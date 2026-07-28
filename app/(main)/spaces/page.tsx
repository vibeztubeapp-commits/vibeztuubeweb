import { Radio } from "lucide-react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function SpacesPage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Spaces" subtitle="Live audio rooms" />}>
        <SectionPlaceholder
          icon={Radio}
          title="Live Audio Spaces"
          description="Drop-in audio rooms with hosts, speakers, and listeners — powered by LiveKit — arrive in a later step."
        />
      </FeedColumn>
      <RightRail />
    </div>
  )
}
