export type User = {
    id: string
    name: string
    username: string
    avatarColor: string
    verified?: boolean
    bio?: string
    followers: number
    following: number
}

export type Post = {
    id: string
    authorId: string
    repostOf?: string | null
    timeAgo: string
    createdAt?: any
    text: string
    media?: { type: "image" | "video"; src: string; aspect?: "video" | "square" | "portrait" }[]
    likes: number
    comments: number
    reposts: number
    bookmarks?: number
    shares?: number
    views: string
    liked?: boolean
}

export type Short = {
    id: string
    authorId: string
    caption: string
    cover: string
    likes: number
    comments: number
    shares: number
    music: string
}

export type Space = {
    id: string
    title: string
    hostId: string
    listeners: number
    speakers: string[]
    live: boolean
    category: string
}

export type Stream = {
    id: string
    title: string
    streamerId: string
    thumbnail: string
    viewers: number
    category: string
    live: boolean
}

export type Conversation = {
    id: string
    userId: string
    lastMessage: string
    timeAgo: string
    unread: number
    online?: boolean
}

export type Notification = {
    id: string
    type: "like" | "follow" | "comment" | "repost" | "mention" | "live"
    userId: string
    text: string
    timeAgo: string
    read?: boolean
}

export type Trend = {
    tag: string
    category: string
    posts: string
}

export const currentUser: User = {
    id: "guest",
    name: "Sign in",
    username: "guest",
    avatarColor: "oklch(0.62 0.14 240)",
    bio: "Join the conversation on VibezTube.",
    followers: 0,
    following: 0,
}

export const users: User[] = []
export const posts: Post[] = []
export const shorts: Short[] = []
export const spaces: Space[] = []
export const streams: Stream[] = []
export const conversations: Conversation[] = []
export const notifications: Notification[] = []
export const trends: Trend[] = []

export function getUser(id: string): User {
    return users.find((user) => user.id === id) ?? currentUser
}

export function formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
    return String(n)
}

export const backendStatus = {
    firebase: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vibeztube-web-app"),
    cloudinary: Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "lxeo6vuu"),
    livekit: Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://vibeztube-2619i9i2.livekit.cloud"),
}

export function formatTimeAgo(timestamp: any): string {
    if (!timestamp) return "just now"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
}
