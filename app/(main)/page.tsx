"use client"

import { useEffect, useState } from "react"
import { FeedColumn } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { Composer } from "@/components/composer"
import { PostCard } from "@/components/post-card"
import { subscribePosts, subscribeFollowingPosts, db, followUser } from "@/lib/services"
import { useAuth } from "@/components/auth-provider"
import type { Post } from "@/lib/production-data"
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { UserPlus, Sparkles } from "lucide-react"

const tabs = ["For you", "Following"]

export default function HomePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("For you")
  const [posts, setPosts] = useState<Post[]>([])

  // State for strict follow gate system
  const [targetProfiles, setTargetProfiles] = useState<any[]>([])
  const [followedUids, setFollowedUids] = useState<string[]>([])

  useEffect(() => {
    if (activeTab === "Following") {
      if (!user?.uid) {
        setPosts([])
        return
      }
      return subscribeFollowingPosts(user.uid, setPosts)
    } else {
      return subscribePosts(setPosts)
    }
  }, [activeTab, user?.uid])

  // Setup real-time follow monitoring and resolve target profiles
  useEffect(() => {
    if (!user?.uid) return

    const followsQuery = query(
      collection(db, "follows"),
      where("followerUid", "==", user.uid)
    )
    const unsubFollows = onSnapshot(followsQuery, (snap) => {
      const ids = snap.docs.map((d) => d.data().followedUid)
      setFollowedUids(ids)
    })

    const targetUsernames = [
      "sironyeka",
      "kingsholz",
      "queenpreciousd",
      "vpartnership",
      "vibeztube",
      "debest_nft",
      "dammi_esq",
      "addiee69019",
    ]

    const fetchTargets = async () => {
      try {
        const q = query(
          collection(db, "profiles"),
          where("username", "in", targetUsernames)
        )
        const snap = await getDocs(q)
        const profiles = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
        setTargetProfiles(profiles)
      } catch (err) {
        console.error("Failed to fetch target follow profiles", err)
      }
    }

    void fetchTargets()
    return () => unsubFollows()
  }, [user?.uid])

  const unfollowed = targetProfiles.filter((p) => !followedUids.includes(p.uid))
  const showGate = user?.uid && targetProfiles.length > 0 && unfollowed.length > 0

  const handleFollowAll = async () => {
    for (const p of unfollowed) {
      await followUser(p.uid)
    }
  }

  return (
    <div className="flex justify-center relative">
      <FeedColumn
        header={
          <div className="flex" role="tablist" aria-label="Feed">
            {tabs.map((t) => {
              const isActive = activeTab === t
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(t)}
                  className="group relative flex-1 py-3.5 text-[15px] font-semibold transition-colors hover:bg-accent/60 cursor-pointer"
                >
                  <span className={isActive ? "text-foreground" : "text-muted-foreground"}>{t}</span>
                  {isActive ? (
                    <span className="absolute inset-x-0 bottom-0 mx-auto h-1 w-14 rounded-full bg-primary" />
                  ) : null}
                </button>
              )
            })}
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
                {activeTab === "Following" 
                  ? "Follow users or write a post to see what's happening."
                  : "Write a post to see what's happening."
                }
              </p>
            </div>
          )}
        </div>
      </FeedColumn>
      <RightRail />

      {/* Strict "Who to Follow" Gate Overlay */}
      {showGate && (
        <>
          {/* Desktop Overlay Modal */}
          <div className="fixed inset-0 z-50 hidden md:flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-5 text-foreground animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-purple-500/10 text-purple-400 animate-pulse">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-black tracking-tight">Who to Follow</h2>
                <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                  Welcome to VibezTube! To get started and customize your Home Feed experience, please follow the main platform coordinators:
                </p>
              </div>

              {/* Scrollable List */}
              <div className="max-h-[300px] overflow-y-auto space-y-3.5 pr-1 divide-y divide-zinc-900">
                {unfollowed.map((p, index) => (
                  <div key={p.uid} className={`flex items-center justify-between gap-3 ${index > 0 ? "pt-3.5" : ""}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center text-xs border border-zinc-800 shrink-0 font-bold uppercase text-purple-400">
                        {p.displayName?.slice(0, 2) || p.username?.slice(0, 2) || "VT"}
                      </div>
                      <div className="min-w-0 text-left">
                        <h4 className="text-xs font-bold truncate leading-tight">{p.displayName || p.username}</h4>
                        <p className="text-[10px] text-muted-foreground truncate">@{p.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => followUser(p.uid)}
                      className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-900">
                <button
                  onClick={handleFollowAll}
                  className="w-full py-2.5 rounded-full bg-primary hover:opacity-90 text-primary-foreground font-black text-xs transition-opacity cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  <UserPlus className="h-4 w-4" /> Follow All to Enter
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Screen Drawer Popup Overlay */}
          <div className="fixed inset-0 z-50 flex md:hidden items-end justify-center bg-black/80 backdrop-blur-sm select-none">
            <div className="bg-zinc-950 border-t border-zinc-800 rounded-t-[32px] w-full max-h-[85vh] p-5 pb-8 shadow-2xl flex flex-col gap-4 text-foreground animate-in slide-in-from-bottom duration-300">
              {/* Grab handle indicator bar */}
              <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto" />

              <div className="text-center space-y-1.5 mt-1">
                <h2 className="text-base font-black tracking-tight flex items-center justify-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-purple-400" /> Who to Follow
                </h2>
                <p className="text-[11px] text-muted-foreground px-4 leading-relaxed text-pretty">
                  Customize your feed! Follow these accounts to unlock and enter the VibezTube feed:
                </p>
              </div>

              {/* Scrollable list of profiles */}
              <div className="flex-1 overflow-y-auto space-y-3.5 divide-y divide-zinc-900/60 max-h-[40vh] my-1">
                {unfollowed.map((p, index) => (
                  <div key={p.uid} className={`flex items-center justify-between gap-3 ${index > 0 ? "pt-3.5" : ""}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center text-xs border border-zinc-800 shrink-0 font-bold uppercase text-purple-400">
                        {p.displayName?.slice(0, 2) || p.username?.slice(0, 2) || "VT"}
                      </div>
                      <div className="min-w-0 text-left">
                        <h4 className="text-xs font-bold truncate leading-tight">{p.displayName || p.username}</h4>
                        <p className="text-[10px] text-muted-foreground truncate">@{p.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => followUser(p.uid)}
                      className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-[11px] font-black transition-colors cursor-pointer shrink-0"
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>

              {/* Bottom bulk follow button */}
              <div className="pt-2">
                <button
                  onClick={handleFollowAll}
                  className="w-full py-3 rounded-full bg-primary hover:opacity-90 text-primary-foreground font-black text-xs transition-opacity cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  <UserPlus className="h-4.5 w-4.5" /> Follow All to Enter
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
