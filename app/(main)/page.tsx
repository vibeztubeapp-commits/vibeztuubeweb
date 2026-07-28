"use client"

import { useEffect, useState } from "react"
import { FeedColumn } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { Composer } from "@/components/composer"
import { PostCard } from "@/components/post-card"
import { fetchPosts } from "@/lib/services"
import type { Post } from "@/lib/production-data"

const tabs = ["For you", "Following"]

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    void fetchPosts().then(setPosts)
  }, [])

  return (
    <div className="flex justify-center">
      <FeedColumn
        header={
          <div className="flex" role="tablist" aria-label="Feed">
            {tabs.map((t, i) => (
              <button
                key={t}
                role="tab"
                aria-selected={i === 0}
                className="group relative flex-1 py-3.5 text-[15px] font-semibold transition-colors hover:bg-accent/60"
              >
                <span className={i === 0 ? "text-foreground" : "text-muted-foreground"}>{t}</span>
                {i === 0 ? (
                  <span className="absolute inset-x-0 bottom-0 mx-auto h-1 w-14 rounded-full bg-primary" />
                ) : null}
              </button>
            ))}
          </div>
        }
      >
        <div className="hidden md:block">
          <Composer />
        </div>
        <div>
          {posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="px-4 py-12 text-center">
              <p className="text-lg font-semibold">No posts yet.</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Once Firebase is connected, your feed will populate with real posts from Firestore.
              </p>
            </div>
          )}
        </div>
      </FeedColumn>
      <RightRail />
    </div>
  )
}
