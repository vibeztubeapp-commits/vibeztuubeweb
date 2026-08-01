"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { mobileNav } from "@/lib/nav"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
// Cleaned Firestore imports

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetchCounts = async () => {
      try {
        const notifRes = await fetch("/api/notifications")
        if (notifRes.ok) {
          const list = await notifRes.json()
          setUnreadNotifications(list.filter((n: any) => !n.read).length)
        }
      } catch (err) {
        console.error("Failed to fetch counts:", err)
      }
    }

    void fetchCounts()
    const interval = setInterval(fetchCounts, 15000)

    return () => clearInterval(interval)
  }, [user])

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
      {mobileNav.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item.href)

        let displayBadge: number | undefined = undefined
        if (item.href === "/notifications") displayBadge = unreadNotifications
        if (item.href === "/messages") displayBadge = unreadMessages

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
            aria-label={item.label}
          >
            <span className="relative">
              <Icon
                className={cn("h-6 w-6", active ? "text-primary" : "text-muted-foreground")}
                strokeWidth={active ? 2.5 : 2}
              />
              {displayBadge && displayBadge > 0 ? (
                <Badge className="absolute -right-2.5 -top-1.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
                  {displayBadge}
                </Badge>
              ) : null}
            </span>
            <span className={cn("text-[10px]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
