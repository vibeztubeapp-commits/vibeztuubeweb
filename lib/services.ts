import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, type User as FirebaseUser } from "firebase/auth"

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = {} as any
export const storage = {} as any

export interface ProfileData {
    uid: string
    displayName: string
    username: string
    bio?: string
    avatarUrl?: string
    bannerUrl?: string
    email?: string
    phoneNumber?: string
    location?: string
    website?: string
    verified?: boolean
    verifiedBadge?: "blue" | "gray" | "purple" | "gold" | "gov" | null
    dob?: string
    createdAt?: any
}

export async function ensureProfile(user: FirebaseUser, overrides: Partial<ProfileData> = {}) {
    const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            uid: user.uid,
            username: (overrides.username || user.email?.split("@")[0] || `user_${user.uid.slice(0, 6)}`).toLowerCase(),
            displayName: overrides.displayName || user.displayName || user.email?.split("@")[0] || "Creator",
            avatarUrl: overrides.avatarUrl || user.photoURL || "",
        }),
    })
    const data = await response.json()
    return {
        uid: data.id,
        username: data.username,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        verifiedBadge: data.verifiedBadge,
    } as ProfileData
}

export async function getUserProfile(uid: string): Promise<ProfileData | null> {
    try {
        const response = await fetch(`/api/users/${uid}`)
        if (!response.ok) return null
        return await response.json()
    } catch {
        return null
    }
}

export async function createPost(input: { authorId: string; text: string; media?: Array<{ type: string; src: string }>; audience?: string; location?: string }) {
    const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    })
    return await response.json()
}

export async function toggleLikePost(postId: string, currentLikedState: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const response = await fetch(`/api/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", userId: uid }),
    })
    return await response.json()
}

export async function toggleRepostPost(postId: string, currentRepostedState: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const response = await fetch(`/api/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repost", userId: uid }),
    })
    return await response.json()
}

export async function toggleBookmarkPost(postId: string, currentBookmarkedState: boolean) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const response = await fetch(`/api/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bookmark", userId: uid }),
    })
    return await response.json()
}

export async function incrementPostViews(postId: string) {
    const uid = auth.currentUser?.uid || "anonymous"
    await fetch(`/api/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view", userId: uid }),
    })
}

export async function followUser(targetUid: string) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const response = await fetch(`/api/users/${targetUid}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerUid: uid }),
    })
    return await response.json()
}

export async function createComment(postId: string, input: { authorId: string; text: string; parentCommentId?: string | null }) {
    const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    })
    return await response.json()
}

export async function searchUsers(queryStr: string) {
    const response = await fetch(`/api/users?query=${encodeURIComponent(queryStr)}`)
    return await response.json()
}

export async function getRealtimeTrends() {
    const response = await fetch("/api/explore/trends")
    return await response.json()
}

export async function fetchPaginatedPosts(lastVisibleDoc: any = null, limitCount: number = 10) {
    const response = await fetch(`/api/posts?limit=${limitCount}`)
    const postsList = await response.json()
    return {
        posts: postsList,
        lastDoc: postsList[postsList.length - 1] || null,
    }
}

export function subscribePosts(callback: (posts: any[]) => void) {
    const fetchIt = () => {
        fetch("/api/posts")
            .then(res => res.json())
            .then(callback)
            .catch(err => console.error("subscribePosts error:", err))
    }
    fetchIt()
    const interval = setInterval(fetchIt, 10000)
    return () => clearInterval(interval)
}

export function subscribeFollowingPosts(uid: string, callback: (posts: any[]) => void) {
    const fetchIt = () => {
        fetch(`/api/posts?limit=50`)
            .then(res => res.json())
            .then(callback)
            .catch(err => console.error("subscribeFollowingPosts error:", err))
    }
    fetchIt()
    const interval = setInterval(fetchIt, 10000)
    return () => clearInterval(interval)
}

export async function updateUserProfile(arg1: string | Partial<ProfileData>, arg2?: Partial<ProfileData>) {
    const uid = typeof arg1 === "string" ? arg1 : auth.currentUser?.uid
    const data = typeof arg1 === "string" ? arg2 : arg1
    if (!uid || !data) return null
    const response = await fetch(`/api/users/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    return await response.json()
}

export async function uploadToCloudinary(file: File, folder?: string, onProgress?: (percent: number) => void) {
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    })
    const data = await response.json()
    if (onProgress) onProgress(100)
    return data.src
}

export async function isUsernameAvailable(username: string) {
    const response = await fetch(`/api/users/${username}?type=username`)
    return response.status === 404
}

export async function reserveUsername(username: string, uid?: string) { return true }
export async function confirmUsernameReservation(username: string, uid?: string) { return true }

export async function getEmailByUsername(username: string) {
    const cleanUsername = username.startsWith("@") ? username.slice(1) : username
    const response = await fetch(`/api/users/${cleanUsername}?type=username`)
    if (!response.ok) return null
    const data = await response.json()
    return data.email || null
}

export async function unfollowUser(targetUid: string) {
    return await followUser(targetUid)
}

export async function createConversation(arg: any) {
    return "mock_chat_id"
}

export async function sendMessage(chatId: string, message: any) {
    return "mock_msg_id"
}

export async function toggleLikeComment(postId: string, commentId: string, currentLikedState: boolean) {
    return { likes: 0 }
}

export async function toggleRepostComment(postId: string, commentId: string, currentRepostedState: boolean) {
    return { reposts: 0 }
}

export async function toggleBookmarkComment(postId: string, commentId: string, currentBookmarkedState: boolean) {
    return { bookmarked: false }
}

export async function incrementCommentViews(postId: string, commentId: string) {
    return
}
