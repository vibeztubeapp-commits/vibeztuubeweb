"use client"

import { useEffect, useState } from "react"
import { firebaseRuntimeConfig } from "@/lib/firebase"

export function FirebaseStatus() {
    const [ready, setReady] = useState(true)

    useEffect(() => {
        const timer = window.setTimeout(() => setReady(Boolean(firebaseRuntimeConfig.authDomain)), 1500)
        return () => window.clearTimeout(timer)
    }, [])

    return (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Firebase runtime status</p>
            <p className="mt-1">Project: {firebaseRuntimeConfig.projectId}</p>
            <p className="mt-1">Auth domain: {firebaseRuntimeConfig.authDomain}</p>
            <p className="mt-1">{ready ? "Ready for authentication requests." : "Waiting for Firebase to respond."}</p>
        </div>
    )
}
