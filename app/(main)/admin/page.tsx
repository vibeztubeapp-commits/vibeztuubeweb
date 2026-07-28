import { Shield } from "lucide-react"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function AdminPage() {
  return (
    <SectionPlaceholder
      icon={Shield}
      title="Admin Dashboard"
      description="Moderation queues, user management, and platform metrics for admins are coming in a later step."
    />
  )
}
