import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth-session"

export async function GET() {
  try {
    const userId = await getSessionUser()
    if (!userId) {
      return NextResponse.json(null)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      uid: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      verifiedBadge: user.verifiedBadge,
    })
  } catch (err: any) {
    console.error("Session API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
