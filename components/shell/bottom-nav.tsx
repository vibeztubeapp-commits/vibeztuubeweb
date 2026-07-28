"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { mobileNav } from "@/lib/nav"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
      {mobileNav.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item.href)
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
              {item.badge ? (
                <Badge className="absolute -right-2.5 -top-1.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
                  {item.badge}
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
