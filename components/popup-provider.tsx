"use client"

import React, { createContext, useContext, useState } from "react"
import { AlertCircle, CheckCircle2, AlertTriangle, X } from "lucide-react"

type PopupType = "notice" | "warning" | "error"

type PopupConfig = {
  type: PopupType
  title: string
  message: string
  onConfirm?: () => void
  onCancel?: () => void
}

type PopupContextValue = {
  showNotice: (title: string, message: string) => void
  showWarning: (title: string, message: string, onConfirm: () => void) => void
  showError: (title: string, message: string) => void
  closePopup: () => void
}

const PopupContext = createContext<PopupContextValue | undefined>(undefined)

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [popup, setPopup] = useState<PopupConfig | null>(null)

  const showNotice = (title: string, message: string) => {
    setPopup({ type: "notice", title, message })
  }

  const showWarning = (title: string, message: string, onConfirm: () => void) => {
    setPopup({ type: "warning", title, message, onConfirm })
  }

  const showError = (title: string, message: string) => {
    setPopup({ type: "error", title, message })
  }

  const closePopup = () => {
    if (popup?.onCancel) popup.onCancel()
    setPopup(null)
  }

  return (
    <PopupContext.Provider value={{ showNotice, showWarning, showError, closePopup }}>
      {children}
      {popup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 backdrop-blur-xl">
            {/* Header Status Bar */}
            <div className={`h-1.5 w-full ${
              popup.type === "error" ? "bg-red-500" : 
              popup.type === "warning" ? "bg-amber-500" : "bg-purple-500"
            }`} />

            <div className="p-5">
              <div className="flex items-start gap-3.5">
                {/* Icon wrapper */}
                <div className={`p-2 rounded-xl shrink-0 ${
                  popup.type === "error" ? "bg-red-500/10 text-red-400" :
                  popup.type === "warning" ? "bg-amber-500/10 text-amber-400" :
                  "bg-purple-500/10 text-purple-400"
                }`}>
                  {popup.type === "error" ? <AlertCircle className="h-5 w-5" /> :
                   popup.type === "warning" ? <AlertTriangle className="h-5 w-5" /> :
                   <CheckCircle2 className="h-5 w-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-foreground leading-snug">{popup.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed text-pretty">{popup.message}</p>
                </div>

                {/* Close X button */}
                {!popup.onConfirm && (
                  <button onClick={closePopup} className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-0.5 rounded-lg hover:bg-zinc-900">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex justify-end gap-2 text-xs font-semibold">
                {popup.onConfirm ? (
                  <>
                    <button
                      onClick={closePopup}
                      className="px-3.5 py-2 rounded-xl hover:bg-zinc-900 text-muted-foreground transition-colors cursor-pointer border border-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (popup.onConfirm) popup.onConfirm()
                        setPopup(null)
                      }}
                      className={`px-4 py-2 rounded-xl text-white transition-colors cursor-pointer ${
                        popup.type === "error" ? "bg-red-600 hover:bg-red-700" :
                        popup.type === "warning" ? "bg-amber-600 hover:bg-amber-700" :
                        "bg-purple-600 hover:bg-purple-700"
                      }`}
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button
                    onClick={closePopup}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-foreground transition-colors cursor-pointer border border-zinc-800"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  )
}

export function usePopup() {
  const context = useContext(PopupContext)
  if (!context) {
    throw new Error("usePopup must be used within a PopupProvider")
  }
  return context
}
