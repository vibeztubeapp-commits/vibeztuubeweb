import { NextRequest, NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"

export async function POST(req: NextRequest) {
    const { room, identity, name } = await req.json()

    if (!process.env.NEXT_PUBLIC_LIVEKIT_API_KEY || !process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET) {
        return NextResponse.json({ error: "LiveKit credentials missing" }, { status: 500 })
    }

    const at = new AccessToken(process.env.NEXT_PUBLIC_LIVEKIT_API_KEY, process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET, {
        identity,
        name,
    })

    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true })

    return NextResponse.json({ token: await at.toJwt() })
}
