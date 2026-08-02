import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "following"

    if (type === "followers") {
      const list = await prisma.follow.findMany({
        where: { followeeUid: params.id },
      })
      return NextResponse.json(list.map((f) => f.followerUid))
    }

    const list = await prisma.follow.findMany({
      where: { followerUid: params.id },
    })
    return NextResponse.json(list.map((f) => f.followeeUid))
  } catch (err: any) {
    console.error("Get user follows list error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
