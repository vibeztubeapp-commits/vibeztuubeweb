import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const list = await prisma.follow.findMany({
      where: { followerUid: params.id },
    })
    const uids = list.map((f) => f.followeeUid)
    return NextResponse.json(uids)
  } catch (err: any) {
    console.error("Get user follows list error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
