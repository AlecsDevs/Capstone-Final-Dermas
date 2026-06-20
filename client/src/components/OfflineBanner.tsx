import { useEffect, useState } from 'react'
import { useOnlineStatus } from '../offline/useOnlineStatus'
import { flushPendingReports, getPendingCount } from '../offline/syncManager'

export function OfflineBanner() {
  const online = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  // Refresh pending count whenever connectivity changes
  useEffect(() => {
    getPendingCount().then(setPendingCount)
  }, [online])

  // Auto-flush queue when back online
  useEffect(() => {
    if (!online) return
    setSyncing(true)
    flushPendingReports()
      .then(() => getPendingCount())
      .then((count) => {
        setPendingCount(count)
        if (count === 0) {
          setJustSynced(true)
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
        <i className={`bi ${justSynced ? 'bi-check-circle-fill' : 'bi-arrow-repeat offline-spin'}`} />
        <span>{justSynced ? 'Back online — all data synced.' : 'Syncing queued data…'}</span>
      </div>
    )
  }

  return (
    <div className="offline-banner" role="alert" aria-live="assertive">
      <div className="offline-banner__left">
        <i className="bi bi-wifi-off offline-banner__icon" />
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
