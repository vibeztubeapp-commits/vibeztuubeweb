"use client"

import { useState } from "react"
import Image from "next/image"
import { BadgeCheck, Heart, MessageCircle, Repeat2, BarChart3, Share, Bookmark, MoreHorizontal } from "lucide-react"
import { getUser, formatCount, type Post } from "@/lib/production-data"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"

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

export function PostCard({ post, priority }: { post: Post; priority?: boolean }) {
  const author = getUser(post.authorId)
  const [liked, setLiked] = useState(!!post.liked)
  const [saved, setSaved] = useState(false)
  const likeCount = post.likes + (liked && !post.liked ? 1 : 0) - (!liked && post.liked ? 1 : 0)

  return (
    <article className="flex gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-accent/40">
      <UserAvatar user={author} className="h-11 w-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-sm">
          <span className="font-bold">{author.name}</span>
          {author.verified ? <BadgeCheck className="h-4 w-4 fill-primary text-background" /> : null}
          <span className="truncate text-muted-foreground">@{author.username}</span>
          <span className="text-muted-foreground">· {post.timeAgo}</span>
          <button type="button" aria-label="More" className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-relaxed text-pretty">{post.text}</p>

        {post.media?.length ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border">
            {post.media.map((m, i) => (
              <div key={i} className="relative aspect-video bg-muted">
                {m.src ? (
                  <Image
                    src={m.src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                    priority={priority && i === 0}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between pr-1">
          <Action icon={MessageCircle} count={post.comments} label="Reply" />
          <Action icon={Repeat2} count={post.reposts} label="Repost" activeClass="text-emerald-500" />
          <Action
            icon={Heart}
            count={likeCount}
            label="Like"
            active={liked}
            activeClass="text-primary"
            onClick={() => setLiked((v) => !v)}
          />
          <Action icon={BarChart3} count={post.views} label="Views" />
          <div className="flex items-center">
            <Action icon={Bookmark} label="Save" active={saved} activeClass="text-primary" onClick={() => setSaved((v) => !v)} />
            <Action icon={Share} label="Share" />
          </div>
        </div>
      </div>
    </article>
  )
}
