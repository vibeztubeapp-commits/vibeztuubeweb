"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { AuthGuard } from "@/components/auth-guard"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { UserAvatar } from "@/components/user-avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { db, getUserProfile } from "@/lib/services"
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, writeBatch } from "firebase/firestore"
import { Heart, MessageCircle, UserPlus, AtSign, ShieldAlert, Radio, Check, CheckCheck, Bell } from "lucide-react"

type NotificationItem = {
  id: string
  recipientId: string
  senderId: string
  type: "like" | "follow" | "comment" | "mention" | "system" | "live"
  postId?: string
  text: string
  read: boolean
  createdAt: any
  senderProfile?: any
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "like" | "comment" | "follow" | "mention" | "system">("all")

  useEffect(() => {
    if (!user) return

    // Set up real-time listener for incoming notifications targeted at the current user
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid)
    )

    const unsub = onSnapshot(q, async (snap) => {
      const items: NotificationItem[] = []
      
      for (const changeDoc of snap.docs) {
        const data = changeDoc.data()
        const senderProfile = await getUserProfile(data.senderId || "guest")
        
        items.push({
          id: changeDoc.id,
          recipientId: data.recipientId,
          senderId: data.senderId,
          type: data.type,
          postId: data.postId,
          text: data.text,
          read: Boolean(data.read),
          createdAt: data.createdAt,
          senderProfile,
        })
      }

      // Sort client-side to bypass composite index requirement
      items.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()
        return timeB - timeA
      })

      setNotifications(items)
    })

    return () => unsub()
  }, [user])

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return
    const batch = writeBatch(db)
    notifications.forEach((n) => {
      if (!n.read) {
        batch.update(doc(db, "notifications", n.id), { read: true })
      }
    })
    await batch.commit()
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true
    return n.type === activeTab
  })

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-4.5 w-4.5 text-red-500 fill-current" />
      case "comment":
        return <MessageCircle className="h-4.5 w-4.5 text-sky-500 fill-current" />
      case "follow":
        return <UserPlus className="h-4.5 w-4.5 text-emerald-500" />
      case "mention":
        return <AtSign className="h-4.5 w-4.5 text-purple-500" />
      case "live":
        return <Radio className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
      default:
        return <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
    }
  }

  return (
    <AuthGuard>
      <div className="flex justify-center">
        <FeedColumn
          header={
            <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
              <PageHeaderTitle title="Notifications" />
              
              {/* filterable tabs */}
              <div className="flex justify-between items-center px-4 py-1.5 overflow-x-auto gap-2">
                <div className="flex gap-1">
                  {(["all", "like", "comment", "follow", "mention", "system"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer capitalize ${
                        activeTab === tab
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {tab === "all" ? "All" : tab + "s"}
                    </button>
                  ))}
                </div>
                
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={() => void markAllAsRead()}
                    className="flex items-center gap-1 text-xs text-primary font-bold hover:underline cursor-pointer"
                  >
                    <CheckCheck className="h-4 w-4" /> Mark all read
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div className="bg-background min-h-[500px]">
            {filteredNotifications.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex gap-3 transition-colors hover:bg-accent/30 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 items-center">
                        <UserAvatar user={n.senderProfile} className="h-8 w-8" />
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-foreground flex items-center gap-1">
                            <span>{n.senderProfile?.displayName || "System User"}</span>
                            <VerifiedBadge type={n.senderProfile?.verifiedBadge} />
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{n.senderProfile?.username || "system"}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-foreground/90 mt-2">
                        {n.text}
                      </p>
                    </div>

                    {!n.read && (
                      <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 self-center" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center space-y-2">
                <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <h3 className="font-bold text-foreground">No notifications found</h3>
                <p className="text-xs text-muted-foreground">
                  You are all caught up! When you receive likes, comments, or followers, they will display here.
                </p>
              </div>
            )}
          </div>
        </FeedColumn>
        <RightRail />
      </div>
    </AuthGuard>
  )
}
