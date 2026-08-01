import { NextResponse } from "next/server"
import { clearSession } from "@/lib/auth-session"

export async function POST() {
  try {
    await clearSession()
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Logout API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
