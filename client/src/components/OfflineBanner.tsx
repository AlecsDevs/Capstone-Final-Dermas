import { useEffect, useState } from 'react'
import { useOnlineStatus } from '../offline/useOnlineStatus'
import { flushPendingReports, flushPendingFullReports, getPendingCount } from '../offline/syncManager'

const IconWifiOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M10.706 3.294A12.545 12.545 0 0 0 8 3C5.259 3 2.723 3.994.757 5.659l1.415 1.415A10.526 10.526 0 0 1 8 5c.83 0 1.636.097 2.407.274l.299-1.98ZM5.797 7.801A7.544 7.544 0 0 1 8 7.5a7.54 7.54 0 0 1 4.484 1.464l-1.418 1.418A5.543 5.543 0 0 0 8 9.5a5.544 5.544 0 0 0-2.658.681L4.56 8.4a7.51 7.51 0 0 1 1.237-.599Zm3.484 4.032L8 13.118l-1.281-1.285A2.545 2.545 0 0 1 8 11.5c.463 0 .898.126 1.281.333ZM.146.146a.5.5 0 0 1 .708 0L16 15.293l-.708.707L.146.854a.5.5 0 0 1 0-.708Z"/>
  </svg>
)

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
  </svg>
)

const IconSync = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="offline-spin">
    <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
    <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
  </svg>
)

export function OfflineBanner() {
  const online = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  useEffect(() => {
    getPendingCount().then(setPendingCount)
  }, [online])

  useEffect(() => {
    if (!online) return
    setSyncing(true)
    Promise.all([flushPendingReports(), flushPendingFullReports()])
      .then(() => getPendingCount())
      .then((count) => {
        setPendingCount(count)
        if (count === 0) {
          setJustSynced(true)
          window.dispatchEvent(new CustomEvent('mdrrmo-offline-synced'))
          const t = setTimeout(() => setJustSynced(false), 3000)
          return () => clearTimeout(t)
        }
      })
      .finally(() => setSyncing(false))
  }, [online])

  if (online && !syncing && !justSynced) return null

  if (online && (syncing || justSynced)) {
    return (
      <div className={`offline-banner offline-banner--syncing${justSynced ? ' offline-banner--done' : ''}`} role="status">
        {justSynced ? <IconCheck /> : <IconSync />}
        <span>{justSynced ? 'Back online — all data synced.' : 'Syncing queued data…'}</span>
      </div>
    )
  }

  return (
    <div className="offline-banner" role="alert" aria-live="assertive">
      <div className="offline-banner__left">
        <span className="offline-banner__icon"><IconWifiOff /></span>
        <div className="offline-banner__text">
          <span className="offline-banner__title">You are offline</span>
          <span className="offline-banner__sub">
            {pendingCount > 0
              ? `${pendingCount} unsaved item${pendingCount > 1 ? 's' : ''} will sync when reconnected.`
              : 'Changes will sync automatically when reconnected.'}
          </span>
        </div>
      </div>
      {pendingCount > 0 && (
        <span className="offline-banner__badge">{pendingCount}</span>
      )}
    </div>
  )
}
