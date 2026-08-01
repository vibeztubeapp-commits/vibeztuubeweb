"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
    browserLocalPersistence,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    signInWithPopup,
    type User as FirebaseUser,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { ensureProfile } from "@/lib/services"
import type { ProfileData } from "@/lib/services"

type AuthContextValue = {
    user: any | null
    profile: ProfileData | null
    loading: boolean
    signInWithEmail: (emailOrUsername: string, password: string) => Promise<void>
    signUpWithEmail: (email: string, username: string, password: string, displayName?: string, avatarUrl?: string) => Promise<void>
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [user, setUser] = useState<any | null>(null)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)

    // Load active session from cookie on load
    useEffect(() => {
        const initSession = async () => {
            try {
                const res = await fetch("/api/auth/session")
                if (res.ok) {
                    const data = await res.json()
                    if (data) {
                        setProfile(data)
                        setUser({
                            uid: data.uid,
                            displayName: data.displayName,
                            email: data.email,
                            photoURL: data.avatarUrl,
                        })
                    }
                }
            } catch (err) {
                console.error("Failed to initialize session:", err)
            } finally {
                setLoading(false)
            }
        }
        void initSession()

        // Maintain Google/OAuth listener
        const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
            if (nextUser) {
                try {
                    const prof = await ensureProfile(nextUser)
                    setProfile(prof)
                    setUser({
                        uid: nextUser.uid,
                        displayName: nextUser.displayName || prof.displayName,
                        email: nextUser.email || prof.email,
                        photoURL: nextUser.photoURL || prof.avatarUrl,
                    })
                } catch (err) {
                    console.error("Error syncing Google OAuth user:", err)
                }
            }
        })

        return () => unsubscribe()
    }, [])

    const signInWithEmail = async (emailOrUsername: string, password: string) => {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailOrUsername, password }),
        })

        if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Login failed")
        }

        const data = await res.json()
        const prof: ProfileData = {
            uid: data.id,
            username: data.username,
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
            bio: data.bio,
            verifiedBadge: data.verifiedBadge,
        }
        setProfile(prof)
        setUser({
            uid: data.id,
            displayName: data.displayName,
            email: data.email,
            photoURL: data.avatarUrl,
        })
        router.replace("/")
    }

    const signUpWithEmail = async (email: string, username: string, password: string, displayName?: string, avatarUrl?: string) => {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, username, password, displayName, avatarUrl }),
        })

        if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Registration failed")
        }

        const data = await res.json()
        const prof: ProfileData = {
            uid: data.id,
            username: data.username,
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
            bio: data.bio,
            verifiedBadge: data.verifiedBadge,
        }
        setProfile(prof)
        setUser({
            uid: data.id,
            displayName: data.displayName,
            email: data.email,
            photoURL: data.avatarUrl,
        })
        router.replace("/onboarding")
    }

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider()
        const result = await signInWithPopup(auth, provider)
        if (result.user) {
            const prof = await ensureProfile(result.user)
            setProfile(prof)
            setUser({
                uid: result.user.uid,
                displayName: result.user.displayName || prof.displayName,
                email: result.user.email || prof.email,
                photoURL: result.user.photoURL || prof.avatarUrl,
            })
            router.replace("/")
        }
    }

    const signOut = async () => {
        await fetch("/api/auth/logout", { method: "POST" })
        try {
            await firebaseSignOut(auth)
        } catch {}
        setProfile(null)
        setUser(null)
        router.replace("/login")
    }

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            profile,
            loading,
            signInWithEmail,
            signUpWithEmail,
            signInWithGoogle,
            signOut,
        }),
        [user, profile, loading],
    )

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider")
    }
    return context
}
