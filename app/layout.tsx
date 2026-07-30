import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/components/auth-provider"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "VibezTube — Post. Watch. Go Live.",
  description:
    "VibezTube is the all-in-one social platform for posts, short videos, live audio Spaces, and live streaming. Share your vibe with the world.",
  generator: "v0.app",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#251818" },
  ],
  userScalable: false,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

import { EngagementProvider } from "@/components/engagement-provider"
import { PopupProvider } from "@/components/popup-provider"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <TooltipProvider delay={200}>
            <AuthProvider>
              <PopupProvider>
                <EngagementProvider>{children}</EngagementProvider>
              </PopupProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
