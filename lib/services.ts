import { doc, setDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, increment, addDoc, getDoc, deleteDoc, where, onSnapshot, type DocumentData } from "firebase/firestore"
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

export async function getUserProfile(uid: string): Promise<ProfileData | null> {
    const profileRef = doc(db, "profiles", uid)
    const snapshot = await getDoc(profileRef)
    return snapshot.exists() ? (snapshot.data() as ProfileData) : null
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
    if (input.parentCommentId) {
        const parentCommentRef = doc(db, "posts", postId, "comments", input.parentCommentId)
        await updateDoc(parentCommentRef, { comments: increment(1) })
    } else {
        const postRef = doc(db, "posts", postId)
        await updateDoc(postRef, { comments: increment(1) })
    }
    await logUserActivity("comment", { postId, commentId: docRef.id, text: input.text })

    const postRef = doc(db, "posts", postId)
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
    return posts.sort((a, b) => {
        const aLikes = Number(a.likes || 0)
        const aReposts = Number(a.reposts || 0)
        const aComments = Number(a.comments || 0)
        const aBookmarks = Number(a.bookmarks || 0)
        const aViews = Number(a.views || 0)

        const bLikes = Number(b.likes || 0)
        const bReposts = Number(b.reposts || 0)
        const bComments = Number(b.comments || 0)
        const bBookmarks = Number(b.bookmarks || 0)
        const bViews = Number(b.views || 0)

        // X-style weights: Reposts (15x), Comments (12x), Likes (10x), Bookmarks (8x), Views (0.5x)
        const aScore = (aLikes * 10) + (aReposts * 15) + (aComments * 12) + (aBookmarks * 8) + (aViews * 0.5)
        const bScore = (bLikes * 10) + (bReposts * 15) + (bComments * 12) + (bBookmarks * 8) + (bViews * 0.5)

        // Time decay factor: decrease score by 1.5 units per hour since creation
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now()
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.now()
        const aAgeHours = (Date.now() - aTime) / (1000 * 60 * 60)
        const bAgeHours = (Date.now() - bTime) / (1000 * 60 * 60)

        const aFinalScore = aScore - (aAgeHours * 1.5)
        const bFinalScore = bScore - (bAgeHours * 1.5)

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

    if (currentLiked) {
        await deleteDoc(likeRef)
        await updateDoc(postRef, { likes: increment(-1) })
    } else {
        await setDoc(likeRef, { uid, createdAt: serverTimestamp() })
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

    if (currentReposted) {
        await deleteDoc(repostRef)
        await updateDoc(postRef, { reposts: increment(-1) })
        // Remove repost document from feed
        const q = query(collection(db, "posts"), where("repostOf", "==", postId), where("authorId", "==", uid))
        const snap = await getDocs(q)
        for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, "posts", docSnap.id))
        }
    } else {
        await setDoc(repostRef, { uid, createdAt: serverTimestamp() })
        await updateDoc(postRef, { reposts: increment(1) })
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
    await updateDoc(postRef, { views: increment(1) })
}

export async function toggleBookmarkPost(postId: string, currentBookmarked: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const postRef = doc(db, "posts", postId)
    const bookmarkRef = doc(db, "bookmarks", `${uid}_${postId}`)

    if (currentBookmarked) {
        await deleteDoc(bookmarkRef)
        await updateDoc(postRef, { bookmarks: increment(-1) })
    } else {
        await setDoc(bookmarkRef, {
            uid,
            postId,
            createdAt: serverTimestamp()
        })
        await updateDoc(postRef, { bookmarks: increment(1) })
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
