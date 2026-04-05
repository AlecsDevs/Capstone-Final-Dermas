import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const detectMobileDevice = () => {
  if (typeof window === 'undefined') {
    return false
  }

  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)
  const narrowViewport = window.matchMedia('(max-width: 767.98px)').matches
  return mobileUA || narrowViewport
}

const isStandaloneMode = () => {
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return displayModeStandalone || iosStandalone
}

export default function PwaInstallButton() {
  const location = useLocation()
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(() => detectMobileDevice())
  const [showIosHint, setShowIosHint] = useState(false)
  const [showManualHint, setShowManualHint] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }

    return Notification.permission
  })
  const [isRequestingNotification, setIsRequestingNotification] = useState(false)
  const [showDeniedHint, setShowDeniedHint] = useState(false)

  const isIosSafari = useMemo(() => {
    if (typeof window === 'undefined') {
      return false
    }

    const ua = window.navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/i.test(ua)
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
    return isiOS && isSafari
  }, [])

  const installLabel = isInstalling
    ? 'Installing...'
    : isMobileDevice
      ? 'Install Mobile'
      : 'Install Desktop'

  useEffect(() => {
    setIsInstalled(isStandaloneMode())

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setInstallEvent(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const dismissed = window.localStorage.getItem('pwaInstallDismissed') === 'true'
    setIsDismissed(dismissed)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767.98px)')
    const updateDeviceType = () => setIsMobileDevice(detectMobileDevice())
    updateDeviceType()
    media.addEventListener('change', updateDeviceType)
    window.addEventListener('resize', updateDeviceType)

    return () => {
      media.removeEventListener('change', updateDeviceType)
      window.removeEventListener('resize', updateDeviceType)
    }
  }, [])

  const hideOnPublicRoute = useMemo(() => {
    return location.pathname === '/'
  }, [location.pathname])

  const canShowInstallButton = useMemo(() => {
    return !hideOnPublicRoute && !isInstalled && !isDismissed
  }, [hideOnPublicRoute, isInstalled, isDismissed])

  const manualInstallText = useMemo(() => {
    if (typeof window === 'undefined') {
      return 'Use your browser menu and choose Install app.'
    }

    const ua = window.navigator.userAgent
    const isAndroid = /Android/i.test(ua)
    const isEdge = /Edg\//i.test(ua)
    const isChrome = /Chrome\//i.test(ua) && !isEdge

    if (isAndroid && isChrome) {
      return 'In Chrome, tap the menu (3 dots), then tap Install app or Add to Home screen.'
    }

    if (isEdge) {
      return 'In Edge, open the menu and choose Apps, then Install this site as an app.'
    }

    if (isChrome) {
      return 'In Chrome, open the menu (3 dots), then choose Cast, save, and share, then Install page as app.'
    }

    return 'Use your browser menu and choose Install app or Add to Home screen.'
  }, [])

  const handleInstall = async () => {
    if (!installEvent) {
      if (isIosSafari) {
        setShowIosHint(true)
      } else {
        setShowManualHint(true)
      }
      return
    }

    if (!installEvent || isInstalling) {
      return
    }

    setIsInstalling(true)
    try {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      if (choice.outcome === 'accepted') {
        setInstallEvent(null)
      }
    } finally {
      setIsInstalling(false)
    }
  }

  const dismissInstallPrompt = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pwaInstallDismissed', 'true')
    }
    setIsDismissed(true)
  }

  const allowNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported')
      return
    }

    setIsRequestingNotification(true)
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'denied') {
        setShowDeniedHint(true)
      }
    } finally {
      setIsRequestingNotification(false)
    }
  }

  if (!canShowInstallButton) {
    return null
  }

  return (
    <>
      <div className="pwa-install-banner" role="region" aria-label="Install app banner">
        <button type="button" className="pwa-install-btn" onClick={handleInstall}>
          <img src="/mdrrmo-icon-192.png" alt="MDRRMO" className="pwa-install-logo" />
          <span className="pwa-install-copy">
            <span className="pwa-install-subtitle">{installEvent ? installLabel : 'Add MDRRMO to Home Screen'}</span>
          </span>
        </button>

        <button
          type="button"
          className="pwa-install-close"
          onClick={dismissInstallPrompt}
          aria-label="Dismiss install prompt"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
        <button
          type="button"
          className="pwa-notify-btn"
          onClick={allowNotifications}
          disabled={isRequestingNotification}
        >
          <i className="bi bi-bell" />
          <span>{isRequestingNotification ? 'Requesting...' : 'Allow Notifications'}</span>
        </button>
      )}

      {showIosHint && (
        <div className="pwa-ios-hint-backdrop" role="dialog" aria-modal="true" aria-label="iOS install instructions">
          <div className="pwa-ios-hint-card">
            <div className="pwa-ios-hint-header">
              <h6 className="mb-0">Install on iPhone</h6>
              <button type="button" className="btn-close" onClick={() => setShowIosHint(false)} aria-label="Close"></button>
            </div>
            <p className="mb-2">In Safari, tap the Share button, then choose <strong>Add to Home Screen</strong>.</p>
            <div className="d-flex justify-content-end">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowIosHint(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualHint && (
        <div className="pwa-ios-hint-backdrop" role="dialog" aria-modal="true" aria-label="Install instructions">
          <div className="pwa-ios-hint-card">
            <div className="pwa-ios-hint-header">
              <h6 className="mb-0">Install MDRRMO App</h6>
              <button type="button" className="btn-close" onClick={() => setShowManualHint(false)} aria-label="Close"></button>
            </div>
            <p className="mb-2">{manualInstallText}</p>
            <div className="d-flex justify-content-end">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowManualHint(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeniedHint && (
        <div className="pwa-ios-hint-backdrop" role="dialog" aria-modal="true" aria-label="Notifications blocked">
          <div className="pwa-ios-hint-card">
            <div className="pwa-ios-hint-header">
              <h6 className="mb-0">Notifications Blocked</h6>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowDeniedHint(false)}
                aria-label="Close"
              ></button>
            </div>
            <p className="mb-2">Please allow notifications in browser site settings, then reload this page.</p>
            <div className="d-flex justify-content-end">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowDeniedHint(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
