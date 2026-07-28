"use client"

import { useState } from "react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { searchUsers, followUser } from "@/lib/services"
import { Search, Compass, UserPlus, Sparkles, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [followedIds, setFollowedIds] = useState<string[]>([])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const results = await searchUsers(searchQuery)
      setSearchResults(results)
    } catch (err) {
      console.error("Explore search failed", err)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (uid: string) => {
    try {
      await followUser(uid)
      setFollowedIds((prev) => [...prev, uid])
    } catch (err) {
      console.error(err)
    }
  }

  const trends = [
    { tag: "#VibezTubeLaunch", posts: "1.2M posts", category: "Trending" },
    { tag: "#LiveKitConnect", posts: "854K posts", category: "Technology" },
    { tag: "#CreativePartner", posts: "620K posts", category: "Business" },
    { tag: "#VerifiedClub", posts: "482K posts", category: "Entertainment" },
  ]

  return (
    <div className="flex justify-center">
      <FeedColumn
        header={
          <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 p-4 space-y-3">
            <PageHeaderTitle title="Explore" />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search creators by name or @handle..."
                  className="pl-9 text-xs rounded-full border-border bg-card"
                  onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
                />
              </div>
              <Button onClick={() => void handleSearch()} size="sm" className="rounded-full px-4 font-bold shrink-0">
                Search
              </Button>
            </div>
          </div>
        }
      >
        <div className="p-4 space-y-6 min-h-[500px]">
          
          {loading ? (
            <div className="py-20 text-center text-xs text-muted-foreground">Searching database...</div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Search Results
              </h3>
              
              <div className="divide-y divide-border/60 bg-card rounded-2xl border border-border overflow-hidden">
                {searchResults.map((user) => (
                  <div key={user.id} className="p-4 flex items-center justify-between gap-3 transition-colors hover:bg-accent/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={user} className="h-10 w-10 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground flex items-center gap-0.5">
                          <span>{user.displayName || user.name}</span>
                          <VerifiedBadge type={user.verifiedBadge} />
                        </p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                        {user.bio && <p className="text-xs text-muted-foreground mt-1 truncate max-w-sm">{user.bio}</p>}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => void handleFollow(user.id)}
                        disabled={followedIds.includes(user.id)}
                        variant="secondary"
                        size="xs"
                        className="rounded-full font-bold px-3 py-1 cursor-pointer"
                      >
                        {followedIds.includes(user.id) ? "Following" : "Follow"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : searchQuery.trim() ? (
            <div className="py-20 text-center space-y-2">
              <Compass className="h-10 w-10 text-muted-foreground/30 mx-auto animate-pulse" />
              <p className="text-xs text-muted-foreground font-medium">No creators found</p>
              <p className="text-[10px] text-muted-foreground px-6">
                Try searching with another displayName or a username handle without special characters.
              </p>
            </div>
          ) : (
            /* Trending Topics Feed fallback */
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> What's Trending
              </h3>
              
              <div className="divide-y divide-border/60 bg-card rounded-2xl border border-border overflow-hidden">
                {trends.map((t, idx) => (
                  <div key={idx} className="p-4 flex flex-col transition-colors hover:bg-accent/20 cursor-pointer">
                    <span className="text-[10px] text-muted-foreground">{t.category}</span>
                    <span className="text-sm font-bold text-foreground mt-0.5">{t.tag}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{t.posts}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </FeedColumn>
      <RightRail />
    </div>
  )
}
