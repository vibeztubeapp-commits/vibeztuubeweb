"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { AuthGuard } from "@/components/auth-guard"
import { db, getUserProfile, toggleLikePost, toggleRepostPost, followUser } from "@/lib/services"
import { collection, onSnapshot, query, where, orderBy, doc, addDoc, serverTimestamp, getDocs } from "firebase/firestore"
import { Heart, MessageCircle, Repeat2, Bookmark, Share, UserPlus, X, Send, Play, Pause, Loader2, Compass } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ShortVideoPost = {
  id: string
  authorId: string
  text: string
  media: Array<{ type: string; src: string }>
  likes: number
  comments: number
  reposts: number
  createdAt: any
  authorProfile?: any
}

export default function ShortsPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<ShortVideoPost[]>([])
  const [loading, setLoading] = useState(true)
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [postingComment, setPostingComment] = useState(false)

  // Load all posts containing video from firestore
  useEffect(() => {
    const postsRef = collection(db, "posts")
    const q = query(postsRef, orderBy("createdAt", "desc"))

    const unsub = onSnapshot(q, async (snap) => {
      const items: ShortVideoPost[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const media = data.media || []
        const hasVideo = media.some((m: any) => m.type === "video" || m.src?.match(/\.(mp4|webm|ogg|mov)/i))
        if (hasVideo) {
          const authorProfile = await getUserProfile(data.authorId)
          items.push({
            id: d.id,
            authorId: data.authorId,
            text: data.text || "",
            media,
            likes: Number(data.likes || 0),
            comments: Number(data.comments || 0),
            reposts: Number(data.reposts || 0),
            createdAt: data.createdAt,
            authorProfile,
          })
        }
      }
      
      // Sort using TikTok-style algorithm: Likes (12x), Comments (15x), Reposts (18x) with soft recency bias
      items.sort((a, b) => {
        const aScore = (a.likes * 12) + (a.comments * 15) + (a.reposts * 18)
        const bScore = (b.likes * 12) + (b.comments * 15) + (b.reposts * 18)
        
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now()
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.now()
        const aAgeHours = (Date.now() - aTime) / (1000 * 60 * 60)
        const bAgeHours = (Date.now() - bTime) / (1000 * 60 * 60)
        
        const aFinal = aScore - (aAgeHours * 0.8)
        const bFinal = bScore - (bAgeHours * 0.8)
        
        return bFinal - aFinal
      })

      setPosts(items)
      setLoading(false)
    })

    return unsub
  }, [])

  // Listen to comments on active post
  useEffect(() => {
    if (!activePostId) return
    const commentsRef = collection(db, "posts", activePostId, "comments")
    const q = query(commentsRef, orderBy("createdAt", "asc"))

    const unsub = onSnapshot(q, async (snap) => {
      const items: any[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const authorProfile = await getUserProfile(data.authorId)
        items.push({
          id: d.id,
          ...data,
          authorProfile,
        })
      }
      setComments(items)
    })

    return unsub
  }, [activePostId])

  const handlePostComment = async () => {
    if (!user || !activePostId || !newComment.trim()) return
    setPostingComment(true)
    try {
      await addDoc(collection(db, "posts", activePostId, "comments"), {
        authorId: user.uid,
        text: newComment.trim(),
        createdAt: serverTimestamp(),
      })
      setNewComment("")
    } catch (err) {
      console.error(err)
    } finally {
      setPostingComment(false)
    }
  }

  return (
    <AuthGuard>
      <div className="relative flex h-[calc(100vh-65px)] w-full items-center justify-center bg-black overflow-hidden select-none">
        
        {loading ? (
          <div className="text-white text-xs flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Loading Shorts Feed...
          </div>
        ) : posts.length > 0 ? (
          <div className="h-full w-full max-w-[480px] overflow-y-scroll snap-y snap-mandatory scroll-smooth divide-y divide-zinc-900 scrollbar-none">
            {posts.map((post) => (
              <ShortPlayerCard
                key={post.id}
                post={post}
                user={user}
                onOpenComments={(id) => {
                  setActivePostId(id)
                  setCommentDrawerOpen(true)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-zinc-500 space-y-3">
            <Compass className="h-10 w-10 mx-auto text-zinc-700 animate-pulse" />
            <p className="text-xs font-semibold text-zinc-400">No shorts available yet</p>
            <p className="text-[10px] text-zinc-600 px-6">
              Create a post containing a video file using the composer to populate the vertical Short Feed.
            </p>
          </div>
        )}

        {/* Dynamic Comments Drawer Panel (slide up on mobile/web) */}
        {commentDrawerOpen && activePostId && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setCommentDrawerOpen(false)}>
            <div
              className="w-full max-w-[480px] bg-card border-t border-border rounded-t-3xl p-4 flex flex-col h-[70%] space-y-4 animate-slide-in text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h3 className="font-bold text-sm">Comments ({comments.length})</h3>
                <button onClick={() => setCommentDrawerOpen(false)} className="p-1 hover:bg-accent rounded-full text-muted-foreground">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Scrollable list of comments */}
              <div className="flex-1 overflow-y-auto space-y-3 divide-y divide-border/40">
                {comments.length > 0 ? (
                  comments.map((c) => (
                    <div key={c.id} className="pt-3 flex gap-2.5 first:pt-0">
                      <UserAvatar user={c.authorProfile} className="h-8 w-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-bold text-foreground truncate max-w-[120px]">
                            {c.authorProfile?.displayName || "Creator User"}
                          </span>
                          <VerifiedBadge type={c.authorProfile?.verifiedBadge} />
                          <span className="text-[10px] text-muted-foreground">@{c.authorProfile?.username}</span>
                        </div>
                        <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">No comments yet.</div>
                )}
              </div>

              {/* Input section */}
              <div className="pt-2 border-t border-border flex gap-2 items-center">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="text-xs rounded-full border-border bg-card/60"
                  onKeyDown={(e) => e.key === "Enter" && void handlePostComment()}
                />
                <Button onClick={() => void handlePostComment()} disabled={postingComment || !newComment.trim()} size="icon" className="rounded-full shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AuthGuard>
  )
}

function ShortPlayerCard({ post, user, onOpenComments }: { post: ShortVideoPost; user: any; onOpenComments: (id: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [following, setFollowing] = useState(false)

  // IntersectionObserver to auto play/pause active video
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        })
      },
      { threshold: 0.6 }
    )
    if (videoRef.current) {
      observer.observe(videoRef.current)
    }
    return () => observer.disconnect()
  }, [])

  // Listen to like status
  useEffect(() => {
    if (!user) return
    const likeRef = doc(db, "posts", post.id, "likes", user.uid)
    const unsub = onSnapshot(likeRef, (snap) => setLiked(snap.exists()))
    return unsub
  }, [post.id, user])

  // Listen to repost status
  useEffect(() => {
    if (!user) return
    const repostRef = doc(db, "posts", post.id, "reposts", user.uid)
    const unsub = onSnapshot(repostRef, (snap) => setReposted(snap.exists()))
    return unsub
  }, [post.id, user])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
      }
    }
  }

  const handleLike = async () => {
    try {
      await toggleLikePost(post.id, liked)
    } catch (err) {
      console.error(err)
    }
  }

  const handleRepost = async () => {
    try {
      await toggleRepostPost(post.id, reposted)
    } catch (err) {
      console.error(err)
    }
  }

  const handleFollow = async () => {
    try {
      await followUser(post.authorId)
      setFollowing(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/status/${post.id}`)
      alert("Post link copied to clipboard!")
    }
  }

  const videoSrc = post.media.find((m) => m.type === "video" || m.src?.match(/\.(mp4|webm|mov)/i))?.src || ""

  return (
    <div className="relative h-full w-full snap-start snap-always flex flex-col justify-end">
      
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoSrc}
        onClick={togglePlay}
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover cursor-pointer"
      />

      {/* Play/Pause overlay indicator */}
      {!isPlaying && (
        <div onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer">
          <div className="bg-black/60 p-4 rounded-full text-white animate-ping">
            <Play className="h-8 w-8 fill-current" />
          </div>
        </div>
      )}

      {/* Shadow overlay gradient */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />

      {/* Creator Profile & Info Details bottom pane */}
      <div className="absolute left-4 bottom-4 right-16 text-white space-y-3 z-10">
        <div className="flex items-center gap-2">
          <UserAvatar user={post.authorProfile} className="h-10 w-10 border border-zinc-700" />
          <div>
            <h4 className="font-bold text-sm flex items-center gap-0.5">
              <span>{post.authorProfile?.displayName || "Creator"}</span>
              <VerifiedBadge type={post.authorProfile?.verifiedBadge} />
            </h4>
            <p className="text-[11px] text-zinc-300">@{post.authorProfile?.username || "username"}</p>
          </div>
          {user && user.uid !== post.authorId && !following && (
            <button
              onClick={handleFollow}
              className="ml-2 flex items-center gap-0.5 bg-primary px-2.5 py-1 rounded-full text-[10px] font-bold text-primary-foreground cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <UserPlus className="h-3 w-3" /> Follow
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">{post.text}</p>
      </div>

      {/* Engagement actions right sidebar floating block */}
      <div className="absolute right-3 bottom-12 flex flex-col gap-5 items-center z-10 text-white">
        
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <div className={cn(
            "p-2.5 rounded-full bg-zinc-800/60 hover:bg-zinc-800 transition-colors cursor-pointer",
            liked ? "text-red-500 fill-current" : ""
          )}>
            <Heart className={cn("h-5 w-5", liked ? "fill-current" : "")} />
          </div>
          <span className="text-[10px] font-bold">{post.likes}</span>
        </button>

        {/* Comment */}
        <button onClick={() => onOpenComments(post.id)} className="flex flex-col items-center gap-1">
          <div className="p-2.5 rounded-full bg-zinc-800/60 hover:bg-zinc-800 transition-colors cursor-pointer">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold">{post.comments}</span>
        </button>

        {/* Repost */}
        <button onClick={handleRepost} className="flex flex-col items-center gap-1">
          <div className={cn(
            "p-2.5 rounded-full bg-zinc-800/60 hover:bg-zinc-800 transition-colors cursor-pointer",
            reposted ? "text-emerald-500" : ""
          )}>
            <Repeat2 className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold">{post.reposts}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="p-2.5 rounded-full bg-zinc-800/60 hover:bg-zinc-800 transition-colors cursor-pointer">
            <Share className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold">Share</span>
        </button>

      </div>

    </div>
  )
}
