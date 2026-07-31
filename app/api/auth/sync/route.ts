import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { uid, username, displayName, email, avatarUrl } = body

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 })
    }

    // Upsert user profile into PostgreSQL
    const user = await prisma.user.upsert({
      where: { id: uid },
      update: {
        displayName: displayName || undefined,
        avatarUrl: avatarUrl || undefined,
        email: email || undefined,
      },
      create: {
        id: uid,
        username: username || `user_${Math.random().toString(36).substr(2, 9)}`,
        displayName: displayName || "Creator",
        avatarUrl: avatarUrl || "",
        email: email || "",
        bio: "",
        verifiedBadge: "",
      },
    })

    return NextResponse.json(user)
  } catch (err: any) {
    console.error("User profile sync error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
