"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
// Cleaned Firestore imports
import { Radio, Video, Mic, Users, MessageSquare, Hand, Sparkles, Check, ArrowRight, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LiveSpacesLandingPage({ mode }: { mode: "spaces" | "live" }) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [notified, setNotified] = useState(false)
  const [notifyMsg, setNotifyMsg] = useState("")

  // Demo interactive animation state variables
  const [listenersCount, setListenersCount] = useState(48)
  const [activeSpeaker, setActiveSpeaker] = useState("Host")
  const [reactions, setReactions] = useState<{ id: number; icon: string; left: number }[]>([])
  const [raisedHands, setRaisedHands] = useState<string[]>([])
  const [chats, setChats] = useState([
    { user: "Alice", text: "This sounds amazing! Can't wait." },
    { user: "Bob", text: "Will there be recordings?" }
  ])

  // Simulate active viewers/listeners count oscillations
  useEffect(() => {
    const timer = setInterval(() => {
      setListenersCount((prev) => prev + (Math.random() > 0.5 ? 1 : -1))
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  // Simulate incoming floating reactions and speakers indicators
  useEffect(() => {
    let idCounter = 0
    const reactionIcons = ["💖", "🔥", "💯", "👏", "🙌", "🚀"]
    const timer = setInterval(() => {
      const icon = reactionIcons[Math.floor(Math.random() * reactionIcons.length)]
      const left = Math.floor(Math.random() * 80) + 10 // 10% to 90%
      setReactions((prev) => [...prev.slice(-15), { id: idCounter++, icon, left }])
    }, 1800)

    return () => clearInterval(timer)
  }, [])

  // Simulate speaking indicator switching
  useEffect(() => {
    const speakers = ["Host", "Co-Host Alice", "Speaker Charlie"]
    const timer = setInterval(() => {
      setActiveSpeaker(speakers[Math.floor(Math.random() * speakers.length)])
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  // Handle "Notify Me When It Launches" click
  const handleNotifyMe = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    setLoading(true)
    setNotifyMsg("")
    try {
      localStorage.setItem(`notify_${mode}_${user.uid}`, "true")
      setNotified(true)
      setNotifyMsg("Awesome! We'll notify you as soon as this feature launches.")
    } catch (err) {
      console.error(err)
      setNotifyMsg("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-600/30 overflow-x-hidden font-sans pb-16">
      
      {/* Glow Effects backdrop */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Standalone Nav Bar */}
      <nav className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/5">
        <button 
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform" />
          <span>Return to Home</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-purple-400">VibezTube Premium Preview</span>
      </nav>

      {/* HERO SECTION */}
      <header className="max-w-4xl mx-auto text-center px-6 pt-16 md:pt-24 space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400 font-bold uppercase tracking-wider animate-pulse">
          {mode === "spaces" ? <Radio className="h-3 w-3" /> : <Video className="h-3.5 w-3.5" />}
          <span>{mode === "spaces" ? "Live Spaces" : "Live Streaming"}</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent">
          {mode === "spaces" ? "🎙️ Live Audio Spaces" : "🎥 Live Streaming & Broadcasts"}
        </h1>

        <p className="text-xl md:text-2xl font-bold text-neutral-300">
          Real conversations. Real creators. Real-time experiences.
        </p>

        <p className="max-w-2xl mx-auto text-sm md:text-base text-neutral-400 leading-relaxed">
          {mode === "spaces" 
            ? "Host live audio conversations, invite co-hosts, take speaker requests, react instantly with emojis, and share ideas in real-time with millions of listeners globally."
            : "Broadcast high-definition video directly to your feed, engage with viewers through real-time chat, analyze stream performance, and cultivate a community instantly."}
        </p>

        {/* Animated Waveform graphics block */}
        <div className="h-16 flex items-center justify-center gap-1 max-w-xs mx-auto pt-4">
          {[1.2, 2.1, 1.5, 3.2, 1.8, 2.7, 1.1, 2.3, 1.9, 3.0, 1.4, 2.8, 1.7, 2.2, 1.3].map((val, idx) => (
            <div 
              key={idx} 
              className="w-1 bg-purple-500 rounded-full animate-bounce"
              style={{ 
                height: `${val * 12}px`,
                animationDelay: `${idx * 150}ms`,
                animationDuration: "1200ms"
              }}
            />
          ))}
        </div>
      </header>

      {/* DEMO PREVIEW (Interactive UI visualizer) */}
      <section className="max-w-xl mx-auto px-6 pt-12 md:pt-16">
        <div className="relative rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl overflow-hidden shadow-2xl p-6 space-y-6">
          
          {/* Header Panel */}
          <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">LIVE</span>
              <span className="text-xs text-neutral-400">· {mode === "spaces" ? "Spaces" : "Stream"}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-[11px] font-bold text-neutral-300">
              <Users className="h-3 w-3 text-purple-400" />
              <span>{listenersCount} {mode === "spaces" ? "listening" : "watching"}</span>
            </div>
          </div>

          {/* Core Demo Graphics depending on Mode */}
          {mode === "spaces" ? (
            <div className="grid grid-cols-3 gap-6 py-4 justify-items-center">
              {/* Host */}
              <div className="text-center space-y-1.5 relative">
                <div className={cn(
                  "relative h-16 w-16 rounded-full flex items-center justify-center border-2 transition-colors",
                  activeSpeaker === "Host" ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10" : "border-white/10 bg-white/5"
                )}>
                  <Mic className="h-7 w-7 text-white" />
                  {activeSpeaker === "Host" && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold">💬</span>
                  )}
                </div>
                <p className="text-xs font-bold text-neutral-200">Host (You)</p>
              </div>

              {/* Co-Host */}
              <div className="text-center space-y-1.5 relative">
                <div className={cn(
                  "relative h-16 w-16 rounded-full flex items-center justify-center border-2 transition-colors",
                  activeSpeaker === "Co-Host Alice" ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10" : "border-white/10 bg-white/5"
                )}>
                  <Users className="h-7 w-7 text-neutral-300" />
                  {activeSpeaker === "Co-Host Alice" && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold">💬</span>
                  )}
                </div>
                <p className="text-xs font-medium text-neutral-300">Alice</p>
              </div>

              {/* Speaker */}
              <div className="text-center space-y-1.5 relative">
                <div className={cn(
                  "relative h-16 w-16 rounded-full flex items-center justify-center border-2 transition-colors",
                  activeSpeaker === "Speaker Charlie" ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10" : "border-white/10 bg-white/5"
                )}>
                  <Sparkles className="h-7 w-7 text-neutral-300" />
                  {activeSpeaker === "Speaker Charlie" && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold">💬</span>
                  )}
                </div>
                <p className="text-xs text-neutral-400">Charlie</p>
              </div>
            </div>
          ) : (
            <div className="relative aspect-video rounded-xl bg-neutral-950 border border-white/5 overflow-hidden flex items-center justify-center">
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 text-[10px] font-extrabold uppercase tracking-wide border border-white/10">HD STREAM</div>
              <Video className="h-10 w-10 text-neutral-700 animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 text-left">
                <p className="text-xs font-bold">Interactive Creator Broadcast</p>
                <p className="text-[10px] text-neutral-400">Streaming live from VibezTube Studio</p>
              </div>
            </div>
          )}

          {/* Floating Emoji Reactions */}
          <div className="relative h-12 w-full overflow-hidden border-t border-white/5 pt-2">
            {reactions.map((r) => (
              <span
                key={r.id}
                className="absolute text-xl animate-float-up pointer-events-none"
                style={{ 
                  left: `${r.left}%`,
                  bottom: "0px"
                }}
              >
                {r.icon}
              </span>
            ))}
          </div>

          {/* Live Chat */}
          <div className="space-y-2.5 pt-2">
            {chats.map((c, i) => (
              <div key={i} className="flex gap-2 text-xs leading-normal bg-white/5 p-2 rounded-xl border border-white/5 animate-in slide-in-from-bottom-2 duration-300">
                <span className="font-bold text-purple-400">@{c.user}:</span>
                <span className="text-neutral-300">{c.text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button 
              onClick={() => {
                setRaisedHands((prev) => [...prev, "You"])
                setTimeout(() => setRaisedHands((prev) => prev.filter(x => x !== "You")), 4000)
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-neutral-300 hover:bg-white/10 transition-all cursor-pointer"
            >
              <Hand className="h-3.5 w-3.5 text-yellow-500" />
              <span>Raise Hand</span>
            </button>
            <button 
              onClick={() => {
                const reactionIcons = ["💖", "🔥", "💯", "👏", "🙌", "🚀"]
                const icon = reactionIcons[Math.floor(Math.random() * reactionIcons.length)]
                const left = Math.floor(Math.random() * 80) + 10
                setReactions((prev) => [...prev, { id: Date.now(), icon, left }])
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-xs text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>React</span>
            </button>
          </div>

          {raisedHands.includes("You") && (
            <div className="text-center text-[10px] text-yellow-500 animate-pulse font-semibold">
              👋 Hand raised! Wait for host.
            </div>
          )}

        </div>
      </section>

      {/* FEATURE LIST GRID */}
      <section className="max-w-4xl mx-auto px-6 pt-20 grid md:grid-cols-2 gap-8">
        <div className="p-6 rounded-2xl border border-white/5 bg-neutral-900/30 space-y-4 hover:border-purple-500/20 transition-all group">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
            <Radio className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-white">Live Audio Spaces</h3>
          <ul className="space-y-2 text-xs text-neutral-400">
            {["Host your own Space room", "Up to 2 Co-hosts support", "Invite up to 20 Speakers", "Millions of active listeners capacity", "Real-time thread live chat", "Raise Hand speak requests", "Instant interactive emoji reactions", "Share Space link invite instantly"].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 bg-neutral-900/30 space-y-4 hover:border-purple-500/20 transition-all group">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
            <Video className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-white">Live Video Streaming</h3>
          <ul className="space-y-2 text-xs text-neutral-400">
            {["Broadcast Live instantly in high-res", "Ultra-low latency HD video transmission", "Interactive real-time chat pane", "Creator view count analytics", "One-click follow while watching", "Saved video replay archives support", "Glow micro-reaction engagement mechanics", "V-Creator Studio statistics reports"].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LAUNCH STATUS & NOTIFY ME */}
      <section className="max-w-xl mx-auto px-6 pt-20">
        <div className="p-8 rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900 to-neutral-950 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 font-bold tracking-wider uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-ping" />
            <span>🚀 Currently Under Development</span>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold">Active Feature Construction</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              We're building one of the most advanced live communication experiences for VibezTube. 
              This feature is under active development and will be available in a future release update.
            </p>
          </div>

          <div className="pt-2">
            {notified ? (
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400 font-semibold animate-bounce">
                🎉 {notifyMsg}
              </div>
            ) : (
              <Button 
                onClick={() => void handleNotifyMe()}
                disabled={loading}
                className="w-full rounded-full font-bold bg-white text-black hover:bg-neutral-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Registering Request...
                  </>
                ) : (
                  <>
                    Notify Me When It Launches
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-3xl mx-auto text-center px-6 pt-24 space-y-6 border-t border-white/5 mt-16">
        <p className="text-sm italic text-neutral-400">
          &ldquo;The future of live conversations is almost here.&rdquo;
        </p>
        <div className="flex justify-center gap-6 text-xs font-bold text-purple-400">
          <button onClick={() => router.push("/")} className="hover:underline cursor-pointer">
            Explore VibezTube
          </button>
          <span className="text-neutral-700">|</span>
          <button onClick={() => router.push("/")} className="hover:underline cursor-pointer">
            Support Help center
          </button>
        </div>
      </footer>

    </div>
  )
}
