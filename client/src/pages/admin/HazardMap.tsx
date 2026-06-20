import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polygon, Tooltip, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../../style/dashboard.css'
import { BARANGAY_POLYGONS, CENTROID_ENTRIES, POLYGON_CENTROIDS } from './DashboardMap'
import api from '../../api/axios'
import { ReportDocumentModal, type ReportDocumentData } from './zone-report/components/ReportDocumentModal'

// ── Hazard type palette ────────────────────────────────────────────────────────
const HAZARD: Record<string, { color: string; fill: string; bg: string; icon: string; label: string }> = {
  Flood:               { color: '#1e40af', fill: '#3b82f6', bg: '#eff6ff', icon: 'bi-water',          label: 'Flood' },
  Earthquake:          { color: '#92400e', fill: '#f59e0b', bg: '#fef3c7', icon: 'bi-globe-americas',  label: 'Earthquake' },
  Typhoon:             { color: '#0369a1', fill: '#38bdf8', bg: '#e0f2fe', icon: 'bi-wind',            label: 'Typhoon' },
  Landslide:           { color: '#9a3412', fill: '#f97316', bg: '#fff7ed', icon: 'bi-triangle-fill',   label: 'Landslide' },
  Tsunami:             { color: '#0f766e', fill: '#2dd4bf', bg: '#f0fdfa', icon: 'bi-tsunami',         label: 'Tsunami' },
  'Volcanic Eruption': { color: '#be123c', fill: '#fb923c', bg: '#fff7ed', icon: 'bi-fire',            label: 'Volcanic Eruption' },
}
const HAZARD_KEYS = Object.keys(HAZARD)

const SEV: Record<string, { color: string; fill: string; bg: string; label: string; icon: string; order: number }> = {
  High:     { color: '#dc2626', fill: '#fca5a5', bg: '#fef2f2', label: 'High',     icon: 'bi-exclamation-triangle-fill', order: 3 },
  Moderate: { color: '#d97706', fill: '#fcd34d', bg: '#fffbeb', label: 'Moderate', icon: 'bi-dash-circle-fill',          order: 2 },
  Low:      { color: '#16a34a', fill: '#86efac', bg: '#f0fdf4', label: 'Low',      icon: 'bi-check-circle-fill',         order: 1 },
}
const SEV_KEYS = ['High', 'Moderate', 'Low'] as const

const SAFE = { color: '#5b21b6', fill: '#8b5cf6', bg: '#f5f3ff' }
const NABUA_CENTER: [number, number] = [13.41, 123.38]

// ── Types ─────────────────────────────────────────────────────────────────────
export interface HazardReport {
  id:              number
  latitude:        string | null
  longitude:       string | null
  incidentAddress?: string | null
  hazardType:      string | null
  severityLevel?:  string | null
  reportDate?:     string | null
}
interface HazardMapProps { reports: HazardReport[]; isLoading?: boolean }

// ── FlyTo controller ──────────────────────────────────────────────────────────
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo(target, 15, { duration: 0.7 }) }, [target, map])
  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveBarangay(r: HazardReport): string | null {
  const lat = Number(r.latitude), lng = Number(r.longitude)
  if (r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng)) {
    let nearest = '', minDist = Infinity
    CENTROID_ENTRIES.forEach(([n, [bLat, bLng]]) => {
      const d = Math.hypot(lat - bLat, lng - bLng)
      if (d < minDist) { minDist = d; nearest = n }
    })
    return nearest || null
  }
  if (r.incidentAddress) {
    const s = r.incidentAddress.replace(/^nabua\s*/i, '').trim().toLowerCase()
    // Exact match first
    const exact = CENTROID_ENTRIES.find(([n]) => n.toLowerCase() === s)
    if (exact) return exact[0]
    // Fuzzy: check if either side contains the other (handles partial names like "San Miguel" vs "Nabua San Miguel")
    const fuzzy = CENTROID_ENTRIES.find(([n]) => {
      const nl = n.toLowerCase()
      return nl.includes(s) || s.includes(nl)
    })
    return fuzzy ? fuzzy[0] : null
  }
  return null
}

function fmtDate(d: string): string {
  const dt = new Date(d.slice(0, 10) + 'T00:00:00')
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtDateFull(d: string): string {
  const dt = new Date(d.slice(0, 10) + 'T00:00:00')
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateRange(dates: string[]): string {
  if (!dates.length) return ''
  const sorted = [...dates].sort()
  const a = fmtDate(sorted[0]), b = fmtDate(sorted[sorted.length - 1])
  return a === b ? a : `${a} – ${b}`
}

function normaliseHazard(raw: string | null): string {
  if (!raw) return ''
  const t = raw.trim()
  for (const key of HAZARD_KEYS) {
    if (t.toLowerCase().includes(key.toLowerCase())) return key
  }
  return t
}

function resolveReportCoords(r: HazardReport): [number, number] | null {
  const lat = Number(r.latitude), lng = Number(r.longitude)
  if (r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng)) return [lat, lng]
  const bName = resolveBarangay(r)
  if (bName && POLYGON_CENTROIDS[bName]) {
    const c = POLYGON_CENTROIDS[bName]
    // small deterministic jitter so multiple reports on same centroid don't stack
    const angle = ((r.id ?? 0) * 137.508) % 360
    const rad = (angle * Math.PI) / 180
    const s = 0.0007
    return [c[0] + Math.sin(rad) * s, c[1] + Math.cos(rad) * s]
  }
  return null
}

// Pre-compute pin icons at module level to avoid creating new objects on every render
function _makePin(fill: string, border: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${fill};border:2.5px solid ${border};box-shadow:0 2px 8px rgba(0,0,0,0.32);cursor:pointer;"></div>`,
    className: '', iconSize: [14, 14], iconAnchor: [7, 7],
  })
}
const HAZARD_PIN_ICONS: Record<string, L.DivIcon> = Object.fromEntries(
  HAZARD_KEYS.map(k => [k, _makePin(HAZARD[k].fill, HAZARD[k].color)])
)
const SEV_PIN_ICONS: Record<string, L.DivIcon> = {
  High:     _makePin(SEV.High.fill,     SEV.High.color),
  Moderate: _makePin(SEV.Moderate.fill, SEV.Moderate.color),
  Low:      _makePin(SEV.Low.fill,      SEV.Low.color),
}

// ── Report pin layer (inside MapContainer) ────────────────────────────────────
function ReportPinLayer({ reports, activeFilter, onView }: {
  reports: HazardReport[]
  activeFilter: string | null
  onView: (id: number) => void
}) {
  return (
    <>
      {reports.map(r => {
        const h = normaliseHazard(r.hazardType)
        if (!h || !HAZARD[h]) return null
        if (activeFilter && h !== activeFilter) return null
        const coords = resolveReportCoords(r)
        if (!coords) return null
        const hMeta  = HAZARD[h]
        const sev    = r.severityLevel?.trim() ?? 'Low'
        const svMeta = SEV[sev] ?? SEV.Low
        const icon   = activeFilter
          ? (SEV_PIN_ICONS[sev] ?? SEV_PIN_ICONS.Low)
          : (HAZARD_PIN_ICONS[h] ?? HAZARD_PIN_ICONS.Flood)
        return (
          <Marker key={`rpin-${r.id}`} position={coords} icon={icon} zIndexOffset={200}>
            <Tooltip direction="top" opacity={1} offset={[0, -8]}>
              <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 155 }}>
                <div style={{ fontWeight: 700, color: hMeta.color, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className={`bi ${hMeta.icon}`} style={{ fontSize: 12 }} />{h}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: '#374151' }}>Severity:</span>
                  <span style={{ background: svMeta.bg, color: svMeta.color, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{sev}</span>
                </div>
                {r.reportDate && (
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    <i className="bi bi-calendar3 me-1" />{fmtDate(r.reportDate)}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
                  <i className="bi bi-hand-index me-1" />Click to view report
                </div>
              </div>
            </Tooltip>
            <Popup autoPan={false} closeButton={false} offset={[0, -10]}>
              <div style={{ minWidth: 195, fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, padding: '6px 10px', background: hMeta.bg, borderRadius: 8 }}>
                  <i className={`bi ${hMeta.icon}`} style={{ color: hMeta.color, fontSize: 14 }} />
                  <span style={{ fontWeight: 700, color: hMeta.color, fontSize: 13 }}>{h}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6b7280' }}>Report #{r.id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Severity:</span>
                  <span style={{ background: svMeta.bg, color: svMeta.color, border: `2px solid ${svMeta.color}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 800 }}>
                    <i className={`bi ${svMeta.icon} me-1`} />{sev}
                  </span>
                </div>
                {r.reportDate && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="bi bi-calendar3" style={{ color: '#9ca3af' }} />{fmtDate(r.reportDate)}
                  </div>
                )}
                <button type="button"
                  onClick={() => onView(r.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: hMeta.bg, border: `1.5px solid ${hMeta.color}`, color: hMeta.color, width: '100%', justifyContent: 'center', transition: 'all .12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = hMeta.color; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = hMeta.bg; e.currentTarget.style.color = hMeta.color }}
                >
                  <i className="bi bi-file-earmark-text" style={{ fontSize: 13 }} />
                  View Document
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export function HazardMap({ reports, isLoading }: HazardMapProps) {
  const [activeFilter,     setActiveFilter]     = useState<string | null>(null)
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null)
  const [flyTarget,        setFlyTarget]        = useState<[number, number] | null>(null)
  const [isFullscreen,     setIsFullscreen]     = useState(false)
  const [showSummary,      setShowSummary]      = useState(false)
  const [fsFilter,         setFsFilter]         = useState<string | null>(null)
  const [dark,             setDark]             = useState(() => document.documentElement.classList.contains('dark'))
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 4)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [listModal,      setListModal]      = useState<{ barangay: string; hazard: string; items: { id: number; date: string | null; severity: string }[] } | null>(null)
  const [docReport,      setDocReport]      = useState<ReportDocumentData | null>(null)
  const [docLoading,     setDocLoading]     = useState(false)
  const markerRef  = useRef<L.Marker | null>(null)

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  async function openDoc(id: number) {
    setDocLoading(true); setDocReport(null)
    try { const res = await api.get(`/reports/${id}`); setDocReport(res.data as ReportDocumentData) }
    catch { setDocReport(null) }
    finally { setDocLoading(false) }
  }

  // Date preset helpers
  const _now = new Date()
  const _todayStr = _now.toISOString().slice(0, 10)
  const _year = _now.getFullYear()
  const _thisMonthStart = `${_year}-${String(_now.getMonth() + 1).padStart(2, '0')}-01`
  const _last5Start = (() => { const d = new Date(_now); d.setDate(d.getDate() - 4); return d.toISOString().slice(0, 10) })()
  const activePreset =
    dateFrom === _last5Start && dateTo === _todayStr ? 'last5' :
    dateFrom === _thisMonthStart && dateTo === _todayStr ? 'thisMonth' :
    dateFrom === `${_year}-06-01` && dateTo === `${_year}-06-30` ? 'jun' :
    dateFrom === `${_year}-07-01` && dateTo === `${_year}-07-31` ? 'jul' :
    dateFrom === `${_year}-01-01` && dateTo === _todayStr ? 'thisYear' :
    !dateFrom && !dateTo ? 'all' : null as string | null
  function applyPreset(p: string) {
    if (p === 'last5') { setDateFrom(_last5Start); setDateTo(_todayStr) }
    else if (p === 'thisMonth') { setDateFrom(_thisMonthStart); setDateTo(_todayStr) }
    else if (p === 'jun') { setDateFrom(`${_year}-06-01`); setDateTo(`${_year}-06-30`) }
    else if (p === 'jul') { setDateFrom(`${_year}-07-01`); setDateTo(`${_year}-07-31`) }
    else if (p === 'thisYear') { setDateFrom(`${_year}-01-01`); setDateTo(_todayStr) }
    else { setDateFrom(''); setDateTo('') }
  }

  // Auto-open popup after flyTo lands
  useEffect(() => {
    if (!selectedBarangay) return
    const t = setTimeout(() => markerRef.current?.openPopup(), 850)
    return () => clearTimeout(t)
  }, [selectedBarangay])

  // Filter reports by date range
  const filteredReports = useMemo(() => {
    if (!dateFrom && !dateTo) return reports
    return reports.filter(r => {
      if (!r.reportDate) return true
      const d = r.reportDate.slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      return true
    })
  }, [reports, dateFrom, dateTo])

  // Build per-barangay data
  const barangayData = useMemo(() => {
    const hazardCounts:   Record<string, Record<string, number>> = {}
    const hazardSev:      Record<string, Record<string, string>> = {}
    const hazardDates:    Record<string, Record<string, string[]>> = {}
    const hazardReports:  Record<string, Record<string, { id: number; date: string | null; severity: string }[]>> = {}
    Object.keys(BARANGAY_POLYGONS).forEach(n => {
      hazardCounts[n] = {}; hazardSev[n] = {}; hazardDates[n] = {}; hazardReports[n] = {}
    })

    filteredReports.forEach(r => {
      const h = normaliseHazard(r.hazardType)
      if (!h || !HAZARD[h]) return
      const bName = resolveBarangay(r)
      if (!bName) return
      hazardCounts[bName][h] = (hazardCounts[bName][h] ?? 0) + 1
      const sev = r.severityLevel?.trim() ?? 'Low'
      const cur = hazardSev[bName][h]
      if ((SEV[sev]?.order ?? 1) > (SEV[cur]?.order ?? 0)) hazardSev[bName][h] = sev
      if (r.reportDate) {
        if (!hazardDates[bName][h]) hazardDates[bName][h] = []
        hazardDates[bName][h].push(r.reportDate.slice(0, 10))
      }
      if (!hazardReports[bName][h]) hazardReports[bName][h] = []
      hazardReports[bName][h].push({ id: r.id, date: r.reportDate ?? null, severity: sev })
    })

    const result: Record<string, {
      dominant: string | null; total: number
      hazards: { name: string; count: number; severity: string; dates: string[]; reports: { id: number; date: string | null; severity: string }[] }[]
    }> = {}
    Object.keys(BARANGAY_POLYGONS).forEach(bName => {
      const entries = Object.entries(hazardCounts[bName]).sort((a, b) => b[1] - a[1])
      result[bName] = {
        dominant: entries[0]?.[0] ?? null,
        total:    entries.reduce((s, [, c]) => s + c, 0),
        hazards:  entries.map(([name, count]) => ({
          name, count,
          severity: hazardSev[bName][name] ?? 'Low',
          dates:    [...new Set(hazardDates[bName]?.[name] ?? [])].sort(),
          reports:  (hazardReports[bName]?.[name] ?? []).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
        })),
      }
    })
    return result
  }, [filteredReports])

  const sortedBarangays = useMemo(() =>
    Object.keys(BARANGAY_POLYGONS).sort((a, b) => {
      const diff = (barangayData[b]?.total ?? 0) - (barangayData[a]?.total ?? 0)
      return diff !== 0 ? diff : a.localeCompare(b)
    }),
  [barangayData])

  const hazardBarangayCounts = useMemo(() => {
    const c: Record<string, number> = Object.fromEntries(HAZARD_KEYS.map(k => [k, 0]))
    Object.values(barangayData).forEach(({ hazards }) =>
      hazards.forEach(({ name }) => { if (name in c) c[name]++ })
    )
    return c
  }, [barangayData])

  const hazardReportCounts = useMemo(() => {
    const c: Record<string, number> = Object.fromEntries(HAZARD_KEYS.map(k => [k, 0]))
    filteredReports.forEach(r => {
      const h = normaliseHazard(r.hazardType)
      if (h && h in c) c[h]++
    })
    return c
  }, [filteredReports])

  function selectBarangay(name: string) {
    if (selectedBarangay === name) { setSelectedBarangay(null); setFlyTarget(null); return }
    setSelectedBarangay(name)
    const coords = POLYGON_CENTROIDS[name]
    if (coords) setFlyTarget([coords[0], coords[1]])
  }

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 500, color: '#6b7280', gap: 10 }}>
      <div className="spinner-border spinner-border-sm text-primary" role="status" />
      Loading hazard data…
    </div>
  )

  // Selected barangay info for the pin
  const selCoords  = selectedBarangay ? POLYGON_CENTROIDS[selectedBarangay] : null
  const selData    = selectedBarangay ? barangayData[selectedBarangay] : null
  const selHEntry  = activeFilter ? selData?.hazards.find(h => h.name === activeFilter) : null
  const selHazard  = activeFilter ? selHEntry?.name ?? null : selData?.dominant ?? null
  const selH       = selHazard ? HAZARD[selHazard] : null
  const selSevKey  = activeFilter && selHEntry ? selHEntry.severity : null
  const selSev     = selSevKey ? SEV[selSevKey] : null
  // When a specific hazard filter is active, pin color = severity color
  const pinColor   = activeFilter ? (selSev?.color ?? SAFE.color) : (selH?.color ?? SAFE.color)

  const pinIcon = L.divIcon({
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${pinColor};border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.45);cursor:pointer;"></div>`,
    className: '', iconSize: [22, 22], iconAnchor: [11, 11],
  })

  return (
    <div style={{ width: '100%', minWidth: 0 }}>

      {/* ── Filter buttons ───────────────────────────────────── */}
      <div className="hm-filter-bar">
        <button type="button"
          onClick={() => { setActiveFilter(null); setSelectedBarangay(null); setFlyTarget(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: activeFilter === null ? '#1e293b' : (dark ? '#263347' : '#f8fafc'), border: `2px solid ${activeFilter === null ? '#1e293b' : (dark ? '#374151' : '#e2e8f0')}`, color: activeFilter === null ? '#fff' : (dark ? '#d1d5db' : '#374151'), transition: 'all .15s' }}>
          <i className="bi bi-layers-fill" style={{ fontSize: 12 }} />
          All Types
          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 6px', background: activeFilter === null ? 'rgba(255,255,255,0.2)' : (dark ? '#374151' : '#f1f5f9'), color: activeFilter === null ? '#fff' : (dark ? '#d1d5db' : '#374151') }}>
            {Object.values(barangayData).filter(d => d.total > 0).length}
          </span>
        </button>

        {HAZARD_KEYS.map(key => {
          const h = HAZARD[key], active = activeFilter === key, count = hazardBarangayCounts[key]
          return (
            <button key={key} type="button"
              onClick={() => { setActiveFilter(active ? null : key); setSelectedBarangay(null); setFlyTarget(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: active ? h.color : (dark ? '#263347' : '#f8fafc'), border: `2px solid ${active ? h.color : (dark ? '#374151' : '#e2e8f0')}`, color: active ? '#fff' : (dark ? '#d1d5db' : '#374151'), transition: 'all .15s', boxShadow: active ? `0 2px 8px ${h.color}44` : 'none' }}>
              <i className={`bi ${h.icon}`} style={{ fontSize: 12 }} />
              {h.label}
              {count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 6px', background: active ? 'rgba(255,255,255,0.25)' : h.bg, color: active ? '#fff' : h.color }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}

        {/* Full Screen button */}
        <button type="button"
          onClick={() => setIsFullscreen(true)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: dark ? '#263347' : '#f8fafc', border: `2px solid ${dark ? '#374151' : '#e2e8f0'}`, color: dark ? '#d1d5db' : '#374151', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb' }}
          onMouseLeave={e => { e.currentTarget.style.background = dark ? '#263347' : '#f8fafc'; e.currentTarget.style.borderColor = dark ? '#374151' : '#e2e8f0'; e.currentTarget.style.color = dark ? '#d1d5db' : '#374151' }}
        >
          <i className="bi bi-arrows-fullscreen" style={{ fontSize: 12 }} />
          Full Screen
        </button>
      </div>

      {/* ── Date Range Filter ─────────────────────────────────── */}
      <div className="hm-date-bar">
        <i className="bi bi-calendar-range" style={{ color: '#1d4ed8', fontSize: 13, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: dark ? '#d1d5db' : '#374151', flexShrink: 0 }}>Date Range:</span>
        {([
          { key: 'last5',     label: 'Last 5 Days' },
          { key: 'thisMonth', label: 'This Month'  },
          { key: 'jun',       label: 'June'        },
          { key: 'jul',       label: 'July'        },
          { key: 'thisYear',  label: 'This Year'   },
          { key: 'all',       label: 'All Time'    },
        ] as const).map(({ key, label }) => {
          const isActive = activePreset === key
          return (
            <button key={key} type="button" onClick={() => applyPreset(key)}
              style={{ padding: '3px 11px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 11, background: isActive ? '#1d4ed8' : (dark ? '#374151' : '#fff'), border: `1.5px solid ${isActive ? '#1d4ed8' : (dark ? '#4b5563' : '#e2e8f0')}`, color: isActive ? '#fff' : (dark ? '#d1d5db' : '#374151'), transition: 'all .12s', flexShrink: 0 }}>
              {label}
            </button>
          )
        })}
        <div className="hm-date-inputs">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '3px 8px', fontSize: 11, border: `1.5px solid ${dark ? '#4b5563' : '#e2e8f0'}`, borderRadius: 8, color: dark ? '#d1d5db' : '#374151', background: dark ? '#374151' : '#fff', cursor: 'pointer', minWidth: 0, flex: 1 }} />
          <span style={{ fontSize: 11, color: '#9ca3af' }}>–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: '3px 8px', fontSize: 11, border: `1.5px solid ${dark ? '#4b5563' : '#e2e8f0'}`, borderRadius: 8, color: dark ? '#d1d5db' : '#374151', background: dark ? '#374151' : '#fff', cursor: 'pointer', minWidth: 0, flex: 1 }} />
          {(dateFrom || dateTo) && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>
              {filteredReports.length} / {reports.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Map ─────────────────────────────────────────────── */}
      <div style={{ height: 390, borderRadius: 10, overflow: 'hidden', border: '1px solid #dee2e6', position: 'relative', marginBottom: 8 }}>
            <MapContainer center={NABUA_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyTo target={flyTarget} />

              {/* Barangay polygons */}
              {Object.entries(BARANGAY_POLYGONS).map(([name, positions]) => {
                const d           = barangayData[name]
                const isSelected  = name === selectedBarangay

                // ── All Types mode: color by dominant hazard
                // ── Specific filter mode: color by severity of that hazard
                let fillColor: string, strokeColor: string, fillOpacity: number, opacity: number

                if (activeFilter) {
                  const hEntry = d?.hazards.find(hh => hh.name === activeFilter)
                  if (hEntry) {
                    const sv = SEV[hEntry.severity] ?? SEV.Low
                    fillColor   = sv.fill
                    strokeColor = isSelected ? '#1e293b' : sv.color
                    fillOpacity = isSelected ? 0.85 : 0.7
                    opacity     = 1
                  } else {
                    fillColor   = SAFE.fill
                    strokeColor = SAFE.color
                    fillOpacity = 0.12
                    opacity     = 0.35
                  }
                } else {
                  const dominant = d?.dominant ?? null
                  const h        = dominant ? HAZARD[dominant] : null
                  fillColor   = h ? h.fill : SAFE.fill
                  strokeColor = isSelected ? '#1e293b' : (h?.color ?? SAFE.color)
                  fillOpacity = isSelected ? 0.82 : dominant ? 0.65 : 0.3
                  opacity     = 1
                }

                return (
                  <Polygon
                    key={name} positions={positions}
                    pathOptions={{ color: strokeColor, weight: isSelected ? 3 : 1.5, fillColor, fillOpacity, opacity }}
                    eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); selectBarangay(name) } }}
                  >
                    <Tooltip direction="top" opacity={1} sticky>
                      <div style={{ fontSize: 12, lineHeight: 1.7, minWidth: 195 }}>
                        <div style={{ fontWeight: 700, color: '#111827', marginBottom: 5, fontSize: 13 }}>
                          <i className="bi bi-geo-alt-fill me-1" style={{ color: strokeColor }} />{name}
                        </div>

                        {/* Specific hazard filter → show severity prominently */}
                        {activeFilter ? (() => {
                          const hEntry = d?.hazards.find(hh => hh.name === activeFilter)
                          const hp = HAZARD[activeFilter]
                          if (!hEntry || !hp) return (
                            <span style={{ background: SAFE.bg, color: SAFE.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                              No {activeFilter} records
                            </span>
                          )
                          const sv = SEV[hEntry.severity] ?? SEV.Low
                          const dateStr = fmtDateRange(hEntry.dates)
                          return (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                <i className={`bi ${hp.icon}`} style={{ color: hp.color, fontSize: 12 }} />
                                <span style={{ fontWeight: 700, color: hp.color, fontSize: 12 }}>{activeFilter}</span>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>{hEntry.count} report{hEntry.count !== 1 ? 's' : ''}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: dateStr ? 4 : 0 }}>
                                <span style={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Severity:</span>
                                <span style={{ background: sv.bg, color: sv.color, border: `1.5px solid ${sv.color}`, borderRadius: 20, padding: '2px 12px', fontSize: 12, fontWeight: 800 }}>
                                  <i className={`bi ${sv.icon} me-1`} />{sv.label}
                                </span>
                              </div>
                              {dateStr && <div style={{ fontSize: 10, color: '#6b7280' }}><i className="bi bi-calendar3 me-1" />{dateStr}</div>}
                            </div>
                          )
                        })() : (
                          /* All Types mode → show all hazards */
                          !d || d.total === 0 ? (
                            <span style={{ background: SAFE.bg, color: SAFE.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                              Safe — No Hazard Records
                            </span>
                          ) : d.hazards.map(({ name: hn, count, severity }) => {
                            const hp = HAZARD[hn], sc = SEV[severity]
                            if (!hp) return null
                            return (
                              <div key={hn} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: hp.fill, border: `2px solid ${hp.color}`, flexShrink: 0, display: 'inline-block' }} />
                                <span style={{ fontSize: 11, fontWeight: 700, color: hp.color }}>{hn}</span>
                                <span style={{ fontSize: 10, color: '#6b7280' }}>{count} report{count !== 1 ? 's' : ''}</span>
                                {sc && <span style={{ fontSize: 10, fontWeight: 700, color: sc.color }}>· {sc.label}</span>}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </Tooltip>
                  </Polygon>
                )
              })}

              {/* ── Individual report pins ── */}
              <ReportPinLayer reports={filteredReports} activeFilter={activeFilter} onView={openDoc} />

              {/* ── Selected barangay center pin ── */}
              {selectedBarangay && selCoords && (
                <Marker
                  key={selectedBarangay}
                  position={selCoords}
                  icon={pinIcon}
                  ref={markerRef}
                >
                  <Popup autoPan={false} closeButton={false} offset={[0, -14]}>
                    <div style={{ minWidth: 195, fontFamily: 'inherit' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 8 }}>
                        <i className="bi bi-geo-alt-fill me-1" style={{ color: pinColor }} />
                        {selectedBarangay}
                      </div>

                      {/* Specific hazard filter → severity focused view */}
                      {activeFilter ? (() => {
                        const hp = HAZARD[activeFilter]
                        if (!hp || !selHEntry) return (
                          <span style={{ background: SAFE.bg, color: SAFE.color, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
                            No {activeFilter} records
                          </span>
                        )
                        const sv = SEV[selHEntry.severity] ?? SEV.Low
                        const dateStr = fmtDateRange(selHEntry.dates)
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, padding: '6px 10px', background: hp.bg, borderRadius: 8 }}>
                              <i className={`bi ${hp.icon}`} style={{ color: hp.color, fontSize: 14 }} />
                              <span style={{ fontWeight: 700, color: hp.color, fontSize: 13 }}>{activeFilter}</span>
                              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280' }}>{selHEntry.count} report{selHEntry.count !== 1 ? 's' : ''}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: dateStr ? 6 : 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Severity Level:</span>
                              <span style={{ background: sv.bg, color: sv.color, border: `2px solid ${sv.color}`, borderRadius: 20, padding: '3px 14px', fontSize: 13, fontWeight: 800 }}>
                                <i className={`bi ${sv.icon} me-1`} />{sv.label}
                              </span>
                            </div>
                            {dateStr && (
                              <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                                <i className="bi bi-calendar3" style={{ color: '#9ca3af' }} />
                                {dateStr}
                              </div>
                            )}
                            <button type="button"
                              onClick={() => setListModal({ barangay: selectedBarangay!, hazard: activeFilter!, items: selHEntry.reports })}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: hp.bg, border: `1.5px solid ${hp.color}44`, color: hp.color, width: '100%', justifyContent: 'center', marginTop: 4 }}>
                              <i className="bi bi-file-earmark-text" />
                              View {selHEntry.count} Report{selHEntry.count !== 1 ? 's' : ''}
                            </button>
                          </div>
                        )
                      })() : (
                        /* All Types mode */
                        selData && selData.total > 0 ? (
                          <>
                            {selData.hazards.map(({ name: hn, count, severity, reports: hReports }) => {
                              const hp = HAZARD[hn], sc = SEV[severity]
                              if (!hp) return null
                              return (
                                <div key={hn} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: hp.fill, border: `2px solid ${hp.color}`, flexShrink: 0, display: 'inline-block' }} />
                                  <span style={{ fontSize: 12, fontWeight: 700, color: hp.color, flex: 1 }}>{hn}</span>
                                  <span style={{ fontSize: 11, color: '#6b7280' }}>{count}</span>
                                  {sc && <span style={{ fontSize: 10, fontWeight: 700, color: sc.color }}>{sc.label}</span>}
                                  <button type="button"
                                    onClick={() => setListModal({ barangay: selectedBarangay!, hazard: hn, items: hReports })}
                                    title="View reports"
                                    style={{ background: hp.bg, border: `1px solid ${hp.color}44`, borderRadius: 6, cursor: 'pointer', color: hp.color, fontSize: 11, padding: '2px 6px', flexShrink: 0, lineHeight: 1 }}>
                                    <i className="bi bi-file-earmark-text" />
                                  </button>
                                </div>
                              )
                            })}
                            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#6b7280' }}>
                              Total: <strong>{selData.total}</strong> disaster incident{selData.total !== 1 ? 's' : ''}
                            </div>
                          </>
                        ) : (
                          <span style={{ background: SAFE.bg, color: SAFE.color, borderRadius: 20, padding: '2px 12px', fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
                            Safe — No Records
                          </span>
                        )
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* No data overlay */}
            {filteredReports.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(2px)', pointerEvents: 'none' }}>
                <i className="bi bi-cloud-lightning-rain" style={{ fontSize: 36, color: '#d1d5db' }} />
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>{reports.length > 0 ? 'No records in selected date range' : 'No disaster incident records yet'}</div>
              </div>
            )}

            {/* ── Hazard legend overlay — top right inside map (same as accident risk) ── */}
            <div className="hm-legend-overlay" style={{
              position: 'absolute', top: 10, right: 10, zIndex: 1000,
              background: dark ? 'rgba(31,41,55,0.97)' : 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)',
              borderRadius: 10, padding: '12px 14px', border: `1px solid ${dark ? '#374151' : '#e5e7eb'}`,
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)', minWidth: 175,
            }}>
              {!activeFilter ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: dark ? '#d1d5db' : '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bi bi-shield-exclamation" style={{ color: '#1d4ed8', fontSize: 13 }} />
                    Hazard Type
                  </div>
                  {HAZARD_KEYS.map(key => {
                    const h = HAZARD[key], count = hazardReportCounts[key]
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: h.fill, border: `2px solid ${h.color}`, display: 'inline-block' }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: dark ? '#e2e8f0' : '#1e293b', flex: 1 }}>{h.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: count > 0 ? h.color : '#d1d5db',
                          background: count > 0 ? h.bg : 'transparent',
                          borderRadius: 10, padding: '0px 6px', minWidth: 18, textAlign: 'center' }}>
                          {count}
                        </span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: SAFE.fill, border: `2px solid ${SAFE.color}`, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: dark ? '#e2e8f0' : '#1e293b', flex: 1 }}>Safe Area</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: SAFE.color, background: SAFE.bg, borderRadius: 10, padding: '0px 6px', minWidth: 18, textAlign: 'center' }}>
                      {sortedBarangays.filter(n => !barangayData[n]?.total).length}
                    </span>
                  </div>
                  <div style={{ borderTop: `1px solid ${dark ? '#374151' : '#f3f4f6'}`, marginTop: 6, paddingTop: 6, fontSize: 10, color: '#9ca3af' }}>
                    Based on incident reports
                  </div>
                </>
              ) : (() => {
                const hp = HAZARD[activeFilter]
                const sevCounts: Record<string, number> = { High: 0, Moderate: 0, Low: 0 }
                sortedBarangays.forEach(n => {
                  const entry = barangayData[n]?.hazards.find(hh => hh.name === activeFilter)
                  if (entry) sevCounts[entry.severity] = (sevCounts[entry.severity] ?? 0) + 1
                })
                const noRec = sortedBarangays.filter(n => !barangayData[n]?.hazards.find(hh => hh.name === activeFilter)).length
                return (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: hp.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`bi ${hp.icon}`} style={{ fontSize: 13 }} />
                      {activeFilter}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: hp.color, marginBottom: 10 }}>
                      {hazardReportCounts[activeFilter]} report{hazardReportCounts[activeFilter] !== 1 ? 's' : ''} · {hazardBarangayCounts[activeFilter]} barangay{hazardBarangayCounts[activeFilter] !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af', marginBottom: 8 }}>Severity Level</div>
                    {SEV_KEYS.map(k => {
                      const sv = SEV[k], cnt = sevCounts[k] ?? 0
                      return (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                          <span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: sv.fill, border: `2px solid ${sv.color}`, display: 'inline-block' }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: dark ? '#e2e8f0' : '#1e293b', flex: 1 }}>{sv.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: cnt > 0 ? sv.color : '#d1d5db',
                            background: cnt > 0 ? sv.bg : 'transparent',
                            borderRadius: 10, padding: '0px 6px', minWidth: 18, textAlign: 'center' }}>
                            {cnt}
                          </span>
                        </div>
                      )
                    })}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: SAFE.fill, border: `2px solid ${SAFE.color}`, display: 'inline-block' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: dark ? '#e2e8f0' : '#1e293b', flex: 1 }}>No Records</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: noRec > 0 ? SAFE.color : '#d1d5db',
                        background: noRec > 0 ? SAFE.bg : 'transparent',
                        borderRadius: 10, padding: '0px 6px', minWidth: 18, textAlign: 'center' }}>
                        {noRec}
                      </span>
                    </div>
                    <div style={{ borderTop: `1px solid ${dark ? '#374151' : '#f3f4f6'}`, marginTop: 6, paddingTop: 6, fontSize: 10, color: '#9ca3af' }}>
                      Based on incident reports
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

      {/* ── hint ── */}
      <div style={{ marginBottom: 10, fontSize: 11, color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
        <span><i className="bi bi-info-circle me-1" />{activeFilter ? `${activeFilter} — colored by severity level` : 'All hazard types — click filter or column to zoom'}</span>
        <span style={{ fontWeight: 700, color: '#374151' }}>{filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}{filteredReports.length !== reports.length ? ` (of ${reports.length})` : ''}</span>
      </div>

      {/* ── Barangay Hazard Summary — same concept as RiskSummaryPanel ── */}
      <div style={{ border: `1px solid ${dark ? '#374151' : '#e5e7eb'}`, borderRadius: 8, background: dark ? '#1f2937' : '#fff', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderBottom: `1px solid ${dark ? '#374151' : '#f3f4f6'}`, background: dark ? '#263347' : '#f8fafc' }}>
          <i className="bi bi-layers-fill" style={{ color: activeFilter ? HAZARD[activeFilter]?.color : '#1d4ed8', fontSize: 12 }} />
          <span style={{ fontWeight: 700, fontSize: 12, color: dark ? '#e2e8f0' : '#1e293b' }}>
            {activeFilter ? `${activeFilter} — Severity Breakdown` : 'Barangay Hazard Summary'}
          </span>
          {activeFilter && (
            <button type="button"
              onClick={() => { setActiveFilter(null); setSelectedBarangay(null); setFlyTarget(null) }}
              style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: '1px 6px', borderRadius: 6 }}>
              <i className="bi bi-arrow-left" style={{ fontSize: 11 }} /> All Types
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>
            {sortedBarangays.length} barangays · click <i className="bi bi-geo-alt-fill" /> to zoom
          </span>
        </div>

        {/* ── Desktop columns grid ── */}
        <div className="hm-summary-desktop">
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {!activeFilter ? (
          /* ── All Types: one column per hazard type + Safe ── */
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${HAZARD_KEYS.length}, 145px) 145px`, width: `${HAZARD_KEYS.length * 145 + 145}px` }}>
            {HAZARD_KEYS.map((key, ki) => {
              const h = HAZARD[key]
              const items = sortedBarangays
                .map(n => ({ name: n, d: barangayData[n] }))
                .filter(({ d }) => d?.dominant === key)
                .sort((a, b) => (b.d?.total ?? 0) - (a.d?.total ?? 0))
              return (
                <div key={key} title={h.label} style={{ borderRight: ki < HAZARD_KEYS.length ? `1px solid ${dark ? '#374151' : '#f3f4f6'}` : 'none', display: 'flex', flexDirection: 'column' }}>
                  {/* Header: icon + label + count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', background: h.bg, borderBottom: `2px solid ${h.color}33` }}>
                    <i className={`bi ${h.icon}`} style={{ color: h.color, fontSize: 11, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: h.color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: h.color, color: '#fff', borderRadius: 10, padding: '0 5px', flexShrink: 0 }}>{items.length}</span>
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: 160 }}>
                    {items.length === 0 ? (
                      <div style={{ padding: '6px 4px', fontSize: 10, color: '#d1d5db', textAlign: 'center' }}>—</div>
                    ) : items.map(({ name, d }) => {
                      const hEntry = d?.hazards.find(hh => hh.name === key)
                      return (
                        <div key={name}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderBottom: `1px solid ${dark ? '#374151' : '#f9fafb'}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = h.bg)}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          <span style={{ flex: 1, fontSize: 11, color: dark ? '#d1d5db' : '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                            title={name} onClick={() => selectBarangay(name)}>{name}</span>
                          {d && d.total > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: h.color, flexShrink: 0 }}>{d.total}</span>}
                          {hEntry && (
                            <button type="button"
                              onClick={() => setListModal({ barangay: name, hazard: key, items: hEntry.reports })}
                              title="View reports"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 10, padding: '1px 2px', flexShrink: 0, lineHeight: 1 }}
                              onMouseEnter={e => { e.currentTarget.style.color = h.color }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af' }}
                            ><i className="bi bi-file-earmark-text" /></button>
                          )}
                          <i className="bi bi-geo-alt-fill" style={{ fontSize: 9, color: h.color, flexShrink: 0, cursor: 'pointer' }}
                            onClick={() => selectBarangay(name)} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Safe column */}
            {(() => {
              const safeItems = sortedBarangays.filter(n => !barangayData[n]?.total)
              return (
                <div title="Safe — no hazard reports" style={{ borderLeft: `2px solid ${dark ? '#374151' : '#e5e7eb'}`, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', background: SAFE.bg, borderBottom: `2px solid ${SAFE.color}33` }}>
                    <i className="bi bi-shield-check" style={{ color: SAFE.color, fontSize: 11, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: SAFE.color, flex: 1 }}>Safe Area</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: SAFE.color, color: '#fff', borderRadius: 10, padding: '0 5px', flexShrink: 0 }}>{safeItems.length}</span>
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: 160 }}>
                    {safeItems.slice(0, 12).map(name => (
                      <div key={name}
                        onClick={() => selectBarangay(name)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderBottom: '1px solid #f9fafb', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = SAFE.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <span title={name} style={{ flex: 1, fontSize: 10, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <i className="bi bi-geo-alt-fill" style={{ fontSize: 9, color: SAFE.color, flexShrink: 0 }} />
                      </div>
                    ))}
                    {safeItems.length > 12 && (
                      <div style={{ padding: '4px 8px', fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                        +{safeItems.length - 12} more barangays
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (() => {
          /* ── Specific hazard: severity columns ── */
          const hp = HAZARD[activeFilter]
          const grouped: Record<string, string[]> = { High: [], Moderate: [], Low: [], None: [] }
          sortedBarangays.forEach(n => {
            const entry = barangayData[n]?.hazards.find(hh => hh.name === activeFilter)
            if (entry) grouped[entry.severity]?.push(n)
            else       grouped.None.push(n)
          })
          const cols = [
            ...SEV_KEYS.map(k => ({ key: k, label: SEV[k].label, color: SEV[k].color, fill: SEV[k].fill, bg: SEV[k].bg, items: grouped[k] ?? [] })),
            { key: 'None', label: 'No Records', color: SAFE.color, fill: SAFE.fill, bg: SAFE.bg, items: grouped.None },
          ]
          return (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, minmax(80px,1fr))`, minWidth: `${cols.length * 80}px` }}>
              {cols.map((col, ci) => (
                <div key={col.key} title={col.label} style={{ borderRight: ci < cols.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 6px', background: col.bg, borderBottom: `2px solid ${col.color}33` }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: col.fill, border: `2px solid ${col.color}`, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: col.color, textTransform: 'uppercase', letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{col.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: col.color, color: '#fff', borderRadius: 10, padding: '0px 5px', flexShrink: 0 }}>{col.items.length}</span>
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: 160 }}>
                    {col.items.length === 0 ? (
                      <div style={{ padding: '6px 4px', fontSize: 10, color: '#d1d5db', textAlign: 'center' }}>—</div>
                    ) : col.items.map(name => {
                      const entry = barangayData[name]?.hazards.find(hh => hh.name === activeFilter)
                      const entryDateStr = entry ? fmtDateRange(entry.dates) : ''
                      return (
                        <div key={name}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 4px', borderBottom: '1px solid #f9fafb' }}>
                          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                            onClick={() => selectBarangay(name)}
                            onMouseEnter={e => (e.currentTarget.parentElement!.style.background = col.bg)}
                            onMouseLeave={e => (e.currentTarget.parentElement!.style.background = '')}>
                            <div title={name} style={{ fontSize: 9.5, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                            {entryDateStr && <div style={{ fontSize: 9, color: '#9ca3af' }}><i className="bi bi-calendar3 me-1" />{entryDateStr}</div>}
                          </div>
                          {entry && <span style={{ fontSize: 9, fontWeight: 700, color: hp.color, flexShrink: 0 }}>{entry.count}</span>}
                          {entry && (
                            <button type="button"
                              onClick={() => setListModal({ barangay: name, hazard: activeFilter!, items: entry.reports })}
                              title="View reports"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 10, padding: '1px 2px', flexShrink: 0, lineHeight: 1 }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#1d4ed8' }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af' }}
                            ><i className="bi bi-file-earmark-text" /></button>
                          )}
                          <i className="bi bi-geo-alt-fill" style={{ fontSize: 9, color: col.color, flexShrink: 0, cursor: 'pointer' }}
                            onClick={() => selectBarangay(name)} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
        </div>{/* end scroll wrapper */}
        </div>{/* end hm-summary-desktop */}

        {/* ── Mobile summary UI ── */}
        <div className="hm-summary-mobile">
          {!activeFilter ? (
            <>
              {/* Hazard type chips */}
              <div className="hm-chip-row">
                {HAZARD_KEYS.map(key => {
                  const h = HAZARD[key]
                  const cnt = sortedBarangays.filter(n => barangayData[n]?.dominant === key).length
                  return (
                    <button key={key} type="button"
                      className="hm-chip"
                      onClick={() => { setActiveFilter(key); setSelectedBarangay(null); setFlyTarget(null) }}
                      style={{ background: cnt > 0 ? h.bg : '#f8fafc', borderColor: cnt > 0 ? h.color + '44' : '#e5e7eb' }}>
                      <i className={`bi ${h.icon}`} style={{ color: h.color, fontSize: 16 }} />
                      <span style={{ fontSize: 8, fontWeight: 700, color: h.color, textTransform: 'uppercase', letterSpacing: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{h.label.split(' ')[0]}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: cnt > 0 ? h.color : '#d1d5db', lineHeight: 1 }}>{cnt}</span>
                    </button>
                  )
                })}
                {/* Safe chip */}
                {(() => {
                  const safeCnt = sortedBarangays.filter(n => !barangayData[n]?.total).length
                  return (
                    <div className="hm-chip" style={{ background: SAFE.bg, borderColor: SAFE.color + '44' }}>
                      <i className="bi bi-shield-check" style={{ color: SAFE.color, fontSize: 16 }} />
                      <span style={{ fontSize: 8.5, fontWeight: 700, color: SAFE.color, textTransform: 'uppercase' }}>Safe</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: SAFE.color, lineHeight: 1 }}>{safeCnt}</span>
                    </div>
                  )
                })()}
              </div>

              {/* Affected barangays list */}
              <div className="hm-bgy-list">
                {sortedBarangays
                  .filter(n => barangayData[n]?.total > 0)
                  .map(name => {
                    const d = barangayData[name]
                    const dom = d?.dominant
                    if (!dom) return null
                    const h = HAZARD[dom]
                    const hEntry = d.hazards.find(hh => hh.name === dom)
                    return (
                      <div key={name} className="hm-bgy-row" style={{ borderLeftColor: h.color }}>
                        <i className={`bi ${h.icon}`} style={{ color: h.color, fontSize: 14, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: h.color, padding: '1px 8px', borderRadius: 10, flexShrink: 0 }}>{d.total}</span>
                        {hEntry && (
                          <button type="button"
                            onClick={() => setListModal({ barangay: name, hazard: dom, items: hEntry.reports })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, padding: '2px 3px', flexShrink: 0, lineHeight: 1 }}
                            onMouseEnter={e => { e.currentTarget.style.color = h.color }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af' }}
                          ><i className="bi bi-file-earmark-text" /></button>
                        )}
                        <button type="button"
                          onClick={() => selectBarangay(name)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: h.color, fontSize: 15, padding: '2px 3px', flexShrink: 0, lineHeight: 1 }}>
                          <i className="bi bi-geo-alt-fill" />
                        </button>
                      </div>
                    )
                  })}
                {sortedBarangays.every(n => !barangayData[n]?.total) && (
                  <div style={{ padding: '18px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                    <i className="bi bi-check-circle-fill me-2" style={{ color: '#16a34a' }} />
                    No affected barangays in selected date range
                  </div>
                )}
              </div>
            </>
          ) : (() => {
            const hp = HAZARD[activeFilter]
            const grouped: Record<string, string[]> = { High: [], Moderate: [], Low: [] }
            sortedBarangays.forEach(n => {
              const e = barangayData[n]?.hazards.find(hh => hh.name === activeFilter)
              if (e) grouped[e.severity]?.push(n)
            })
            const affectedList = sortedBarangays.filter(n =>
              barangayData[n]?.hazards.some(hh => hh.name === activeFilter)
            )
            return (
              <>
                {/* Severity chips */}
                <div className="hm-sev-row">
                  {SEV_KEYS.map(k => {
                    const sv = SEV[k]
                    const cnt = grouped[k]?.length ?? 0
                    return (
                      <div key={k} className="hm-sev-chip"
                        style={{ background: sv.bg, borderColor: sv.color + '55' }}>
                        <i className={`bi ${sv.icon}`} style={{ color: sv.color, fontSize: 14 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: sv.color, textTransform: 'uppercase' }}>{sv.label}</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: cnt > 0 ? sv.color : '#d1d5db', lineHeight: 1 }}>{cnt}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Barangay list with severity badge */}
                <div className="hm-bgy-list">
                  {affectedList.map(name => {
                    const entry = barangayData[name]?.hazards.find(hh => hh.name === activeFilter)
                    if (!entry) return null
                    const sv = SEV[entry.severity] ?? SEV.Low
                    const dateStr = fmtDateRange(entry.dates)
                    return (
                      <div key={name} className="hm-bgy-row" style={{ borderLeftColor: sv.color }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
                          {dateStr && <div style={{ fontSize: 10, color: '#9ca3af' }}><i className="bi bi-calendar3 me-1" />{dateStr}</div>}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sv.color, background: sv.bg, padding: '2px 8px', borderRadius: 10, border: `1px solid ${sv.color}33`, flexShrink: 0 }}>{sv.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: hp.color, flexShrink: 0 }}>{entry.count}</span>
                        <button type="button"
                          onClick={() => setListModal({ barangay: name, hazard: activeFilter!, items: entry.reports })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, padding: '2px 3px', flexShrink: 0, lineHeight: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.color = hp.color }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af' }}
                        ><i className="bi bi-file-earmark-text" /></button>
                        <button type="button"
                          onClick={() => selectBarangay(name)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: sv.color, fontSize: 15, padding: '2px 3px', flexShrink: 0, lineHeight: 1 }}>
                          <i className="bi bi-geo-alt-fill" />
                        </button>
                      </div>
                    )
                  })}
                  {affectedList.length === 0 && (
                    <div style={{ padding: '18px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                      No barangays with {activeFilter} reports in selected date range
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>{/* end hm-summary-mobile */}

      </div>

      {/* ── Fullscreen overlay ─────────────────────────────────────── */}
      {isFullscreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: dark ? '#111827' : '#f8fafc' }}>

          {/* ── Top bar ── */}
          <div className="hm-fs-topbar">
            {/* Title */}
            <div className="hm-fs-title">
              <i className="bi bi-shield-exclamation" style={{ color: '#1d4ed8', fontSize: 17 }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Hazard Map</span>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 20, padding: '1px 9px', fontSize: 11, fontWeight: 600 }}>
                {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}{filteredReports.length !== reports.length ? ` of ${reports.length}` : ''}
              </span>
            </div>

            {/* Actions: summary toggle + exit */}
            <div className="hm-fs-actions">
              <button type="button"
                onClick={() => setShowSummary(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: showSummary ? '#eff6ff' : '#f8fafc', border: `1.5px solid ${showSummary ? '#2563eb' : '#e2e8f0'}`, borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: showSummary ? '#1d4ed8' : '#374151', transition: 'all .15s' }}>
                <i className={`bi ${showSummary ? 'bi-list-ul' : 'bi-list'}`} />
                <span className="hm-fs-exit-label">Hazard Summary</span>
                <span style={{ fontSize: 9, borderRadius: 10, padding: '1px 6px', fontWeight: 700, background: showSummary ? '#2563eb' : '#94a3b8', color: '#fff' }}>{showSummary ? 'ON' : 'OFF'}</span>
              </button>
              <button type="button"
                onClick={() => setIsFullscreen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#dc2626' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151' }}
              >
                <i className="bi bi-fullscreen-exit" />
                <span className="hm-fs-exit-label"> Exit</span>
              </button>
            </div>

            {/* Filter buttons — full width row on mobile */}
            <div className="hm-fs-filters">
              <button type="button"
                onClick={() => { setActiveFilter(null); setSelectedBarangay(null); setFlyTarget(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: activeFilter === null ? '#1e293b' : (dark ? '#263347' : '#f8fafc'), border: `2px solid ${activeFilter === null ? '#1e293b' : (dark ? '#374151' : '#e2e8f0')}`, color: activeFilter === null ? '#fff' : (dark ? '#d1d5db' : '#374151'), flexShrink: 0, transition: 'all .15s' }}>
                <i className="bi bi-layers-fill" style={{ fontSize: 11 }} /> All Types
                <span style={{ fontSize: 10, borderRadius: 20, padding: '1px 5px', background: activeFilter === null ? 'rgba(255,255,255,0.2)' : (dark ? '#374151' : '#f1f5f9'), color: activeFilter === null ? '#fff' : (dark ? '#d1d5db' : '#374151') }}>
                  {Object.values(barangayData).filter(d => d.total > 0).length}
                </span>
              </button>
              {HAZARD_KEYS.map(key => {
                const h = HAZARD[key], act = activeFilter === key, cnt = hazardBarangayCounts[key]
                return (
                  <button key={key} type="button"
                    onClick={() => { setActiveFilter(act ? null : key); setSelectedBarangay(null); setFlyTarget(null) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: act ? h.color : (dark ? '#263347' : '#f8fafc'), border: `2px solid ${act ? h.color : (dark ? '#374151' : '#e2e8f0')}`, color: act ? '#fff' : (dark ? '#d1d5db' : '#374151'), flexShrink: 0, transition: 'all .15s', boxShadow: act ? `0 2px 8px ${h.color}44` : 'none' }}>
                    <i className={`bi ${h.icon}`} style={{ fontSize: 11 }} /> {h.label}
                    {cnt > 0 && <span style={{ fontSize: 10, borderRadius: 20, padding: '1px 5px', background: act ? 'rgba(255,255,255,0.25)' : h.bg, color: act ? '#fff' : h.color }}>{cnt}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Date Range bar ── */}
          <div className="hm-date-bar hm-fs-datebar" style={{ padding: '7px 18px', flexShrink: 0, borderBottom: `1px solid ${dark ? '#374151' : '#e2e8f0'}` }}>
            <i className="bi bi-calendar-range" style={{ color: '#1d4ed8', fontSize: 13, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: dark ? '#d1d5db' : '#374151', flexShrink: 0 }}>Date Range:</span>
            {([
              { key: 'last5',     label: 'Last 5 Days' },
              { key: 'thisMonth', label: 'This Month'  },
              { key: 'jun',       label: 'June'        },
              { key: 'jul',       label: 'July'        },
              { key: 'thisYear',  label: 'This Year'   },
              { key: 'all',       label: 'All Time'    },
            ] as const).map(({ key, label }) => {
              const isActive = activePreset === key
              return (
                <button key={key} type="button" onClick={() => applyPreset(key)}
                  style={{ padding: '3px 11px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 11, background: isActive ? '#1d4ed8' : (dark ? '#374151' : '#fff'), border: `1.5px solid ${isActive ? '#1d4ed8' : (dark ? '#4b5563' : '#e2e8f0')}`, color: isActive ? '#fff' : (dark ? '#d1d5db' : '#374151'), transition: 'all .12s', flexShrink: 0 }}>
                  {label}
                </button>
              )
            })}
            <div className="hm-date-inputs hm-fs-date-inputs">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ padding: '3px 8px', fontSize: 11, border: `1.5px solid ${dark ? '#4b5563' : '#e2e8f0'}`, borderRadius: 8, color: dark ? '#d1d5db' : '#374151', background: dark ? '#374151' : '#fff', cursor: 'pointer', flex: 1, minWidth: 0 }} />
              <span style={{ fontSize: 11, color: '#9ca3af' }}>–</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ padding: '3px 8px', fontSize: 11, border: `1.5px solid ${dark ? '#4b5563' : '#e2e8f0'}`, borderRadius: 8, color: dark ? '#d1d5db' : '#374151', background: dark ? '#374151' : '#fff', cursor: 'pointer', flex: 1, minWidth: 0 }} />
              {(dateFrom || dateTo) && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>
                  {filteredReports.length} / {reports.length}
                </span>
              )}
            </div>
          </div>

          {/* ── Body: map + optional right sidebar ── */}
          <div className="hm-fs-body">

            {/* Map — absolute fill so Leaflet gets explicit height */}
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <MapContainer center={NABUA_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <FlyTo target={flyTarget} />
                  {Object.entries(BARANGAY_POLYGONS).map(([name, positions]) => {
                    const d = barangayData[name], isSel = name === selectedBarangay
                    let fillColor: string, strokeColor: string, fillOpacity: number, opacity: number
                    if (activeFilter) {
                      const hEntry = d?.hazards.find(hh => hh.name === activeFilter)
                      if (hEntry) { const sv = SEV[hEntry.severity] ?? SEV.Low; fillColor = sv.fill; strokeColor = isSel ? '#1e293b' : sv.color; fillOpacity = isSel ? 0.85 : 0.7; opacity = 1 }
                      else { fillColor = SAFE.fill; strokeColor = SAFE.color; fillOpacity = 0.12; opacity = 0.35 }
                    } else {
                      const dom = d?.dominant ?? null, h = dom ? HAZARD[dom] : null
                      fillColor = h ? h.fill : SAFE.fill; strokeColor = isSel ? '#1e293b' : (h?.color ?? SAFE.color)
                      fillOpacity = isSel ? 0.82 : dom ? 0.65 : 0.3; opacity = 1
                    }
                    return (
                      <Polygon key={name} positions={positions}
                        pathOptions={{ color: strokeColor, weight: isSel ? 3 : 1.5, fillColor, fillOpacity, opacity }}
                        eventHandlers={{ click: e => { L.DomEvent.stopPropagation(e); selectBarangay(name) } }}
                      >
                        <Tooltip direction="top" opacity={1} sticky>
                          <div style={{ fontSize: 12, lineHeight: 1.7, minWidth: 195 }}>
                            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 5, fontSize: 13 }}>
                              <i className="bi bi-geo-alt-fill me-1" style={{ color: strokeColor }} />{name}
                            </div>
                            {activeFilter ? (() => {
                              const hEntry = d?.hazards.find(hh => hh.name === activeFilter); const hp = HAZARD[activeFilter]
                              if (!hEntry || !hp) return <span style={{ background: SAFE.bg, color: SAFE.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>No {activeFilter} records</span>
                              const sv = SEV[hEntry.severity] ?? SEV.Low
                              return <div><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}><i className={`bi ${hp.icon}`} style={{ color: hp.color, fontSize: 12 }} /><span style={{ fontWeight: 700, color: hp.color, fontSize: 12 }}>{activeFilter}</span><span style={{ fontSize: 11, color: '#6b7280' }}>{hEntry.count} report{hEntry.count !== 1 ? 's' : ''}</span></div><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Severity:</span><span style={{ background: sv.bg, color: sv.color, border: `1.5px solid ${sv.color}`, borderRadius: 20, padding: '2px 12px', fontSize: 12, fontWeight: 800 }}><i className={`bi ${sv.icon} me-1`} />{sv.label}</span></div></div>
                            })() : (
                              !d || d.total === 0
                                ? <span style={{ background: SAFE.bg, color: SAFE.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Safe — No Hazard Records</span>
                                : d.hazards.map(({ name: hn, count, severity }) => {
                                    const hp = HAZARD[hn], sc = SEV[severity]; if (!hp) return null
                                    return <div key={hn} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: hp.fill, border: `2px solid ${hp.color}`, flexShrink: 0, display: 'inline-block' }} /><span style={{ fontSize: 11, fontWeight: 700, color: hp.color }}>{hn}</span><span style={{ fontSize: 10, color: '#6b7280' }}>{count} report{count !== 1 ? 's' : ''}</span>{sc && <span style={{ fontSize: 10, fontWeight: 700, color: sc.color }}>· {sc.label}</span>}</div>
                                  })
                            )}
                          </div>
                        </Tooltip>
                      </Polygon>
                    )
                  })}
                  {/* ── Individual report pins ── */}
                  <ReportPinLayer reports={filteredReports} activeFilter={activeFilter} onView={openDoc} />

                  {selectedBarangay && selCoords && (
                    <Marker position={selCoords} icon={pinIcon} ref={markerRef}>
                      <Popup autoPan={false} closeButton={false} offset={[0, -14]}>
                        <div style={{ minWidth: 195, fontFamily: 'inherit' }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 8 }}>
                            <i className="bi bi-geo-alt-fill me-1" style={{ color: pinColor }} />{selectedBarangay}
                          </div>
                          {activeFilter ? (() => {
                            const hp = HAZARD[activeFilter]
                            if (!hp || !selHEntry) return <span style={{ background: SAFE.bg, color: SAFE.color, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, display: 'inline-block' }}>No {activeFilter} records</span>
                            const sv = SEV[selHEntry.severity] ?? SEV.Low
                            return <div><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, padding: '6px 10px', background: hp.bg, borderRadius: 8 }}><i className={`bi ${hp.icon}`} style={{ color: hp.color, fontSize: 14 }} /><span style={{ fontWeight: 700, color: hp.color, fontSize: 13 }}>{activeFilter}</span><span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280' }}>{selHEntry.count} report{selHEntry.count !== 1 ? 's' : ''}</span></div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Severity Level:</span><span style={{ background: sv.bg, color: sv.color, border: `2px solid ${sv.color}`, borderRadius: 20, padding: '3px 14px', fontSize: 13, fontWeight: 800 }}><i className={`bi ${sv.icon} me-1`} />{sv.label}</span></div></div>
                          })() : selData && selData.total > 0 ? (
                            <>{selData.hazards.map(({ name: hn, count, severity }) => { const hp = HAZARD[hn], sc = SEV[severity]; if (!hp) return null; return <div key={hn} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: hp.fill, border: `2px solid ${hp.color}`, flexShrink: 0, display: 'inline-block' }} /><span style={{ fontSize: 12, fontWeight: 700, color: hp.color }}>{hn}</span><span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>{count} report{count !== 1 ? 's' : ''}</span>{sc && <span style={{ fontSize: 11, fontWeight: 700, color: sc.color }}>{sc.label}</span>}</div> })}<div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#6b7280' }}>Total: <strong>{selData.total}</strong> disaster incident{selData.total !== 1 ? 's' : ''}</div></>
                          ) : (
                            <span style={{ background: SAFE.bg, color: SAFE.color, borderRadius: 20, padding: '2px 12px', fontSize: 11, fontWeight: 700, display: 'inline-block' }}>Safe — No Records</span>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              {/* No-data overlay */}
              {filteredReports.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(2px)', pointerEvents: 'none' }}>
                  <i className="bi bi-cloud-lightning-rain" style={{ fontSize: 42, color: '#d1d5db' }} />
                  <div style={{ fontSize: 14, color: '#9ca3af', marginTop: 10 }}>{reports.length > 0 ? 'No records in selected date range' : 'No disaster incident records yet'}</div>
                </div>
              )}

              {/* Legend overlay */}
              <div className="hm-legend-overlay" style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)', borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', minWidth: 175 }}>
                {!activeFilter ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><i className="bi bi-shield-exclamation" style={{ color: '#1d4ed8', fontSize: 13 }} />Hazard Type</div>
                    {HAZARD_KEYS.map(key => { const h = HAZARD[key], count = hazardReportCounts[key]; return <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}><span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: h.fill, border: `2px solid ${h.color}`, display: 'inline-block' }} /><span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', flex: 1 }}>{h.label}</span><span style={{ fontSize: 11, fontWeight: 800, color: count > 0 ? h.color : '#d1d5db', background: count > 0 ? h.bg : 'transparent', borderRadius: 10, padding: '0px 6px', minWidth: 18, textAlign: 'center' }}>{count}</span></div> })}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: SAFE.fill, border: `2px solid ${SAFE.color}`, display: 'inline-block' }} /><span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', flex: 1 }}>Safe Area</span><span style={{ fontSize: 11, fontWeight: 800, color: SAFE.color, background: SAFE.bg, borderRadius: 10, padding: '0px 6px', minWidth: 18, textAlign: 'center' }}>{sortedBarangays.filter(n => !barangayData[n]?.total).length}</span></div>
                    <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 6, paddingTop: 6, fontSize: 10, color: '#9ca3af' }}>Based on incident reports</div>
                  </>
                ) : (() => {
                  const hp = HAZARD[activeFilter]; const sevCounts: Record<string, number> = { High: 0, Moderate: 0, Low: 0 }
                  sortedBarangays.forEach(n => { const e = barangayData[n]?.hazards.find(hh => hh.name === activeFilter); if (e) sevCounts[e.severity] = (sevCounts[e.severity] ?? 0) + 1 })
                  const noRec = sortedBarangays.filter(n => !barangayData[n]?.hazards.find(hh => hh.name === activeFilter)).length
                  return (<>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: hp.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><i className={`bi ${hp.icon}`} style={{ fontSize: 13 }} />{activeFilter}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: hp.color, marginBottom: 10 }}>{hazardReportCounts[activeFilter]} report{hazardReportCounts[activeFilter] !== 1 ? 's' : ''} · {hazardBarangayCounts[activeFilter]} barangay{hazardBarangayCounts[activeFilter] !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af', marginBottom: 8 }}>Severity Level</div>
                    {SEV_KEYS.map(k => { const sv = SEV[k], cnt = sevCounts[k] ?? 0; return <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}><span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: sv.fill, border: `2px solid ${sv.color}`, display: 'inline-block' }} /><span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', flex: 1 }}>{sv.label}</span><span style={{ fontSize: 11, fontWeight: 800, color: cnt > 0 ? sv.color : '#d1d5db', background: cnt > 0 ? sv.bg : 'transparent', borderRadius: 10, padding: '0px 6px', minWidth: 18, textAlign: 'center' }}>{cnt}</span></div> })}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: SAFE.fill, border: `2px solid ${SAFE.color}`, display: 'inline-block' }} /><span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', flex: 1 }}>No Records</span><span style={{ fontSize: 11, fontWeight: 800, color: noRec > 0 ? SAFE.color : '#d1d5db', background: noRec > 0 ? SAFE.bg : 'transparent', borderRadius: 10, padding: '0px 6px', minWidth: 18, textAlign: 'center' }}>{noRec}</span></div>
                    <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 6, paddingTop: 6, fontSize: 10, color: '#9ca3af' }}>Based on incident reports</div>
                  </>)
                })()}
              </div>
            </div>

            {/* ── Right sidebar — same concept as DashboardMap ── */}
            {showSummary && (
              <div className="hm-fs-sidebar">

                {/* Compact stats header */}
                <div style={{ flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
                  {/* Top stat cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ background: '#eff6ff', borderRadius: 10, padding: '8px 12px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className="bi bi-shield-exclamation" style={{ color: '#1d4ed8', fontSize: 18, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Reports</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>
                          {Object.values(hazardBarangayCounts).reduce((a, b) => a + b, 0)}
                        </div>
                      </div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '8px 12px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className="bi bi-geo-alt-fill" style={{ color: '#16a34a', fontSize: 18, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Barangays</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>
                          {sortedBarangays.filter(n => (barangayData[n]?.total ?? 0) > 0).length}
                          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>/{sortedBarangays.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hazard filter chips (or severity chips when filtered) */}
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {activeFilter
                      ? <><button type="button" onClick={() => { setActiveFilter(null); setFsFilter(null) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontSize: 10, padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <i className="bi bi-arrow-left" style={{ fontSize: 11 }} />Back
                        </button><span style={{ color: '#d1d5db' }}>|</span>{activeFilter} Severity</>
                      : 'Hazard Types'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {!activeFilter ? HAZARD_KEYS.map(key => {
                      const h = HAZARD[key], cnt = hazardBarangayCounts[key]
                      return (
                        <button key={key} type="button" onClick={() => { setActiveFilter(key); setSelectedBarangay(null); setFlyTarget(null); setFsFilter(null) }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: cnt > 0 ? h.bg : '#f8fafc', color: cnt > 0 ? h.color : '#9ca3af', border: `1.5px solid ${cnt > 0 ? h.color + '44' : '#e5e7eb'}`, borderRadius: 20, padding: '3px 10px', cursor: 'pointer' }}>
                          <i className={`bi ${h.icon}`} style={{ fontSize: 11 }} />
                          {h.label}
                          <span style={{ fontWeight: 800, background: cnt > 0 ? h.color : '#d1d5db', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>{cnt}</span>
                        </button>
                      )
                    }) : (() => {
                      const grouped: Record<string, number> = { High: 0, Moderate: 0, Low: 0 }
                      sortedBarangays.forEach(n => { const e = barangayData[n]?.hazards.find(hh => hh.name === activeFilter); if (e) grouped[e.severity] = (grouped[e.severity] ?? 0) + 1 })
                      return SEV_KEYS.map(k => {
                        const sv = SEV[k], cnt = grouped[k] ?? 0, active = fsFilter === k
                        return (
                          <button key={k} type="button" onClick={() => setFsFilter(active ? null : k)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: active ? sv.color : sv.bg, color: active ? '#fff' : sv.color, border: `1.5px solid ${sv.color + (active ? '' : '44')}`, borderRadius: 20, padding: '3px 10px', cursor: 'pointer' }}>
                            {sv.label}
                            <span style={{ fontWeight: 800, background: active ? 'rgba(255,255,255,0.3)' : sv.color, color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>{cnt}</span>
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* Vertical barangay list — same concept as SlimRiskPanel */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {/* Sticky header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: dark ? '#263347' : '#f8fafc', borderBottom: `1px solid ${dark ? '#374151' : '#e5e7eb'}`, position: 'sticky', top: 0, zIndex: 2 }}>
                    <i className="bi bi-layers-fill" style={{ color: activeFilter ? HAZARD[activeFilter]?.color : '#1d4ed8', fontSize: 12 }} />
                    <span style={{ fontWeight: 700, fontSize: 11, color: dark ? '#e2e8f0' : '#1e293b' }}>
                      {activeFilter ? `${activeFilter} — Severity Breakdown` : 'Barangay Hazard Summary'}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>
                      {sortedBarangays.filter(n => {
                        if (!activeFilter) return barangayData[n]?.total > 0
                        const e = barangayData[n]?.hazards.find(hh => hh.name === activeFilter)
                        return fsFilter ? e?.severity === fsFilter : !!e
                      }).length}/{sortedBarangays.length}
                    </span>
                  </div>

                  {/* Barangay rows */}
                  {sortedBarangays.map(name => {
                    const d = barangayData[name]
                    if (!activeFilter) {
                      const dom = d?.dominant
                      if (!dom) return null
                      const h = HAZARD[dom]
                      return (
                        <div key={name} onClick={() => selectBarangay(name)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = h?.bg ?? SAFE.bg}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: h?.fill ?? SAFE.fill, border: `2px solid ${h?.color ?? SAFE.color}` }} />
                          <span style={{ flex: 1, fontSize: 11, color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                          {h && <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: h.color, borderRadius: 10, padding: '0 5px', flexShrink: 0 }}>{d?.total}</span>}
                          <i className="bi bi-geo-alt-fill" style={{ fontSize: 10, color: h?.color ?? SAFE.color, flexShrink: 0 }} />
                        </div>
                      )
                    }
                    const entry = d?.hazards.find(hh => hh.name === activeFilter)
                    if (!entry) return null
                    if (fsFilter && entry.severity !== fsFilter) return null
                    const sv = SEV[entry.severity] ?? SEV.Low
                    const rowDateStr = fmtDateRange(entry.dates)
                    return (
                      <div key={name}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderBottom: '1px solid #f3f4f6' }}
                        onMouseEnter={e => (e.currentTarget.style.background = sv.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: sv.fill, border: `2px solid ${sv.color}` }} />
                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => selectBarangay(name)}>
                          <div style={{ fontSize: 11, color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                          {rowDateStr && <div style={{ fontSize: 9, color: '#9ca3af' }}><i className="bi bi-calendar3 me-1" />{rowDateStr}</div>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: sv.color, borderRadius: 10, padding: '0 5px', flexShrink: 0 }}>{sv.label}</span>
                        <button type="button"
                          onClick={() => setListModal({ barangay: name, hazard: activeFilter!, items: entry.reports })}
                          title="View reports"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, padding: '1px 3px', flexShrink: 0, lineHeight: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#1d4ed8' }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af' }}
                        ><i className="bi bi-file-earmark-text" /></button>
                        <i className="bi bi-geo-alt-fill" style={{ fontSize: 10, color: sv.color, flexShrink: 0, cursor: 'pointer' }}
                          onClick={() => selectBarangay(name)} />
                      </div>
                    )
                  })}
                  {sortedBarangays.every(n => {
                    const d = barangayData[n]
                    if (!activeFilter) return !d?.total
                    const e = d?.hazards.find(hh => hh.name === activeFilter)
                    return fsFilter ? e?.severity !== fsFilter : !e
                  }) && (
                    <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
                      No barangays in this category
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Report List Modal ─────────────────────────────────────── */}
      {listModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) setListModal(null) }}>
          <div style={{ background: dark ? '#1f2937' : '#fff', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', width: 480, maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${dark ? '#374151' : '#e5e7eb'}`, background: HAZARD[listModal.hazard]?.bg ?? '#f8fafc', flexShrink: 0 }}>
              <i className={`bi ${HAZARD[listModal.hazard]?.icon ?? 'bi-shield-exclamation'}`} style={{ color: HAZARD[listModal.hazard]?.color ?? '#1d4ed8', fontSize: 18 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{listModal.hazard} Reports</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{listModal.barangay} · {listModal.items.length} record{listModal.items.length !== 1 ? 's' : ''}</div>
              </div>
              <button type="button" onClick={() => setListModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1, padding: 4 }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            {/* Report rows — sorted latest → oldest */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {[...listModal.items]
                .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
                .map((item, idx) => {
                  const sv = SEV[item.severity] ?? SEV.Low
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${dark ? '#374151' : '#f3f4f6'}` }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: dark ? '#263347' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: dark ? '#94a3b8' : '#64748b', flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#e2e8f0' : '#1e293b' }}>
                          Report #{item.id}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <i className="bi bi-calendar3" style={{ fontSize: 10 }} />
                          {item.date ? fmtDateFull(item.date) : 'No date recorded'}
                        </div>
                      </div>
                      <span style={{ background: sv.bg, color: sv.color, border: `1.5px solid ${sv.color}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        <i className={`bi ${sv.icon} me-1`} />{sv.label}
                      </span>
                      <button type="button"
                        onClick={() => { setListModal(null); openDoc(item.id) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1d4ed8', flexShrink: 0, transition: 'all .12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8' }}
                      >
                        <i className="bi bi-file-earmark-text" style={{ fontSize: 13 }} />
                        View
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── Report Document Modal ──────────────────────────────────── */}
      {(docReport || docLoading) && (
        <ReportDocumentModal
          report={docReport}
          isLoading={docLoading}
          onClose={() => { setDocReport(null) }}
        />
      )}
    </div>
  )
}
