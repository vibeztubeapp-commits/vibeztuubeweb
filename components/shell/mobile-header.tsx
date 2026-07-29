"use client"

import Link from "next/link"
import { Wordmark } from "@/components/brand"
import { UserAvatar } from "@/components/user-avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/components/auth-provider"
import { db, getUserProfile } from "@/lib/services"
import { useEffect, useState } from "react"
import { currentUser } from "@/lib/production-data"
import { Bell, X, ShieldAlert, Heart, MessageCircle, UserPlus, AtSign, Radio, ShieldCheck, User, Settings } from "lucide-react"
import { collection, query, where, onSnapshot, limit, orderBy, doc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VerifiedBadge } from "@/components/verified-badge"

type NotificationItem = {
  id: string
  recipientId: string
  senderId: string
  type: "like" | "follow" | "comment" | "mention" | "system" | "live"
  text: string
  read: boolean
  createdAt: any
  senderProfile?: any
}

export function MobileHeader() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    const profileRef = doc(db, "profiles", user.uid)
    return onSnapshot(profileRef, (snap: any) => {
      if (snap.exists()) {
        setProfile({ uid: snap.id, ...snap.data() })
      }
    })
  }, [user])

  useEffect(() => {
    if (!user) return

    // Unread count listener
    const qUnread = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      where("read", "==", false)
    )
    const unsubUnread = onSnapshot(qUnread, (snap) => {
      setUnreadCount(snap.docs.length)
    })

    // Preview list listener
    const qList = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid)
    )
    const unsubList = onSnapshot(qList, async (snap) => {
      const items: NotificationItem[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const senderProfile = await getUserProfile(data.senderId || "guest")
        items.push({
          id: d.id,
          recipientId: data.recipientId,
          senderId: data.senderId,
          type: data.type,
          text: data.text,
          read: Boolean(data.read),
          createdAt: data.createdAt,
          senderProfile,
        })
      }
      
      // Sort client-side
      items.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()
        return timeB - timeA
      })

      setNotifications(items.slice(0, 5)) // Get latest 5 for preview
    })

    return () => {
      unsubUnread()
      unsubList()
    }
  }, [user])

  const userToShow = profile || currentUser

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-3.5 w-3.5 text-red-500 fill-current" />
      case "comment":
        return <MessageCircle className="h-3.5 w-3.5 text-sky-500 fill-current" />
      case "follow":
        return <UserPlus className="h-3.5 w-3.5 text-emerald-500" />
      case "mention":
        return <AtSign className="h-3.5 w-3.5 text-purple-500" />
      case "live":
        return <Radio className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
      default:
        return <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur-lg md:hidden">
        <button onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar menu" className="cursor-pointer">
          <UserAvatar user={userToShow} className="h-9 w-9" />
        </button>
        <Link href="/" aria-label="VibezTube home">
          <Wordmark />
        </Link>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowModal(!showModal)}
            className="relative p-1.5 hover:bg-accent rounded-full text-foreground cursor-pointer"
            aria-label="Toggle notifications preview"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Profile Slide-in Left Drawer/Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}>
          <div
            className="absolute inset-y-0 left-0 w-64 bg-card border-r border-border p-5 flex flex-col justify-between shadow-2xl z-50 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Sidebar Header user info */}
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <UserAvatar user={userToShow} className="h-12 w-12" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-0.5">
                      <span>{userToShow.displayName || userToShow.name}</span>
                      <VerifiedBadge type={userToShow.verifiedBadge} />
                    </h4>
                    <p className="text-xs text-muted-foreground">@{userToShow.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 hover:bg-accent rounded-full text-muted-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Sidebar navigation list */}
              <nav className="flex flex-col gap-2 pt-4">
                <Link
                  href="/profile"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold hover:bg-accent text-foreground transition-colors"
                >
                  <User className="h-5 w-5" /> Profile
                </Link>
                <Link
                  href="/studio"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold hover:bg-accent text-foreground transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="9" rx="1" />
                    <rect x="14" y="3" width="7" height="5" rx="1" />
                    <rect x="14" y="12" width="7" height="9" rx="1" />
                    <rect x="3" y="16" width="7" height="5" rx="1" />
                  </svg>
                  V-Creator Studio
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold hover:bg-accent text-foreground transition-colors"
                >
                  <ShieldCheck className="h-5 w-5" /> Get Verified
                </Link>
                <Link
                  href="/spaces"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold hover:bg-accent text-foreground transition-colors"
                >
                  <Radio className="h-5 w-5" /> Spaces
                </Link>
                <Link
                  href="/messages"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold hover:bg-accent text-foreground transition-colors"
                >
                  <MessageCircle className="h-5 w-5" /> Chat
                </Link>
              </nav>
            </div>

            {/* Settings & Logout bottom block */}
            <div className="pt-4 border-t border-border space-y-2">
              <Link
                href="/settings"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold hover:bg-accent text-foreground transition-colors"
              >
                <Settings className="h-5 w-5" /> Settings
              </Link>
              <Button
                onClick={() => {
                  void signOut()
                  setIsSidebarOpen(false)
                }}
                variant="destructive"
                className="w-full rounded-full font-bold text-xs"
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Top-Right Notifications Preview Modal/Dropdown */}
      {showModal && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="absolute top-14 right-4 w-72 max-h-96 overflow-y-auto bg-card border border-border rounded-2xl p-4 shadow-xl space-y-3 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-primary" /> Notifications
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-accent rounded-full text-muted-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 divide-y divide-border/60">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className={`pt-2 flex gap-2 first:pt-0 ${!n.read ? "bg-primary/5 -mx-2 px-2 rounded-lg" : ""}`}>
                    <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-foreground truncate max-w-[120px]">
                          {n.senderProfile?.displayName || "System User"}
                        </span>
                        <VerifiedBadge type={n.senderProfile?.verifiedBadge} />
                      </div>
                      <p className="text-xs text-foreground/80 leading-normal mt-0.5 line-clamp-2">
                        {n.text}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No notifications yet.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border">
              <Link
                href="/notifications"
                onClick={() => setShowModal(false)}
                className="block text-center text-xs font-bold text-primary hover:underline"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
