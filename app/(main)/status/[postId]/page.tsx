"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { AuthGuard } from "@/components/auth-guard"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { UserAvatar } from "@/components/user-avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db, getUserProfile, createComment, toggleLikeComment, toggleRepostComment, toggleLikePost, toggleRepostPost, incrementPostViews, toggleBookmarkPost, toggleBookmarkComment, incrementCommentViews } from "@/lib/services"
import { doc, onSnapshot, collection, query, orderBy, serverTimestamp, addDoc, updateDoc } from "firebase/firestore"
import { ArrowLeft, MessageCircle, Repeat2, Heart, Share, Bookmark, Send, Loader2, ArrowUp, CornerDownRight, Eye, MapPin, Smile, Image as ImageIcon, Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

function CommentCardItem({
  comment,
  postId,
  replyingToUser,
  user,
  formatTimestamp,
  handlePostReply,
  renderCommentTree,
  depth,
}: {
  comment: any
  postId: string
  replyingToUser: any
  user: any
  formatTimestamp: (timestamp: any) => string
  handlePostReply: (parentCommentId: string | null, textValue: string, isInline: boolean) => Promise<void>
  renderCommentTree: (parentId: string | null, depth: number) => React.ReactNode
  depth: number
}) {
  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showReplyComposer, setShowReplyComposer] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [loading, setLoading] = useState(false)
  const [myProfile, setMyProfile] = useState<any>(null)
  const router = useRouter()
  const uid = user?.uid

  useEffect(() => {
    if (!uid) return
    const myProfileRef = doc(db, "profiles", uid)
    return onSnapshot(myProfileRef, (snap) => {
      if (snap.exists()) {
        setMyProfile({ uid: snap.id, ...snap.data() })
      }
    })
  }, [uid])

  useEffect(() => {
    if (!uid) return
    const likeRef = doc(db, "posts", postId, "comments", comment.id, "likes", uid)
    return onSnapshot(likeRef, (snap) => setLiked(snap.exists()))
  }, [postId, comment.id, uid])

  useEffect(() => {
    if (!uid) return
    const repostRef = doc(db, "posts", postId, "comments", comment.id, "reposts", uid)
    return onSnapshot(repostRef, (snap) => setReposted(snap.exists()))
  }, [postId, comment.id, uid])

  useEffect(() => {
    if (!uid) return
    const bookmarkRef = doc(db, "bookmarks", `${uid}_${comment.id}`)
    return onSnapshot(bookmarkRef, (snap) => setSaved(snap.exists()))
  }, [comment.id, uid])

  useEffect(() => {
    if (postId && comment.id) {
      void incrementCommentViews(postId, comment.id)
    }
  }, [postId, comment.id])

  const onLike = async () => {
    try {
      await toggleLikeComment(postId, comment.id, liked)
    } catch (err) {
      console.error(err)
    }
  }

  const onRepost = async () => {
    try {
      await toggleRepostComment(postId, comment.id, reposted)
    } catch (err) {
      console.error(err)
    }
  }

  const onBookmark = async () => {
    try {
      await toggleBookmarkComment(postId, comment.id, saved)
    } catch (err) {
      console.error(err)
    }
  }

  const submitReply = async () => {
    if (!replyText.trim()) return
    setLoading(true)
    try {
      await handlePostReply(comment.id, replyText, true)
      setReplyText("")
      setShowReplyComposer(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group/card">
      <div className="hover:bg-accent/25 border-b border-border/50 py-3 px-1 space-y-2 transition-colors">
        <div className="flex gap-2.5 items-start">
          <UserAvatar user={comment.authorProfile} className="h-8 w-8 shrink-0" />
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[11px]">
            <div
              onClick={(e) => {
                e.stopPropagation()
                const targetUid = comment.authorId
                if (targetUid) {
                  router.push(`/profile?uid=${targetUid}`)
                }
              }}
              className="flex items-center gap-1 cursor-pointer hover:underline text-[11px]"
            >
              <span className="font-bold text-foreground flex items-center gap-0.5">
                <span>{comment.authorProfile?.displayName || "Creator"}</span>
                <VerifiedBadge type={comment.authorProfile?.verifiedBadge} />
              </span>
              <span className="text-muted-foreground truncate">@{comment.authorProfile?.username || "username"}</span>
            </div>
            <span className="text-[10px] text-muted-foreground ml-auto">{formatTimestamp(comment.createdAt)}</span>
            </div>

            {replyingToUser && (
              <p className="text-[10px] text-primary font-medium mt-0.5">
                Replying to <span className="hover:underline">@{replyingToUser.username}</span>
              </p>
            )}

            <p className="text-xs text-foreground/90 mt-1 leading-relaxed whitespace-pre-wrap">
              {comment.text}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/40 pt-1.5 px-1 mt-1 text-muted-foreground">
          <button
            onClick={() => setShowReplyComposer(!showReplyComposer)}
            className="flex items-center gap-1 text-[10px] hover:text-primary transition-colors cursor-pointer"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{comment.comments || 0}</span>
          </button>

          <button
            onClick={onRepost}
            className={cn(
              "flex items-center gap-1 text-[10px] hover:text-emerald-500 transition-colors cursor-pointer",
              reposted && "text-emerald-500"
            )}
          >
            <Repeat2 className="h-3.5 w-3.5" />
            <span>{comment.reposts || 0}</span>
          </button>

          <button
            onClick={onLike}
            className={cn(
              "flex items-center gap-1 text-[10px] hover:text-red-500 transition-colors cursor-pointer",
              liked && "text-red-500"
            )}
          >
            <Heart className="h-3.5 w-3.5" />
            <span>{comment.likes || 0}</span>
          </button>

          <button
            onClick={onBookmark}
            className={cn(
              "flex items-center gap-1 text-[10px] hover:text-primary transition-colors cursor-pointer",
              saved && "text-primary"
            )}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>{comment.bookmarks || 0}</span>
          </button>

          <button
            className="flex items-center gap-1 text-[10px] hover:text-primary transition-colors cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{comment.views || 0}</span>
          </button>

          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard.writeText(`${window.location.origin}/status/${postId}`)
                alert("Thread link copied!")
              }
            }}
            className="flex items-center text-[10px] hover:text-foreground transition-colors cursor-pointer"
          >
            <Share className="h-3.5 w-3.5" />
          </button>
        </div>

        {showReplyComposer && (
          <div className="mt-2 pt-2 border-t border-border/40 flex gap-2 items-center">
            <UserAvatar user={myProfile || user} className="h-7 w-7 shrink-0" />
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to @${comment.authorProfile?.username}...`}
              className="text-xs rounded-full border-border bg-card/60"
              onKeyDown={(e) => e.key === "Enter" && void submitReply()}
            />
            <Button
              onClick={() => void submitReply()}
              disabled={loading || !replyText.trim()}
              size="xs"
              className="rounded-full shrink-0 font-bold px-3"
            >
              {loading ? "..." : "Reply"}
            </Button>
          </div>
        )}
      </div>

      {renderCommentTree(comment.id, depth + 1)}
    </div>
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
    <div className="relative w-full h-auto max-h-[600px] bg-black flex items-center justify-center group overflow-hidden cursor-pointer rounded-xl" onClick={togglePlay}>
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

export default function StatusPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const postId = params?.postId as string

  const [post, setPost] = useState<any>(null)
  const [postAuthor, setPostAuthor] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  
  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const [parentReplyText, setParentReplyText] = useState("")
  const [postingReply, setPostingReply] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    const profileRef = doc(db, "profiles", user.uid)
    return onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        setCurrentUserProfile({ uid: snap.id, ...snap.data() })
      }
    })
  }, [user])

  useEffect(() => {
    if (!user?.uid || !postId) return
    const likeRef = doc(db, "posts", postId, "likes", user.uid)
    return onSnapshot(likeRef, (snap) => {
      setLiked(snap.exists())
    })
  }, [postId, user?.uid])

  useEffect(() => {
    if (!user?.uid || !postId) return
    const repostRef = doc(db, "posts", postId, "reposts", user.uid)
    return onSnapshot(repostRef, (snap) => {
      setReposted(snap.exists())
    })
  }, [postId, user?.uid])

  useEffect(() => {
    if (!user?.uid || !postId) return
    const bookmarkRef = doc(db, "bookmarks", `${user.uid}_${postId}`)
    return onSnapshot(bookmarkRef, (snap) => {
      setSaved(snap.exists())
    })
  }, [postId, user?.uid])

  // Real-time parent post listener and view increment
  useEffect(() => {
    if (!postId) return
    void incrementPostViews(postId)

    const postRef = doc(db, "posts", postId)
    const unsub = onSnapshot(postRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setPost({ id: snap.id, ...data })
        if (data.authorId) {
          const profile = await getUserProfile(data.authorId)
          setPostAuthor(profile)
        }
      } else {
        setPost(null)
      }
      setLoading(false)
    })
    return unsub
  }, [postId])

  // Real-time comments list listener
  useEffect(() => {
    if (!postId) return
    const commentsRef = collection(db, "posts", postId, "comments")
    const q = query(commentsRef, orderBy("createdAt", "asc"))
    
    const unsub = onSnapshot(q, async (snap) => {
      const items: any[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const authorProfile = await getUserProfile(data.authorId)
        items.push({
          id: d.id,
          ...data,
          likes: Number(data.likes || 0),
          comments: Number(data.comments || 0),
          reposts: Number(data.reposts || 0),
          bookmarks: Number(data.bookmarks || 0),
          views: Number(data.views || 0),
          shares: Number(data.shares || 0),
          authorProfile,
        })
      }
      setComments(items)
    })
    return unsub
  }, [postId])

  const handlePostReply = async (parentCommentId: string | null = null, textValue: string, isInline = false) => {
    if (!user || !textValue.trim()) return
    setPostingReply(true)
    try {
      await createComment(postId, {
        authorId: user.uid,
        text: textValue.trim(),
        parentCommentId,
      })
      if (!isInline) {
        setParentReplyText("")
      }
    } catch (err) {
      console.error(err)
      alert("Failed to send comment.")
    } finally {
      setPostingReply(false)
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "just now"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Recursive Tree Rendering
  const renderCommentTree = (parentId: string | null = null, depth = 0): React.ReactNode => {
    const layer = comments.filter((c) => c.parentCommentId === parentId)
    if (layer.length === 0) return null

    return (
      <div className={cn("space-y-2", depth > 0 && "pl-4 border-l border-border/80 ml-3.5 mt-2")}>
        {layer.map((comment) => {
          const parentComment = comments.find((c) => c.id === comment.parentCommentId)
          const replyingToUser = parentComment ? parentComment.authorProfile : postAuthor

          return (
            <CommentCardItem
              key={comment.id}
              comment={comment}
              postId={postId}
              replyingToUser={replyingToUser}
              user={user}
              formatTimestamp={formatTimestamp}
              handlePostReply={handlePostReply}
              renderCommentTree={renderCommentTree}
              depth={depth}
            />
          )
        })}
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="flex justify-center">
        <FeedColumn
          header={
            <div className="flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 p-4">
              <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <PageHeaderTitle title="Post Details" />
            </div>
          }
        >
          <div className="p-4 space-y-4">
            
            {loading ? (
              <div className="py-20 text-center text-xs text-muted-foreground">Loading conversation...</div>
            ) : post ? (
              <div className="space-y-6">
                
                {/* Parent Post Card details */}
                <div className="p-2 space-y-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={postAuthor} className="h-11 w-11" />
                    <div>
                      <p className="font-bold text-sm text-foreground flex items-center gap-0.5">
                        <span>{postAuthor?.displayName || "User"}</span>
                        <VerifiedBadge type={postAuthor?.verifiedBadge} />
                      </p>
                      <p className="text-xs text-muted-foreground">@{postAuthor?.username || "username"}</p>
                    </div>
                  </div>

                  <p className="text-base text-foreground whitespace-pre-wrap font-medium">{post.text}</p>

                  {post.media?.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-border">
                      {post.media.map((m: any, idx: number) => {
                        const isVideo = m.type === "video" || m.src?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)
                        return (
                          <div key={idx} className="relative bg-muted w-full flex items-center justify-center">
                            {m.src && (
                              isVideo ? (
                                <CustomVideoPlayer src={m.src} />
                              ) : (
                                <img src={m.src} alt="" className="w-full h-auto max-h-[600px] object-contain" />
                              )
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Timestamp and Views count row */}
                  <div className="text-xs text-muted-foreground pt-1 pb-3">
                    <span>{formatTimestamp(post.createdAt)}</span>
                    <span> · </span>
                    <span className="font-bold text-foreground">{post.views || 0}</span> Views
                  </div>

                  {/* Border-y Action Buttons bar */}
                  <div className="border-t border-b border-border/80 py-3.5 flex justify-around text-muted-foreground">
                    <button className="flex items-center gap-2 hover:text-primary transition-colors">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-xs font-bold">{post.comments || 0}</span>
                    </button>
                    <button onClick={() => void toggleRepostPost(post.id, reposted)} className={cn("flex items-center gap-2 hover:text-emerald-500 transition-colors", reposted && "text-emerald-500")}>
                      <Repeat2 className={cn("h-5 w-5", reposted && "fill-current")} />
                      <span className="text-xs font-bold">{post.reposts || 0}</span>
                    </button>
                    <button onClick={() => void toggleLikePost(post.id, liked)} className={cn("flex items-center gap-2 hover:text-red-500 transition-colors", liked && "text-red-500")}>
                      <Heart className={cn("h-5 w-5", liked && "fill-current")} />
                      <span className="text-xs font-bold">{post.likes || 0}</span>
                    </button>
                    <button onClick={() => void toggleBookmarkPost(post.id, saved)} className={cn("flex items-center gap-2 hover:text-primary transition-colors", saved && "text-primary")}>
                      <Bookmark className={cn("h-5 w-5", saved && "fill-current")} />
                      <span className="text-xs font-bold">{post.bookmarks || 0}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(`${window.location.origin}/status/${post.id}`)
                          alert("Link copied!")
                        }
                      }}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      <Share className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Direct Post Reply Composer */}
                <div className="flex gap-3 py-4 px-1 items-start border-b border-border">
                  <UserAvatar user={currentUserProfile || user} className="h-10 w-10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Replying to <span className="text-primary font-medium">@{postAuthor?.username || "username"}</span>
                    </div>
                    <textarea
                      value={parentReplyText}
                      onChange={(e) => setParentReplyText(e.target.value)}
                      placeholder="Post your reply..."
                      className="w-full bg-transparent text-sm resize-none outline-none border-0 p-0 focus:ring-0 placeholder:text-muted-foreground min-h-[50px]"
                    />
                    <div className="flex items-center justify-between pt-3 border-t border-border/40">
                      {/* Media bar icons */}
                      <div className="flex items-center gap-4 text-primary">
                        <ImageIcon className="h-4.5 w-4.5 cursor-pointer hover:opacity-85" />
                        <span className="border border-primary text-[9px] font-extrabold px-1 py-0.5 rounded cursor-pointer hover:opacity-85 leading-none">GIF</span>
                        <Smile className="h-4.5 w-4.5 cursor-pointer hover:opacity-85" />
                        <MapPin className="h-4.5 w-4.5 cursor-pointer hover:opacity-85" />
                      </div>
                      
                      <Button
                        onClick={() => void handlePostReply(null, parentReplyText, false)}
                        disabled={postingReply || !parentReplyText.trim()}
                        size="sm"
                        className="rounded-full font-bold px-5 h-8 text-xs cursor-pointer bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95"
                      >
                        {postingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reply"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* X-Style Nested Reply Conversation Tree */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
                    <CornerDownRight className="h-4 w-4 text-primary" /> Conversation Thread
                  </h3>
                  
                  <div className="space-y-4">
                    {comments.filter(c => c.parentCommentId === null).length > 0 ? (
                      renderCommentTree(null)
                    ) : (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No replies yet. Start the conversation!
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-20 text-center text-xs text-muted-foreground">
                This post is no longer available.
              </div>
            )}

          </div>
        </FeedColumn>
        <RightRail />
      </div>
    </AuthGuard>
  )
}
