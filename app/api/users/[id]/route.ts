import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { searchParams } = new URL(req.url)
    const isUsername = searchParams.get("type") === "username"

    let profile = null

    if (isUsername) {
      profile = await prisma.user.findUnique({
        where: { username: params.id },
      })
    } else {
      profile = await prisma.user.findUnique({
        where: { id: params.id },
      })
    }

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    return NextResponse.json({
      uid: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      verifiedBadge: profile.verifiedBadge,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
    })
  } catch (err: any) {
    console.error("Get user profile API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json()
    const { displayName, bio, avatarUrl, username, verifiedBadge } = body

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        displayName: displayName !== undefined ? displayName : undefined,
        bio: bio !== undefined ? bio : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        username: username !== undefined ? username : undefined,
        verifiedBadge: verifiedBadge !== undefined ? verifiedBadge : undefined,
      },
    })

    return NextResponse.json({
      uid: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      bio: updated.bio,
      avatarUrl: updated.avatarUrl,
      verifiedBadge: updated.verifiedBadge,
      followersCount: updated.followersCount,
      followingCount: updated.followingCount,
    })
  } catch (err: any) {
    console.error("Update user profile API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
