import { useEffect, useMemo, useRef, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../api/axios'
import { ReportDocumentModal, type ReportDocumentData } from '../pages/admin/zone-report/components/ReportDocumentModal'
import { fetchNabuaWeather } from '../api/weather'
import type { CurrentWeather } from '../api/weather'
import nabuaLogoUrl from '../assets/nabua_logo.png?url'
import mdrrmoLogoUrl from '../assets/Mdrrmo_logo.png?url'

function weatherIcon(code: number): string {
  if (code === 0)  return 'bi-sun-fill'
  if (code <= 3)   return 'bi-cloud-sun-fill'
  if (code <= 48)  return 'bi-cloud-fog2-fill'
  if (code <= 55)  return 'bi-cloud-drizzle-fill'
  if (code <= 65)  return 'bi-cloud-rain-fill'
  if (code <= 82)  return 'bi-cloud-rain-heavy-fill'
  return               'bi-cloud-lightning-rain-fill'
}

function weatherLabel(code: number, temp: number): string {
  const hot  = temp >= 33
  const warm = temp >= 30
  if (code === 0)  return hot ? 'Hot & Sunny' : warm ? 'Sunny' : 'Clear'
  if (code <= 3)   return 'Partly Cloudy'
  if (code <= 48)  return 'Foggy'
  if (code <= 55)  return 'Drizzle'
  if (code <= 65)  return 'Rain'
  if (code <= 82)  return 'Heavy Rain'
  if (code <= 94)  return 'Thunderstorm'
  return 'Heavy Storm'
}

interface TopBarProps {
  onToggleSidebar: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
}

interface DailyReportMeta {
  date: string
  total: number
  by_nature: Record<string, number>
}

interface NotificationItem {
  id: number
  notification_type?: 'report_submitted' | 'daily_report' | string
  report_id: number | null
  actor_username: string
  report_type: 'Emergency' | 'Incident' | string
  client_name: string | null
  submitted_at: string
  is_read: boolean
  read_at: string | null
  metadata?: DailyReportMeta | null
}

const loadImgBase64 = (url: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve('')
    img.src = url
  })

async function buildDailyReportDoc(meta: DailyReportMeta): Promise<jsPDF> {
  const [nabuaB64, mdrrmoB64] = await Promise.all([
    loadImgBase64(nabuaLogoUrl).catch(() => ''),
    loadImgBase64(mdrrmoLogoUrl).catch(() => ''),
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const dateLabel = new Date(meta.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const logoH = 18, logoW = 18
  if (nabuaB64)  doc.addImage(nabuaB64,  'PNG', 10, 6, logoW, logoH)
  if (mdrrmoB64) doc.addImage(mdrrmoB64, 'PNG', W - 10 - logoW, 6, logoW, logoH)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 40, 90)
  doc.text('Republic of the Philippines', W / 2, 9, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Municipality of Nabua, Camarines Sur', W / 2, 14, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Municipal Disaster Risk Reduction and Management Office', W / 2, 19, { align: 'center' })
  doc.setDrawColor(255, 200, 0)
  doc.setLineWidth(0.8)
  doc.line(10, 26, W - 10, 26)
  doc.setLineWidth(0.4)
  doc.line(10, 27.5, W - 10, 27.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 40, 90)
  doc.text('DAILY EMERGENCY REPORT', W / 2, 38, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(dateLabel, W / 2, 45, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 40, 90)
  doc.text(`Total Emergency Reports Today: ${meta.total}`, 14, 56)

  if (meta.total === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 120)
    doc.text('No emergency reports were recorded today.', 14, 65)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 40, 90)
    doc.text('Breakdown by Nature of Call:', 14, 65)

    const rows = Object.entries(meta.by_nature).map(([nature, count]) => [nature, String(count)])
    autoTable(doc, {
      startY: 69,
      head: [['Nature of Call', 'Count']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [15, 40, 90], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
      columnStyles: { 1: { halign: 'center', cellWidth: 25 } },
      margin: { left: 14, right: 14 },
    })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' })
  }

  return doc
}

async function downloadDailyReportPdf(meta: DailyReportMeta): Promise<void> {
  const doc = await buildDailyReportDoc(meta)
  doc.save(`Daily_Emergency_Report_${meta.date}.pdf`)
}

async function viewDailyReportPdf(meta: DailyReportMeta): Promise<string> {
  const doc = await buildDailyReportDoc(meta)
  return doc.output('bloburl') as unknown as string
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
  const [nabuaWeather, setNabuaWeather] = useState<CurrentWeather | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchNabuaWeather()
        if (!cancelled) setNabuaWeather(data.current)
      } catch { /* silently ignore — topbar widget is non-critical */ }
    }
    load()
    const interval = setInterval(load, 15 * 60 * 1000) // refresh every 15 min
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

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
  const [dailyPdfUrl, setDailyPdfUrl] = useState<string | null>(null)
  const [dailyPdfMeta, setDailyPdfMeta] = useState<DailyReportMeta | null>(null)
  const [dailyPdfLoading, setDailyPdfLoading] = useState(false)
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
          showDesktopNotification(item).catch(() => undefined)
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

  const showDesktopNotification = async (item: NotificationItem) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    if (Notification.permission !== 'granted') {
      return
    }

    const typeLabel = item.report_type === 'Emergency' ? 'Emergency' : 'Incident'
    const body = `${item.actor_username} submitted ${typeLabel} report${item.client_name ? ` for ${item.client_name}` : ''}.`

    const title = `${typeLabel} Report Submitted`
    const tag = `report-notification-${item.id}`

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(title, {
          body,
          tag,
          data: {
            reportId: item.report_id,
          },
        })
        return
      }
    }

    const desktopNotification = new Notification(title, { body, tag })
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
    // fetchNotifications depends on local callback graph; keep one interval lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        {/* Nabua live weather chip */}
        {nabuaWeather && (
          <div className="topbar-weather">
            <i className={`bi ${weatherIcon(nabuaWeather.weathercode)} topbar-weather-icon`} />
            <span className="topbar-weather-temp">{nabuaWeather.temperature}°C</span>
            <span className="topbar-weather-label">{weatherLabel(nabuaWeather.weathercode, nabuaWeather.temperature)}</span>
            <span className="topbar-weather-loc">· Nabua</span>
          </div>
        )}

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
                  <div className="notif-head-title">
                    <strong>Notifications</strong>
                    <small>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</small>
                  </div>
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
                    notifications.map((item) => {
                      const isDailyReport = item.notification_type === 'daily_report'
                      const meta = item.metadata as DailyReportMeta | null | undefined

                      if (isDailyReport) {
                        return (
                          <div
                            key={item.id}
                            className={`notif-item notif-daily${item.is_read ? '' : ' unread'}`}
                          >
                            <div className="notif-item-row">
                              <span className="notif-item-icon notif-daily-icon" aria-hidden="true">
                                <i className="bi bi-clipboard2-pulse-fill" />
                              </span>
                              <div className="notif-item-content">
                                <p className="notif-message mb-1">
                                  <strong>Daily Emergency Report</strong>
                                  {meta ? (
                                    <>
                                      {' — '}
                                      {new Date(meta.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      {' · '}
                                      <strong>{meta.total}</strong> report{meta.total !== 1 ? 's' : ''}
                                    </>
                                  ) : null}
                                </p>
                                <div className="notif-item-meta">
                                  <span className={`notif-read-pill ${item.is_read ? 'read' : 'unread'}`}>
                                    {item.is_read ? 'Read' : 'Unread'}
                                  </span>
                                  <small className="notif-time">{formatTime(item.submitted_at)}</small>
                                </div>
                                {meta && (
                                  <div className="notif-pdf-actions">
                                    <button
                                      type="button"
                                      className="notif-pdf-btn notif-view-btn"
                                      disabled={dailyPdfLoading && dailyPdfMeta?.date === meta.date}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDailyPdfMeta(meta)
                                        setDailyPdfLoading(true)
                                        void viewDailyReportPdf(meta).then((url) => {
                                          setDailyPdfUrl(url)
                                          setDailyPdfLoading(false)
                                        }).catch(() => setDailyPdfLoading(false))
                                        if (!item.is_read) {
                                          void api.post('/notifications/mark-read', { ids: [item.id] })
                                          setNotifications((prev) =>
                                            prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n)
                                          )
                                          setUnreadCount((c) => Math.max(0, c - 1))
                                        }
                                      }}
                                    >
                                      <i className="bi bi-eye me-1" />
                                      {dailyPdfLoading && dailyPdfMeta?.date === meta.date ? 'Loading...' : 'View'}
                                    </button>
                                    <button
                                      type="button"
                                      className="notif-pdf-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void downloadDailyReportPdf(meta)
                                        if (!item.is_read) {
                                          void api.post('/notifications/mark-read', { ids: [item.id] })
                                          setNotifications((prev) =>
                                            prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n)
                                          )
                                          setUnreadCount((c) => Math.max(0, c - 1))
                                        }
                                      }}
                                    >
                                      <i className="bi bi-download me-1" />
                                      Download
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <button
                          key={item.id}
                          className={`notif-item notif-item-btn${item.is_read ? '' : ' unread'}`}
                          type="button"
                          onClick={() => openNotificationReport(item)}
                        >
                          <div className="notif-item-row">
                            <span className="notif-item-icon" aria-hidden="true">
                              <i className={resolveTypeIconClass(item.report_type)} />
                            </span>

                            <div className="notif-item-content">
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

                              <div className="notif-item-meta">
                                <span className={`notif-read-pill ${item.is_read ? 'read' : 'unread'}`}>
                                  {item.is_read ? 'Read' : 'Unread'}
                                </span>
                                <small className="notif-time">{formatTime(item.submitted_at)}</small>
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <button className="topbar-icon-btn topbar-theme-toggle" onClick={onToggleDarkMode} aria-label="Toggle dark mode">
            <i className={`bi ${darkMode ? 'bi-sun' : 'bi-moon'}`} />
          </button>
        </div>
      </div>

      {isReportModalOpen && (
        <ReportDocumentModal report={selectedReport} isLoading={isReportLoading} onClose={closeReportModal} />
      )}

      {dailyPdfUrl && dailyPdfMeta && (
        <div className="daily-pdf-backdrop" onClick={() => { setDailyPdfUrl(null); setDailyPdfMeta(null) }}>
          <div className="daily-pdf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="daily-pdf-header">
              <div className="daily-pdf-title">
                <i className="bi bi-clipboard2-pulse-fill me-2" style={{ color: '#2563eb' }} />
                <span>Daily Emergency Report — {new Date(dailyPdfMeta.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="daily-pdf-actions-header">
                <button
                  type="button"
                  className="daily-pdf-dl-btn"
                  onClick={() => void downloadDailyReportPdf(dailyPdfMeta)}
                  title="Download PDF"
                >
                  <i className="bi bi-download me-1" />
                  Download
                </button>
                <button
                  type="button"
                  className="daily-pdf-close"
                  onClick={() => { setDailyPdfUrl(null); setDailyPdfMeta(null) }}
                  aria-label="Close"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>
            <div className="daily-pdf-body">
              <iframe
                src={dailyPdfUrl}
                title="Daily Emergency Report"
                className="daily-pdf-iframe"
              />
            </div>
          </div>
        </div>
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
