import { useEffect, useState } from 'react'

const DISMISS_KEY = 'stockranges_install_dismissed'

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem(DISMISS_KEY) } catch { return false }
  })

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  async function promptInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  const alreadyInstalled = isStandalone()
  const showAndroidPrompt = !alreadyInstalled && !dismissed && !!deferredPrompt
  const showIosHint = !alreadyInstalled && !dismissed && isIos()

  return { showAndroidPrompt, showIosHint, promptInstall, dismiss }
}
