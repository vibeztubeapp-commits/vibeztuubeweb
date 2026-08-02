import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth-session"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { searchParams } = new URL(req.url)
    const isUsername = searchParams.get("type") === "username"

    let profile = null

    if (isUsername) {
      profile = await prisma.user.findUnique({
        where: { username: params.id.toLowerCase() },
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
      bannerUrl: profile.bannerUrl,
      location: profile.location,
      website: profile.website,
      phoneNumber: profile.phoneNumber,
      dob: profile.dob,
      interests: profile.interests,
      topics: profile.topics,
      onboarded: profile.onboarded,
      verified: profile.verified,
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
    const sessionUserId = await getSessionUser()
    if (!sessionUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      displayName,
      bio,
      avatarUrl,
      bannerUrl,
      location,
      website,
      phoneNumber,
      dob,
      username,
      verified,
      verifiedBadge,
      underReview,
      reviewBadge,
      reviewStartedAt,
      interests,
      topics,
      onboarded,
    } = body

    const updated = await prisma.user.update({
      where: { id: sessionUserId },
      data: {
        displayName: displayName !== undefined ? displayName : undefined,
        bio: bio !== undefined ? bio : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        bannerUrl: bannerUrl !== undefined ? bannerUrl : undefined,
        location: location !== undefined ? location : undefined,
        website: website !== undefined ? website : undefined,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
        dob: dob !== undefined ? dob : undefined,
        username: username !== undefined ? username : undefined,
        verified: verified !== undefined ? verified : undefined,
        verifiedBadge: verifiedBadge !== undefined ? verifiedBadge : undefined,
        underReview: underReview !== undefined ? underReview : undefined,
        reviewBadge: reviewBadge !== undefined ? reviewBadge : undefined,
        reviewStartedAt: reviewStartedAt !== undefined ? (reviewStartedAt ? new Date(reviewStartedAt) : null) : undefined,
        interests: interests !== undefined ? interests : undefined,
        topics: topics !== undefined ? topics : undefined,
        onboarded: onboarded !== undefined ? onboarded : undefined,
      },
    })

    return NextResponse.json({
      uid: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      bio: updated.bio,
      avatarUrl: updated.avatarUrl,
      bannerUrl: updated.bannerUrl,
      location: updated.location,
      website: updated.website,
      phoneNumber: updated.phoneNumber,
      dob: updated.dob,
      interests: updated.interests,
      topics: updated.topics,
      onboarded: updated.onboarded,
      verified: updated.verified,
      verifiedBadge: updated.verifiedBadge,
      followersCount: updated.followersCount,
      followingCount: updated.followingCount,
    })
  } catch (err: any) {
    console.error("Update user profile API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
