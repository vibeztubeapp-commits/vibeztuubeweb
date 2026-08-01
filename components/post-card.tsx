"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BadgeCheck, Heart, MessageCircle, Repeat2, Eye, Share, Bookmark, MoreHorizontal, Play, Pause, X } from "lucide-react"
import { getUser, formatCount, formatTimeAgo, type Post } from "@/lib/production-data"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"
import { getUserProfile, toggleLikePost, toggleRepostPost, toggleBookmarkPost, incrementPostViews } from "@/lib/services"
import { useAuth } from "@/components/auth-provider"
// Cleaned Firestore imports
import { VerifiedBadge } from "@/components/verified-badge"
import { useEngagement } from "@/components/engagement-provider"
import { usePopup } from "@/components/popup-provider"

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

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        playsInline
        muted
        autoPlay
        loop
        className="w-full h-full object-cover"
      />
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

  const [reposterProfile, setReposterProfile] = useState<any>(null)
  const [originalPost, setOriginalPost] = useState<Post | null>(null)
  const [originalAuthor, setOriginalAuthor] = useState<any>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null)

  const { isLiked, isReposted, isBookmarked, toggleLikeLocal, toggleRepostLocal, toggleBookmarkLocal } = useEngagement()
  const displayPost = originalPost || post
  const liked = isLiked(displayPost.id)
  const reposted = isReposted(displayPost.id)
  const saved = isBookmarked(displayPost.id)
  const { user } = useAuth()
  const uid = user?.uid
  const { showNotice, showWarning, showError } = usePopup()

  // Optimistic UI state overrides
  const [optLiked, setOptLiked] = useState<boolean | null>(null)
  const [optLikesCount, setOptLikesCount] = useState<number | null>(null)
  const [optReposted, setOptReposted] = useState<boolean | null>(null)
  const [optRepostsCount, setOptRepostsCount] = useState<number | null>(null)
  const [optSaved, setOptSaved] = useState<boolean | null>(null)
  const [optBookmarksCount, setOptBookmarksCount] = useState<number | null>(null)



  const currentLiked = optLiked !== null ? optLiked : liked
  const currentLikesCount = optLikesCount !== null ? optLikesCount : Number(displayPost.likes || 0)
  const currentReposted = optReposted !== null ? optReposted : reposted
  const currentRepostsCount = optRepostsCount !== null ? optRepostsCount : Number(displayPost.reposts || 0)
  const currentSaved = optSaved !== null ? optSaved : saved
  const currentBookmarksCount = optBookmarksCount !== null ? optBookmarksCount : Number(displayPost.bookmarks || 0)

  const handleLike = async () => {
    if (!uid) {
      showNotice("Authentication Required", "Please sign in to like posts.")
      return
    }
    const nextState = !currentLiked
    setOptLiked(nextState)
    setOptLikesCount(currentLikesCount + (nextState ? 1 : -1))
    try {
      await toggleLikePost(displayPost.id, currentLiked)
      toggleLikeLocal(displayPost.id)
    } catch (err: any) {
      setOptLiked(null)
      setOptLikesCount(null)
      console.error("Like operation failed", {
        operation: "toggleLikePost",
        uid,
        contentId: displayPost.id,
        contentType: "post",
        path: `posts/${displayPost.id}`,
        errorCode: err.code || "unknown",
        errorMessage: err.message || String(err)
      })
      showError("Like Failed", "Couldn't update your Like. Please try again.")
    }
  }

  const handleRepost = async () => {
    if (!uid) {
      showNotice("Authentication Required", "Please sign in to repost content.")
      return
    }
    const nextState = !currentReposted
    setOptReposted(nextState)
    setOptRepostsCount(currentRepostsCount + (nextState ? 1 : -1))
    try {
      await toggleRepostPost(displayPost.id, currentReposted)
      toggleRepostLocal(displayPost.id)
    } catch (err: any) {
      setOptReposted(null)
      setOptRepostsCount(null)
      console.error("Repost operation failed", {
        operation: "toggleRepostPost",
        uid,
        contentId: displayPost.id,
        contentType: "post",
        path: `posts/${displayPost.id}`,
        errorCode: err.code || "unknown",
        errorMessage: err.message || String(err)
      })
      showError("Repost Failed", "Couldn't update your Repost. Please try again.")
    }
  }

  const handleBookmark = async () => {
    if (!uid) {
      showNotice("Authentication Required", "Please sign in to save bookmarks.")
      return
    }
    const nextState = !currentSaved
    setOptSaved(nextState)
    setOptBookmarksCount(currentBookmarksCount + (nextState ? 1 : -1))
    try {
      await toggleBookmarkPost(displayPost.id, currentSaved)
      toggleBookmarkLocal(displayPost.id)
    } catch (err: any) {
      setOptSaved(null)
      setOptBookmarksCount(null)
      console.error("Bookmark operation failed", {
        operation: "toggleBookmarkPost",
        uid,
        contentId: displayPost.id,
        contentType: "post",
        path: `posts/${displayPost.id}`,
        errorCode: err.code || "unknown",
        errorMessage: err.message || String(err)
      })
      showError("Bookmark Failed", "Couldn't update your Bookmark. Please try again.")
    }
  }

  useEffect(() => {
    if (!post.repostOf) return
    void getUserProfile(post.authorId).then((profile) => setReposterProfile(profile))
    
    const loadOriginal = (targetId: string) => {
      fetch(`/api/posts/${targetId}`)
        .then((res) => res.json())
        .then(async (data) => {
          if (data && !data.error) {
            if (data.repostOf) {
              loadOriginal(data.repostOf)
            } else {
              setOriginalPost(data)
              const profile = await getUserProfile(data.authorId)
              setOriginalAuthor(profile)
            }
          }
        })
        .catch((err) => console.error("Error loading original post:", err))
    }
    loadOriginal(post.repostOf)
    return () => {}
  }, [post.repostOf, post.authorId])

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
            {post.authorId === uid && (
              <div className="relative ml-auto">
                <button
                  type="button"
                  aria-label="More"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                  }}
                  className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showMenu && (
                  <div 
                    className="absolute right-0 mt-1 w-52 rounded-xl bg-card border border-border shadow-lg py-1.5 z-50 text-xs font-medium text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        showNotice("Boost Post", "This post has been boosted successfully to wider audiences!")
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      Boost post
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        showNotice("Pin Post", "This post has been pinned to your profile timeline header.")
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      Pin to profile
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        showNotice("Content Disclosure", "This post is transparently disclosed as standard user-generated content.")
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      Content disclosure
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        showNotice("Reply Permissions", "Permissions updated successfully: only people you follow can reply.")
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      Change who can reply
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        router.push(`/status/${displayPost.id}`)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent/60 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      View hidden replies
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        showWarning("Delete Post", "Are you sure you want to delete this post? This action is permanent and cannot be undone.", async () => {
                          await fetch(`/api/posts/${post.id}`, { method: "DELETE" })
                        })
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-2 cursor-pointer border-t border-border mt-1"
                    >
                      Delete post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-relaxed text-pretty">{displayPost.text}</p>

          {displayPost.media?.length ? (() => {
            const count = displayPost.media.length
            let gridClass = "grid gap-1.5"
            if (count === 1) gridClass = "grid grid-cols-1"
            else if (count === 2) gridClass = "grid grid-cols-2 aspect-[16/10]"
            else if (count === 3) gridClass = "grid grid-cols-2 grid-rows-2 aspect-[16/10]"
            else gridClass = "grid grid-cols-2 grid-rows-2 aspect-[16/10]"

            return (
              <div className={`mt-3 overflow-hidden rounded-2xl border border-border ${gridClass}`}>
                {displayPost.media.map((m, i) => {
                  const isVideo = m.type === "video" || m.src?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)
                  
                  let cellClass = "relative bg-muted w-full h-full flex items-center justify-center overflow-hidden"
                  if (count === 3 && i === 0) {
                    cellClass += " row-span-2"
                  }

                  return (
                    <div key={i} className={cellClass}>
                      {m.src ? (
                        isVideo ? (
                          <CustomVideoPlayer src={m.src} />
                        ) : (
                          <img
                            src={m.src}
                            alt=""
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveLightboxImage(m.src)
                            }}
                          />
                        )
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )
          })() : null}

          <div className="mt-3 flex items-center justify-between pr-1" onClick={(e) => e.stopPropagation()}>
            <Action icon={MessageCircle} count={displayPost.comments} label="Reply" onClick={() => router.push(`/status/${displayPost.id}`)} />
            <Action
              icon={Repeat2}
              count={currentRepostsCount}
              label="Repost"
              active={currentReposted}
              activeClass="text-emerald-500 animate-pulse"
              onClick={() => void handleRepost()}
            />
            <Action
              icon={Heart}
              count={currentLikesCount}
              label="Like"
              active={currentLiked}
              activeClass="text-red-500 animate-pulse"
              onClick={() => void handleLike()}
            />
            <Action icon={Eye} count={displayPost.views} label="Views" />
            <div className="flex items-center">
              <Action icon={Bookmark} count={currentBookmarksCount} label="Save" active={currentSaved} activeClass="text-purple-500 animate-pulse" onClick={() => void handleBookmark()} />
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

      {activeLightboxImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-neutral-300 p-2 bg-neutral-900/60 rounded-full cursor-pointer transition-colors"
            onClick={() => setActiveLightboxImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img 
            src={activeLightboxImage} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
