import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const list = await prisma.user.findMany({
      take: 10,
    })
    const formatted = list.map((u) => ({
      uid: u.id,
      username: u.username,
      displayName: u.displayName,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      verifiedBadge: u.verifiedBadge,
    }))
    return NextResponse.json(formatted)
  } catch (err: any) {
    console.error("Get user suggestions error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
