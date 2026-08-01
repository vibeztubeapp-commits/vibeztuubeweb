import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createSession } from "@/lib/auth-session"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: Request) {
  try {
    const { email, username, password, displayName, avatarUrl } = await req.json()

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const cleanUsername = username.toLowerCase().trim()
    const cleanEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { username: cleanUsername }
        ]
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Username or Email already registered" },
        { status: 409 }
      )
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10)
    const userId = uuidv4()

    // Create the user
    const user = await prisma.user.create({
      data: {
        id: userId,
        username: cleanUsername,
        displayName: displayName || username,
        email: cleanEmail,
        passwordHash,
        avatarUrl: avatarUrl || "",
        bio: "",
        verifiedBadge: "",
      }
    })

    // Start session
    await createSession(user.id)

    return NextResponse.json(user)
  } catch (err: any) {
    console.error("Register API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
