import { Video } from "lucide-react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function LivePage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Live" subtitle="Streams happening now" />}>
        <SectionPlaceholder
          icon={Video}
          title="Live Video"
          description="A browse grid of live streams plus a full watch page with chat — powered by LiveKit — is coming next."
        />
      </FeedColumn>
      <RightRail />
    </div>
  )
}
