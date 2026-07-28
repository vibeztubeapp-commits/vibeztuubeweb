"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, LogOut, Mail } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { getUserProfile } from "@/lib/services"

function ProfileView() {
  const { user, signOut, verifyEmail } = useAuth()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (!user) return
    void getUserProfile(user.uid).then(setProfile)
  }, [user])

  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Profile" subtitle="Your authenticated account" />}>
        <div className="space-y-4 px-4 py-6">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Account</p>
                <h2 className="mt-2 text-xl font-bold">{profile?.displayName || user?.displayName || "Your profile"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{user?.email || "Phone sign-in"}</p>
              </div>
              {user?.emailVerified ? <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">Verified</span> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!user?.emailVerified ? (
                <Button variant="outline" onClick={() => void verifyEmail()}>
                  <Mail className="mr-2 h-4 w-4" /> Verify email
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => void signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Secure session
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Firebase Authentication manages your secure session and account state.</p>
            <p className="mt-2 text-sm text-muted-foreground">UID: {user?.uid}</p>
          </div>
        </div>
      </FeedColumn>
      <RightRail />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileView />
    </AuthGuard>
  )
}
