import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const queryStr = searchParams.get("query") || ""

    if (!queryStr.trim()) {
      return NextResponse.json([])
    }

    const cleanQuery = queryStr.replace("@", "").trim()

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: cleanQuery, mode: "insensitive" } },
          { displayName: { contains: cleanQuery, mode: "insensitive" } },
        ],
      },
      take: 20,
    })

    const formatted = users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      verifiedBadge: u.verifiedBadge,
    }))

    return NextResponse.json(formatted)
  } catch (err: any) {
    console.error("Search users API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
