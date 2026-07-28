import { ShieldAlert } from "lucide-react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function SafetyPage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Safety Center" subtitle="Future-ready portal" />}>
        <SectionPlaceholder
          icon={ShieldAlert}
          title="Safety Center"
          description="Tools for reporting, safety resources, and parental controls are arriving in a future release."
        />
      </FeedColumn>
      <RightRail />
    </div>
  )
}
