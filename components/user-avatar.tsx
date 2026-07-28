import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/production-data"

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function UserAvatar({
  user,
  className,
  ring,
}: {
  user: User
  className?: string
  ring?: boolean
}) {
  return (
    <Avatar className={cn(ring && "ring-2 ring-primary ring-offset-2 ring-offset-background", className)}>
      <AvatarFallback
        className="font-semibold text-white"
        style={{ backgroundColor: user.avatarColor }}
      >
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  )
}
