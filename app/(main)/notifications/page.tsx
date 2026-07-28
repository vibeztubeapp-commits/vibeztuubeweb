import { Bell } from "lucide-react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function NotificationsPage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Notifications" />}>
        <SectionPlaceholder
          icon={Bell}
          title="Notifications"
          description="Likes, follows, comments, mentions, and live alerts — grouped and filterable — arrive in a later step."
        />
      </FeedColumn>
      <RightRail />
    </div>
  )
}
