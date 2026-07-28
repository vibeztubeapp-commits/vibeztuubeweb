import { doc, setDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, increment, addDoc, getDoc, deleteDoc, where, onSnapshot, type DocumentData } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
import app from "@/lib/firebase"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage, auth } from "@/lib/firebase"
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
}

export async function ensureProfile(user: FirebaseUser, overrides: Partial<ProfileData> = {}) {
    const profileRef = doc(db, "profiles", user.uid)
    const existing = await getDoc(profileRef)
    const nextProfile: ProfileData = {
        uid: user.uid,
        displayName: overrides.displayName || user.displayName || user.email?.split("@")[0] || "New user",
        username: overrides.username || user.email?.split("@")[0] || `user${user.uid.slice(0, 6)}`,
        bio: overrides.bio || "",
        avatarUrl: overrides.avatarUrl || user.photoURL || "",
        bannerUrl: overrides.bannerUrl || "",
        email: overrides.email ?? user.email,
        phoneNumber: overrides.phoneNumber ?? user.phoneNumber,
        createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    }
    await setDoc(profileRef, nextProfile, { merge: true })
    return nextProfile
}

export async function getUserProfile(uid: string): Promise<ProfileData | null> {
    const profileRef = doc(db, "profiles", uid)
    const snapshot = await getDoc(profileRef)
    return snapshot.exists() ? (snapshot.data() as ProfileData) : null
}

export async function createPost(input: { authorId: string; text: string; media?: Array<{ type: string; src: string }> }) {
    const postsRef = collection(db, "posts")
    await addDoc(postsRef, {
        authorId: input.authorId,
        text: input.text,
        media: input.media || [],
        likes: 0,
        comments: 0,
        reposts: 0,
        shares: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
}

export async function createComment(postId: string, input: { authorId: string; text: string }) {
    const commentsRef = collection(db, "posts", postId, "comments")
    await addDoc(commentsRef, {
        authorId: input.authorId,
        text: input.text,
        createdAt: serverTimestamp(),
    })
}

export async function createReply(postId: string, commentId: string, input: { authorId: string; text: string }) {
    const repliesRef = collection(db, "posts", postId, "comments", commentId, "replies")
    await addDoc(repliesRef, {
        authorId: input.authorId,
        text: input.text,
        createdAt: serverTimestamp(),
    })
}

export async function toggleLike(postId: string) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const likeRef = doc(db, "posts", postId, "likes", uid)
    const likeSnap = await getDoc(likeRef)
    if (likeSnap.exists()) {
        await deleteDoc(likeRef)
    } else {
        await setDoc(likeRef, { createdAt: serverTimestamp() })
        const postRef = doc(db, "posts", postId)
        await updateDoc(postRef, { likes: increment(1) })
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
}

export async function getUserFeed(): Promise<Post[]> {
    try {
        const postsRef = collection(db, "posts")
        const q = query(postsRef, orderBy("createdAt", "desc"), limit(20))
        const snapshot = await getDocs(q)
        return snapshot.docs.map((doc) => {
            const data = doc.data() as DocumentData
            return {
                id: doc.id,
                authorId: data.authorId || "guest",
                timeAgo: data.timeAgo || "just now",
                text: data.text || "",
                media: data.media || [],
                likes: Number(data.likes || 0),
                comments: Number(data.comments || 0),
                reposts: Number(data.reposts || 0),
                views: String(data.views || "0"),
                liked: Boolean(data.liked),
            }
        })
    } catch {
        return []
    }
}

export async function fetchPosts(): Promise<Post[]> {
    return getUserFeed()
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
    const usersRef = collection(db, "profiles")
    const q = query(usersRef, where("displayName", ">=", queryText), where("displayName", "<=", `${queryText}\uf8ff`))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export async function isUsernameAvailable(username: string) {
    const profilesRef = collection(db, "profiles")
    const q = query(profilesRef, where("username", "==", username), limit(1))
    const snapshot = await getDocs(q)
    return snapshot.empty
}

export async function reserveUsername(username: string) {
    try {
        const functions = getFunctions(app)
        const reserve = httpsCallable(functions, "reserveUsername")
        const res = await reserve({ username })
        return res.data?.ok === true
    } catch (err: any) {
        // If function indicates already-exists, treat as unavailable
        if (err?.code === 'already-exists' || err?.details === 'username taken') return false
        // For other errors, rethrow
        throw err
    }
}

export async function confirmUsernameReservation(username: string, uid: string) {
    const ref = doc(db, "username-reservations", username)
    await setDoc(ref, { reserved: true, reservedAt: serverTimestamp(), uid }, { merge: true })
}

export async function uploadToCloudinary(file: File, folder = "vibeztube") {
    // Request a signature from our server endpoint
    const res = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder, resourceType: "image" }),
    })
    if (!res.ok) throw new Error("Failed to get upload signature")
    const { apiKey, cloudName, signature, timestamp } = await res.json()

    const form = new FormData()
    form.append("file", file)
    form.append("api_key", apiKey)
    form.append("timestamp", String(timestamp))
    form.append("signature", signature)
    form.append("folder", folder)

    const upload = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: form,
    })

    if (!upload.ok) throw new Error("Cloudinary upload failed")
    const data = await upload.json()
    return data.secure_url as string
}
