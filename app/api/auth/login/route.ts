import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createSession } from "@/lib/auth-session"

export async function POST(req: Request) {
  try {
    const { emailOrUsername, password } = await req.json()

    if (!emailOrUsername || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const cleanInput = emailOrUsername.toLowerCase().trim()

    // Find the user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanInput },
          { username: cleanInput }
        ]
      }
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Incorrect email/username or password" },
        { status: 401 }
      )
    }

    // Compare passwords
    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return NextResponse.json(
        { error: "Incorrect email/username or password" },
        { status: 401 }
      )
    }

    // Start session
    await createSession(user.id)

    return NextResponse.json(user)
  } catch (err: any) {
    console.error("Login API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
