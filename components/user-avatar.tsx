import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

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
  disableLink,
}: {
  user: any
  className?: string
  ring?: boolean
  disableLink?: boolean
}) {
  const router = useRouter()
  const avatarUrl = user?.avatarUrl || user?.avatar
  
  const handleClick = (e: React.MouseEvent) => {
    if (disableLink) return
    const targetUid = user?.uid || user?.id
    if (targetUid) {
      e.stopPropagation()
      router.push(`/profile?uid=${targetUid}`)
    }
  }

  return (
    <Avatar
      onClick={handleClick}
      className={cn(
        ring && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        !disableLink && "cursor-pointer hover:opacity-85 transition-opacity",
        className
      )}
    >
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
