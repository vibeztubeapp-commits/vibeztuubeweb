"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login")
        }
    }, [loading, user, router])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
                Loading your account...
            </div>
        )
    }

    if (!user) {
        return null
    }

    return <>{children}</>
}
