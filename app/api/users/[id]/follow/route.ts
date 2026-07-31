import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { searchParams } = new URL(req.url)
    const followerUid = searchParams.get("followerUid")
    const followeeUid = params.id

    if (!followerUid) {
      return NextResponse.json({ following: false })
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerUid_followeeUid: { followerUid, followeeUid },
      },
    })

    return NextResponse.json({ following: !!existing })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json()
    const { followerUid } = body
    const followeeUid = params.id

    if (!followerUid) {
      return NextResponse.json({ error: "Missing followerUid" }, { status: 400 })
    }

    if (followerUid === followeeUid) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 })
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerUid_followeeUid: { followerUid, followeeUid },
      },
    })

    if (existing) {
      // Unfollow
      await prisma.follow.delete({
        where: {
          followerUid_followeeUid: { followerUid, followeeUid },
        },
      })

      // Decrement counts
      await prisma.user.update({
        where: { id: followerUid },
        data: { followingCount: { decrement: 1 } },
      })
      await prisma.user.update({
        where: { id: followeeUid },
        data: { followersCount: { decrement: 1 } },
      })

      return NextResponse.json({ following: false })
    } else {
      // Follow
      await prisma.follow.create({
        data: { followerUid, followeeUid },
      })

      // Increment counts
      await prisma.user.update({
        where: { id: followerUid },
        data: { followingCount: { increment: 1 } },
      })
      await prisma.user.update({
        where: { id: followeeUid },
        data: { followersCount: { increment: 1 } },
      })

      // Create notification
      await prisma.notification.create({
        data: {
          recipientId: followeeUid,
          senderId: followerUid,
          type: "follow",
          text: "started following you",
        },
      })

      return NextResponse.json({ following: true })
    }
  } catch (err: any) {
    console.error("Follow user API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
