"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    signInWithPopup,
    signOut as firebaseSignOut,
    type ConfirmationResult,
    type User as FirebaseUser,
    PhoneAuthProvider,
    signInWithCredential,
    RecaptchaVerifier,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { ensureProfile, confirmUsernameReservation } from "@/lib/services"
import type { ProfileData } from "@/lib/services"

type AuthContextValue = {
    user: FirebaseUser | null
    profile: ProfileData | null
    loading: boolean
    signInWithEmail: (email: string, password: string) => Promise<void>
    signUpWithEmail: (email: string, password: string, profileOverrides?: Partial<ProfileData>) => Promise<void>
    signInWithGoogle: () => Promise<void>
    startPhoneSignIn: (phoneNumber: string) => Promise<ConfirmationResult>
    confirmPhoneCode: (code: string) => Promise<void>
    resetPassword: (email: string) => Promise<void>
    verifyEmail: () => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null)

    useEffect(() => {
        const persistAuth = async () => {
            await setPersistence(auth, browserLocalPersistence)
        }

        void persistAuth()

        const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
            setUser(nextUser)
            if (nextUser) {
                const prof = await ensureProfile(nextUser)
                setProfile(prof)
            } else {
                setProfile(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const signInWithEmail = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password)
        router.replace("/")
    }

    const signUpWithEmail = async (email: string, password: string, profileOverrides: Partial<ProfileData> = {}) => {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        if (result.user) {
            await ensureProfile(result.user, profileOverrides)
            if (profileOverrides.username) {
                try {
                    await confirmUsernameReservation(profileOverrides.username, result.user.uid)
                } catch (err) {
                    console.error("Failed to confirm username reservation", err)
                }
            }
            if (result.user.email) {
                await sendEmailVerification(result.user)
            }
            router.replace("/onboarding")
        }
    }

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
        router.replace("/")
    }

    const startPhoneSignIn = async (phoneNumber: string) => {
        const appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
        })
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
        setPhoneConfirmation(confirmation)
        return confirmation
    }

    const confirmPhoneCode = async (code: string) => {
        if (!phoneConfirmation) {
            throw new Error("No phone confirmation in progress")
        }

        const credential = PhoneAuthProvider.credential(phoneConfirmation.verificationId, code)
        await signInWithCredential(auth, credential)
        router.replace("/")
    }

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email)
    }

    const verifyEmail = async () => {
        if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser)
        }
    }

    const signOut = async () => {
        await firebaseSignOut(auth)
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
            startPhoneSignIn,
            confirmPhoneCode,
            resetPassword,
            verifyEmail,
            signOut,
        }),
        [user, profile, loading, phoneConfirmation],
    )

    return (
        <AuthContext.Provider value={value}>
            <div id="recaptcha-container" />
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
