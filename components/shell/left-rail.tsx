"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"
import { Wordmark } from "@/components/brand"
import { UserAvatar } from "@/components/user-avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { primaryNav, secondaryNav, type NavItem } from "@/lib/nav"
import { currentUser } from "@/lib/production-data"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { getUserProfile } from "@/lib/services"
import { useEffect, useState } from "react"
import { db } from "@/lib/services"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { VerifiedBadge } from "@/components/verified-badge"

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

function RailLink({ item, active, badgeOverride }: { item: NavItem; active: boolean; badgeOverride?: number }) {
  const Icon = item.icon
  const displayBadge = badgeOverride !== undefined ? badgeOverride : item.badge
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-4 rounded-full px-4 py-2.5 text-lg transition-colors hover:bg-accent",
        active ? "font-bold text-foreground" : "font-medium text-foreground/80",
      )}
    >
      <span className="relative">
        <Icon className={cn("h-6 w-6", active && "text-primary")} strokeWidth={active ? 2.5 : 2} />
        {displayBadge && displayBadge > 0 ? (
          <Badge className="absolute -right-2 -top-2 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
            {displayBadge}
          </Badge>
        ) : null}
      </span>
      <span className="hidden xl:inline">{item.label}</span>
    </Link>
  )
}

export function LeftRail() {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)

  useEffect(() => {
    if (!user) return

    const qNotif = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      where("read", "==", false)
    )
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      setUnreadNotifications(snap.docs.length)
    })

    const qChats = query(
      collection(db, "conversations"),
      where("userIds", "array-contains", user.uid)
    )
    const unsubChats = onSnapshot(qChats, (snap) => {
      let unreadSum = 0
      snap.docs.forEach((doc) => {
        const data = doc.data()
        if (data.unreadCount && data.lastSenderId !== user.uid) {
          unreadSum += Number(data.unreadCount || 0)
        }
      })
      setUnreadMessages(unreadSum)
    })

    return () => {
      unsubNotif()
      unsubChats()
    }
  }, [user])



  const userToShow = user
    ? (profile || {
        id: user.uid,
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        username: user.email?.split("@")[0] || "user",
        avatarUrl: user.photoURL || "",
        verifiedBadge: null,
      })
    : currentUser

  return (
    <aside className="sticky top-0 hidden h-svh shrink-0 flex-col justify-between border-r border-border px-2 py-4 md:flex xl:w-64 xl:px-4">
      <div className="flex flex-col gap-1">
        <Link href="/" className="mb-2 px-2 py-1">
          <span className="hidden xl:block">
            <Wordmark />
          </span>
          <span className="xl:hidden">
            <Wordmark showIcon className="[&>span:last-child]:hidden" />
          </span>
        </Link>

        <nav className="flex flex-col gap-0.5">
          {primaryNav.map((item) => {
            let override: number | undefined = undefined
            if (item.href === "/notifications") override = unreadNotifications
            if (item.href === "/messages") override = unreadMessages
            return (
              <RailLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                badgeOverride={override}
              />
            )
          })}
        </nav>

        <div className="my-2 h-px bg-border" />

        <nav className="flex flex-col gap-0.5">
          {secondaryNav.map((item) => {
            if (item.label === "More") {
              return (
                <div key={item.label} className="relative">
                  <button
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    className={cn(
                      "group flex w-full items-center gap-4 rounded-full px-4 py-2.5 text-lg transition-colors hover:bg-accent cursor-pointer",
                      showMoreDropdown ? "font-bold text-foreground bg-accent" : "font-medium text-foreground/80"
                    )}
                  >
                    <span className="relative">
                      <item.icon className="h-6 w-6" strokeWidth={showMoreDropdown ? 2.5 : 2} />
                    </span>
                    <span className="hidden xl:inline">{item.label}</span>
                  </button>

                  {showMoreDropdown && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-border rounded-2xl p-2 shadow-xl z-50 space-y-1">
                      <Link
                        href="/settings"
                        onClick={() => setShowMoreDropdown(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-sm font-semibold hover:bg-accent text-foreground transition-colors"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setShowMoreDropdown(false)
                          void signOut()
                        }}
                        className="flex w-full items-center gap-2.5 p-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                      >
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              )
            }
            return (
              <RailLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            )
          })}
        </nav>

        <Link
          href="/compose"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-3 h-12 rounded-full text-base font-bold",
          )}
        >
          <Plus className="h-5 w-5 xl:hidden" />
          <span className="hidden xl:inline">Create</span>
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-full p-1 xl:hover:bg-accent">
        <Link href="/profile" className="flex min-w-0 items-center gap-3">
          <UserAvatar user={userToShow} className="h-10 w-10" />
          <span className="hidden min-w-0 xl:block">
            <span className="block truncate text-sm font-semibold flex items-center">
              <span>{userToShow.displayName || userToShow.name}</span>
              <VerifiedBadge type={userToShow.verifiedBadge} />
            </span>
            <span className="block truncate text-sm text-muted-foreground">@{userToShow.username}</span>
          </span>
        </Link>
        <ThemeToggle className="hidden shrink-0 xl:inline-flex" />
      </div>
    </aside>
  )
}
