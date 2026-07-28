import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

function initials(name: string) {
  if (!name) return "U"
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
  user: any
  className?: string
  ring?: boolean
}) {
  const avatarUrl = user?.avatarUrl || user?.avatar
  return (
    <Avatar className={cn(ring && "ring-2 ring-primary ring-offset-2 ring-offset-background", className)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={user?.displayName || user?.name || "avatar"} />
      ) : null}
      <AvatarFallback
        className="font-semibold text-white"
        style={{ backgroundColor: user?.avatarColor || "oklch(0.62 0.14 240)" }}
      >
        {initials(user?.displayName || user?.name || "User")}
      </AvatarFallback>
    </Avatar>
  )
}
