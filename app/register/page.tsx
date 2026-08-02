"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Camera, Eye, EyeOff, Mail, Lock, User, CalendarDays, AtSign } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { isUsernameAvailable, reserveUsername, uploadToMinIO } from "@/lib/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const verifiedDomains = ["gmail.com", "outlook.com", "live.com", "hotmail.com", "yahoo.com", "icloud.com"]

const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
]
const days = Array.from({ length: 31 }, (_, i) => String(i + 1))
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 110 }, (_, i) => String(currentYear - i))

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

export default function RegisterPage() {
    const { signUpWithEmail } = useAuth()
    const [showSplash, setShowSplash] = useState(true)
    const [step, setStep] = useState(0)
    const [displayName, setDisplayName] = useState("")
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [dobMonth, setDobMonth] = useState("")
    const [dobDay, setDobDay] = useState("")
    const [dobYear, setDobYear] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [avatar, setAvatar] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")

    const dob = useMemo(() => {
        if (!dobYear || !dobMonth || !dobDay) return ""
        return `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`
    }, [dobYear, dobMonth, dobDay])

    const isAgeValid = useMemo(() => {
        if (!dob) return false
        const birthDate = new Date(dob)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age >= 13
    }, [dob])

    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 2000)
        return () => clearTimeout(timer)
    }, [])

    const isEmailValid = useMemo(() => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|live\.com|hotmail\.com|yahoo\.com|icloud\.com)$/i
        return emailRegex.test(email.trim())
    }, [email])

    const canAdvance = useMemo(() => {
        if (step === 0) return displayName.trim().length >= 2
        if (step === 1) return username.trim().length >= 3
        if (step === 2) return isEmailValid
        if (step === 3) return password.length >= 8
        if (step === 4) return isAgeValid
        return Boolean(avatar)
    }, [avatar, displayName, isAgeValid, isEmailValid, password, step, username])

    if (showSplash) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <div className="text-center">
                    <img src="/logo-auth.png" alt="VibezTube Logo" className="mx-auto h-24 w-auto mb-4 animate-pulse" />
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">VibezTube</p>
                </div>
            </div>
        )
    }

    const handleSubmit = async () => {
        setLoading(true)
        setMessage("")
        try {
            // Reserve username to avoid race conditions
            const reserved = await reserveUsername(username)
            if (!reserved) {
                setMessage("Username already taken. Please choose another.")
                setLoading(false)
                return
            }

            // Upload avatar if present
            let avatarUrl: string | undefined
            if (avatarFile) {
                try {
                    const res = await uploadToMinIO(avatarFile)
                    if (typeof res === "string") avatarUrl = res
                } catch (err) {
                    console.error("MinIO upload failed", err)
                }
            }

            await signUpWithEmail(email, username, password, displayName, avatarUrl, dob)
        } catch (error) {
            setMessage(cleanErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    const nextStep = () => {
        if (step < 5) {
            setStep((value) => value + 1)
        }
    }

    const prevStep = () => {
        if (step > 0) {
            setStep((value) => value - 1)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-sm bg-transparent p-0">
                <div className="mb-6 text-center">
                    <img src="/logo-auth.png" alt="VibezTube Logo" className="mx-auto h-20 w-auto mb-4" />
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">VibezTube</p>
                    <h1 className="mt-2 text-2xl font-bold">Create your account</h1>
                    <p className="mt-2 text-sm text-muted-foreground">A guided setup for your profile, identity, and security.</p>
                </div>

                <div className="space-y-5">
                    {step === 0 ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-foreground text-center">Display name</label>
                            <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="What should people call you?" className="border-0 bg-transparent p-0 shadow-none w-full" />
                            </div>
                        </div>
                    ) : null}

                    {step === 1 ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-foreground text-center">@username</label>
                            <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                                <AtSign className="h-4 w-4 text-muted-foreground" />
                                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" className="border-0 bg-transparent p-0 shadow-none w-full" />
                            </div>
                        </div>
                    ) : null}

                    {step === 2 ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-foreground text-center">Email address</label>
                            <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" className="border-0 bg-transparent p-0 shadow-none w-full" />
                            </div>
                            <p className="text-sm text-muted-foreground text-center">Use a verified provider such as Gmail, Outlook, Live, or Yahoo.</p>
                        </div>
                    ) : null}

                    {step === 3 ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-foreground text-center">Password</label>
                            <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" className="border-0 bg-transparent p-0 shadow-none w-full" />
                                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-muted-foreground">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {step === 4 ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-foreground text-center">Date of birth</label>
                            <div className="mt-2 mx-auto w-full max-w-xs flex gap-2">
                                <select
                                    value={dobMonth}
                                    onChange={(e) => setDobMonth(e.target.value)}
                                    className="flex-1 rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <option value="" disabled>Month</option>
                                    {months.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={dobDay}
                                    onChange={(e) => setDobDay(e.target.value)}
                                    className="w-20 rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <option value="" disabled>Day</option>
                                    {days.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <select
                                    value={dobYear}
                                    onChange={(e) => setDobYear(e.target.value)}
                                    className="w-24 rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <option value="" disabled>Year</option>
                                    {years.map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            {dob && !isAgeValid ? (
                                <p className="text-xs text-red-500 text-center mt-1 animate-pulse">
                                    You must be at least 13 years old to register.
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    {step === 5 ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-foreground text-center">Profile photo</label>
                            <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-3 bg-transparent px-2 py-2">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-primary">
                                    {avatar ? <img src={avatar} alt="avatar preview" className="h-12 w-12 rounded-full object-cover" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <input type="file" accept="image/*" className="w-full text-sm text-muted-foreground bg-transparent" onChange={(event) => {
                                    const file = event.target.files?.[0]
                                    if (file) {
                                        const preview = URL.createObjectURL(file)
                                        setAvatar(preview)
                                        setAvatarFile(file)
                                    }
                                }} />
                            </div>
                        </div>
                    ) : null}

                    <div className="flex items-center justify-center gap-3 pt-2">
                        <Button variant="ghost" onClick={prevStep} disabled={step === 0}>
                            Back
                        </Button>
                        {step < 5 ? (
                            <Button onClick={nextStep} disabled={!canAdvance}>
                                Continue
                            </Button>
                        ) : (
                            <Button onClick={() => void handleSubmit()} disabled={loading || !canAdvance}>
                                {loading ? "Creating account..." : "Create account"}
                            </Button>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground text-center">
                        Already have an account? <Link href="/login" className="text-primary">Sign in</Link>
                    </p>
                    {message ? <p className="text-sm text-muted-foreground text-center">{message}</p> : null}

                    <p className="mt-8 text-[10px] text-muted-foreground text-center leading-relaxed px-4">
                        By continuing, you agree to our Terms, Privacy Policy and Cookie Use.
                    </p>
                </div>
            </div>
        </div>
    )
}
