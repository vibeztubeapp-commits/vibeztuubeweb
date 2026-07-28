"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Mail, Lock, Phone, Globe, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
    const { signInWithEmail, signInWithGoogle, resetPassword, startPhoneSignIn } = useAuth()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [phone, setPhone] = useState("")
    const [mode, setMode] = useState<"email" | "phone">("email")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")

    const canSubmit = useMemo(() => {
        if (mode === "email") return email && password
        return phone
    }, [email, password, mode, phone])

    const handleEmailSubmit = async () => {
        setLoading(true)
        setMessage("")
        try {
            await signInWithEmail(email, password)
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to sign in")
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
            setMessage(error instanceof Error ? error.message : "Google sign-in failed")
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
            setMessage(error instanceof Error ? error.message : "Phone sign-in failed")
        } finally {
            setLoading(false)
        }
    }

    const handleReset = async () => {
        if (!email) {
            setMessage("Enter your email to reset your password")
            return
        }
        try {
            await resetPassword(email)
            setMessage("Password reset email sent")
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not reset password")
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <div className="w-full max-w-sm bg-transparent p-0">
                <div className="mb-6 text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">VibezTube</p>
                    <h1 className="mt-2 text-2xl font-bold">Welcome back</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Sign in to continue with Firebase authentication.</p>
                </div>

                <div className="mb-4 flex items-center justify-center gap-3">
                    <button type="button" onClick={() => setMode("email")} className={`px-3 py-2 text-sm font-semibold ${mode === "email" ? "text-primary" : "text-muted-foreground"}`}>
                        Email
                    </button>
                    <button type="button" onClick={() => setMode("phone")} className={`px-3 py-2 text-sm font-semibold ${mode === "phone" ? "text-primary" : "text-muted-foreground"}`}>
                        Phone
                    </button>
                </div>

                {mode === "email" ? (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground text-center">Email</label>
                        <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="border-0 bg-transparent p-0 shadow-none w-full" />
                        </div>

                        <label className="block text-sm font-medium text-foreground text-center">Password</label>
                        <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="border-0 bg-transparent p-0 shadow-none w-full" />
                            <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-muted-foreground">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        <Button className="w-full" disabled={!canSubmit || loading} onClick={handleEmailSubmit}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>

                        <div className="flex items-center justify-between text-sm">
                            <button type="button" onClick={handleReset} className="text-primary">Forgot password?</button>
                            <Link href="/register" className="text-primary">Create account</Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground text-center">Phone number</label>
                        <div className="mt-2 mx-auto w-full max-w-xs flex items-center gap-2 bg-transparent px-2 py-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" className="border-0 bg-transparent p-0 shadow-none w-full" />
                        </div>
                        <Button className="w-full" disabled={!canSubmit || loading} onClick={handlePhone}>
                            {loading ? "Sending code..." : "Send code"}
                        </Button>
                    </div>
                )}

                <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    <span>or</span>
                    <span className="h-px flex-1 bg-border" />
                </div>

                <Button variant="outline" className="w-full" onClick={handleGoogle}>
                    <Globe className="mr-2 h-4 w-4" /> Continue with Google
                </Button>

                {message ? <p className="mt-4 text-sm text-muted-foreground text-center">{message}</p> : null}
            </div>
        </div>
    )
}
