import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/axios'
import { ReportDocumentModal, type ReportDocumentData } from '../pages/admin/zone-report/ReportDocumentModal'

interface TopBarProps {
  onToggleSidebar: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
}

interface NotificationItem {
  id: number
  report_id: number
  actor_username: string
  report_type: 'Emergency' | 'Incident' | string
  client_name: string | null
  submitted_at: string
  is_read: boolean
  read_at: string | null
}

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const TopBar = ({ onToggleSidebar, darkMode, onToggleDarkMode }: TopBarProps) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }

    return Notification.permission
  })
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportDocumentData | null>(null)
  const notifRef = useRef<HTMLDivElement | null>(null)
  const hasHydratedNotificationsRef = useRef(false)
  const seenNotificationIdsRef = useRef<Set<number>>(new Set())

  const fetchNotifications = async () => {
    setIsLoadingNotifs(true)
    try {
      const response = await api.get('/notifications', {
        params: {
          limit: 20,
        },
      })

      const items = Array.isArray(response.data?.items) ? response.data.items : []

      if (!hasHydratedNotificationsRef.current) {
        seenNotificationIdsRef.current = new Set(items.map((item: NotificationItem) => item.id))
        hasHydratedNotificationsRef.current = true
      } else {
        const newItems = items.filter((item: NotificationItem) => !seenNotificationIdsRef.current.has(item.id))
        newItems.forEach((item: NotificationItem) => {
          showDesktopNotification(item)
          seenNotificationIdsRef.current.add(item.id)
        })
      }

      setNotifications(items)
      setUnreadCount(Number(response.data?.unread_count ?? 0))
    } catch {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoadingNotifs(false)
    }
  }

  const setNotificationReadState = (ids: number[] | null) => {
    const changed = new Set(ids ?? notifications.filter((item) => !item.is_read).map((item) => item.id))

    if (changed.size < 1) {
      return
    }

    setNotifications((prev) =>
      prev.map((item) => (changed.has(item.id) ? { ...item, is_read: true, read_at: new Date().toISOString() } : item))
    )

    setUnreadCount((prev) => {
      if (ids === null) {
        return 0
      }

      return Math.max(0, prev - changed.size)
    })
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-read')
      setNotificationReadState(null)
    } catch {
      // Keep UI unchanged if mark-read fails.
    }
  }

  const markNotificationRead = async (id: number) => {
    try {
      await api.post('/notifications/mark-read', { ids: [id] })
      setNotificationReadState([id])
    } catch {
      // Keep UI unchanged if mark-read fails.
    }
  }

  const closeReportModal = () => {
    setIsReportModalOpen(false)
    setIsReportLoading(false)
    setSelectedReport(null)
  }

  const openNotificationReport = async (item: NotificationItem) => {
    setIsReportModalOpen(true)
    setIsReportLoading(true)

    if (!item.is_read) {
      markNotificationRead(item.id).catch(() => undefined)
    }

    try {
      const response = await api.get(`/reports/${item.report_id}`)
      setSelectedReport(response.data as ReportDocumentData)
    } catch {
      setSelectedReport(null)
    } finally {
      setIsReportLoading(false)
    }
  }

  const showDesktopNotification = (item: NotificationItem) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    if (Notification.permission !== 'granted') {
      return
    }

    const typeLabel = item.report_type === 'Emergency' ? 'Emergency' : 'Incident'
    const body = `${item.actor_username} submitted ${typeLabel} report${item.client_name ? ` for ${item.client_name}` : ''}.`

    const desktopNotification = new Notification(`${typeLabel} Report Submitted`, {
      body,
      tag: `report-notification-${item.id}`,
    })

    desktopNotification.onclick = () => {
      window.focus()
      openNotificationReport(item).catch(() => undefined)
      desktopNotification.close()
    }
  }

  const enableDesktopAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setDesktopPermission('unsupported')
      return
    }

    setIsRequestingPermission(true)
    try {
      const result = await Notification.requestPermission()
      setDesktopPermission(result)

      if (result === 'granted') {
        setIsAlertsModalOpen(false)
      }
    } finally {
      setIsRequestingPermission(false)
    }
  }

  const resolveTypeIconClass = (type: string) => {
    if (type === 'Emergency') {
      return 'bi bi-exclamation-octagon-fill notif-type-icon emergency'
    }

    return 'bi bi-shield-fill-exclamation notif-type-icon incident'
  }

  useEffect(() => {
    fetchNotifications().catch(() => undefined)

    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return
      }

      fetchNotifications().catch(() => undefined)
    }, 15000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!notifRef.current) {
        return
      }

      if (!notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const bellBadge = useMemo(() => {
    if (unreadCount <= 0) {
      return null
    }

    if (unreadCount > 99) {
      return '99+'
    }

    return String(unreadCount)
  }, [unreadCount])

  const handleToggleNotifications = () => {
    const next = !isNotifOpen
    setIsNotifOpen(next)

    if (next) {
      fetchNotifications().catch(() => undefined)
    }
  }

  return (
    <>
      <div className="topbar">
        {/* Hamburger – mobile only */}
        <button className="topbar-hamburger d-lg-none" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <i className="bi bi-list" />
        </button>

        <div className="topbar-brand" title="MDRRMO Report System">
          MDRRMO Report System
        </div>

        {/* Spacer */}
        <div className="topbar-spacer" />

        {/* Right actions */}
        <div className="topbar-actions">
          <div className="topbar-notif-wrap" ref={notifRef}>
            <button
              className="topbar-icon-btn"
              aria-label="Notifications"
              aria-expanded={isNotifOpen}
              onClick={handleToggleNotifications}
            >
              <i className="bi bi-bell" />
              {bellBadge && <span className="notif-badge">{bellBadge}</span>}
            </button>

            {isNotifOpen && (
              <div className="notif-dropdown" role="dialog" aria-label="Notification list">
                <div className="notif-dropdown-head">
                  <strong>Notifications</strong>
                  <div className="notif-head-actions">
                    {desktopPermission !== 'unsupported' && desktopPermission !== 'granted' && (
                      <button className="notif-enable-alerts" onClick={() => setIsAlertsModalOpen(true)} type="button">
                        {desktopPermission === 'denied' ? 'Alerts blocked' : 'Enable alerts'}
                      </button>
                    )}
                    <button
                      className="notif-mark-read"
                      onClick={markAllRead}
                      disabled={unreadCount <= 0}
                      type="button"
                    >
                      Mark all read
                    </button>
                  </div>
                </div>

                <div className="notif-dropdown-body">
                  {isLoadingNotifs ? (
                    <p className="notif-empty">Loading notifications...</p>
                  ) : notifications.length === 0 ? (
                    <p className="notif-empty">No notifications yet.</p>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        className={`notif-item notif-item-btn${item.is_read ? '' : ' unread'}`}
                        type="button"
                        onClick={() => openNotificationReport(item)}
                      >
                        <div className="notif-item-head mb-1">
                          <span className="notif-type-pill">
                            <i className={resolveTypeIconClass(item.report_type)} />
                            {item.report_type}
                          </span>
                          <span className={`notif-read-pill ${item.is_read ? 'read' : 'unread'}`}>
                            {item.is_read ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        <p className="notif-message mb-1">
                          <strong>{item.actor_username}</strong> submitted a <strong>{item.report_type}</strong> report
                          {item.client_name ? (
                            <>
                              {' '}
                              for <strong>{item.client_name}</strong>
                            </>
                          ) : (
                            <> with no client name</>
                          )}
                          .
                        </p>
                        <small className="notif-time">{formatTime(item.submitted_at)}</small>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <button className="topbar-icon-btn" onClick={onToggleDarkMode} aria-label="Toggle dark mode">
            <i className={`bi ${darkMode ? 'bi-sun' : 'bi-moon'}`} />
          </button>
        </div>
      </div>

      {isReportModalOpen && (
        <ReportDocumentModal report={selectedReport} isLoading={isReportLoading} onClose={closeReportModal} />
      )}

      {isAlertsModalOpen && (
        <div className="notif-permission-backdrop" role="dialog" aria-modal="true" aria-label="Enable alerts modal">
          <div className="notif-permission-card">
            <div className="notif-permission-head">
              <h5 className="mb-0">Enable Desktop Alerts</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => setIsAlertsModalOpen(false)}
              />
            </div>

            <div className="notif-permission-body">
              {desktopPermission === 'denied' ? (
                <>
                  <p className="mb-2">Notifications are blocked in your browser.</p>
                  <p className="mb-0 text-muted small">
                    Please allow notifications from your browser site settings, then reload this page.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-2">Enable alerts to receive popup notifications on your PC for new reports.</p>
                  <p className="mb-0 text-muted small">Supported in Chrome, Edge, Firefox and other modern browsers.</p>
                </>
              )}
            </div>

            <div className="notif-permission-foot">
              <button className="btn btn-outline-secondary" type="button" onClick={() => setIsAlertsModalOpen(false)}>
                Cancel
              </button>
              {desktopPermission !== 'denied' && (
                <button className="btn btn-primary" type="button" onClick={enableDesktopAlerts} disabled={isRequestingPermission}>
                  {isRequestingPermission ? 'Requesting...' : 'Allow alerts'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
