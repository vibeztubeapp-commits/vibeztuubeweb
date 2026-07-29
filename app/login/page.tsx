"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Mail, Lock, Phone, Globe, Eye, EyeOff, AtSign } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { getEmailByUsername } from "@/lib/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function cleanErrorMessage(error: any): string {
    if (!error) return "An unexpected error occurred. Please try again."
    const errStr = error.code || (error.message ? String(error.message) : String(error))
    
    if (errStr.includes("auth/network-request-failed") || errStr.includes("network-request-failed")) {
        return "Network connection lost. Please check your internet connection and try again."
    }
    if (
        errStr.includes("auth/invalid-credential") || 
        errStr.includes("auth/user-not-found") || 
        errStr.includes("auth/wrong-password") ||
        errStr.includes("auth/invalid-email")
    ) {
        return "Password or email/username incorrect. Please try again."
    }
    if (errStr.includes("auth/email-already-in-use")) {
        return "This email address is already registered to another account."
    }
    if (errStr.includes("auth/weak-password")) {
        return "Password is too weak. Please use at least 6 characters."
    }
    if (errStr.includes("auth/too-many-requests")) {
        return "Too many unsuccessful attempts. Please try again later."
    }
    if (errStr.includes("auth/user-disabled")) {
        return "This account has been disabled. Please contact support."
    }
    
    let clean = error.message || String(error)
    clean = clean.replace(/^firebase:\s*/gi, "")
    clean = clean.replace(/FirebaseError:\s*/gi, "")
    clean = clean.replace(/\s*\(auth\/[a-z-]+\)\.?/gi, "")
    return clean || "An unexpected error occurred. Please try again."
}

export default function LoginPage() {
    const { signInWithEmail, signInWithGoogle, resetPassword, startPhoneSignIn } = useAuth()
    const [showSplash, setShowSplash] = useState(true)
    const [step, setStep] = useState(0) // 0: Email/Handle, 1: Password
    const [emailOrHandle, setEmailOrHandle] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [phone, setPhone] = useState("")
    const [mode, setMode] = useState<"email" | "phone">("email")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")

    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 2000)
        return () => clearTimeout(timer)
    }, [])

    const canAdvance = useMemo(() => {
        if (mode === "email") {
            if (step === 0) return emailOrHandle.trim().length > 0
            return password.length > 0
        }
        return phone.trim().length > 0
    }, [emailOrHandle, password, mode, phone, step])

    if (showSplash) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <div className="text-center">
                    <img src="/logo.png" alt="VibezTube Logo" className="mx-auto h-24 w-auto mb-4 animate-pulse" />
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">VibezTube</p>
                </div>
            </div>
        )
    }

    const handleEmailSubmit = async () => {
        setLoading(true)
        setMessage("")
        try {
            let emailToUse = emailOrHandle.trim()
            
            // If it's not a valid email format, assume it is a handle and resolve it to an email
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)
            if (!isEmail) {
                const resolvedEmail = await getEmailByUsername(emailToUse)
                if (!resolvedEmail) {
                    throw new Error("No account associated with that handle.")
                }
                emailToUse = resolvedEmail
            }

            await signInWithEmail(emailToUse, password)
        } catch (error: any) {
            setMessage(cleanErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    const handleGoogle = async () => {
        setLoading(true)
        setMessage("")
        try {
            await signInWithGoogle()
        } catch (error) {
            setMessage(cleanErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    const handlePhone = async () => {
        setLoading(true)
        setMessage("")
        try {
            await startPhoneSignIn(phone)
            setMessage("Code sent. Enter the code in your app to finish sign-in.")
        } catch (error) {
            setMessage(cleanErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    const handleReset = async () => {
        let emailToUse = emailOrHandle.trim()
        if (!emailToUse) {
            setMessage("Enter your email or @handle to reset your password")
            return
        }

        setLoading(true)
        setMessage("Sending reset email...")
        try {
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)
            if (!isEmail) {
                const resolvedEmail = await getEmailByUsername(emailToUse)
                if (!resolvedEmail) {
                    throw new Error("No account associated with that handle.")
                }
                emailToUse = resolvedEmail
            }
            await resetPassword(emailToUse)
            setMessage(`Password reset email successfully sent to: ${emailToUse}`)
        } catch (error) {
            setMessage(cleanErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    const nextStep = async () => {
        if (step === 0 && mode === "email") {
            setLoading(true)
            setMessage("")
            try {
                const input = emailOrHandle.trim()
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
                if (!isEmail) {
                    const resolvedEmail = await getEmailByUsername(input)
                    if (!resolvedEmail) {
                        throw new Error("No account associated with that handle.")
                    }
                }
                setStep(1)
            } catch (err: any) {
                setMessage(cleanErrorMessage(err))
            } finally {
                setLoading(false)
            }
        }
    }

    const prevStep = () => {
        if (step === 1) {
            setStep(0)
            setMessage("")
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-sm bg-transparent p-0">
                <div className="mb-6 text-center">
                    <img src="/logo.png" alt="VibezTube Logo" className="mx-auto h-20 w-auto mb-4" />
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">VibezTube</p>
                    <h1 className="mt-2 text-2xl font-bold">Welcome back</h1>
                </div>

                {mode === "email" ? (
                    <div className="space-y-3">
                        {step === 0 ? (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-foreground text-center">Email or @handle</label>
                                <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                                    {emailOrHandle.startsWith("@") || (!emailOrHandle.includes("@") && emailOrHandle.length > 0) ? (
                                        <AtSign className="h-4 w-4 text-muted-foreground animate-in fade-in zoom-in duration-200" />
                                    ) : (
                                        <Mail className="h-4 w-4 text-muted-foreground animate-in fade-in zoom-in duration-200" />
                                    )}
                                    <Input value={emailOrHandle} onChange={(e) => setEmailOrHandle(e.target.value)} placeholder="you@example.com or @username" className="border-0 bg-transparent p-0 shadow-none w-full" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-foreground text-center">Password</label>
                                <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="border-0 bg-transparent p-0 shadow-none w-full animate-in slide-in-from-right-3 duration-200" />
                                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-muted-foreground">
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-3 pt-4">
                            {step === 1 ? (
                                <Button variant="ghost" onClick={prevStep} disabled={loading}>
                                    Back
                                </Button>
                            ) : null}
                            {step === 0 ? (
                                <Button disabled={!canAdvance || loading} onClick={() => void nextStep()}>
                                    {loading ? "Checking..." : "Continue"}
                                </Button>
                            ) : (
                                <Button className="font-bold" disabled={!canAdvance || loading} onClick={() => void handleEmailSubmit()}>
                                    {loading ? "Signing in..." : "Sign in"}
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-sm pt-4">
                            <button type="button" onClick={handleReset} className="text-primary hover:underline">Forgot password?</button>
                            <Link href="/register" className="text-primary hover:underline">Create account</Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground text-center">Phone number</label>
                        <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" className="border-0 bg-transparent p-0 shadow-none w-full" />
                        </div>
                        <div className="flex justify-center pt-2">
                            <Button disabled={!canAdvance || loading} onClick={handlePhone}>
                                {loading ? "Sending code..." : "Send code"}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 0 ? (
                    <>
                        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            <span className="h-px flex-1 bg-border" />
                            <span>or</span>
                            <span className="h-px flex-1 bg-border" />
                        </div>

                        <div className="flex items-center justify-center gap-4">
                            {/* Round Google Button */}
                            <button
                                type="button"
                                onClick={handleGoogle}
                                className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white shadow-sm transition-colors hover:bg-neutral-50 cursor-pointer"
                                title="Sign in with Google"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#EA4335"
                                        d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.336 0 3.332 2.682 1.41 6.605l3.856 3.16z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M16.04 15.345c-1.127.755-2.527 1.2-4.04 1.2a7.077 7.077 0 0 1-6.734-4.856l-3.856 3.16C3.332 18.782 7.336 21.464 12 21.464c3.09 0 5.927-1.027 8.073-2.8l-4.033-3.32z"
                                    />
                                    <path
                                        fill="#4285F4"
                                        d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.436c-.277 1.464-1.1 2.7-2.345 3.536l4.033 3.32c2.364-2.182 3.733-5.38 3.733-9.065z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.266 11.682a7.03 7.03 0 0 1 0-1.917L1.41 6.605A11.968 11.968 0 0 0 0 12c0 1.91.445 3.718 1.41 5.395l3.856-3.16a7.043 7.043 0 0 1 0-2.553z"
                                    />
                                </svg>
                            </button>

                            {/* Round Phone / Email Toggle Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(mode === "email" ? "phone" : "email")
                                    setStep(0)
                                }}
                                className={`flex h-12 w-12 items-center justify-center rounded-full border border-border shadow-sm transition-colors cursor-pointer ${
                                    mode === "phone"
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                        : "bg-card text-foreground hover:bg-accent"
                                }`}
                                title={mode === "email" ? "Sign in with Phone number" : "Sign in with Email or Handle"}
                            >
                                {mode === "email" ? <Phone className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                            </button>
                        </div>
                    </>
                ) : null}

                {message ? <p className="mt-4 text-sm text-muted-foreground text-center">{message}</p> : null}

                <p className="mt-8 text-[10px] text-muted-foreground text-center leading-relaxed px-4">
                  By continuing, you agree to our Terms, Privacy Policy and Cookie Use.
                </p>
            </div>
        </div>
    )
}
