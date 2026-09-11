import { useEffect, useState } from 'react'
import { Download, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/Button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Check if user already dismissed in this session
    const isDismissed = sessionStorage.getItem('edutrack_pwa_dismissed')
    if (isDismissed) {
      return
    }

    // Check if already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandalone) {
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    const handleAppInstalled = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setIsVisible(false)
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err)
    } finally {
      setIsInstalling(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    sessionStorage.setItem('edutrack_pwa_dismissed', 'true')
  }

  if (!isVisible || !deferredPrompt) {
    return null
  }

  return (
    <div
      role="banner"
      aria-label="Ilovani o'rnatish taklifi"
      className="fixed bottom-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/30 bg-[rgb(var(--surface))]/95 p-4 shadow-2xl backdrop-blur-2xl transition-all hover:border-sky-500/50">
        {/* Specular neon top rim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-80" />

        <div className="flex items-start gap-3.5">
          {/* Animated 2026 Micro-SVG App Icon Badge */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-md shadow-sky-500/20">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold tracking-tight text-[rgb(var(--text))]">
                EduTrack Ilovasi
              </h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-full p-1 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))] transition"
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">
              EduTrack ilovasini telefoningizga o&apos;rnating (Tezkor va qulay)
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="h-8 px-3.5 text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sm"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {isInstalling ? "O'rnatilmoqda..." : "O'rnatish"}
              </Button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-1 text-xs font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition"
              >
                Keyinroq
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
