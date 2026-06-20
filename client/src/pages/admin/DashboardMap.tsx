import { useMemo, useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, Tooltip, Popup, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../../style/dashboard.css'
import L from 'leaflet'
import api from '../../api/axios'
import { BARANGAY_COORDS, ZONE_COORDS, NABUA_BOUNDARY } from './zone-report/data/nabuaBarangays'
import { NABUA_BARANGAY_BOUNDARIES } from './zone-report/data/nabuaBarangayBoundaries'
import { ACCIDENT_TYPES, getAccidentMeta } from './zone-report/data/accidentTypes'
import type { ReportDocumentData } from './zone-report/components/ReportDocumentModal'

export interface MapReport {
  id: number
  report_type: 'Emergency' | 'Incident'
  date_reported: string
  latitude?: number | null
  longitude?: number | null
  geographicTypeName?: string
  clientName?: string | null
  incidentAddress?: string | null
  emergencyType?: string | null
  hazardType?: string | null
  callNature?: string | null
  accidentType?: string | null
}

/* ── Dark-mode detector ───────────────────────────────── */
function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

/* ── Pin icons ────────────────────────────────────────── */
function createPinIcon(report: MapReport, isSelected: boolean): L.DivIcon {
  const size   = isSelected ? 40 : 32
  const ptW    = Math.round(size * 0.44)   // triangle base half-width
  const ptH    = Math.round(size * 0.36)   // triangle height
  const totalH = size + ptH - 1

  const meta = getAccidentMeta(report.accidentType ?? '')
  const bg        = meta?.color ?? '#dc2626'
  const iconClass = meta?.icon  ?? 'bi-heart-pulse-fill'

  const iconSize  = Math.round(size * 0.44)
  const ringColor = isSelected ? '#1e3a8a' : bg
  const ringW     = isSelected ? 3 : 2.5
  const ringAlpha = isSelected ? '0.45' : '0.0'
  const outerRing = isSelected
    ? `0 0 0 4px rgba(30,58,138,${ringAlpha}), ` : ''
  const headShadow = `${outerRing}0 3px 12px ${bg}80, 0 1px 4px rgba(0,0,0,0.25)`

  // Teardrop: circle head + downward triangle
  const head = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};
      border:${ringW}px solid ${isSelected ? '#fff' : '#fff'};
      outline:${isSelected ? `2.5px solid ${ringColor}` : 'none'};
      display:flex;align-items:center;justify-content:center;
      box-shadow:${headShadow};
    ">
      <i class="bi ${iconClass}" style="color:#fff;font-size:${iconSize}px;line-height:1;display:block;"></i>
    </div>`

  const triangle = `
    <div style="
      width:0;height:0;
      border-left:${ptW}px solid transparent;
      border-right:${ptW}px solid transparent;
      border-top:${ptH}px solid ${bg};
      margin-top:-1px;
      filter:drop-shadow(0 3px 3px ${bg}50);
    "></div>`

  return L.divIcon({
    html: `
      <div style="
        display:flex;flex-direction:column;align-items:center;
        position:relative;
        filter:drop-shadow(0 6px 10px ${bg}45);
      ">
        <div style="position:relative;">
          ${head}
        </div>
        ${triangle}
      </div>`,
    className: '',
    iconSize:   [size + ptW, totalH],
    iconAnchor: [Math.round((size + ptW) / 2), totalH],
  })
}


const NABUA_CENTER: [number, number] = [13.4057, 123.3744]
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

/* ── Accident Risk ────────────────────────────────────── */
const RISK_LEVELS = [
  { label: 'High Risk Area',     minCount: 4, color: '#ea580c', fillColor: '#f97316', bg: '#fff7ed' },
  { label: 'Moderate Risk Area', minCount: 2, color: '#b45309', fillColor: '#fbbf24', bg: '#fefce8' },
  { label: 'Low Risk Area',      minCount: 1, color: '#1d4ed8', fillColor: '#60a5fa', bg: '#eff6ff' },
  { label: 'Safe Area',          minCount: 0, color: '#7e22ce', fillColor: '#c084fc', bg: '#faf5ff' },
]

export function getRisk(count: number) {
  return RISK_LEVELS.find(r => count >= r.minCount) ?? RISK_LEVELS[3]
}


/**
 * Voronoi cell for one barangay — perpendicular bisector capped at MAX.
 */
function makeVoronoiPoly(
  name: string, lat: number, lng: number,
  all: [string, [number, number]][]
): [number, number][] {
  const N = 48, MAX = 0.060  // large MAX so clipping does the real bounding

  return Array.from({ length: N }, (_, i) => {
    const theta = (i * 2 * Math.PI) / N
    const cosT = Math.cos(theta), sinT = Math.sin(theta)
    let r = MAX
    all.forEach(([other, [oLat, oLng]]) => {
      if (other === name) return
      const dy = oLat - lat, dx = oLng - lng
      const d2 = dy * dy + dx * dx
      const dot = cosT * dy + sinT * dx
      if (dot > 0) { const b = d2 / (2 * dot); if (b < r) r = b }
    })
    return [lat + r * cosT, lng + r * sinT] as [number, number]
  })
}

/**
 * Sutherland-Hodgman polygon clipping.
 * Clips `poly` to the inside of convex `clip` polygon.
 * NABUA_BOUNDARY is clockwise → inside is where cross ≤ 0.
 */
function shInsideClip(p: [number,number], a: [number,number], b: [number,number]): boolean {
  // Cross product (a→b) × (a→p), lat=y lng=x
  return (b[1]-a[1])*(p[0]-a[0]) - (b[0]-a[0])*(p[1]-a[1]) <= 0
}
function shIntersect(
  p1: [number,number], p2: [number,number],
  p3: [number,number], p4: [number,number]
): [number,number] {
  const dLat1=p2[0]-p1[0], dLng1=p2[1]-p1[1]
  const dLat2=p4[0]-p3[0], dLng2=p4[1]-p3[1]
  const denom = dLat1*dLng2 - dLng1*dLat2
  if (Math.abs(denom)<1e-12) return p1
  const t = ((p3[0]-p1[0])*dLng2 - (p3[1]-p1[1])*dLat2) / denom
  return [p1[0]+t*dLat1, p1[1]+t*dLng1]
}
function clipToNabua(poly: [number,number][]): [number,number][] {
  const clip = NABUA_BOUNDARY
  let out = [...poly]
  for (let i=0; i<clip.length-1; i++) {
    if (out.length===0) return []
    const inp = [...out]; out = []
    const a=clip[i], b=clip[i+1]
    for (let j=0; j<inp.length; j++) {
      const curr=inp[j], prev=inp[(j+inp.length-1)%inp.length]
      if (shInsideClip(curr,a,b)) {
        if (!shInsideClip(prev,a,b)) out.push(shIntersect(prev,curr,a,b))
        out.push(curr)
      } else if (shInsideClip(prev,a,b)) {
        out.push(shIntersect(prev,curr,a,b))
      }
    }
  }
  return out
}

// Pre-compute polygon shapes — real GADM boundaries where available, Voronoi fallback otherwise
export const CENTROID_ENTRIES = Object.entries(BARANGAY_COORDS) as [string, [number, number]][]

// Normalize a location string for fuzzy barangay matching:
// strips "Nabua " prefix, "(Pob.)" / "(pob.)" suffix, and extra spaces
export const normForMatch = (s: string) =>
  s.toLowerCase()
   .replace(/^nabua\s+/i, '')
   .replace(/\s*\(pob\.?\)\s*/gi, '')
   .replace(/\s+/g, ' ')
   .trim()

export const matchBarangay = (address: string): string | null => {
  const needle = normForMatch(address)
  if (!needle) return null
  // 1. Exact after normalization
  let found = CENTROID_ENTRIES.find(([name]) => normForMatch(name) === needle)
  if (found) return found[0]
  // 2. Barangay name starts with the address (e.g. "San Miguel" → "San Miguel (Pob.)")
  found = CENTROID_ENTRIES.find(([name]) => normForMatch(name).startsWith(needle))
  if (found) return found[0]
  // 3. Address starts with barangay name (e.g. "San Miguel Purok 3" → "San Miguel")
  found = CENTROID_ENTRIES.find(([name]) => needle.startsWith(normForMatch(name)))
  if (found) return found[0]
  // 4. Either contains the other
  found = CENTROID_ENTRIES.find(([name]) => normForMatch(name).includes(needle) || needle.includes(normForMatch(name)))
  return found ? found[0] : null
}
const GADM_LOOKUP: Record<string, [number, number][]> = Object.fromEntries(
  NABUA_BARANGAY_BOUNDARIES.map(b => [b.name, b.coords])
)
export const BARANGAY_POLYGONS: Record<string, [number, number][]> = Object.fromEntries(
  CENTROID_ENTRIES.map(([name, [lat, lng]]) => [
    name,
    GADM_LOOKUP[name] ?? clipToNabua(makeVoronoiPoly(name, lat, lng, CENTROID_ENTRIES)),
  ])
)

// Compute centroid from actual polygon (more accurate than hardcoded BARANGAY_COORDS)
function polyCentroid(poly: [number, number][]): [number, number] | null {
  if (!poly || poly.length < 3) return null
  // Area centroid via shoelace — gives the true centre of mass of the polygon,
  // unlike a vertex average which drifts badly for concave/irregular shapes.
  let A = 0, cLat = 0, cLng = 0
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length
    const [lat0, lng0] = poly[i], [lat1, lng1] = poly[j]
    const cross = lng0 * lat1 - lng1 * lat0
    A    += cross
    cLng += (lng0 + lng1) * cross
    cLat += (lat0 + lat1) * cross
  }
  A /= 2
  if (Math.abs(A) < 1e-12) {
    // Degenerate — fall back to vertex average
    const lat = poly.reduce((s, p) => s + p[0], 0) / poly.length
    const lng = poly.reduce((s, p) => s + p[1], 0) / poly.length
    return isNaN(lat) || isNaN(lng) ? null : [lat, lng]
  }
  cLat /= 6 * A
  cLng /= 6 * A
  return isNaN(cLat) || isNaN(cLng) ? null : [cLat, cLng]
}
// Pre-computed polygon centroids for all barangays (null-safe)
export const POLYGON_CENTROIDS: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(BARANGAY_POLYGONS)
    .map(([name, poly]) => [name, polyCentroid(poly)])
    .filter((entry): entry is [string, [number, number]] => entry[1] !== null)
)

const SERVER_BASE = API_BASE.replace(/\/api\/?$/, '')

function resolvePhotoUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('data:') || path.startsWith('blob:')) return path
  const rel = path.replace(/^\/?storage\//, '')
  const encode = (v: string) => v.split('/').map(encodeURIComponent).join('/')
  if (rel !== path) return `${API_BASE}/files/public/${encode(rel)}`
  if (!path.startsWith('/')) return `${API_BASE}/files/public/${encode(path)}`
  return `${SERVER_BASE}${path}`
}

function stableJitter(id: number, scale = 0.004): number {
  const x = Math.sin(id * 9301 + 49297) * 233280
  return (x - Math.floor(x)) * scale - scale / 2
}

function resolveCoords(report: MapReport): [number, number] | null {
  if (report.latitude && report.longitude) return [report.latitude, report.longitude]
  if (report.incidentAddress) {
    const matched = matchBarangay(report.incidentAddress)
    if (matched) return BARANGAY_COORDS[matched] ?? null
  }
  const zone = report.geographicTypeName ?? ''
  if (zone in ZONE_COORDS) {
    const [lat, lng] = ZONE_COORDS[zone]
    return [lat + stableJitter(report.id), lng + stableJitter(report.id + 1)]
  }
  return null
}

const fmtDate = (v?: string) => {
  if (!v) return 'N/A'
  const d = new Date(v)
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const fmtTime = (v?: string | null) => {
  if (!v) return null
  const [hStr, mStr] = v.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr?.padStart(2, '0') ?? '00'
  if (isNaN(h)) return v
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${period}`
}

/* ── Info row ────────────────────────────────────────── */
function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: '#9ca3af', marginBottom: 3 }}>
        <i className={`bi bi-${icon} me-1`} />{label}
      </div>
      <div style={{ fontSize: 13, color: '#111827', fontWeight: 500, lineHeight: 1.45 }}>{value}</div>
    </div>
  )
}

/* ── Stats bar row ───────────────────────────────────── */
function StatBar({ label, count, max, color, icon, trackBg = '#f3f4f6', labelColor = '#374151' }: {
  label: string; count: number; max: number; color: string; icon?: string; trackBg?: string; labelColor?: string
}) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: labelColor, fontWeight: 500, flex: 1, minWidth: 0 }}>
          {icon && <i className={`bi ${icon}`} style={{ color, fontSize: 13, flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color, marginLeft: 6, flexShrink: 0 }}>{count}</span>
      </div>
      <div style={{ height: 5, background: trackBg, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

/* ── Analytics sidebar ───────────────────────────────── */
function StatsPanel({ reports, plottedCount, darkMode = false, compact = false }: { reports: MapReport[]; plottedCount: number; darkMode?: boolean; compact?: boolean }) {
  const emergencyTotal = reports.length

  const accidentCounts = useMemo(() => {
    const m: Record<string, number> = {}
    reports.forEach(r => {
      if (r.accidentType)
        m[r.accidentType] = (m[r.accidentType] ?? 0) + 1
    })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 7)
  }, [reports])

  const zoneCounts = useMemo(() => {
    const m: Record<string, number> = {}
    reports.forEach(r => {
      if (r.geographicTypeName) m[r.geographicTypeName] = (m[r.geographicTypeName] ?? 0) + 1
    })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [reports])

  const maxAccident = accidentCounts[0]?.[1] ?? 1
  const maxZone     = zoneCounts[0]?.[1] ?? 1

  const bg      = darkMode ? '#0f172a'  : '#fff'
  const border  = darkMode ? '#334155'  : '#e5e7eb'
  const secBdr  = darkMode ? '#1e293b'  : '#f3f4f6'
  const textSub = darkMode ? '#94a3b8'  : '#6b7280'
  const textMain= darkMode ? '#f1f5f9'  : '#374151'
  const trackBg = darkMode ? '#1e293b'  : '#f3f4f6'

  const panelStyle: React.CSSProperties = {
    width: darkMode ? '100%' : 252,
    flexShrink: 0,
    background: bg,
    border: darkMode ? 'none' : `1px solid ${border}`,
    borderRadius: darkMode ? 0 : 10,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    fontSize: 13,
  }

  const sectionStyle: React.CSSProperties = {
    padding: '13px 15px 10px',
    borderBottom: `1px solid ${secBdr}`,
  }

  const secTitle = (icon: string, label: string, color: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 11 }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: `${color}22` }}>
        <i className={`bi ${icon}`} style={{ color, fontSize: 12 }} />
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: textSub }}>{label}</span>
    </div>
  )

  /* ── Compact layout (mobile fullscreen sidebar) ── */
  if (compact) {
    return (
      <div style={{ width: '100%', background: '#fff', padding: '10px 14px' }}>
        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div style={{ background: '#fef2f2', borderRadius: 10, padding: '8px 12px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-heart-pulse-fill" style={{ color: '#dc2626', fontSize: 18, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Cases</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{emergencyTotal}</div>
            </div>
          </div>
          <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '8px 12px', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-geo-alt-fill" style={{ color: '#7c3aed', fontSize: 18, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Plotted</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>{plottedCount}<span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>/{reports.length}</span></div>
            </div>
          </div>
        </div>

        {/* Emergency type badges */}
        {accidentCounts.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af', marginBottom: 7 }}>Emergency Types</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {accidentCounts.map(([type, count]) => {
                const meta = getAccidentMeta(type)
                return (
                  <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: `${meta?.color ?? '#dc2626'}18`, color: meta?.color ?? '#dc2626', border: `1px solid ${meta?.color ?? '#dc2626'}33`, borderRadius: 20, padding: '3px 10px' }}>
                    {meta?.icon && <i className={`bi ${meta.icon}`} style={{ fontSize: 11 }} />}
                    {type}
                    <span style={{ fontWeight: 800 }}>{count}</span>
                  </span>
                )
              })}
            </div>
          </>
        )}

        {reports.length === 0 && (
          <div style={{ textAlign: 'center', color: '#d1d5db', padding: '10px 0', fontSize: 12 }}>
            <i className="bi bi-bar-chart me-2" />No data yet
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      {/* Overview */}
      <div style={{ ...sectionStyle, paddingTop: 14 }}>
        {secTitle('bi-bar-chart-fill', 'Overview', '#6366f1')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 8 }}>
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 10px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Emergency Cases</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{emergencyTotal}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textSub, padding: '6px 8px', background: trackBg, borderRadius: 7 }}>
          <i className="bi bi-geo-alt-fill" style={{ color: '#6366f1' }} />
          <span><strong style={{ color: textMain }}>{plottedCount}</strong> plotted on map</span>
          <span style={{ marginLeft: 'auto', color: '#d1d5db' }}>/ {reports.length} total</span>
        </div>
      </div>

      {/* Accident types */}
      {accidentCounts.length > 0 && (
        <div style={sectionStyle}>
          {secTitle('bi-heart-pulse-fill', 'Emergency Types', '#dc2626')}
          {accidentCounts.map(([type, count]) => {
            const meta = getAccidentMeta(type)
            return (
              <StatBar
                key={type}
                label={type}
                count={count}
                max={maxAccident}
                color={meta?.color ?? '#dc2626'}
                icon={meta?.icon}
                trackBg={trackBg}
                labelColor={textMain}
              />
            )
          })}
          {ACCIDENT_TYPES.filter(t => !accidentCounts.find(([k]) => k === t.value)).length > 0 && (
            <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 4 }}>
              {ACCIDENT_TYPES.filter(t => !accidentCounts.find(([k]) => k === t.value)).length} types with 0 cases
            </div>
          )}
        </div>
      )}

      {/* Prone areas */}
      {zoneCounts.length > 0 && (
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          {secTitle('bi-geo-alt-fill', 'Prone Areas', '#7c3aed')}
          {zoneCounts.map(([zone, count]) => (
            <StatBar
              key={zone}
              label={zone}
              count={count}
              max={maxZone}
              color='#7c3aed'
              icon='bi-pin-map-fill'
              trackBg={trackBg}
              labelColor={textMain}
            />
          ))}
        </div>
      )}

      {reports.length === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', padding: 20, textAlign: 'center' }}>
          <i className="bi bi-bar-chart" style={{ fontSize: 28, marginBottom: 8 }} />
          <div style={{ fontSize: 12 }}>No data yet</div>
        </div>
      )}
    </div>
  )
}

/* ── Slide-in sidebar ────────────────────────────────── */
function ReportSidebar({
  open, isLoading, report, onClose, clusterItems, clusterIdx, onClusterNav,
}: {
  open: boolean
  isLoading: boolean
  report: ReportDocumentData | null
  onClose: () => void
  clusterItems?: MapReport[] | null
  clusterIdx?: number
  onClusterNav?: (idx: number) => void
}) {
  const isEmergency = report?.report_type === 'Emergency'
  const client = report?.clients?.[0]
  const extraClients = (report?.clients?.length ?? 0) - 1
  const ed = report?.emergencyDetails ?? report?.emergency_details
  const id = report?.incidentDetails ?? report?.incident_details
  const geo = report?.geographicType?.name ?? report?.geographic_type?.name ?? ''
  const photoPath = report?.photos?.[0]?.photo_path
  const photoUrl = photoPath ? resolvePhotoUrl(photoPath) : null

  const severityColor: Record<string, string> = {
    low: '#16a34a', moderate: '#d97706', high: '#ea580c', critical: '#dc2626',
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1040,
          background: 'rgba(0,0,0,0.38)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(440px, 92vw)', zIndex: 1050,
          background: '#fff',
          boxShadow: '-6px 0 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
        }}
      >
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div className="spinner-border text-primary" role="status" />
            <p className="mb-0 text-muted" style={{ fontSize: 13 }}>Loading report…</p>
          </div>
        )}
        {!isLoading && !report && open && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: '0 24px', textAlign: 'center' }}>
            <i className="bi bi-exclamation-circle text-danger" style={{ fontSize: 40 }} />
            <p className="mb-0 text-muted" style={{ fontSize: 13 }}>Could not load report details.</p>
          </div>
        )}
        {!isLoading && report && (
          <>
            {/* Cluster navigation bar */}
            {clusterItems && clusterItems.length > 1 && onClusterNav && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fef2f2', borderBottom: '1px solid #fecaca', flexWrap: 'wrap' }}>
                <i className="bi bi-geo-alt-fill" style={{ color: '#dc2626', fontSize: 12, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', flexShrink: 0 }}>{clusterItems.length} at same location:</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {clusterItems.map((r, i) => {
                    const isActive = i === (clusterIdx ?? 0)
                    const meta = getAccidentMeta(r.accidentType ?? '')
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onClusterNav(i)}
                        title={`Report #${r.id} — ${r.accidentType || 'No type'}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700,
                          background: isActive ? (meta?.color ?? '#dc2626') : '#fff',
                          color: isActive ? '#fff' : (meta?.color ?? '#dc2626'),
                          border: `2px solid ${meta?.color ?? '#dc2626'}`,
                          borderRadius: 20, padding: '2px 10px', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {meta?.icon && <i className={`bi ${meta.icon}`} style={{ fontSize: 10 }} />}
                        Person {i + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{
              position: 'sticky', top: 0, zIndex: 10,
              background: isEmergency ? '#fef2f2' : '#eff6ff',
              borderBottom: `3px solid ${isEmergency ? '#dc2626' : '#2563eb'}`,
              padding: '14px 18px 12px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: isEmergency ? '#dc2626' : '#2563eb' }}>
                  {isEmergency ? '🚑 Emergency Report' : '🔷 Incident Report'}
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>#{report.id}</span>
                </div>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 3 }}>
                  <i className="bi bi-calendar3 me-1" />{fmtDate(report.date_reported)}
                  {report.time_reported && <><span style={{ margin: '0 6px' }}>·</span><i className="bi bi-clock me-1" />{fmtTime(report.time_reported)}</>}
                </div>
                {geo && (
                  <div style={{ marginTop: 5 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                      background: isEmergency ? '#fee2e2' : '#dbeafe',
                      color: isEmergency ? '#991b1b' : '#1e40af',
                    }}>{geo}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#6b7280', fontSize: 20, lineHeight: 1, flexShrink: 0, borderRadius: 6 }}
                aria-label="Close"
              >✕</button>
            </div>

            <div style={{ padding: '22px 22px 40px', overflowY: 'auto', flex: 1 }}>
              {photoUrl ? (
                <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 22, aspectRatio: '16/9' }}>
                  <img src={photoUrl} alt="Incident" crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
                <div style={{ height: 80, borderRadius: 10, marginBottom: 22, background: '#f9fafb', border: '1.5px dashed #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, color: '#d1d5db' }}><i className="bi bi-image me-2" />No photo attached</span>
                </div>
              )}

              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 12 }}>Patient / Person</div>
                <InfoRow icon="person-fill" label="Full Name"
                  value={[client?.full_name, extraClients > 0 ? `+${extraClients} more` : ''].filter(Boolean).join('  ')} />
                <InfoRow icon="info-circle" label="Age / Gender"
                  value={[client?.age ? `${client.age} yrs` : '', client?.gender ?? ''].filter(Boolean).join(' · ')} />
                {client?.accident_type && (
                  <div style={{ marginBottom: 13 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: '#9ca3af', marginBottom: 5 }}>
                      <i className="bi bi-car-front-fill me-1" />Accident Type
                    </div>
                    {(() => {
                      const m = getAccidentMeta(client.accident_type)
                      return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, background: m?.bg ?? '#f0fdf4', color: m?.color ?? '#15803d', padding: '3px 12px 3px 8px', borderRadius: 20, border: `1px solid ${m?.border ?? '#bbf7d0'}` }}>
                          {m && <i className={`bi ${m.icon}`} />}
                          {client.accident_type}
                        </span>
                      )
                    })()}
                  </div>
                )}
                <InfoRow icon="telephone" label="Contact" value={client?.contact_number} />
                <InfoRow icon="house" label="Permanent Address" value={client?.permanent_address} />
              </div>

              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 12 }}>Incident Details</div>
                {isEmergency ? (
                  <>
                    <InfoRow icon="activity"   label="Emergency Type"      value={ed?.type_of_emergency} />
                    <InfoRow icon="heart-pulse" label="Nature of Illness"   value={ed?.nature_of_illness} />
                    <InfoRow icon="bandaid"     label="Mechanism of Injury" value={ed?.mechanism_of_injury} />
                  </>
                ) : (
                  <>
                    <InfoRow icon="exclamation-triangle" label="Type of Hazard" value={id?.type_of_hazard} />
                    <InfoRow icon="telephone"            label="Nature of Call"  value={id?.nature_of_call} />
                    {id?.severity_level && (
                      <div style={{ marginBottom: 13 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: '#9ca3af', marginBottom: 5 }}>
                          <i className="bi bi-thermometer-half me-1" />Severity Level
                        </div>
                        <span style={{ display: 'inline-block', background: severityColor[id.severity_level.toLowerCase()] ?? '#6b7280', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20 }}>
                          {id.severity_level}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 12 }}>Location</div>
                <InfoRow icon="geo-alt-fill" label="Incident Address" value={client?.incident_address} />
                {(report.latitude && report.longitude) && (
                  <div style={{ marginBottom: 13 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: '#9ca3af', marginBottom: 5 }}>
                      <i className="bi bi-crosshair me-1" />GPS Coordinates
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: 8, border: '1px solid #bbf7d0', fontFamily: 'monospace' }}>
                        {Number(report.latitude).toFixed(5)}° N
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: 8, border: '1px solid #bfdbfe', fontFamily: 'monospace' }}>
                        {Number(report.longitude).toFixed(5)}° E
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {(report.ambulanceTransfer ?? report.ambulance_transfer) && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 12 }}>Responders</div>
                  <InfoRow icon="truck"        label="Ambulance Driver" value={(report.ambulanceTransfer ?? report.ambulance_transfer)?.ambulance_driver} />
                  <InfoRow icon="person-badge" label="Dispatcher"       value={(report.ambulanceTransfer ?? report.ambulance_transfer)?.dispatcher} />
                  <InfoRow icon="people-fill"  label="Responders"       value={(report.ambulanceTransfer ?? report.ambulance_transfer)?.responders} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

/* ── Deselect barangay on map background click ────────── */
function MapClickHandler({ onDeselect }: { onDeselect: () => void }) {
  const map = useMap()
  useMapEvents({
    click: () => {
      onDeselect()
      map.flyTo(NABUA_CENTER, 13, { duration: 0.7 })
    },
  })
  return null
}

/* ── Fly to a map position ───────────────────────────── */
function FlyToTarget({ target, barangayName }: { target: [number, number] | null; barangayName?: string | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target || isNaN(target[0]) || isNaN(target[1])) return
    const poly = barangayName ? BARANGAY_POLYGONS[barangayName] : null
    if (poly && poly.length > 1) {
      try {
        map.flyToBounds(L.latLngBounds(poly), { padding: [40, 40], maxZoom: 15, duration: 0.9 })
      } catch {
        map.flyTo(target, 15, { duration: 0.9 })
      }
    } else {
      map.flyTo(target, 15, { duration: 0.9 })
    }
  }, [target, map])
  return null
}

/* ── Slim risk panel with filter (used inside fullscreen sidebar) ── */
function SlimRiskPanel({
  sorted,
  onFlyTo,
}: {
  sorted: [string, number][]
  onFlyTo: (lat: number, lng: number, name: string) => void
}) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const visible = activeFilter
    ? sorted.filter(([, c]) => getRisk(c).label === activeFilter)
    : sorted

  return (
    <div style={{ background: '#fff' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', background: '#f8fafc',
        borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 2,
      }}>
        <i className="bi bi-layers-fill" style={{ color: '#ea580c', fontSize: 12 }} />
        <span style={{ fontWeight: 700, fontSize: 11, color: '#1e293b' }}>Barangay Risk Summary</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>
          {visible.length}/{sorted.length}
        </span>
      </div>

      {/* Filter buttons — sticky below header */}
      <div style={{
        display: 'flex', gap: 3, padding: '5px 8px',
        background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
        position: 'sticky', top: 31, zIndex: 2,
      }}>
        {/* All button */}
        <button
          type="button"
          onClick={() => setActiveFilter(null)}
          style={{
            flex: 1, textAlign: 'center', padding: '4px 2px',
            background: activeFilter === null ? '#1e293b' : '#f1f5f9',
            borderRadius: 6,
            border: `1.5px solid ${activeFilter === null ? '#1e293b' : '#cbd5e1'}`,
            cursor: 'pointer', transition: 'all .12s',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: activeFilter === null ? '#fff' : '#374151' }}>{sorted.length}</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: activeFilter === null ? '#fff' : '#64748b', lineHeight: 1.2 }}>All</div>
        </button>

        {RISK_LEVELS.map(l => {
          const cnt = sorted.filter(([, c]) => getRisk(c).label === l.label).length
          const isActive = activeFilter === l.label
          return (
            <button
              key={l.label}
              type="button"
              onClick={() => setActiveFilter(isActive ? null : l.label)}
              title={isActive ? 'Show all' : `Filter: ${l.label}`}
              style={{
                flex: 1, textAlign: 'center', padding: '4px 2px',
                background: isActive ? l.color : l.bg,
                borderRadius: 6,
                border: `1.5px solid ${isActive ? l.color : l.color + '44'}`,
                cursor: 'pointer', transition: 'all .12s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: isActive ? '#fff' : l.color }}>{cnt}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: isActive ? '#fff' : l.color, lineHeight: 1.2, whiteSpace: 'pre-line' }}>
                {l.label.replace(' Area', '').replace(' Risk', '\nRisk')}
              </div>
            </button>
          )
        })}
      </div>

      {/* Barangay rows */}
      {visible.length === 0 ? (
        <div style={{ padding: '14px 10px', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
          No barangays in this category
        </div>
      ) : visible.map(([name, count]) => {
        const risk   = getRisk(count)
        const coords = POLYGON_CENTROIDS[name] ?? BARANGAY_COORDS[name]
        return (
          <div
            key={name}
            onClick={() => coords && onFlyTo(coords[0], coords[1], name)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = risk.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: risk.fillColor, border: `2px solid ${risk.color}`,
            }} />
            <span style={{ flex: 1, fontSize: 11, color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </span>
            {count > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 800, color: '#fff',
                background: risk.color, borderRadius: 10, padding: '0 5px', flexShrink: 0,
              }}>{count}</span>
            )}
            <i className="bi bi-geo-alt-fill" style={{ fontSize: 10, color: risk.color, flexShrink: 0 }} />
          </div>
        )
      })}
    </div>
  )
}

/* ── Barangay Risk Summary panel ─────────────────────── */
function RiskSummaryPanel({
  barangayRisk,
  onFlyTo,
  slim = false,
}: {
  barangayRisk: Record<string, number>
  onFlyTo: (lat: number, lng: number, name: string) => void
  slim?: boolean
}) {
  const dark = useDarkMode()
  // slim = compact single-column list with filter (for narrow sidebar in fullscreen)
  if (slim) {
    const riskOrder = RISK_LEVELS.map(r => r.label)
    const sorted = Object.entries(barangayRisk).sort((a, b) => {
      const oA = riskOrder.indexOf(getRisk(a[1]).label)
      const oB = riskOrder.indexOf(getRisk(b[1]).label)
      if (oA !== oB) return oA - oB
      return b[1] - a[1] || a[0].localeCompare(b[0])
    })
    return <SlimRiskPanel sorted={sorted} onFlyTo={onFlyTo} />
  }
  return (
    <div style={{
      marginTop: 10,
      border: `1px solid ${dark ? '#374151' : '#e5e7eb'}`,
      borderRadius: 8,
      background: dark ? '#1f2937' : '#fff',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderBottom: `1px solid ${dark ? '#374151' : '#f3f4f6'}`,
        background: dark ? '#111827' : '#f8fafc',
      }}>
        <i className="bi bi-layers-fill" style={{ color: '#ea580c', fontSize: 12 }} />
        <span style={{ fontWeight: 700, fontSize: 12, color: dark ? '#f1f5f9' : '#1e293b' }}>Barangay Risk Summary</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>
          {Object.keys(barangayRisk).length} barangays · click <i className="bi bi-geo-alt-fill" /> to locate
        </span>
      </div>

      {/* 5-column layout: 4 risk levels + all barangays */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 1.3fr' }}>
        {/* Risk level columns */}
        {RISK_LEVELS.map((level) => {
          const items = Object.entries(barangayRisk)
            .filter(([, count]) => getRisk(count).label === level.label)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          return (
            <div key={level.label} style={{
              borderRight: `1px solid ${dark ? '#374151' : '#f3f4f6'}`,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px',
                background: dark ? `${level.color}22` : level.bg,
                borderBottom: `2px solid ${level.color}33`,
              }}>
                <span style={{
                  width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                  background: level.fillColor, border: `2px solid ${level.color}`,
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: level.color, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {level.label}
                </span>
                <span style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                  background: level.color, color: '#fff',
                  borderRadius: 10, padding: '0px 6px',
                }}>
                  {items.length}
                </span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 200 }}>
                {items.length === 0 ? (
                  <div style={{ padding: '8px 10px', fontSize: 11, color: '#d1d5db' }}>—</div>
                ) : items.map(([name, count]) => {
                  const coords = POLYGON_CENTROIDS[name] ?? BARANGAY_COORDS[name]
                  const hoverBg = dark ? `${level.color}33` : level.bg
                  return (
                    <div key={name}
                      onClick={() => coords && onFlyTo(coords[0], coords[1], name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 8px', borderBottom: `1px solid ${dark ? '#263347' : '#f9fafb'}`,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <span style={{ flex: 1, fontSize: 11, color: dark ? '#cbd5e1' : '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: level.color, flexShrink: 0 }}>
                        {count === 0 ? '—' : `${count} case${count !== 1 ? 's' : ''}`}
                      </span>
                      <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: level.color, flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* 5th column — All Barangays */}
        {(() => {
          const allSorted = Object.entries(barangayRisk)
            .sort((a, b) => a[0].localeCompare(b[0]))
          return (
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `2px solid ${dark ? '#374151' : '#e5e7eb'}` }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px',
                background: dark ? '#1e293b' : '#f1f5f9',
                borderBottom: `2px solid ${dark ? '#374151' : '#e2e8f0'}`,
              }}>
                <i className="bi bi-list-ul" style={{ fontSize: 11, color: '#64748b' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: dark ? '#94a3b8' : '#374151', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  All Barangays
                </span>
                <span style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                  background: '#64748b', color: '#fff',
                  borderRadius: 10, padding: '0px 6px',
                }}>
                  {allSorted.length}
                </span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 200 }}>
                {allSorted.map(([name, count]) => {
                  const risk   = getRisk(count)
                  const coords = POLYGON_CENTROIDS[name] ?? BARANGAY_COORDS[name]
                  const hoverBg = dark ? `${risk.color}33` : risk.bg
                  return (
                    <div key={name}
                      onClick={() => coords && onFlyTo(coords[0], coords[1], name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 8px', borderBottom: `1px solid ${dark ? '#263347' : '#f9fafb'}`,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: risk.fillColor, border: `2px solid ${risk.color}`,
                        display: 'inline-block',
                      }} />
                      <span style={{ flex: 1, fontSize: 11, color: dark ? '#cbd5e1' : '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                      <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: risk.color, flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/* ── Barangay details sidebar ────────────────────────── */
function BarangayDetailsSidebar({
  open, barangayName, reports, barangayRisk,
  onClose, onOpenReport,
}: {
  open: boolean
  barangayName: string | null
  reports: MapReport[]
  barangayRisk: Record<string, number>
  onClose: () => void
  onOpenReport: (id: number) => void
}) {

  const dark = useDarkMode()
  const barangayReports = useMemo(() => {
    if (!barangayName) return []
    return reports.filter(r => {
      // Text address takes priority (same logic as barangayRisk)
      if (r.incidentAddress) {
        return matchBarangay(r.incidentAddress) === barangayName
      }
      // Fall back to GPS nearest-centroid
      const lat = Number(r.latitude), lng = Number(r.longitude)
      if (r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng)) {
        let nearest = '', minDist = Infinity
        CENTROID_ENTRIES.forEach(([name, [bLat, bLng]]) => {
          const d = Math.hypot(lat - bLat, lng - bLng)
          if (d < minDist) { minDist = d; nearest = name }
        })
        return nearest === barangayName
      }
      return false
    })
  }, [barangayName, reports])

  const count = barangayName ? (barangayRisk[barangayName] ?? 0) : 0
  const risk  = getRisk(count)

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1040,
          background: 'rgba(0,0,0,0.32)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.22s ease',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(400px, 92vw)', zIndex: 1050,
        background: dark ? '#1f2937' : '#fff',
        boxShadow: '-6px 0 32px rgba(0,0,0,0.16)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: dark ? `${risk.color}22` : risk.bg,
          borderBottom: `3px solid ${risk.color}`,
          padding: '14px 18px 12px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: risk.color, marginBottom: 3 }}>
              <i className="bi bi-layers-fill me-1" />Accident Risk — Barangay
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: dark ? '#f1f5f9' : '#1e293b' }}>
              <i className="bi bi-geo-alt-fill me-1" style={{ color: risk.color }} />
              {barangayName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 12px', borderRadius: 20,
                background: risk.color, color: '#fff',
              }}>{risk.label}</span>
              <span style={{ fontSize: 12, color: dark ? '#9ca3af' : '#6b7280' }}>
                {count === 0 ? 'No recorded incidents' : `${count} case${count !== 1 ? 's' : ''} recorded`}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: dark ? '#9ca3af' : '#6b7280', padding: '4px 6px', borderRadius: 6, lineHeight: 1 }}>✕</button>
        </div>

        {/* Records list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {barangayReports.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#d1d5db', textAlign: 'center' }}>
              <i className="bi bi-clipboard-x" style={{ fontSize: 36, marginBottom: 10 }} />
              <div style={{ fontSize: 13 }}>No records found for this barangay</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9ca3af', marginBottom: 10 }}>
                {barangayReports.length} Record{barangayReports.length !== 1 ? 's' : ''}
              </div>
              {barangayReports.map(r => {
                const meta = getAccidentMeta(r.accidentType ?? '')
                return (
                  <div key={r.id} style={{
                    border: `1px solid ${dark ? '#374151' : '#f3f4f6'}`,
                    borderRadius: 10, padding: '10px 12px',
                    marginBottom: 8, background: dark ? '#111827' : '#fafafa',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: dark ? `${meta?.color ?? '#dc2626'}22` : (meta?.bg ?? '#fef2f2'),
                      border: `1.5px solid ${dark ? `${meta?.color ?? '#dc2626'}66` : (meta?.border ?? '#fecaca')}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`bi ${meta?.icon ?? 'bi-heart-pulse-fill'}`} style={{ color: meta?.color ?? '#dc2626', fontSize: 15 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: dark ? '#f1f5f9' : '#1e293b' }}>
                          Emergency #{r.id}
                        </span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDate(r.date_reported)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: dark ? '#cbd5e1' : '#374151', marginTop: 2 }}>
                        {r.accidentType || 'Unspecified type'}
                      </div>
                      {r.clientName && (
                        <div style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280', marginTop: 1 }}>
                          <i className="bi bi-person-fill me-1" />{r.clientName}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenReport(r.id)}
                      title="View full report"
                      style={{
                        flexShrink: 0,
                        background: dark ? '#1e3a5f' : '#eff6ff',
                        border: `1px solid ${dark ? '#3b82f6' : '#bfdbfe'}`,
                        borderRadius: 7, padding: '5px 10px', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, color: dark ? '#60a5fa' : '#2563eb',
                      }}
                    >
                      <i className="bi bi-eye-fill me-1" />View
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Main component ──────────────────────────────────── */
interface DashboardMapProps {
  reports: MapReport[]
  isLoading: boolean
}

export function DashboardMap({ reports, isLoading }: DashboardMapProps) {
  const [sidebarOpen,        setSidebarOpen]        = useState(false)
  const [selectedId,         setSelectedId]         = useState<number | null>(null)
  const [detailReport,       setDetailReport]       = useState<ReportDocumentData | null>(null)
  const [isLoadingDetail,    setIsLoadingDetail]    = useState(false)
  const [isFullscreen,       setIsFullscreen]       = useState(false)
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null)
  const [clusterItems,       setClusterItems]       = useState<MapReport[] | null>(null)
  const [clusterIdx,         setClusterIdx]         = useState(0)
  const [showRisk,          setShowRisk]          = useState(false)
  const [flyTarget,         setFlyTarget]         = useState<[number, number] | null>(null)
  const [selectedBarangay,  setSelectedBarangay]  = useState<string | null>(null)
  const [barangayDetailsOpen,setBarangayDetailsOpen] = useState(false)
  const [detailsBarangayName, setDetailsBarangayName] = useState<string | null>(null)
  const barangayMarkerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!selectedBarangay) return
    const t = setTimeout(() => barangayMarkerRef.current?.openPopup(), 500)
    return () => clearTimeout(t)
  }, [selectedBarangay])

  // Count cases per barangay: GPS nearest-centroid first, then text address fallback
  const barangayRisk = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(
      Object.keys(BARANGAY_COORDS).map(b => [b, 0])
    )
    reports.forEach(r => {
      // Text address takes priority — it's the explicit barangay the user entered
      if (r.incidentAddress) {
        const matched = matchBarangay(r.incidentAddress)
        if (matched) { counts[matched] += 1; return }
      }
      // Fall back to GPS nearest-centroid when no address is available
      const lat = Number(r.latitude)
      const lng = Number(r.longitude)
      if (r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng)) {
        let nearest = '', minDist = Infinity
        CENTROID_ENTRIES.forEach(([name, [bLat, bLng]]) => {
          const d = Math.hypot(lat - bLat, lng - bLng)
          if (d < minDist) { minDist = d; nearest = name }
        })
        if (nearest) counts[nearest] += 1
      }
    })
    return counts
  }, [reports])

  const plotted = useMemo(() =>
    reports
      .map(r => ({ report: r, coords: resolveCoords(r) }))
      .filter((item): item is { report: MapReport; coords: [number, number] } => item.coords !== null),
    [reports])

  // Group pins that share the exact same coordinates into clusters
  const clusters = useMemo(() => {
    const groups = new Map<string, { coords: [number, number]; items: MapReport[] }>()
    plotted.forEach(({ report, coords }) => {
      const key = `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`
      if (!groups.has(key)) groups.set(key, { coords, items: [] })
      groups.get(key)!.items.push(report)
    })
    return Array.from(groups.entries()).map(([key, val]) => ({ key, ...val }))
  }, [plotted])

  const handlePinClick = async (id: number) => {
    setSelectedId(id)
    setSidebarOpen(true)
    setDetailReport(null)
    setIsLoadingDetail(true)
    try {
      const res = await api.get(`/reports/${id}`)
      setDetailReport(res.data as ReportDocumentData)
    } catch {
      setDetailReport(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleClose = () => {
    setSidebarOpen(false)
    setSelectedId(null)
    setSelectedClusterKey(null)
    setClusterItems(null)
    setClusterIdx(0)
  }

  const handleClusterNav = async (items: MapReport[], idx: number) => {
    setClusterIdx(idx)
    setSelectedId(items[idx].id)
    setDetailReport(null)
    setIsLoadingDetail(true)
    try {
      const res = await api.get(`/reports/${items[idx].id}`)
      setDetailReport(res.data as ReportDocumentData)
    } catch {
      setDetailReport(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const MapLayers = () => (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!showRisk && (
        <Polygon
          positions={NABUA_BOUNDARY}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.07, weight: 2, dashArray: '6 3' }}
        />
      )}

      {/* ── Accident Risk polygons — real GADM boundaries per barangay ── */}
      {showRisk && Object.entries(BARANGAY_POLYGONS).map(([name, positions]) => {
        const count = barangayRisk[name] ?? 0
        const risk  = getRisk(count)
        const isSelected = name === selectedBarangay
        return (
          <Polygon
            key={`risk-${name}`}
            positions={positions}
            eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); setSelectedBarangay(name) } }}
            pathOptions={{
              color:       isSelected ? '#1e293b' : '#fff',
              weight:      isSelected ? 3 : 1,
              fillColor:   risk.fillColor,
              fillOpacity: isSelected ? 0.88 : (count === 0 ? 0.35 : 0.72),
            }}
          >
            <Tooltip direction="top" opacity={1} sticky>
              <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 170 }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 5, fontSize: 13 }}>
                  <i className="bi bi-geo-alt-fill me-1" style={{ color: risk.color }} />
                  {name}
                </div>
                <span style={{
                  background: risk.bg, color: risk.color, border: `1px solid ${risk.color}55`,
                  borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                }}>
                  {risk.label}
                </span>
                <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>
                  {count === 0
                    ? 'No recorded emergency incidents'
                    : `${count} emergency case${count !== 1 ? 's' : ''} recorded`}
                </div>
              </div>
            </Tooltip>
          </Polygon>
        )
      })}

      {/* ── Selected barangay center pin ── */}
      {showRisk && selectedBarangay && (() => {
        const bCoords: [number, number] | undefined =
          POLYGON_CENTROIDS[selectedBarangay] ?? BARANGAY_COORDS[selectedBarangay]
        if (!bCoords || isNaN(bCoords[0]) || isNaN(bCoords[1])) return null
        const bCount  = barangayRisk[selectedBarangay] ?? 0
        const bRisk   = getRisk(bCount)
        const pinIcon = L.divIcon({
          html: `<div style="
            width:20px;height:20px;border-radius:50%;
            background:${bRisk.color};border:3px solid #fff;
            box-shadow:0 2px 10px rgba(0,0,0,0.4);
            cursor:pointer;
          "></div>`,
          className: '', iconSize: [20, 20], iconAnchor: [10, 10],
        })
        return (
          <Marker
            key={`center-${selectedBarangay}`}
            position={bCoords}
            icon={pinIcon}
            ref={barangayMarkerRef}
          >
            <Popup autoPan={false} closeButton={false} offset={[0, -12]}>
              <div style={{ minWidth: 180, fontFamily: 'inherit' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 5 }}>
                  <i className="bi bi-geo-alt-fill me-1" style={{ color: bRisk.color }} />
                  {selectedBarangay}
                </div>
                <span style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 700,
                  background: bRisk.color, color: '#fff',
                  borderRadius: 20, padding: '2px 12px', marginBottom: 7,
                }}>
                  {bRisk.label}
                </span>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                  {bCount === 0
                    ? 'No recorded incidents'
                    : `${bCount} case${bCount !== 1 ? 's' : ''} recorded`}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDetailsBarangayName(selectedBarangay)
                    setBarangayDetailsOpen(true)
                  }}
                  style={{
                    width: '100%', background: bRisk.color, color: '#fff',
                    border: 'none', borderRadius: 8, padding: '7px 0',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <i className="bi bi-list-ul" />View Records
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })()}

      {/* ── Emergency pins — grouped into clusters when coords match ── */}
      {!showRisk && clusters.map(({ key, coords, items }) => {
        const isSingle = items.length === 1
        const isSelected = isSingle
          ? items[0].id === selectedId
          : selectedClusterKey === key
        // Always use a normal pin icon — cluster count badge removed
        const icon = createPinIcon(items[0], isSelected)

        return (
          <Marker
            key={`cluster-${key}-${isSelected}`}
            position={coords}
            icon={icon}
            eventHandlers={{
              click: () => {
                if (isSingle) {
                  setSelectedClusterKey(null)
                  setClusterItems(null)
                  setClusterIdx(0)
                  handlePinClick(items[0].id)
                } else {
                  setSelectedClusterKey(key)
                  setClusterItems(items)
                  setClusterIdx(0)
                  handlePinClick(items[0].id)
                }
              },
            }}
          >
            {isSingle ? (
              <Tooltip direction="top" offset={[0, -14]} opacity={1}>
                <div style={{ minWidth: 185, maxWidth: 230, fontSize: 12, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 6, fontSize: 13 }}>
                    🚑 Emergency #{items[0].id}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, background: '#fef2f2', borderRadius: 4, padding: '1px 5px', color: '#dc2626', fontWeight: 500 }}>Type</span>
                    <span style={{ color: '#374151', fontWeight: 500 }}>{items[0].accidentType || 'Not specified'}</span>
                  </div>
                  <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#15803d', background: '#f0fdf4', padding: '1px 6px', borderRadius: 5 }}>{coords[0].toFixed(5)}° N</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#1d4ed8', background: '#eff6ff', padding: '1px 6px', borderRadius: 5 }}>{coords[1].toFixed(5)}° E</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{fmtDate(items[0].date_reported)}</div>
                </div>
              </Tooltip>
            ) : (
              <Tooltip direction="top" offset={[0, -14]} opacity={1}>
                <div style={{ fontSize: 12, color: '#374151' }}>
                  <span style={{ fontWeight: 700, color: '#dc2626' }}>{items.length} reports</span> at this location
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Click to view all records</div>
                </div>
              </Tooltip>
            )}
          </Marker>
        )
      })}
    </>
  )

  const MapOverlays = ({ emptyMap }: { emptyMap: boolean }) => (
    <>
      {/* Pin legend (always visible) */}
      <div className="dm-map-legend" style={{
        position: 'absolute', bottom: 10, left: 10, zIndex: 1000,
        background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(4px)',
        borderRadius: 8, padding: '7px 12px', border: '1px solid #e5e7eb',
        fontSize: 11, display: 'flex', gap: 14,
        boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#dc2626', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', display: 'inline-block' }} />
          <span style={{ color: '#374151', fontWeight: 600 }}>Emergency</span>
        </span>
      </div>

      {/* Accident Risk legend (only when overlay is on) */}
      {showRisk && (
        <div className="dm-map-legend" style={{
          position: 'absolute', top: 10, right: 10, zIndex: 1000,
          background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)',
          borderRadius: 10, padding: '12px 14px', border: '1px solid #e5e7eb',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)', minWidth: 180,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-layers-fill" style={{ color: '#ea580c' }} />
            Accident Risk
          </div>
          {RISK_LEVELS.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <span style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                background: r.fillColor, border: `2px solid ${r.color}`,
                display: 'inline-block',
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{r.label}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 6, paddingTop: 6, fontSize: 10, color: '#9ca3af' }}>
            Based on GPS-matched barangay records
          </div>
        </div>
      )}
      {emptyMap && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 500,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)',
          pointerEvents: 'none',
        }}>
          <i className="bi bi-geo-alt text-muted" style={{ fontSize: 36 }} />
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>No reports to display</div>
        </div>
      )}
    </>
  )

  return (
    <>
      <section className="db-panel" style={{ marginBottom: 0, height: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div>
            <h5 className="mb-0">
              <i className="bi bi-map-fill me-2 text-primary" />
              Emergency Response Map
            </h5>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              <i className="bi bi-info-circle me-1" />
              Hover a pin to see details · Click to open full report
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Accident Risk toggle */}
            <button
              type="button"
              onClick={() => { setShowRisk(v => !v); if (showRisk) setSelectedBarangay(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: showRisk ? '#fff7ed' : '#f8fafc',
                border: `1.5px solid ${showRisk ? '#f97316' : '#e2e8f0'}`,
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                color: showRisk ? '#ea580c' : '#374151',
                transition: 'all .15s',
              }}
            >
              <i className={`bi ${showRisk ? 'bi-layers-fill' : 'bi-layers'}`} />
              Accident Risk
              {showRisk && (
                <span style={{ fontSize: 10, background: '#ea580c', color: '#fff', borderRadius: 10, padding: '1px 6px', marginLeft: 2 }}>ON</span>
              )}
            </button>

            {/* Full Screen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#374151',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLButtonElement).style.color = '#2563eb' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.color = '#374151' }}
            >
              <i className="bi bi-arrows-fullscreen" />
              Full Screen
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="d-flex align-items-center justify-content-center" style={{ height: 340 }}>
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
            Loading map data…
          </div>
        ) : (
          <div style={{ height: 340, borderRadius: 10, overflow: 'hidden', border: '1px solid #dee2e6', position: 'relative' }}>
            <MapContainer center={NABUA_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <MapLayers />
              <FlyToTarget target={flyTarget} barangayName={selectedBarangay} />
              <MapClickHandler onDeselect={() => setSelectedBarangay(null)} />
            </MapContainer>
            <MapOverlays emptyMap={plotted.length === 0} />
          </div>
        )}

        {/* Barangay Risk Summary — shown when Risk overlay is ON */}
        {showRisk && !isLoading && (
          <RiskSummaryPanel
            barangayRisk={barangayRisk}
            onFlyTo={(_lat, _lng, name) => {
              const c = POLYGON_CENTROIDS[name] ?? BARANGAY_COORDS[name]
              if (c && !isNaN(c[0]) && !isNaN(c[1])) setFlyTarget(c)
              setSelectedBarangay(name)
            }}
          />
        )}

        {/* Slide-in sidebar */}
        <ReportSidebar
          open={sidebarOpen}
          isLoading={isLoadingDetail}
          report={detailReport}
          onClose={handleClose}
          clusterItems={clusterItems}
          clusterIdx={clusterIdx}
          onClusterNav={idx => handleClusterNav(clusterItems!, idx)}
        />

        {/* Barangay details sidebar */}
        <BarangayDetailsSidebar
          open={barangayDetailsOpen}
          barangayName={detailsBarangayName}
          reports={reports}
          barangayRisk={barangayRisk}
          onClose={() => { setBarangayDetailsOpen(false); setDetailsBarangayName(null) }}
          onOpenReport={id => { setBarangayDetailsOpen(false); setDetailsBarangayName(null); handlePinClick(id) }}
        />
      </section>

      {/* ── Fullscreen map overlay ─────────────────────── */}
      {isFullscreen && (
        <div className="fs-overlay">
          {/* ── Fullscreen top bar ── */}
          <div className="fs-topbar">
            {/* Title */}
            <div className="fs-topbar-title">
              <i className="bi bi-map-fill" style={{ color: '#2563eb', fontSize: 17 }} />
              <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 15 }}>Emergency Response Map</span>
              <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '1px 9px', fontSize: 11, fontWeight: 600 }}>
                {clusters.length} pin{clusters.length !== 1 ? 's' : ''}
              </span>
            </div>
            {/* Controls */}
            <div className="fs-topbar-actions">
              <button type="button"
                onClick={() => { setShowRisk(v => !v); if (showRisk) setSelectedBarangay(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: showRisk ? '#fff7ed' : '#f8fafc', border: `1.5px solid ${showRisk ? '#f97316' : '#e2e8f0'}`, borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: showRisk ? '#ea580c' : '#374151', transition: 'all .15s' }}
              >
                <i className={`bi ${showRisk ? 'bi-layers-fill' : 'bi-layers'}`} />
                <span className="fs-btn-label"> Accident Risk</span>
                <span style={{ fontSize: 9, borderRadius: 10, padding: '1px 6px', fontWeight: 700, background: showRisk ? '#ea580c' : '#94a3b8', color: '#fff' }}>{showRisk ? 'ON' : 'OFF'}</span>
              </button>
              <button type="button"
                onClick={() => setIsFullscreen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#dc2626' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151' }}
              >
                <i className="bi bi-fullscreen-exit" />
                <span className="fs-btn-label"> Exit</span>
              </button>
            </div>
          </div>

          {/* ── Fullscreen body: map + right panel ── */}
          <div className="fs-body">

            {/* Map — absolute fill so height: 100% works for Leaflet */}
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <MapContainer center={NABUA_CENTER} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                  <MapLayers />
                  <FlyToTarget target={flyTarget} barangayName={selectedBarangay} />
                  <MapClickHandler onDeselect={() => setSelectedBarangay(null)} />
                </MapContainer>
              </div>
              <MapOverlays emptyMap={plotted.length === 0} />
            </div>

            {/* Right sidebar — light theme */}
            <div className="fs-sidebar">
              <div style={{ flexShrink: 0 }}>
                <StatsPanel reports={reports} plottedCount={plotted.length} compact />
              </div>
              {showRisk && !isLoading && (
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, borderTop: '1px solid #e2e8f0' }}>
                  <RiskSummaryPanel
                    slim
                    barangayRisk={barangayRisk}
                    onFlyTo={(_lat, _lng, name) => {
                      const c = POLYGON_CENTROIDS[name] ?? BARANGAY_COORDS[name]
                      if (c && !isNaN(c[0]) && !isNaN(c[1])) setFlyTarget(c)
                      setSelectedBarangay(name)
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Slide-in sidebars */}
          <ReportSidebar
            open={sidebarOpen}
            isLoading={isLoadingDetail}
            report={detailReport}
            onClose={handleClose}
          />
          <BarangayDetailsSidebar
            open={barangayDetailsOpen}
            barangayName={detailsBarangayName}
            reports={reports}
            barangayRisk={barangayRisk}
            onClose={() => { setBarangayDetailsOpen(false); setDetailsBarangayName(null) }}
            onOpenReport={id => { setBarangayDetailsOpen(false); setDetailsBarangayName(null); handlePinClick(id) }}
          />
        </div>
      )}
    </>
  )
}
