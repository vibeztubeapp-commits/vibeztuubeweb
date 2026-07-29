import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl overflow-hidden bg-black shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <img src="/logo.png" alt="logo" className="h-full w-full object-cover" />
    </span>
  )
}

export function Wordmark({ className, showIcon = true }: { className?: string; showIcon?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {showIcon && <Logo className="h-8 w-8" />}
    </span>
  )
}
