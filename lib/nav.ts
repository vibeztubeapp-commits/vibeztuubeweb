import {
  Home,
  Compass,
  Clapperboard,
  Radio,
  Video,
  MessageCircle,
  Bell,
  User,
  LayoutDashboard,
  Shield,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

// Primary navigation used in the desktop left rail.
export const primaryNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Shorts", href: "/shorts", icon: Clapperboard },
  { label: "Spaces", href: "/spaces", icon: Radio },
  { label: "Live", href: "/live", icon: Video },
  { label: "Messages", href: "/messages", icon: MessageCircle, badge: 3 },
  { label: "Notifications", href: "/notifications", icon: Bell, badge: 4 },
  { label: "Profile", href: "/profile", icon: User },
]

export const secondaryNav: NavItem[] = [
  { label: "Creator Studio", href: "/studio", icon: LayoutDashboard },
  { label: "Admin", href: "/admin", icon: Shield },
  { label: "Settings", href: "/settings", icon: Settings },
]

// Condensed navigation for the mobile bottom bar.
export const mobileNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Shorts", href: "/shorts", icon: Clapperboard },
  { label: "Live", href: "/live", icon: Video },
  { label: "Messages", href: "/messages", icon: MessageCircle, badge: 3 },
]
