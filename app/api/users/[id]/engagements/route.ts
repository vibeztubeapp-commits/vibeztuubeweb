import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const uid = params.id

    const likes = await prisma.like.findMany({
      where: { userId: uid },
      select: { postId: true },
    })

    const reposts = await prisma.repost.findMany({
      where: { userId: uid },
      select: { postId: true },
    })

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: uid },
      select: { postId: true },
    })

    return NextResponse.json({
      likedIds: likes.map(l => l.postId),
      repostedIds: reposts.map(r => r.postId),
      bookmarkedIds: bookmarks.map(b => b.postId),
    })
  } catch (err: any) {
    console.error("Get user engagements API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
