import Link from "next/link"
import { Search, TrendingUp, Radio } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { trends, spaces, formatCount } from "@/lib/production-data"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { db, followUser } from "@/lib/services"
import { collection, query, where, limit, onSnapshot } from "firebase/firestore"

export function RightRail() {
  const { user } = useAuth()
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [followedIds, setFollowedIds] = useState<string[]>([])
  const liveSpace = spaces.find((s) => s.live)

  useEffect(() => {
    // Fetch profiles
    const q = query(collection(db, "profiles"), limit(30))
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }))
      setAllProfiles(list)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, "follows"), where("followerUid", "==", user.uid))
    return onSnapshot(q, (snap) => {
      const ids = snap.docs.map((doc) => doc.data().followeeUid)
      setFollowedIds(ids)
    })
  }, [user])

  const suggestions = allProfiles
    .filter((p) => p.uid !== user?.uid && !followedIds.includes(p.uid))
    .slice(0, 3)

  return (
    <aside className="sticky top-0 hidden h-svh w-80 shrink-0 flex-col gap-4 overflow-y-auto py-4 pl-6 pr-2 lg:flex">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search VibezTube" className="h-11 rounded-full bg-muted pl-10" />
      </div>

      {liveSpace ? (
        <Link
          href="/spaces"
          className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Radio className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> LIVE SPACE
            </span>
            <span className="block truncate text-sm font-medium">{liveSpace.title}</span>
            <span className="text-xs text-muted-foreground">{formatCount(liveSpace.listeners)} listening</span>
          </span>
        </Link>
      ) : null}

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="flex items-center gap-2 px-4 pt-4 text-base font-bold">
          <TrendingUp className="h-4 w-4 text-primary" /> Trending
        </h2>
        <ul>
          {trends.map((t) => (
            <li key={t.tag}>
              <Link href="/explore" className="block px-4 py-3 transition-colors hover:bg-accent">
                <p className="text-xs text-muted-foreground">{t.category}</p>
                <p className="font-semibold">{t.tag}</p>
                <p className="text-xs text-muted-foreground">{t.posts} posts</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-2 text-base font-bold">Who to follow</h2>
        <ul className="flex flex-col gap-3">
          {suggestions.map((u) => (
            <li key={u.uid} className="flex items-center gap-3">
              <UserAvatar user={u} className="h-10 w-10 shrink-0" />
              <Link
                href={`/profile?uid=${u.uid}`}
                className="min-w-0 flex-1 hover:underline decoration-muted-foreground/50"
              >
                <p className="truncate text-sm font-semibold leading-tight">{u.displayName || u.name || "Creator"}</p>
                <p className="truncate text-xs text-muted-foreground">@{u.username || "username"}</p>
              </Link>
              <Button
                size="sm"
                className="rounded-full font-bold h-8 text-xs px-4"
                onClick={() => void followUser(u.uid)}
              >
                Follow
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="px-2 text-xs text-muted-foreground space-y-2">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <span>&middot;</span>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span>&middot;</span>
          <Link href="/cookies" className="hover:underline">Cookie Policy</Link>
          <span>&middot;</span>
          <Link href="/community-guidelines" className="hover:underline">Guidelines</Link>
          <span>&middot;</span>
          <Link href="/safety" className="hover:underline">Safety Center</Link>
          <span>&middot;</span>
          <Link href="/help" className="hover:underline">Help</Link>
          <span>&middot;</span>
          <Link href="/contact" className="hover:underline">Contact</Link>
        </div>
        <p className="leading-relaxed">
          &copy; {new Date().getFullYear()} VibezTube. All rights reserved.
        </p>
      </footer>
    </aside>
  )
}
