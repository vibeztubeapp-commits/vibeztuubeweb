import { Settings } from "lucide-react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function SettingsPage() {
  return (
    <FeedColumn header={<PageHeaderTitle title="Settings" />}>
      <SectionPlaceholder
        icon={Settings}
        title="Settings"
        description="Account, privacy, notifications, and appearance settings are coming in a later step."
      />
    </FeedColumn>
  )
}
