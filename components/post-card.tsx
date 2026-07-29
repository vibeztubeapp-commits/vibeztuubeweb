"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BadgeCheck, Heart, MessageCircle, Repeat2, Eye, Share, Bookmark, MoreHorizontal, Play, Pause } from "lucide-react"
import { getUser, formatCount, formatTimeAgo, type Post } from "@/lib/production-data"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import { getUserProfile, db, toggleLikePost, toggleRepostPost, toggleBookmarkPost, incrementPostViews } from "@/lib/services"
import { useAuth } from "@/components/auth-provider"
import { doc, onSnapshot } from "firebase/firestore"
import { VerifiedBadge } from "@/components/verified-badge"

function Action({
  icon: Icon,
  count,
  label,
  active,
  activeClass,
  onClick,
}: {
  icon: typeof Heart
  count?: number | string
  label: string
  active?: boolean
  activeClass?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
        active && activeClass,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-accent">
        <Icon className={cn("h-[18px] w-[18px]", active && "fill-current")} />
      </span>
      {count !== undefined ? <span className="tabular-nums">{typeof count === "number" ? formatCount(count) : count}</span> : null}
    </button>
  )
}

function CustomVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showCenterBtn, setShowCenterBtn] = useState(true)

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
      setShowCenterBtn(true)
    } else {
      videoRef.current.play().catch((err) => console.log(err))
      setIsPlaying(true)
      setShowCenterBtn(false)
    }
  }

  return (
    <div className="relative w-full h-auto max-h-[600px] bg-black flex items-center justify-center group overflow-hidden cursor-pointer" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        playsInline
        loop
        className="w-full h-auto max-h-[600px] object-contain"
        onPlay={() => {
          setIsPlaying(true)
          setShowCenterBtn(false)
        }}
        onPause={() => {
          setIsPlaying(false)
          setShowCenterBtn(true)
        }}
      />
      
      {/* Center Play/Pause Button overlay */}
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 pointer-events-none",
          showCenterBtn || !isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <div className="h-14 w-14 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm shadow-lg border border-white/20 transform scale-100 active:scale-95 transition-all">
          {isPlaying ? (
            <Pause className="h-6 w-6 fill-current" />
          ) : (
            <Play className="h-6 w-6 fill-current translate-x-0.5" />
          )}
        </div>
      </div>
    </div>
  )
}

export function PostCard({ post, priority }: { post: Post; priority?: boolean }) {
  const [author, setAuthor] = useState<any>(null)

  useEffect(() => {
    let active = true
    void getUserProfile(post.authorId).then((profile) => {
      if (active) {
        if (profile) {
          setAuthor(profile)
        } else {
          setAuthor(getUser(post.authorId))
        }
      }
    })
    return () => {
      active = false
    }
  }, [post.authorId])

  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [saved, setSaved] = useState(false)
  const { user } = useAuth()
  const uid = user?.uid

  useEffect(() => {
    if (!uid) return
    const likeRef = doc(db, "posts", post.id, "likes", uid)
    return onSnapshot(likeRef, (snap) => {
      setLiked(snap.exists())
    })
  }, [post.id, uid])

  useEffect(() => {
    if (!uid) return
    const repostRef = doc(db, "posts", post.id, "reposts", uid)
    return onSnapshot(repostRef, (snap) => {
      setReposted(snap.exists())
    })
  }, [post.id, uid])

  useEffect(() => {
    if (!uid) return
    const bookmarkRef = doc(db, "bookmarks", `${uid}_${post.id}`)
    return onSnapshot(bookmarkRef, (snap) => {
      setSaved(snap.exists())
    })
  }, [post.id, uid])

  const [reposterProfile, setReposterProfile] = useState<any>(null)
  const [originalPost, setOriginalPost] = useState<Post | null>(null)
  const [originalAuthor, setOriginalAuthor] = useState<any>(null)

  useEffect(() => {
    if (!post.repostOf) return
    void getUserProfile(post.authorId).then((profile) => setReposterProfile(profile))
    
    const origRef = doc(db, "posts", post.repostOf)
    return onSnapshot(origRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        const p = {
          id: snap.id,
          authorId: data.authorId || "guest",
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
        }
        setOriginalPost(p)
        const profile = await getUserProfile(p.authorId)
        setOriginalAuthor(profile)
      }
    })
  }, [post.repostOf, post.authorId])

  const displayPost = originalPost || post
  const displayAuthor = originalPost ? (originalAuthor || getUser(originalPost.authorId)) : (author || getUser(post.authorId))

  const router = useRouter()

  useEffect(() => {
    if (displayPost?.id) {
      void incrementPostViews(displayPost.id)
    }
  }, [displayPost?.id])

  const handleCardClick = (e: React.MouseEvent) => {
    router.push(`/status/${displayPost.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className="border-b border-border transition-colors hover:bg-accent/40 cursor-pointer"
    >
      {/* Repost status banner header */}
      {post.repostOf && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground px-4 pt-2.5 pb-0.5">
          <Repeat2 className="h-3 w-3 text-emerald-500" />
          <span>{post.authorId === uid ? "You" : (reposterProfile?.displayName || reposterProfile?.name || "Someone")} reposted</span>
        </div>
      )}

      <article className="flex gap-3 px-4 py-3">
        <UserAvatar user={displayAuthor} className="h-11 w-11 shrink-0" />
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <div
              onClick={(e) => {
                e.stopPropagation()
                const targetUid = displayAuthor.uid || displayAuthor.id || post.authorId
                if (targetUid) {
                  router.push(`/profile?uid=${targetUid}`)
                }
              }}
              className="flex items-center gap-1 cursor-pointer hover:underline"
            >
              <span className="font-bold flex items-center">
                <span>{displayAuthor.displayName || displayAuthor.name}</span>
                <VerifiedBadge type={displayAuthor.verifiedBadge} />
              </span>
              <span className="truncate text-muted-foreground">@{displayAuthor.username}</span>
            </div>
            <span className="text-muted-foreground">· {formatTimeAgo(displayPost.createdAt)}</span>
            <button
              type="button"
              aria-label="More"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-relaxed text-pretty">{displayPost.text}</p>

          {displayPost.media?.length ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-border" onClick={(e) => e.stopPropagation()}>
              {displayPost.media.map((m, i) => {
                const isVideo = m.type === "video" || m.src?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)
                return (
                  <div key={i} className="relative bg-muted w-full flex items-center justify-center">
                    {m.src ? (
                      isVideo ? (
                        <CustomVideoPlayer src={m.src} />
                      ) : (
                        <img
                          src={m.src}
                          alt=""
                          className="w-full h-auto max-h-[600px] object-contain"
                        />
                      )
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between pr-1" onClick={(e) => e.stopPropagation()}>
            <Action icon={MessageCircle} count={displayPost.comments} label="Reply" onClick={() => router.push(`/status/${displayPost.id}`)} />
            <Action
              icon={Repeat2}
              count={displayPost.reposts}
              label="Repost"
              active={reposted}
              activeClass="text-emerald-500 animate-pulse"
              onClick={() => void toggleRepostPost(displayPost.id, reposted)}
            />
            <Action
              icon={Heart}
              count={displayPost.likes}
              label="Like"
              active={liked}
              activeClass="text-primary animate-pulse"
              onClick={() => void toggleLikePost(displayPost.id, liked)}
            />
            <Action icon={Eye} count={displayPost.views} label="Views" />
            <div className="flex items-center">
              <Action icon={Bookmark} count={displayPost.bookmarks} label="Save" active={saved} activeClass="text-primary animate-pulse" onClick={() => void toggleBookmarkPost(displayPost.id, saved)} />
              <Action
                icon={Share}
                label="Share"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(`${window.location.origin}/status/${displayPost.id}`)
                    alert("Post link copied to clipboard!")
                  }
                }}
              />
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
