"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { searchUsers, followUser, getRealtimeTrends } from "@/lib/services"
import { Search, Compass, UserPlus, Sparkles, TrendingUp, Play } from "lucide-react"
import Link from "next/link"
import { PostCard } from "@/components/post-card"

export default function ExplorePage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [followedIds, setFollowedIds] = useState<string[]>([])
  const [suggestedCreators, setSuggestedCreators] = useState<any[]>([])
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [trendingVideos, setTrendingVideos] = useState<any[]>([])
  const [trendingPosts, setTrendingPosts] = useState<any[]>([])

  useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        const res = await fetch("/api/posts?limit=50")
        if (!res.ok) return
        const allPosts = await res.json()

        // 1. Resolve Trending Videos (has video media, sorted by views descending)
        const videoPosts = allPosts
          .filter((p: any) => p.media && p.media.some((m: any) => m.type === "video" || m.src?.match(/\.(mp4|webm|mov)/i)))
          .sort((a: any, b: any) => Number(b.views || 0) - Number(a.views || 0))
          .slice(0, 3)
        setTrendingVideos(videoPosts)

        // 2. Resolve Trending Posts (sorted by engagement score or views descending)
        const popularPosts = [...allPosts]
          .sort((a: any, b: any) => {
            const aScore = Number(a.likes || 0) * 10 + Number(a.reposts || 0) * 15 + Number(a.views || 0)
            const bScore = Number(b.likes || 0) * 10 + Number(b.reposts || 0) * 15 + Number(b.views || 0)
            return bScore - aScore
          })
          .slice(0, 5)
        setTrendingPosts(popularPosts)

        // 3. Resolve Real-time Trends (hashtags and words combined)
        const realtrends = await getRealtimeTrends()
        setTrendingTopics(realtrends)
      } catch (err) {
        console.error("Failed to fetch real-time trending data", err)
      }
    }

    void fetchTrendingData()
  }, [])

  useEffect(() => {
    // 1. Resolve coordinators profiles
    const fetchTargets = async () => {
      const uids = ["@sironyeka", "@kingsholz", "@queenpreciousd", "@vpartnership", "@vibeztube", "@debest_nft", "@dammi_esq", "@addiee69019"]
      const cleanHandles = uids.map((h) => h.replace("@", ""))
      const list = await Promise.all(
        cleanHandles.map(async (uname) => {
          try {
            const res = await fetch(`/api/users/${uname}?type=username`)
            if (res.ok) return await res.json()
          } catch {}
          return null
        })
      )
      setSuggestedCreators(list.filter(Boolean) as any[])
    }

    // 2. Fetch logged-in user's follows
    const fetchFollows = async () => {
      if (!user?.uid) return
      try {
        const res = await fetch(`/api/users/${user.uid}/follows`)
        if (res.ok) {
          const ids = await res.json()
          setFollowedIds(ids)
        }
      } catch (err) {
        console.error(err)
      }
    }
    
    void fetchTargets()
    void fetchFollows()
  }, [user?.uid])

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
            /* Real-time Explore Content Layout */
            <div className="space-y-6">
              {/* 1. What's Trending */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" /> What's Trending
                </h3>
                <div className="divide-y divide-border/60 bg-card rounded-2xl border border-border overflow-hidden">
                  {trendingTopics.map((t, idx) => (
                    <div key={idx} className="p-4 flex flex-col transition-colors hover:bg-accent/20 cursor-pointer">
                      <span className="text-[10px] text-muted-foreground">{t.category}</span>
                      <span className="text-sm font-bold text-foreground mt-0.5">{t.tag}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{t.posts}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Suggested Followers */}
              {suggestedCreators.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" /> Suggested Followers
                  </h3>
                  <div className="divide-y divide-border/60 bg-card rounded-2xl border border-border overflow-hidden">
                    {suggestedCreators.map((p) => {
                      const isFollowed = followedIds.includes(p.uid)
                      return (
                        <div key={p.uid} className="p-4 flex items-center justify-between gap-3 transition-colors hover:bg-accent/20">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar user={p} className="h-10 w-10 shrink-0" />
                            <div className="min-w-0 text-left">
                              <p className="font-bold text-sm text-foreground flex items-center gap-0.5">
                                <span>{p.displayName || p.username}</span>
                                <VerifiedBadge type={p.verifiedBadge} />
                              </p>
                              <p className="text-xs text-muted-foreground">@{p.username}</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => void handleFollow(p.uid)}
                            disabled={isFollowed}
                            variant="secondary"
                            size="xs"
                            className="rounded-full font-bold px-3 py-1 cursor-pointer shrink-0"
                          >
                            {isFollowed ? "Following" : "Follow"}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 3. Trending Video */}
              {trendingVideos.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Play className="h-4 w-4 text-primary fill-current" /> Trending Videos
                  </h3>
                  <div className="space-y-4">
                    {trendingVideos.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Trending Post */}
              {trendingPosts.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-primary" /> Trending Posts
                  </h3>
                  <div className="space-y-4">
                    {trendingPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </FeedColumn>
      <RightRail />
    </div>
  )
}
