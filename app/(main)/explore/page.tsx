import { Compass } from "lucide-react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function ExplorePage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Explore" />}>
        <SectionPlaceholder
          icon={Compass}
          title="Explore & Search"
          description="Trending topics, search across people, posts and videos, and a discovery grid land here next."
        />
      </FeedColumn>
      <RightRail />
    </div>
  )
}
