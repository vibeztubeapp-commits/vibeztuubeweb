"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Camera, Eye, EyeOff, Mail, Lock, User, CalendarDays, AtSign } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { isUsernameAvailable, reserveUsername, uploadToCloudinary } from "@/lib/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const verifiedDomains = ["gmail.com", "outlook.com", "live.com", "hotmail.com", "yahoo.com", "icloud.com"]

export default function RegisterPage() {
    const { signUpWithEmail } = useAuth()
    const [step, setStep] = useState(0)
    const [displayName, setDisplayName] = useState("")
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [dob, setDob] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [avatar, setAvatar] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")

    const isEmailValid = useMemo(() => {
        const domain = email.split("@")[1]?.toLowerCase() || ""
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && verifiedDomains.includes(domain)
    }, [email])

    const canAdvance = useMemo(() => {
        if (step === 0) return displayName.trim().length >= 2
        if (step === 1) return username.trim().length >= 3
        if (step === 2) return isEmailValid
        if (step === 3) return password.length >= 8
        if (step === 4) return Boolean(dob)
        return Boolean(avatar)
    }, [avatar, displayName, dob, isEmailValid, password, step, username])

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
                    const res = await uploadToCloudinary(avatarFile)
                    if (typeof res === "string") avatarUrl = res
                } catch (err) {
                    console.error("Cloudinary upload failed", err)
                }
            }

            await signUpWithEmail(email, password, { displayName, username, avatarUrl, createdAt: undefined })
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to create account")
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
                            <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="border-0 bg-transparent p-0 shadow-none w-full" />
                            </div>
                        </div>
                    ) : null}

                    {step === 5 ? (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-foreground text-center">Profile photo</label>
                            <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-3 bg-transparent px-2 py-2">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-primary">
                                    {avatar ? <img src={avatar} alt="avatar preview" className="h-12 w-12 rounded-full object-cover" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <input type="file" accept="image/*" capture="environment" className="w-full text-sm text-muted-foreground bg-transparent" onChange={(event) => {
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
                </div>
            </div>
        </div>
    )
}
