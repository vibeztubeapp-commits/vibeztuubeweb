import { doc, setDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, increment, addDoc, getDoc, deleteDoc, where, onSnapshot, startAfter, type DocumentData } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
import app from "@/lib/firebase"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage, auth } from "@/lib/firebase"
export { db }
import type { Post, User } from "@/lib/production-data"
import type { User as FirebaseUser } from "firebase/auth"

export type ProfileData = {
    uid: string
    displayName?: string
    username?: string
    bio?: string
    avatarUrl?: string
    bannerUrl?: string
    email?: string | null
    phoneNumber?: string | null
    createdAt?: unknown
    location?: string
    website?: string
    verified?: boolean
    verifiedBadge?: "blue" | "gray" | "purple" | "gold" | "gov" | null
    dob?: string
}

export async function ensureProfile(user: FirebaseUser, overrides: Partial<ProfileData> = {}) {
    // Give the authentication token a brief moment to propagate to the Firestore client
    await new Promise((resolve) => setTimeout(resolve, 500))
    const profileRef = doc(db, "profiles", user.uid)
    const existing = await getDoc(profileRef)
    const existingData = existing.exists() ? (existing.data() as ProfileData) : ({} as Partial<ProfileData>)

    const nextProfile: ProfileData = {
        uid: user.uid,
        displayName: overrides.displayName || existingData.displayName || user.displayName || user.email?.split("@")[0] || "New user",
        username: (overrides.username || existingData.username || user.email?.split("@")[0] || `user${user.uid.slice(0, 6)}`).toLowerCase(),
        bio: overrides.bio || existingData.bio || "",
        avatarUrl: overrides.avatarUrl || existingData.avatarUrl || user.photoURL || "",
        bannerUrl: overrides.bannerUrl || existingData.bannerUrl || "",
        email: overrides.email ?? existingData.email ?? user.email,
        phoneNumber: overrides.phoneNumber ?? existingData.phoneNumber ?? user.phoneNumber,
        location: overrides.location ?? existingData.location ?? "",
        website: overrides.website ?? existingData.website ?? "",
        verified: overrides.verified ?? existingData.verified ?? false,
        verifiedBadge: overrides.verifiedBadge ?? existingData.verifiedBadge ?? null,
        dob: overrides.dob || existingData.dob || "",
        createdAt: existingData.createdAt || serverTimestamp(),
    }
    await setDoc(profileRef, nextProfile, { merge: true })
    return nextProfile
}

const userProfileCache: Record<string, ProfileData | null> = {}

export const followedAuthorsCache = new Set<string>()
export const likedAuthorsCache = new Set<string>()

// Track auth change to load affinities
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        followedAuthorsCache.clear()
        likedAuthorsCache.clear()
        return
    }
    
    try {
        // Load followed users
        const followsRef = collection(db, "follows")
        const qFollows = query(followsRef, where("followerUid", "==", user.uid))
        const followsSnap = await getDocs(qFollows)
        followsSnap.docs.forEach(d => {
            const followed = d.data().followeeUid
            if (followed) followedAuthorsCache.add(followed)
        })
        
        // Load liked posts to determine creator affinity
        const likesRef = collection(db, "profiles", user.uid, "likes")
        const likesSnap = await getDocs(likesRef)
        const likedPostIds = likesSnap.docs.map(d => d.id)
        
        // For creator affinity, resolve authors of liked posts
        for (const pid of likedPostIds) {
            const postSnap = await getDoc(doc(db, "posts", pid))
            if (postSnap.exists()) {
                const authorId = postSnap.data().authorId
                if (authorId) likedAuthorsCache.add(authorId)
            }
        }
    } catch (e) {
        console.error("Failed to load affinity caches", e)
    }
})

export async function getUserProfile(uid: string): Promise<ProfileData | null> {
    if (uid in userProfileCache) {
        return userProfileCache[uid]
    }
    const profileRef = doc(db, "profiles", uid)
    const snapshot = await getDoc(profileRef)
    const profile = snapshot.exists() ? (snapshot.data() as ProfileData) : null
    userProfileCache[uid] = profile
    return profile
}

export async function createPost(input: { authorId: string; text: string; media?: Array<{ type: string; src: string }>; audience?: string; location?: string }) {
    const postsRef = collection(db, "posts")
    const docRef = await addDoc(postsRef, {
        authorId: input.authorId,
        text: input.text,
        media: input.media || [],
        audience: input.audience || "Everyone",
        location: input.location || null,
        likes: 0,
        comments: 0,
        reposts: 0,
        shares: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
    await logUserActivity("create_post", { postId: docRef.id, text: input.text })
}

export async function createComment(postId: string, input: { authorId: string; text: string; parentCommentId?: string | null }) {
    const commentsRef = collection(db, "posts", postId, "comments")
    const docRef = await addDoc(commentsRef, {
        authorId: input.authorId,
        text: input.text,
        parentCommentId: input.parentCommentId || null,
        likes: 0,
        comments: 0,
        reposts: 0,
        createdAt: serverTimestamp(),
    })
    const postRef = doc(db, "posts", postId)
    await updateDoc(postRef, { comments: increment(1) })
    if (input.parentCommentId) {
        const parentCommentRef = doc(db, "posts", postId, "comments", input.parentCommentId)
        await updateDoc(parentCommentRef, { comments: increment(1) })
    }
    
    // Save to user profile subcollection for timeline Replies tab
    await setDoc(doc(db, "profiles", input.authorId, "replies", docRef.id), {
        postId,
        commentId: docRef.id,
        text: input.text,
        parentCommentId: input.parentCommentId || null,
        createdAt: serverTimestamp()
    })

    await logUserActivity("comment", { postId, commentId: docRef.id, text: input.text })

    const postSnap = await getDoc(postRef)
    if (postSnap.exists()) {
        const postData = postSnap.data()
        if (postData.authorId && postData.authorId !== input.authorId) {
            await addDoc(collection(db, "notifications"), {
                recipientId: postData.authorId,
                senderId: input.authorId,
                type: "comment",
                postId: postId,
                text: "commented on your post",
                read: false,
                createdAt: serverTimestamp()
            })
        }
    }
}

export async function createReply(postId: string, commentId: string, input: { authorId: string; text: string }) {
    const repliesRef = collection(db, "posts", postId, "comments", commentId, "replies")
    const docRef = await addDoc(repliesRef, {
        authorId: input.authorId,
        text: input.text,
        createdAt: serverTimestamp(),
    })

    // Save to user profile subcollection for timeline Replies tab
    await setDoc(doc(db, "profiles", input.authorId, "replies", docRef.id), {
        postId,
        commentId,
        replyId: docRef.id,
        text: input.text,
        createdAt: serverTimestamp()
    })

    await logUserActivity("reply", { postId, commentId, replyId: docRef.id, text: input.text })
}

export async function toggleLike(postId: string) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const likeRef = doc(db, "posts", postId, "likes", uid)
    const likeSnap = await getDoc(likeRef)
    if (likeSnap.exists()) {
        await deleteDoc(likeRef)
        await logUserActivity("unlike", { postId })
    } else {
        await setDoc(likeRef, { createdAt: serverTimestamp() })
        const postRef = doc(db, "posts", postId)
        await updateDoc(postRef, { likes: increment(1) })
        await logUserActivity("like", { postId })

        // Create notification for post author
        const postSnap = await getDoc(postRef)
        if (postSnap.exists()) {
            const postData = postSnap.data()
            if (postData.authorId && postData.authorId !== uid) {
                await addDoc(collection(db, "notifications"), {
                    recipientId: postData.authorId,
                    senderId: uid,
                    type: "like",
                    postId: postId,
                    text: "liked your post",
                    read: false,
                    createdAt: serverTimestamp()
                })
            }
        }
    }
}

export async function toggleBookmark(postId: string) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const bookmarkRef = doc(db, "bookmarks", `${uid}_${postId}`)
    const bookmarkSnap = await getDoc(bookmarkRef)
    if (bookmarkSnap.exists()) {
        await deleteDoc(bookmarkRef)
    } else {
        await setDoc(bookmarkRef, { uid, postId, createdAt: serverTimestamp() })
    }
}

export async function followUser(targetUid: string) {
    const uid = auth.currentUser?.uid
    if (!uid || uid === targetUid) return
    const followRef = doc(db, "follows", `${uid}_${targetUid}`)
    await setDoc(followRef, { followerUid: uid, followeeUid: targetUid, createdAt: serverTimestamp() })
    await logUserActivity("follow", { targetUid })

    // Create follow notification
    await addDoc(collection(db, "notifications"), {
        recipientId: targetUid,
        senderId: uid,
        type: "follow",
        text: "started following you",
        read: false,
        createdAt: serverTimestamp()
    })
}

function rankPostsByXAlgorithm(posts: Post[]) {
    const getMs = (t: any) => {
        if (!t) return Date.now()
        if (t.seconds) return t.seconds * 1000
        if (t.toDate) return t.toDate().getTime()
        return new Date(t).getTime()
    }

    const getBadgeWeight = (authorId: string) => {
        const profile = userProfileCache[authorId]
        if (!profile || !profile.verifiedBadge) return 0.20
        const b = profile.verifiedBadge
        if (b === "gold") return 0.99
        if (b === "gov") return 0.99
        if (b === "purple") return 0.60
        if (b === "gray") return 0.50 // Premium Blue+ (Blue Badge style)
        if (b === "blue") return 0.30 // Premium Standard (Green Badge style)
        return 0.20
    }

    return posts.sort((a, b) => {
        const aLikes = Number(a.likes || 0)
        const aReposts = Number(a.reposts || 0)
        const aComments = Number(a.comments || 0)

        const bLikes = Number(b.likes || 0)
        const bReposts = Number(b.reposts || 0)
        const bComments = Number(b.comments || 0)

        // 1. Engagement Score: Likes (+1.0), Reposts (+2.0), Comments (+1.5)
        const aEngagement = (aLikes * 1.0) + (aReposts * 2.0) + (aComments * 1.5)
        const bEngagement = (bLikes * 1.0) + (bReposts * 2.0) + (bComments * 1.5)

        // 2. Exponential Recency Decay: S_recency = e^(-0.15 * t)
        const aTime = getMs(a.createdAt)
        const bTime = getMs(b.createdAt)
        const aAgeHours = (Date.now() - aTime) / (1000 * 60 * 60)
        const bAgeHours = (Date.now() - bTime) / (1000 * 60 * 60)

        const aDecay = Math.exp(-0.15 * aAgeHours)
        const bDecay = Math.exp(-0.15 * bAgeHours)

        // 3. Follower Affinity (3.0x multiplier) & Creator Affinity (2.0x multiplier)
        let aAffinity = 1.0
        if (followedAuthorsCache.has(a.authorId)) aAffinity *= 3.0
        if (likedAuthorsCache.has(a.authorId)) aAffinity *= 2.0

        let bAffinity = 1.0
        if (followedAuthorsCache.has(b.authorId)) bAffinity *= 3.0
        if (likedAuthorsCache.has(b.authorId)) bAffinity *= 2.0

        // 4. Badge Visibility Weights
        const aBadgeWeight = getBadgeWeight(a.authorId)
        const bBadgeWeight = getBadgeWeight(b.authorId)

        // If author profile is not in local cache yet, trigger load in background to resolve on next render/snapshot
        if (!userProfileCache[a.authorId]) {
            void getUserProfile(a.authorId)
        }
        if (!userProfileCache[b.authorId]) {
            void getUserProfile(b.authorId)
        }

        const aFinalScore = (aEngagement + 1) * aDecay * aAffinity * aBadgeWeight
        const bFinalScore = (bEngagement + 1) * bDecay * bAffinity * bBadgeWeight

        return bFinalScore - aFinalScore
    })
}

export async function getUserFeed(): Promise<Post[]> {
    try {
        const postsRef = collection(db, "posts")
        // Fetch a larger pool of latest posts to allow ranking recommendation
        const q = query(postsRef, orderBy("createdAt", "desc"), limit(60))
        const snapshot = await getDocs(q)
        const posts = snapshot.docs.map((doc) => {
            const data = doc.data() as DocumentData
            return {
                id: doc.id,
                authorId: data.authorId || "guest",
                repostOf: data.repostOf || null,
                timeAgo: data.timeAgo || "just now",
                createdAt: data.createdAt,
                text: data.text || "",
                media: data.media || [],
                likes: Number(data.likes || 0),
                comments: Number(data.comments || 0),
                reposts: Number(data.reposts || 0),
                bookmarks: Number(data.bookmarks || 0),
                shares: Number(data.shares || 0),
                views: String(data.views || "0"),
                liked: Boolean(data.liked),
            }
        })
        return rankPostsByXAlgorithm(posts)
    } catch {
        return []
    }
}

export async function fetchPosts(): Promise<Post[]> {
    return getUserFeed()
}

export function subscribePosts(callback: (posts: Post[]) => void) {
    const postsRef = collection(db, "posts")
    const q = query(postsRef, orderBy("createdAt", "desc"), limit(60))
    return onSnapshot(q, (snapshot) => {
        const postsList = snapshot.docs.map((doc) => {
            const data = doc.data() as DocumentData
            return {
                id: doc.id,
                authorId: data.authorId || "guest",
                repostOf: data.repostOf || null,
                timeAgo: data.timeAgo || "just now",
                createdAt: data.createdAt,
                text: data.text || "",
                media: data.media || [],
                likes: Number(data.likes || 0),
                comments: Number(data.comments || 0),
                reposts: Number(data.reposts || 0),
                bookmarks: Number(data.bookmarks || 0),
                shares: Number(data.shares || 0),
                views: String(data.views || "0"),
                liked: Boolean(data.liked),
            }
        })
        callback(rankPostsByXAlgorithm(postsList))
    }, (error) => {
        console.error("Error listening to posts:", error)
    })
}

export function subscribeFollowingPosts(uid: string, callback: (posts: Post[]) => void) {
    const followsRef = collection(db, "follows")
    const qFollows = query(followsRef, where("followerUid", "==", uid))
    
    let unsubPosts: (() => void) | null = null
    
    const unsubFollows = onSnapshot(qFollows, (followsSnap) => {
        if (unsubPosts) {
            unsubPosts()
            unsubPosts = null
        }
        
        const followedUids = followsSnap.docs.map(doc => doc.data().followeeUid)
        if (followedUids.length === 0) {
            callback([])
            return
        }
        
        const chunk = followedUids.slice(0, 30)
        const postsRef = collection(db, "posts")
        const qPosts = query(postsRef, where("authorId", "in", chunk), orderBy("createdAt", "desc"), limit(60))
        
        unsubPosts = onSnapshot(qPosts, (postsSnap) => {
            const postsList = postsSnap.docs.map((docSnap) => {
                const data = docSnap.data()
                return {
                    id: docSnap.id,
                    authorId: data.authorId || "guest",
                    repostOf: data.repostOf || null,
                    timeAgo: data.timeAgo || "just now",
                    createdAt: data.createdAt,
                    text: data.text || "",
                    media: data.media || [],
                    likes: Number(data.likes || 0),
                    comments: Number(data.comments || 0),
                    reposts: Number(data.reposts || 0),
                    bookmarks: Number(data.bookmarks || 0),
                    shares: Number(data.shares || 0),
                    views: String(data.views || "0"),
                    liked: Boolean(data.liked),
                }
            })
            callback(postsList)
        }, (err) => {
            console.error("Error listening to following posts:", err)
        })
    }, (err) => {
        console.error("Error listening to follows:", err)
    })
    
    return () => {
        unsubFollows()
        if (unsubPosts) {
            unsubPosts()
        }
    }
}


export async function uploadMedia(file: File, uid: string) {
    const storageRef = ref(storage, `uploads/${uid}/${Date.now()}_${file.name}`)
    const uploadTask = uploadBytesResumable(storageRef, file)
    return new Promise<Array<{ type: string; src: string }>>((resolve, reject) => {
        uploadTask.on(
            "state_changed",
            () => { },
            reject,
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref)
                resolve([{ type: file.type.startsWith("video") ? "video" : "image", src: url }])
            },
        )
    })
}

export async function deleteMedia(url: string) {
    try {
        const decoded = decodeURIComponent(url)
        const filePath = decoded.split("/o/")[1]?.split("?", 1)[0] || ""
        if (!filePath) return
        const storageRef = ref(storage, decodeURIComponent(filePath))
        await deleteObject(storageRef)
    } catch {
        // Ignore storage cleanup errors during initial rollout.
    }
}

export async function createNotification(input: { uid: string; text: string; type: string }) {
    await addDoc(collection(db, "notifications"), {
        uid: input.uid,
        text: input.text,
        type: input.type,
        createdAt: serverTimestamp(),
        read: false,
    })
}

export async function createConversation(input: { userIds: string[]; lastMessage: string }) {
    const conversationsRef = collection(db, "conversations")
    const docRef = await addDoc(conversationsRef, {
        userIds: input.userIds,
        lastMessage: input.lastMessage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
    return docRef.id
}

export async function sendMessage(conversationId: string, input: { senderUid: string; text: string }) {
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
        senderUid: input.senderUid,
        text: input.text,
        createdAt: serverTimestamp(),
    })
}

export async function searchUsers(queryText: string) {
    const cleanQuery = queryText.startsWith("@") ? queryText.slice(1) : queryText
    const usersRef = collection(db, "profiles")
    
    const qName = query(usersRef, where("displayName", ">=", queryText), where("displayName", "<=", `${queryText}\uf8ff`))
    const qUsername = query(usersRef, where("username", ">=", cleanQuery.toLowerCase()), where("username", "<=", `${cleanQuery.toLowerCase()}\uf8ff`))
    
    const [snapName, snapUsername] = await Promise.all([
        getDocs(qName),
        getDocs(qUsername)
    ])
    
    const resultMap = new Map<string, any>()
    snapName.docs.forEach((doc) => {
        resultMap.set(doc.id, { id: doc.id, ...doc.data() })
    })
    snapUsername.docs.forEach((doc) => {
        resultMap.set(doc.id, { id: doc.id, ...doc.data() })
    })
    
    return Array.from(resultMap.values())
}

export async function isUsernameAvailable(username: string) {
    const cleanUsername = username.startsWith("@") ? username.slice(1).toLowerCase() : username.toLowerCase()
    
    // Check reservations collection
    const reservationRef = doc(db, "username-reservations", cleanUsername)
    const reservationSnap = await getDoc(reservationRef)
    if (reservationSnap.exists()) {
        return false
    }

    // Check profiles collection
    const profilesRef = collection(db, "profiles")
    const q = query(profilesRef, where("username", "==", cleanUsername), limit(1))
    const snapshot = await getDocs(q)
    return snapshot.empty
}

export async function getEmailByUsername(username: string): Promise<string | null> {
    const cleanUsername = username.startsWith("@") ? username.slice(1).toLowerCase() : username.toLowerCase()
    const profilesRef = collection(db, "profiles")
    const q = query(profilesRef, where("username", "==", cleanUsername), limit(1))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    return (snapshot.docs[0].data() as ProfileData).email || null
}

export async function reserveUsername(username: string) {
    try {
        const functions = getFunctions(app)
        const reserve = httpsCallable(functions, "reserveUsername")
        const res = await reserve({ username })
        return (res.data as { ok?: boolean })?.ok === true
    } catch (err: any) {
        // If function indicates already-exists, treat as unavailable
        if (err?.code === 'already-exists' || err?.details === 'username taken') return false
        
        // Fallback: If Cloud Functions are not deployed/configured (e.g. throwing internal or not-found errors),
        // query Firestore directly for username availability.
        try {
            console.warn("Cloud function failed, falling back to Firestore query:", err)
            const available = await isUsernameAvailable(username)
            return available
        } catch (fallbackErr) {
            console.error("Firestore username check fallback also failed:", fallbackErr)
        }
        throw err
    }
}

export async function confirmUsernameReservation(username: string, uid: string) {
    const ref = doc(db, "username-reservations", username.toLowerCase())
    await setDoc(ref, { reserved: true, reservedAt: serverTimestamp(), uid }, { merge: true })
}

export async function uploadToCloudinary(file: File, folder = "vibeztube", onProgress?: (percent: number) => void) {
    const res = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
    })
    if (!res.ok) throw new Error("Failed to get upload signature")
    const { apiKey, cloudName, signature, timestamp } = await res.json()

    const form = new FormData()
    form.append("file", file)
    form.append("api_key", apiKey)
    form.append("timestamp", String(timestamp))
    form.append("signature", signature)
    form.append("folder", folder)

    return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, true)
        if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100)
                    onProgress(percent)
                }
            }
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText)
                    resolve(data.secure_url)
                } catch (e) {
                    reject(new Error("Failed to parse Cloudinary response"))
                }
            } else {
                reject(new Error(`Cloudinary upload failed: ${xhr.statusText}`))
            }
        }
        xhr.onerror = () => reject(new Error("Network error during Cloudinary upload"))
        xhr.send(form)
    })
}

export async function logUserActivity(activityType: string, details: Record<string, any> = {}) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    try {
        await addDoc(collection(db, "activities"), {
            uid,
            type: activityType,
            details,
            createdAt: serverTimestamp()
        })
    } catch (e) {
        console.error("Activity logging failed", e)
    }
}

export async function unfollowUser(targetUid: string) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const followRef = doc(db, "follows", `${uid}_${targetUid}`)
    await deleteDoc(followRef)
    await logUserActivity("unfollow", { targetUid })
}

export async function updateUserProfile(data: Partial<ProfileData>) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const profileRef = doc(db, "profiles", uid)
    await updateDoc(profileRef, data)
    await logUserActivity("update_profile", data)
}

export async function toggleLikePost(postId: string, currentLiked: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const postRef = doc(db, "posts", postId)
    const likeRef = doc(db, "posts", postId, "likes", uid)
    const userLikeRef = doc(db, "profiles", uid, "likes", postId)

    if (currentLiked) {
        await deleteDoc(likeRef)
        await deleteDoc(userLikeRef)
        await updateDoc(postRef, { likes: increment(-1) })
    } else {
        await setDoc(likeRef, { uid, createdAt: serverTimestamp() })
        await setDoc(userLikeRef, { postId, createdAt: serverTimestamp() })
        await updateDoc(postRef, { likes: increment(1) })

        const postSnap = await getDoc(postRef)
        if (postSnap.exists()) {
            const postData = postSnap.data()
            if (postData.authorId && postData.authorId !== uid) {
                await addDoc(collection(db, "notifications"), {
                    recipientId: postData.authorId,
                    senderId: uid,
                    type: "like",
                    postId: postId,
                    text: "liked your post",
                    read: false,
                    createdAt: serverTimestamp()
                })
            }
        }
    }
}

export async function toggleRepostPost(postId: string, currentReposted: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const postRef = doc(db, "posts", postId)
    const repostRef = doc(db, "posts", postId, "reposts", uid)
    const userRepostRef = doc(db, "profiles", uid, "reposts", postId)

    if (currentReposted) {
        await deleteDoc(repostRef)
        await deleteDoc(userRepostRef)
        await updateDoc(postRef, { reposts: increment(-1) })
        await logUserActivity("unrepost", { postId })
        // Remove repost document from feed
        const q = query(collection(db, "posts"), where("repostOf", "==", postId), where("authorId", "==", uid))
        const snap = await getDocs(q)
        for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, "posts", docSnap.id))
        }
    } else {
        await setDoc(repostRef, { uid, createdAt: serverTimestamp() })
        await setDoc(userRepostRef, { postId, createdAt: serverTimestamp() })
        await updateDoc(postRef, { reposts: increment(1) })
        await logUserActivity("repost", { postId })
        // Create repost document on feed
        await addDoc(collection(db, "posts"), {
            authorId: uid,
            repostOf: postId,
            text: "",
            media: [],
            likes: 0,
            comments: 0,
            reposts: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })
    }
}

export async function toggleLikeComment(postId: string, commentId: string, currentLiked: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const commentRef = doc(db, "posts", postId, "comments", commentId)
    const likeRef = doc(db, "posts", postId, "comments", commentId, "likes", uid)

    if (currentLiked) {
        await deleteDoc(likeRef)
        await updateDoc(commentRef, { likes: increment(-1) })
    } else {
        await setDoc(likeRef, { uid, createdAt: serverTimestamp() })
        await updateDoc(commentRef, { likes: increment(1) })
    }
}

export async function toggleRepostComment(postId: string, commentId: string, currentReposted: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const commentRef = doc(db, "posts", postId, "comments", commentId)
    const repostRef = doc(db, "posts", postId, "comments", commentId, "reposts", uid)

    if (currentReposted) {
        await deleteDoc(repostRef)
        await updateDoc(commentRef, { reposts: increment(-1) })
    } else {
        await setDoc(repostRef, { uid, createdAt: serverTimestamp() })
        await updateDoc(commentRef, { reposts: increment(1) })
    }
}

export async function incrementPostViews(postId: string) {
    const postRef = doc(db, "posts", postId)
    const snap = await getDoc(postRef)
    if (snap.exists()) {
        const currentViews = Number(snap.data()?.views || 0)
        await updateDoc(postRef, { views: currentViews + 1 })
    }
}

export async function incrementCommentViews(postId: string, commentId: string) {
    const commentRef = doc(db, "posts", postId, "comments", commentId)
    const snap = await getDoc(commentRef)
    if (snap.exists()) {
        const currentViews = Number(snap.data()?.views || 0)
        await updateDoc(commentRef, { views: currentViews + 1 })
    }
}

export async function toggleBookmarkPost(postId: string, currentBookmarked: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const postRef = doc(db, "posts", postId)
    const bookmarkRef = doc(db, "bookmarks", `${uid}_${postId}`)

    if (currentBookmarked) {
        await deleteDoc(bookmarkRef)
        await updateDoc(postRef, { bookmarks: increment(-1) })
        await logUserActivity("unbookmark", { postId })
    } else {
        await setDoc(bookmarkRef, {
            uid,
            postId,
            createdAt: serverTimestamp()
        })
        await updateDoc(postRef, { bookmarks: increment(1) })
        await logUserActivity("bookmark", { postId })
    }
}

export async function toggleBookmarkComment(postId: string, commentId: string, currentBookmarked: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const commentRef = doc(db, "posts", postId, "comments", commentId)
    const bookmarkRef = doc(db, "bookmarks", `${uid}_${commentId}`)

    if (currentBookmarked) {
        await deleteDoc(bookmarkRef)
        await updateDoc(commentRef, { bookmarks: increment(-1) })
    } else {
        await setDoc(bookmarkRef, {
            uid,
            postId,
            commentId,
            createdAt: serverTimestamp()
        })
        await updateDoc(commentRef, { bookmarks: increment(1) })
    }
}

export async function fetchPaginatedPosts(lastVisibleDoc: any = null, limitCount: number = 10) {
    const postsRef = collection(db, "posts")
    let q = query(postsRef, orderBy("createdAt", "desc"), limit(limitCount))
    if (lastVisibleDoc) {
        q = query(postsRef, orderBy("createdAt", "desc"), startAfter(lastVisibleDoc), limit(limitCount))
    }
    const snap = await getDocs(q)
    const postsList = snap.docs.map((doc) => {
        const data = doc.data() as DocumentData
        return {
            id: doc.id,
            authorId: data.authorId || "guest",
            repostOf: data.repostOf || null,
            timeAgo: data.timeAgo || "just now",
            createdAt: data.createdAt,
            text: data.text || "",
            media: data.media || [],
            likes: Number(data.likes || 0),
            comments: Number(data.comments || 0),
            reposts: Number(data.reposts || 0),
            bookmarks: Number(data.bookmarks || 0),
            shares: Number(data.shares || 0),
            views: String(data.views || "0"),
            liked: Boolean(data.liked),
        }
    })
    return {
        posts: postsList,
        lastDoc: snap.docs[snap.docs.length - 1] || null
    }
}
