import { useEffect, useMemo, useState } from 'react'
import api from '../../api/axios'
import '../../style/dashboard.css'
import { OnboardingTour } from '../../components/OnboardingTour'
import { DashboardMap, type MapReport, CENTROID_ENTRIES, BARANGAY_POLYGONS, POLYGON_CENTROIDS, matchBarangay, getRisk } from './DashboardMap'
import { DisasterWeatherPanel } from './DisasterWeatherPanel'
import { HazardMap, type HazardReport } from './HazardMap'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import nabuaLogoUrl from '../../assets/nabua_logo.png?url'
import mdrrmoLogoUrl from '../../assets/Mdrrmo_logo.png?url'

type ReportType = 'Emergency' | 'Incident'
type GenderTab = 'all' | 'male' | 'female'

interface ApiGeographicType {
    id: number
    name: string
}

interface ApiClient {
    full_name?: string
    age?: number | string | null
    gender?: string | null
    incident_address?: string | null
    accident_type?: string | null
}

interface ApiEmergencyDetails {
    type_of_emergency?: string | null
    mechanism_of_injury?: string | null
    nature_of_illness?: string | null
    incident_date?: string | null
    incident_time?: string | null
}

interface ApiIncidentDetails {
    type_of_hazard?: string | null
    nature_of_call?: string | null
    severity_level?: string | null
    incident_barangay?: string | null
}

interface ApiReport {
    id: number
    report_type: ReportType
    date_reported: string
    time_reported: string
    latitude?: number | null
    longitude?: number | null
    geographicType?: ApiGeographicType | null
    geographic_type?: ApiGeographicType | null
    clients?: ApiClient[]
    emergencyDetails?: ApiEmergencyDetails | null
    emergency_details?: ApiEmergencyDetails | null
    incidentDetails?: ApiIncidentDetails | null
    incident_details?: ApiIncidentDetails | null
}

interface ApiUser {
    role?: string
    status?: string
}

interface AgeBucket {
    label: string
    medical: number
    trauma: number
    latestDate: string | null
}

const ZONE_NAMES = ['Rail Road', 'Poblacion', 'Mountain Area', 'River Side']

const ZONE_COLORS: Record<string, string> = {
    'Rail Road': '#1d6fe8',
    Poblacion: '#15824e',
    'Mountain Area': '#eab308',
    'River Side': '#06b6d4',
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const AGE_RANGES = [
    { min: 0, max: 20, label: '0-20' },
    { min: 21, max: 40, label: '21-40' },
    { min: 41, max: 60, label: '41-60' },
    { min: 61, max: 200, label: '61 above' },
]

const normalizeDateInput = (dateValue: Date): string => {
    const year = dateValue.getFullYear()
    const month = `${dateValue.getMonth() + 1}`.padStart(2, '0')
    const day = `${dateValue.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
}

const formatShortDate = (value: string | null): string => {
    if (!value) return 'N/A'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString()
}

const parseAge = (age: number | string | null | undefined): number | null => {
    if (age === null || age === undefined) return null
    if (typeof age === 'number' && Number.isFinite(age)) return age
    const parsed = Number(age)
    return Number.isFinite(parsed) ? parsed : null
}

const normalizeZone = (report: ApiReport): string => {
    return report.geographicType?.name ?? report.geographic_type?.name ?? 'Unknown Zone'
}

const extractEmergencyDetails = (report: ApiReport): ApiEmergencyDetails | null => {
    return report.emergencyDetails ?? report.emergency_details ?? null
}

const classifyEmergency = (detail: ApiEmergencyDetails | null): 'medical' | 'trauma' => {
    const raw = `${detail?.type_of_emergency ?? ''} ${detail?.mechanism_of_injury ?? ''} ${detail?.nature_of_illness ?? ''}`.toLowerCase()
    const traumaHints = ['trauma', 'injury', 'accident', 'fracture', 'wound', 'bleed', 'collision']
    return traumaHints.some((hint) => raw.includes(hint)) ? 'trauma' : 'medical'
}

const inferBarangay = (address: string | null | undefined): string => {
    if (!address || address.trim() === '') return 'Unknown'
    const firstChunk = address.split(',')[0]?.trim()
    return firstChunk && firstChunk.length > 0 ? firstChunk : address.trim()
}

const extractDateKey = (raw: string | null | undefined): string | null => {
    if (!raw) return null
    const text = raw.trim()
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]

    const parsed = new Date(text)
    if (Number.isNaN(parsed.getTime())) return null
    return normalizeDateInput(parsed)
}

const reportDateKey = (report: ApiReport): string | null => {
    const fallbackIncidentDate = extractEmergencyDetails(report)?.incident_date
    return extractDateKey(report.date_reported) ?? extractDateKey(fallbackIncidentDate)
}

const monthKeyFromDate = (dateKey: string): string => dateKey.slice(0, 7)

const DonutChart = ({ data }: { data: Array<{ label: string; value: number; color: string }> }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)

    if (total <= 0) {
        return (
            <div className="db-donut-wrap">
                <div className="db-donut" style={{ background: '#1d6fe8' }} />
                <div className="db-legend-item mt-2">
                    <span className="db-dot" style={{ background: '#1d6fe8' }}></span>
                    <span>No Data</span>
                </div>
            </div>
        )
    }

    const slices = data
        .reduce(
            (acc, item) => {
                const percentage = (item.value / total) * 100
                const end = acc.offset + percentage
                return {
                    offset: end,
                    segments: [...acc.segments, `${item.color} ${acc.offset}% ${end}%`],
                }
            },
            { offset: 0, segments: [] as string[] }
        )
        .segments

    return (
        <div className="db-donut-wrap">
            <div className="db-donut" style={{ background: `conic-gradient(${slices.join(', ')})` }} />
            <div className="db-legend-list mt-2">
                {data.filter((item) => item.value > 0).map((item) => (
                    <div key={item.label} className="db-legend-item">
                        <span className="db-dot" style={{ background: item.color }}></span>
                        <span>{item.label} ({item.value})</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

const GroupedBarChart = ({ series, title }: { series: Record<string, number[]>; title?: string }) => {
    const width = 740
    const height = 260
    const pad = { top: 24, right: 20, bottom: 52, left: 40 }
    const plotW = width - pad.left - pad.right
    const plotH = height - pad.top - pad.bottom

    const zones = Object.keys(series)
    const months = 12
    const groupW = plotW / months
    const barGap = 2
    const barW = Math.max(3, (groupW - barGap * (zones.length + 1)) / zones.length)

    const allValues = Object.values(series).flat()
    const maxValue = Math.max(1, ...allValues)
    const yTicks = 5
    const getY = (v: number) => pad.top + ((maxValue - v) / maxValue) * plotH
    const baseline = pad.top + plotH

    return (
        <div className="db-line-wrap">
            {title && <p className="db-chart-title" style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{title}</p>}
            <svg viewBox={`0 0 ${width} ${height}`} className="db-line-svg" role="img" aria-label="Monthly zonal reports comparison">
                {/* Y-axis label */}
                <text x={10} y={pad.top + plotH / 2} className="db-axis-text" transform={`rotate(-90, 10, ${pad.top + plotH / 2})`} textAnchor="middle">Reports</text>

                {/* Grid lines + Y ticks */}
                {Array.from({ length: yTicks + 1 }).map((_, i) => {
                    const v = Math.round((maxValue / yTicks) * i)
                    const y = getY(v)
                    return (
                        <g key={`gy-${i}`}>
                            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '3,3'} />
                            <text x={pad.left - 4} y={y + 4} className="db-axis-text" textAnchor="end">{v}</text>
                        </g>
                    )
                })}

                {/* Baseline */}
                <line x1={pad.left} y1={baseline} x2={width - pad.right} y2={baseline} stroke="#d1d5db" strokeWidth="1.5" />

                {/* Bars + month labels */}
                {MONTH_LABELS.map((label, mi) => {
                    const groupX = pad.left + mi * groupW
                    const groupCenter = groupX + groupW / 2
                    return (
                        <g key={label}>
                            {zones.map((zone, zi) => {
                                const v = series[zone]?.[mi] ?? 0
                                const bx = groupX + barGap + zi * (barW + barGap)
                                const bh = v === 0 ? 0 : Math.max(2, (v / maxValue) * plotH)
                                const by = baseline - bh
                                return (
                                    <g key={zone}>
                                        <rect x={bx} y={by} width={barW} height={bh}
                                            fill={ZONE_COLORS[zone] ?? '#64748b'}
                                            rx="2"
                                            opacity="0.88"
                                        />
                                        {v > 0 && bh > 14 && (
                                            <text x={bx + barW / 2} y={by - 3} className="db-axis-text" textAnchor="middle" style={{ fontSize: 8 }}>{v}</text>
                                        )}
                                    </g>
                                )
                            })}
                            <text x={groupCenter} y={height - 36} className="db-axis-text db-axis-month" textAnchor="middle">{label}</text>
                        </g>
                    )
                })}
            </svg>

            <div className="db-zone-legend">
                {zones.map((zone) => (
                    <span key={zone} className="db-zone-legend-item">
                        <span className="db-dot" style={{ background: ZONE_COLORS[zone] ?? '#64748b' }}></span>
                        {zone}
                    </span>
                ))}
            </div>
        </div>
    )
}

// Accident type color palette
const ACCIDENT_COLORS: Record<string, string> = {
    'Vehicular Accident': '#dc2626',
    'Fire Incident': '#ea580c',
    'Drowning': '#2563eb',
    'Electrocution': '#d97706',
    'Medical Emergency': '#db2777',
    'Trauma / Injury': '#7c3aed',
    'Building Collapse': '#78350f',
    'Explosion': '#b45309',
    'Others': '#4b5563',
    'Unspecified': '#9ca3af',
}

type DashboardTab = 'emergency' | 'disaster'

export const Dashboard = () => {
    const [reports, setReports] = useState<ApiReport[]>([])
    const [staffCount, setStaffCount] = useState(0)
    const [genderTab, setGenderTab] = useState<GenderTab>('all')
    const [dashTab, setDashTab] = useState<DashboardTab>('emergency')
    const [isLoading, setIsLoading] = useState(true)
    const [showDailyModal, setShowDailyModal] = useState(false)
    const [dailyFrom, setDailyFrom] = useState('')
    const [dailyTo, setDailyTo] = useState('')
    const [isDailyGenerating, setIsDailyGenerating] = useState(false)

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setIsLoading(true)

                let loadedReports: ApiReport[] = []

                try {
                    const fullResponse = await api.get<ApiReport[]>('/reports')
                    loadedReports = Array.isArray(fullResponse.data) ? fullResponse.data : []
                } catch {
                    loadedReports = []
                }

                setReports(loadedReports)

                try {
                    const usersResponse = await api.get<ApiUser[]>('/users')
                    if (Array.isArray(usersResponse.data)) {
                        const activeStaff = usersResponse.data.filter((user) => user.role === 'staff' && user.status === 'active')
                        setStaffCount(activeStaff.length)
                    } else {
                        setStaffCount(0)
                    }
                } catch {
                    setStaffCount(0)
                }
            } catch {
                setReports([])
                setStaffCount(0)
            } finally {
                setIsLoading(false)
            }
        }

        void loadDashboardData()
    }, [])

    const todayKey = normalizeDateInput(new Date())
    const monthNow = new Date().getMonth()
    const yearNow = new Date().getFullYear()
    const monthLabel = new Date().toLocaleString(undefined, { month: 'long' })

    // Emergency-only slice — use this for ALL stats
    const emergencyReports = useMemo(() => reports.filter(r => r.report_type === 'Emergency'), [reports])

    // Total patients affected (all clients across emergency reports)
    const totalPatientsAffected = useMemo(() =>
        emergencyReports.reduce((sum, r) => sum + (r.clients?.length ?? 0), 0),
    [emergencyReports])

    // Top stat cards — emergency only
    const todayCount = useMemo(() => emergencyReports.filter(r => reportDateKey(r) === todayKey).length, [emergencyReports, todayKey])

    const monthCount = useMemo(() => {
        const currentMonthKey = `${yearNow}-${String(monthNow + 1).padStart(2, '0')}`
        return emergencyReports.filter(r => { const k = reportDateKey(r); return k !== null && monthKeyFromDate(k) === currentMonthKey }).length
    }, [emergencyReports, monthNow, yearNow])

    // Zone counts — emergency only
    const zoneCounts = useMemo(() => {
        const out: Record<string, number> = Object.fromEntries(ZONE_NAMES.map(z => [z, 0]))
        emergencyReports.forEach(r => { const z = normalizeZone(r); if (z in out) out[z] += 1 })
        return out
    }, [emergencyReports])

    // Trend — emergency only
    const trend = useMemo(() => {
        const currentMonthKey = `${yearNow}-${String(monthNow + 1).padStart(2, '0')}`
        const prevDate = new Date(yearNow, monthNow - 1, 1)
        const previousMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
        const current = emergencyReports.filter(r => { const k = reportDateKey(r); return k && monthKeyFromDate(k) === currentMonthKey }).length
        const previous = emergencyReports.filter(r => { const k = reportDateKey(r); return k && monthKeyFromDate(k) === previousMonthKey }).length
        return { current, previous, pct: previous === 0 ? null as number | null : Math.round(((current - previous) / previous) * 100) }
    }, [emergencyReports, monthNow, yearNow])

    const ageBuckets = useMemo(() => {
        const buckets: AgeBucket[] = AGE_RANGES.map((range) => ({
            label: range.label,
            medical: 0,
            trauma: 0,
            latestDate: null,
        }))

        emergencyReports.forEach((report) => {
            const emergencyType = classifyEmergency(extractEmergencyDetails(report))
            const relevantClients = (report.clients ?? []).filter((client) => {
                if (genderTab === 'all') return true
                const gender = (client.gender ?? '').toLowerCase()
                return genderTab === 'male' ? gender === 'male' : gender === 'female'
            })

            relevantClients.forEach((client) => {
                const age = parseAge(client.age)
                if (age === null) return

                const bucketIndex = AGE_RANGES.findIndex((range) => age >= range.min && age <= range.max)
                if (bucketIndex < 0) return

                if (emergencyType === 'trauma') {
                    buckets[bucketIndex].trauma += 1
                } else {
                    buckets[bucketIndex].medical += 1
                }

                if (!buckets[bucketIndex].latestDate || report.date_reported > buckets[bucketIndex].latestDate) {
                    buckets[bucketIndex].latestDate = report.date_reported
                }
            })
        })

        return buckets
    }, [emergencyReports, genderTab])

    const populatedAgeBuckets = ageBuckets

    // Most affected barangays — emergency only, simplified columns + topType
    const mostAffectedBarangays = useMemo(() => {
        const map = new Map<string, { barangay: string; total: number; typeCounts: Record<string, number> }>()
        emergencyReports.forEach(report => {
            const addr = report.clients?.find(c => (c.incident_address ?? '').trim() !== '')?.incident_address ?? normalizeZone(report)
            const barangay = inferBarangay(addr)
            const existing = map.get(barangay) ?? { barangay, total: 0, typeCounts: {} }
            existing.total += 1
            report.clients?.forEach(client => {
                const type = client.accident_type?.trim() || 'Unspecified'
                existing.typeCounts[type] = (existing.typeCounts[type] ?? 0) + 1
            })
            map.set(barangay, existing)
        })
        return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5).map((item, i) => ({
            rank: i + 1,
            barangay: item.barangay,
            total: item.total,
            topType: Object.entries(item.typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
        }))
    }, [emergencyReports])

    // Accident type distribution — for donut chart
    const accidentTypeData = useMemo(() => {
        const m = new Map<string, number>()
        emergencyReports.forEach(r => {
            r.clients?.forEach(c => {
                const t = c.accident_type?.trim() || 'Unspecified'
                m.set(t, (m.get(t) ?? 0) + 1)
            })
        })
        const palette = Object.values(ACCIDENT_COLORS)
        return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({
            label, value, color: ACCIDENT_COLORS[label] ?? palette[i % palette.length],
        }))
    }, [emergencyReports])

    // Gender distribution — for donut
    const genderData = useMemo(() => {
        let male = 0, female = 0
        emergencyReports.forEach(r => r.clients?.forEach(c => {
            const g = (c.gender ?? '').toLowerCase()
            if (g === 'male') male++; else if (g === 'female') female++
        }))
        return [{ label: 'Male', value: male, color: '#1d6fe8' }, { label: 'Female', value: female, color: '#ec4899' }]
    }, [emergencyReports])

    // Monthly trends — emergency only
    const monthlyZoneSeries = useMemo(() => {
        const year = new Date().getFullYear()
        const result: Record<string, number[]> = Object.fromEntries(ZONE_NAMES.map(z => [z, Array(12).fill(0)]))
        emergencyReports.forEach(r => {
            const d = new Date(r.date_reported)
            if (isNaN(d.getTime()) || d.getFullYear() !== year) return
            const z = normalizeZone(r); if (z in result) result[z][d.getMonth()] += 1
        })
        return result
    }, [emergencyReports])

    // mapReports — emergency only
    const mapReports = useMemo((): MapReport[] =>
        emergencyReports.map(r => ({
            id: r.id, report_type: r.report_type, date_reported: r.date_reported,
            latitude: r.latitude, longitude: r.longitude, geographicTypeName: normalizeZone(r),
            clientName: r.clients?.[0]?.full_name ?? null,
            incidentAddress: r.clients?.[0]?.incident_address ?? null,
            emergencyType: (r.emergencyDetails ?? r.emergency_details)?.type_of_emergency ?? null,
            hazardType: null, callNature: null,
            accidentType: r.clients?.[0]?.accident_type ?? null,
        })),
    [emergencyReports])

    // Accident type bar stats (for the breakdown section)
    const accidentTypeBars = useMemo(() => {
        const ALL_TYPES = Object.keys(ACCIDENT_COLORS).filter(t => t !== 'Unspecified')
        const m = new Map<string, number>(ALL_TYPES.map(t => [t, 0]))
        emergencyReports.forEach(r => r.clients?.forEach(c => {
            const t = c.accident_type?.trim() || 'Unspecified'
            m.set(t, (m.get(t) ?? 0) + 1)
        }))
        const entries = [...m.entries()].sort((a, b) => b[1] - a[1])
        const maxVal = entries.find(([, v]) => v > 0)?.[1] ?? 1
        return entries.map(([type, count]) => ({ type, count, pct: count === 0 ? 0 : Math.round((count / maxVal) * 100), color: ACCIDENT_COLORS[type] ?? '#6b7280' }))
    }, [emergencyReports])

    // ── Barangay risk (emergency only, for PDF) ───────────
    const barangayRisk = useMemo(() => {
        const counts: Record<string, number> = Object.fromEntries(CENTROID_ENTRIES.map(([n]) => [n, 0]))
        emergencyReports.forEach(r => {
            const addr = r.clients?.[0]?.incident_address
            if (addr) {
                const matched = matchBarangay(addr)
                if (matched) { counts[matched] = (counts[matched] ?? 0) + 1; return }
            }
            const lat = Number(r.latitude), lng = Number(r.longitude)
            if (r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng)) {
                let nearest = '', minDist = Infinity
                CENTROID_ENTRIES.forEach(([name, [bLat, bLng]]) => {
                    const d = Math.hypot(lat - bLat, lng - bLng)
                    if (d < minDist) { minDist = d; nearest = name }
                })
                if (nearest) counts[nearest] = (counts[nearest] ?? 0) + 1
            }
        })
        return counts
    }, [emergencyReports])

    // ── PDF helpers ───────────────────────────────────────
    const loadImgBase64 = (url: string): Promise<string> =>
        new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                const c = document.createElement('canvas')
                c.width = img.width; c.height = img.height
                c.getContext('2d')!.drawImage(img, 0, 0)
                resolve(c.toDataURL('image/png'))
            }
            img.onerror = reject
            img.src = url
        })

    const drawPdfHeader = (doc: jsPDF, pageWidth: number, nabuaB64: string, mdrrmoB64: string) => {
        doc.addImage(nabuaB64,  'PNG', 30,           14, 110, 110)
        doc.addImage(mdrrmoB64, 'PNG', pageWidth - 140, 14, 110, 110)
        doc.setFont('times', 'normal'); doc.setFontSize(18); doc.setTextColor(0, 0, 0)
        doc.text('Republic of the Philippines', pageWidth / 2, 42, { align: 'center' })
        doc.setFontSize(16)
        doc.text('Province of Camarines Sur', pageWidth / 2, 64, { align: 'center' })
        doc.setFont('times', 'bold'); doc.setFontSize(16)
        doc.text('Local Government Unit of Nabua', pageWidth / 2, 86, { align: 'center' })
        doc.setTextColor(0, 56, 192); doc.setFontSize(19)
        doc.text('Municipal Disaster Risk Reduction & Management Office', pageWidth / 2, 118, { align: 'center' })
        doc.setTextColor(0, 0, 0); doc.setFont('times', 'normal'); doc.setFontSize(12)
        doc.text('Emergency Hotline: (054) 288-10-23  Smart: 0947-1819-217  Globe: 0915-2062-265  Radio Freq: 147.075', pageWidth / 2, 138, { align: 'center' })
        doc.text('Email Address: mdrrmonabua@yahoo.com / mdrrmonabua@gmail.com', pageWidth / 2, 156, { align: 'center' })
        doc.setDrawColor(255, 204, 0); doc.setLineWidth(2)
        doc.line(30, 168, pageWidth - 30, 168)
        doc.line(30, 174, pageWidth - 30, 174)
    }

    const renderEmergencyMapCanvas = (risk: Record<string, number>): string => {
        const W = 1800, H = 700
        const canvas = document.createElement('canvas')
        canvas.width = W; canvas.height = H
        const ctx = canvas.getContext('2d')
        if (!ctx) return ''

        // Coordinate bounds
        let latMin = Infinity, latMax = -Infinity, lngMin = Infinity, lngMax = -Infinity
        Object.values(BARANGAY_POLYGONS).forEach(poly =>
            poly.forEach(([lat, lng]) => {
                if (lat < latMin) latMin = lat; if (lat > latMax) latMax = lat
                if (lng < lngMin) lngMin = lng; if (lng > lngMax) lngMax = lng
            })
        )
        const latPad = (latMax - latMin) * 0.055
        const lngPad = (lngMax - lngMin) * 0.055
        latMin -= latPad; latMax += latPad; lngMin -= lngPad; lngMax += lngPad

        const LEGEND_W = 210, PAD = 16
        const mapW = W - PAD * 2 - LEGEND_W
        const mapH = H - PAD * 2
        const toX = (lng: number) => PAD + (lng - lngMin) / (lngMax - lngMin) * mapW
        const toY = (lat: number) => PAD + (1 - (lat - latMin) / (latMax - latMin)) * mapH

        // Shoelace pixel area — used to prioritise larger barangay labels
        const pixelArea = (poly: [number, number][]): number => {
            let a = 0
            for (let i = 0; i < poly.length; i++) {
                const j = (i + 1) % poly.length
                a += toX(poly[i][1]) * toY(poly[j][0]) - toX(poly[j][1]) * toY(poly[i][0])
            }
            return Math.abs(a) / 2
        }

        // Background (ocean blue)
        ctx.fillStyle = '#bfdbfe'
        ctx.fillRect(0, 0, W, H)

        // Small-polygon inflation: scale small polygons outward from their area
        // centroid (same point used for the label) so the label sits inside the shape.
        const inflatedPoly = (
            poly: [number, number][],
            centroidLatLng: [number, number],
        ): [number, number][] => {
            const pts = poly.map(([lat, lng]) => [toX(lng), toY(lat)] as [number, number])
            const area = pixelArea(poly)
            if (area >= 1400) return pts
            // Scale from the area centroid so the label stays at the polygon centre
            const pcx = toX(centroidLatLng[1])
            const pcy = toY(centroidLatLng[0])
            const scale = Math.min(3.2, Math.sqrt(2800 / Math.max(area, 80)))
            return pts.map(([x, y]) => [pcx + (x - pcx) * scale, pcy + (y - pcy) * scale])
        }

        // Draw barangay polygons — white outer border for separation, colored inner border
        Object.entries(BARANGAY_POLYGONS).forEach(([name, poly]) => {
            if (poly.length < 3) return
            const centroidLatLng = POLYGON_CENTROIDS[name]
            if (!centroidLatLng) return
            const count = risk[name] ?? 0
            const r = getRisk(count)
            const pixels = inflatedPoly(poly, centroidLatLng)
            const drawPath = () => {
                ctx.beginPath()
                pixels.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
                ctx.closePath()
            }
            drawPath()
            ctx.globalAlpha = 0.82
            ctx.fillStyle = r.fillColor
            ctx.fill()
            ctx.globalAlpha = 1
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 2.5
            ctx.stroke()
            drawPath()
            ctx.strokeStyle = r.color
            ctx.lineWidth = 0.9
            ctx.stroke()
        })

        // Labels — larger barangays first, skip if overlapping
        const labelOrder = Object.entries(POLYGON_CENTROIDS)
            .map(([name, [lat, lng]]) => ({
                name, cx: toX(lng), cy: toY(lat),
                area: BARANGAY_POLYGONS[name] ? pixelArea(BARANGAY_POLYGONS[name]) : 0,
            }))
            .sort((a, b) => b.area - a.area)

        const occupied: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

        const tryDrawLabel = (text: string, cx: number, cy: number, fs: number): boolean => {
            ctx.font = `bold ${fs}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            const tw = ctx.measureText(text).width
            const th = fs + 2
            const px = 5, py = 3
            const x1 = cx - tw / 2 - px, y1 = cy - th / 2 - py
            const x2 = cx + tw / 2 + px, y2 = cy + th / 2 + py
            // Collision check
            for (const r of occupied) {
                if (x1 < r.x2 + 2 && x2 > r.x1 - 2 && y1 < r.y2 + 2 && y2 > r.y1 - 2) return false
            }
            occupied.push({ x1, y1, x2, y2 })
            // White rounded pill background
            const rad = 4
            ctx.fillStyle = 'rgba(255,255,255,0.9)'
            ctx.beginPath()
            ctx.moveTo(x1 + rad, y1)
            ctx.lineTo(x2 - rad, y1)
            ctx.quadraticCurveTo(x2, y1, x2, y1 + rad)
            ctx.lineTo(x2, y2 - rad)
            ctx.quadraticCurveTo(x2, y2, x2 - rad, y2)
            ctx.lineTo(x1 + rad, y2)
            ctx.quadraticCurveTo(x1, y2, x1, y2 - rad)
            ctx.lineTo(x1, y1 + rad)
            ctx.quadraticCurveTo(x1, y1, x1 + rad, y1)
            ctx.closePath()
            ctx.fill()
            // Text
            ctx.fillStyle = '#1e293b'
            ctx.fillText(text, cx, cy)
            return true
        }

        // Skip these specific tiny Poblacion barangays — too small to label cleanly
        const SKIP_LABELS = new Set(['San Roque (Pob.)', 'San Luis (Pob.)'])

        labelOrder.forEach(({ name, cx, cy, area }) => {
            if (area < 500 || SKIP_LABELS.has(name)) return
            const short = name
                .replace(/^Nabua\s+/i, '')
                .replace(/\s*\(Pob\.?\)\s*/gi, ' (P.)')
                .replace(/Gorong-Gorong/gi, 'G-G')
            const fs = area > 9000 ? 11 : area > 3500 ? 10 : 9
            tryDrawLabel(short, cx, cy, fs)
        })

        // ── Legend panel ──────────────────────────────────────
        const lx = W - LEGEND_W
        ctx.fillStyle = 'rgba(255,255,255,0.96)'
        ctx.fillRect(lx, 0, LEGEND_W, H)
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1
        ctx.strokeRect(lx, 0, LEGEND_W, H)

        let ly = 24
        const legendSection = (title: string) => {
            ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#0f172a'
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
            ctx.fillText(title, lx + 12, ly); ly += 8
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(lx + 8, ly); ctx.lineTo(lx + LEGEND_W - 8, ly)
            ctx.stroke(); ly += 12
        }

        legendSection('Barangay Risk Level')
        const RISK_DISPLAY = [
            { label: 'High Risk (4+ cases)',  fillColor: '#f97316', color: '#ea580c' },
            { label: 'Moderate (2–3 cases)',  fillColor: '#fbbf24', color: '#b45309' },
            { label: 'Low Risk (1 case)',      fillColor: '#60a5fa', color: '#1d4ed8' },
            { label: 'Safe (0 cases)',         fillColor: '#c084fc', color: '#7e22ce' },
        ]
        RISK_DISPLAY.forEach(rl => {
            ctx.globalAlpha = 0.85
            ctx.fillStyle = rl.fillColor; ctx.strokeStyle = rl.color; ctx.lineWidth = 1
            ctx.fillRect(lx + 12, ly - 7, 14, 14); ctx.strokeRect(lx + 12, ly - 7, 14, 14)
            ctx.globalAlpha = 1
            ctx.fillStyle = '#374151'; ctx.font = '10.5px Arial'
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
            ctx.fillText(rl.label, lx + 32, ly); ly += 22
        })

        return canvas.toDataURL('image/png')
    }

    const handleDownloadEmergencyPdf = async () => {
        const [nabuaB64, mdrrmoB64] = await Promise.all([
            loadImgBase64(nabuaLogoUrl).catch(() => ''),
            loadImgBase64(mdrrmoLogoUrl).catch(() => ''),
        ])

        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const generatedAt = new Date().toLocaleString()

        // ── PAGE 1: Summary Statistics ──────────────────────
        drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)

        doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
        doc.text('Emergency Reports Summary', pageWidth / 2, 200, { align: 'center' })
        doc.setFont('times', 'normal'); doc.setFontSize(11)
        doc.text(`Generated: ${generatedAt}`, 40, 220)

        // Overview table
        autoTable(doc, {
            startY: 232,
            head: [['Total Emergency Cases', 'Today', 'This Month', 'Patients Affected', 'Active Staff']],
            body: [[
                String(emergencyReports.length),
                String(todayCount),
                String(monthCount),
                String(totalPatientsAffected),
                String(staffCount),
            ]],
            styles: { fontSize: 11, halign: 'center', cellPadding: 6 },
            headStyles: { fillColor: [220, 38, 38] },
            theme: 'grid',
        })

        // Zone breakdown
        const zoneY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16
        doc.setFont('times', 'bold'); doc.setFontSize(12)
        doc.text('Emergency Cases by Zone', 40, zoneY)
        autoTable(doc, {
            startY: zoneY + 8,
            head: [['Zone', 'Cases']],
            body: ZONE_NAMES.map(z => [z, String(zoneCounts[z] ?? 0)]),
            styles: { fontSize: 11, cellPadding: 5 },
            headStyles: { fillColor: [30, 99, 220] },
            columnStyles: { 1: { halign: 'center' } },
            theme: 'striped',
            tableWidth: 280,
        })

        // Accident type breakdown — placed beside zone table
        const typeY = zoneY + 8
        autoTable(doc, {
            startY: typeY,
            head: [['Accident / Emergency Type', 'Cases']],
            body: accidentTypeBars.filter(a => a.count > 0).map(a => [a.type, String(a.count)]),
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [124, 58, 237] },
            columnStyles: { 1: { halign: 'center' } },
            theme: 'striped',
            margin: { left: pageWidth / 2 + 10 },
        })

        // ── PAGE 2: Emergency Map ────────────────────────────
        doc.addPage()
        drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)

        doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
        doc.text('Emergency Incident Map — Barangay Risk & Pin Points', pageWidth / 2, 200, { align: 'center' })
        doc.setFont('times', 'normal'); doc.setFontSize(10)
        doc.text('Polygons = barangay risk level  |  Colored circles = emergency type  |  GPS-recorded reports only', pageWidth / 2, 215, { align: 'center' })

        const mapImgData = renderEmergencyMapCanvas(barangayRisk)
        if (mapImgData) {
            const mapAvailW = pageWidth - 60
            const mapImgH = mapAvailW * (600 / 1500)
            doc.addImage(mapImgData, 'PNG', 30, 222, mapAvailW, mapImgH)
        }

        // ── PAGE 3: Pin-Point Locations ─────────────────────
        doc.addPage()
        drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)

        doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
        doc.text('Emergency Incident Pin-Point Locations', pageWidth / 2, 200, { align: 'center' })
        doc.setFont('times', 'normal'); doc.setFontSize(11)
        doc.text(`Total: ${emergencyReports.length} records`, 40, 218)

        const pinRows = emergencyReports.map(r => {
            const client = r.clients?.[0]
            const ed = r.emergencyDetails ?? r.emergency_details
            const addr = client?.incident_address?.trim() || '—'
            const zone = normalizeZone(r)
            const gps = (r.latitude && r.longitude)
                ? `${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)}`
                : '—'
            return [
                r.date_reported ? new Date(r.date_reported).toLocaleDateString() : '—',
                client?.full_name || '—',
                client?.age ?? '—',
                client?.gender || '—',
                ed?.type_of_emergency || client?.accident_type || '—',
                addr,
                zone,
                gps,
            ]
        })

        autoTable(doc, {
            startY: 228,
            head: [['Date', 'Name', 'Age', 'Gender', 'Type', 'Incident Address', 'Zone', 'GPS']],
            body: pinRows,
            styles: { fontSize: 9, cellPadding: 5 },
            headStyles: { fillColor: [30, 99, 220] },
            theme: 'striped',
        })

        // ── PAGE 4: Barangay Accident Risk ──────────────────
        doc.addPage()
        drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)

        doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
        doc.text('Barangay Accident Risk Assessment', pageWidth / 2, 200, { align: 'center' })
        doc.setFont('times', 'normal'); doc.setFontSize(11)
        doc.text('Based on emergency report locations (text address + GPS fallback)', 40, 218)

        const riskRows = Object.entries(barangayRisk)
            .sort((a, b) => b[1] - a[1])
            .map(([barangay, count], i) => {
                const risk = getRisk(count)
                return [String(i + 1), barangay, String(count), risk.label]
            })

        autoTable(doc, {
            startY: 228,
            head: [['#', 'Barangay', 'Cases', 'Risk Level']],
            body: riskRows,
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [220, 38, 38] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 60 },
                3: { cellWidth: 160 },
            },
            theme: 'striped',
            didParseCell: (data) => {
                if (data.column.index === 3 && data.section === 'body') {
                    const label = String(data.cell.raw)
                    if (label.includes('High'))     data.cell.styles.textColor = [234, 88, 12]
                    else if (label.includes('Moderate')) data.cell.styles.textColor = [180, 83, 9]
                    else if (label.includes('Low'))  data.cell.styles.textColor = [29, 78, 216]
                    else                             data.cell.styles.textColor = [126, 34, 206]
                }
            },
        })

        doc.save(`emergency-summary-${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    // ── Disaster tab data ─────────────────────────────────
    const incidentReports = useMemo(() => reports.filter(r => r.report_type === 'Incident'), [reports])

    const hazardMapReports = useMemo((): HazardReport[] =>
        incidentReports.map(r => {
            const details = r.incidentDetails ?? r.incident_details
            return {
                id:              r.id,
                latitude:        r.latitude != null ? String(r.latitude) : null,
                longitude:       r.longitude != null ? String(r.longitude) : null,
                incidentAddress: details?.incident_barangay ?? null,
                hazardType:      details?.type_of_hazard ?? null,
                severityLevel:   details?.severity_level ?? null,
                reportDate:      r.date_reported ?? null,
            }
        }),
    [incidentReports])

    const HAZARD_COLORS: Record<string, string> = {
        Flood: '#1d4ed8', Earthquake: '#92400e', Typhoon: '#0369a1', Landslide: '#713f12',
        Tsunami: '#0f766e', 'Volcanic Eruption': '#be123c',
    }
    const HAZARD_ICONS: Record<string, string> = {
        Flood: 'bi-water', Earthquake: 'bi-globe-americas', Typhoon: 'bi-wind', Landslide: 'bi-triangle-fill',
        Tsunami: 'bi-tsunami', 'Volcanic Eruption': 'bi-fire',
    }
    const ALL_HAZARDS = ['Flood', 'Earthquake', 'Typhoon', 'Landslide', 'Tsunami', 'Volcanic Eruption'] as const

    const disasterHazardCounts = useMemo(() => {
        const m: Record<string, number> = Object.fromEntries(ALL_HAZARDS.map(h => [h, 0]))
        incidentReports.forEach(r => {
            const h = (r.incidentDetails ?? r.incident_details)?.type_of_hazard?.trim()
            if (h && h in m) m[h] += 1
        })
        return m
    }, [incidentReports])

    const disasterZoneCounts = useMemo(() => {
        const out: Record<string, number> = Object.fromEntries(ZONE_NAMES.map(z => [z, 0]))
        incidentReports.forEach(r => { const z = normalizeZone(r); if (z in out) out[z] += 1 })
        return out
    }, [incidentReports])

    const disasterHazardData = useMemo(() => {
        const palette = ['#1d4ed8', '#92400e', '#0369a1', '#713f12', '#6b7280']
        const m = new Map<string, number>()
        incidentReports.forEach(r => {
            const h = (r.incidentDetails ?? r.incident_details)?.type_of_hazard?.trim() || 'Unknown'
            m.set(h, (m.get(h) ?? 0) + 1)
        })
        return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({
            label, value, color: HAZARD_COLORS[label] ?? palette[i % palette.length],
        }))
    }, [incidentReports])

    const disasterMonthlyZone = useMemo(() => {
        const year = new Date().getFullYear()
        const result: Record<string, number[]> = Object.fromEntries(ZONE_NAMES.map(z => [z, Array(12).fill(0)]))
        incidentReports.forEach(r => {
            const d = new Date(r.date_reported)
            if (isNaN(d.getTime()) || d.getFullYear() !== year) return
            const z = normalizeZone(r); if (z in result) result[z][d.getMonth()] += 1
        })
        return result
    }, [incidentReports])

    const disasterTodayCount = useMemo(() => incidentReports.filter(r => reportDateKey(r) === todayKey).length, [incidentReports, todayKey])
    const disasterMonthCount = useMemo(() => {
        const k = `${yearNow}-${String(monthNow + 1).padStart(2, '0')}`
        return incidentReports.filter(r => { const dk = reportDateKey(r); return dk && monthKeyFromDate(dk) === k }).length
    }, [incidentReports, monthNow, yearNow])

    const disasterMostAffectedBarangays = useMemo(() => {
        const SEV_ORDER: Record<string, number> = { High: 3, Moderate: 2, Low: 1 }
        const map = new Map<string, { barangay: string; total: number; hazardCounts: Record<string, number>; topSev: string }>()
        incidentReports.forEach(r => {
            const details = r.incidentDetails ?? r.incident_details
            const raw = details?.incident_barangay?.trim() ?? ''
            const barangay = (raw.replace(/^nabua\s*/i, '').trim()) || normalizeZone(r)
            if (!barangay) return
            const existing = map.get(barangay) ?? { barangay, total: 0, hazardCounts: {}, topSev: 'Low' }
            existing.total += 1
            const hazard = details?.type_of_hazard?.trim()
            if (hazard) existing.hazardCounts[hazard] = (existing.hazardCounts[hazard] ?? 0) + 1
            const sev = details?.severity_level?.trim() ?? 'Low'
            if ((SEV_ORDER[sev] ?? 1) > (SEV_ORDER[existing.topSev] ?? 1)) existing.topSev = sev
            map.set(barangay, existing)
        })
        return [...map.values()]
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
            .map((item, i) => ({
                rank: i + 1,
                barangay: item.barangay,
                total: item.total,
                topHazard: Object.entries(item.hazardCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
                topSeverity: item.topSev,
            }))
    }, [incidentReports])

    // ── Barangay risk (disaster/incident only, for PDF) ───
    const disasterBarangayRisk = useMemo(() => {
        const counts: Record<string, number> = Object.fromEntries(CENTROID_ENTRIES.map(([n]) => [n, 0]))
        incidentReports.forEach(r => {
            const details = r.incidentDetails ?? r.incident_details
            const barangay = details?.incident_barangay?.trim()
            if (barangay) {
                const matched = matchBarangay(barangay)
                if (matched) { counts[matched] = (counts[matched] ?? 0) + 1; return }
            }
            const lat = Number(r.latitude), lng = Number(r.longitude)
            if (r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng)) {
                let nearest = '', minDist = Infinity
                CENTROID_ENTRIES.forEach(([name, [bLat, bLng]]) => {
                    const d = Math.hypot(lat - bLat, lng - bLng)
                    if (d < minDist) { minDist = d; nearest = name }
                })
                if (nearest) counts[nearest] = (counts[nearest] ?? 0) + 1
            }
        })
        return counts
    }, [incidentReports])

    // ── Per-hazard barangay risk (for per-hazard map pages) ─
    const barangayRiskByHazard = useMemo(() => {
        const result: Record<string, Record<string, number>> = {}
        ALL_HAZARDS.forEach(hazard => {
            const counts: Record<string, number> = Object.fromEntries(CENTROID_ENTRIES.map(([n]) => [n, 0]))
            incidentReports
                .filter(r => (r.incidentDetails ?? r.incident_details)?.type_of_hazard?.trim() === hazard)
                .forEach(r => {
                    const details = r.incidentDetails ?? r.incident_details
                    const barangay = details?.incident_barangay?.trim()
                    if (barangay) {
                        const matched = matchBarangay(barangay)
                        if (matched) { counts[matched] = (counts[matched] ?? 0) + 1; return }
                    }
                    const lat = Number(r.latitude), lng = Number(r.longitude)
                    if (r.latitude && r.longitude && !isNaN(lat) && !isNaN(lng)) {
                        let nearest = '', minDist = Infinity
                        CENTROID_ENTRIES.forEach(([name, [bLat, bLng]]) => {
                            const d = Math.hypot(lat - bLat, lng - bLng)
                            if (d < minDist) { minDist = d; nearest = name }
                        })
                        if (nearest) counts[nearest] = (counts[nearest] ?? 0) + 1
                    }
                })
            result[hazard] = counts
        })
        return result
    }, [incidentReports])

    // ── Disaster PDF download ─────────────────────────────
    const handleDownloadDisasterPdf = async () => {
        const [nabuaB64, mdrrmoB64] = await Promise.all([
            loadImgBase64(nabuaLogoUrl).catch(() => ''),
            loadImgBase64(mdrrmoLogoUrl).catch(() => ''),
        ])

        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const generatedAt = new Date().toLocaleString()

        // ── PAGE 1: Summary ──────────────────────────────────
        drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)

        doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
        doc.text('Disaster / Incident Reports Summary', pageWidth / 2, 200, { align: 'center' })
        doc.setFont('times', 'normal'); doc.setFontSize(11)
        doc.text(`Generated: ${generatedAt}`, 40, 220)

        // Overview stats
        autoTable(doc, {
            startY: 232,
            head: [['Total Incident Reports', 'Today', 'This Month']],
            body: [[String(incidentReports.length), String(disasterTodayCount), String(disasterMonthCount)]],
            styles: { fontSize: 11, halign: 'center', cellPadding: 6 },
            headStyles: { fillColor: [29, 78, 216] },
            theme: 'grid',
        })

        const afterStats = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16
        doc.setFont('times', 'bold'); doc.setFontSize(12)
        doc.text('Incident Reports by Zone', 40, afterStats)
        autoTable(doc, {
            startY: afterStats + 8,
            head: [['Zone', 'Reports']],
            body: ZONE_NAMES.map(z => [z, String(disasterZoneCounts[z] ?? 0)]),
            styles: { fontSize: 11, cellPadding: 5 },
            headStyles: { fillColor: [29, 78, 216] },
            columnStyles: { 1: { halign: 'center' } },
            theme: 'striped',
            tableWidth: 280,
        })

        autoTable(doc, {
            startY: afterStats + 8,
            head: [['Hazard / Disaster Type', 'Reports']],
            body: ALL_HAZARDS.map(h => [h, String(disasterHazardCounts[h] ?? 0)]),
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [7, 102, 173] },
            columnStyles: { 1: { halign: 'center' } },
            theme: 'striped',
            margin: { left: pageWidth / 2 + 10 },
        })

        // ── PAGES 2+: One map per hazard type (only if has incidents), then combined ─
        const mapAvailW = pageWidth - 60
        const mapImgH = mapAvailW * (700 / 1800)

        ALL_HAZARDS.forEach(hazard => {
            const hazardRisk = barangayRiskByHazard[hazard] ?? {}
            const total = Object.values(hazardRisk).reduce((s, n) => s + n, 0)

            doc.addPage()
            drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)
            doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
            doc.text(`${hazard} — Barangay Risk Map`, pageWidth / 2, 200, { align: 'center' })
            doc.setFont('times', 'normal'); doc.setFontSize(10)
            doc.text(
                total > 0
                    ? `Total ${hazard} incidents: ${total}  |  Polygons colored by incident count`
                    : `No ${hazard} incidents recorded — all barangays currently safe`,
                pageWidth / 2, 215, { align: 'center' }
            )
            const img = renderEmergencyMapCanvas(hazardRisk)
            if (img) doc.addImage(img, 'PNG', 30, 222, mapAvailW, mapImgH)
        })

        // Combined all-hazards map
        doc.addPage()
        drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)
        doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
        doc.text('All Disaster Types — Combined Barangay Risk Map', pageWidth / 2, 200, { align: 'center' })
        doc.setFont('times', 'normal'); doc.setFontSize(10)
        doc.text(`Total incidents: ${incidentReports.length}  |  All hazard types combined`, pageWidth / 2, 215, { align: 'center' })
        const combinedImg = renderEmergencyMapCanvas(disasterBarangayRisk)
        if (combinedImg) doc.addImage(combinedImg, 'PNG', 30, 222, mapAvailW, mapImgH)

        // ── PAGE 3: Incident Reports List ────────────────────
        doc.addPage()
        drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)

        doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
        doc.text('Disaster / Incident Report List', pageWidth / 2, 200, { align: 'center' })
        doc.setFont('times', 'normal'); doc.setFontSize(11)
        doc.text(`Total: ${incidentReports.length} records`, 40, 218)

        const incidentRows = incidentReports.map(r => {
            const details = r.incidentDetails ?? r.incident_details
            return [
                r.date_reported ? new Date(r.date_reported).toLocaleDateString() : '—',
                details?.incident_barangay?.trim() || '—',
                details?.type_of_hazard || '—',
                details?.severity_level || '—',
                normalizeZone(r),
                details?.nature_of_call || '—',
            ]
        })

        autoTable(doc, {
            startY: 228,
            head: [['Date', 'Barangay / Location', 'Hazard Type', 'Severity', 'Zone', 'Nature of Call']],
            body: incidentRows,
            styles: { fontSize: 9, cellPadding: 5 },
            headStyles: { fillColor: [29, 78, 216] },
            theme: 'striped',
        })

        // ── PAGE 4: Barangay Risk Assessment ─────────────────
        doc.addPage()
        drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)

        doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
        doc.text('Barangay Disaster Risk Assessment', pageWidth / 2, 200, { align: 'center' })
        doc.setFont('times', 'normal'); doc.setFontSize(11)
        doc.text('Based on incident/disaster report locations', 40, 218)

        const disasterRiskRows = Object.entries(disasterBarangayRisk)
            .sort((a, b) => b[1] - a[1])
            .map(([barangay, count], i) => {
                const risk = getRisk(count)
                return [String(i + 1), barangay, String(count), risk.label]
            })

        autoTable(doc, {
            startY: 228,
            head: [['#', 'Barangay', 'Reports', 'Risk Level']],
            body: disasterRiskRows,
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [29, 78, 216] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 60 },
                3: { cellWidth: 160 },
            },
            theme: 'striped',
            didParseCell: (data) => {
                if (data.column.index === 3 && data.section === 'body') {
                    const label = String(data.cell.raw)
                    if (label.includes('High'))          data.cell.styles.textColor = [234, 88, 12]
                    else if (label.includes('Moderate')) data.cell.styles.textColor = [180, 83, 9]
                    else if (label.includes('Low'))      data.cell.styles.textColor = [29, 78, 216]
                    else                                 data.cell.styles.textColor = [126, 34, 206]
                }
            },
        })

        doc.save(`disaster-summary-${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    // ── Daily Reports modal ───────────────────────────────
    const openDailyModal = () => {
        const today = normalizeDateInput(new Date())
        setDailyFrom(today)
        setDailyTo(today)
        setShowDailyModal(true)
    }

    const handleGenerateDailyPdf = async () => {
        if (!dailyFrom || !dailyTo) return
        setIsDailyGenerating(true)
        try {
            const from = dailyFrom
            const to = dailyTo

            const filtered = reports.filter(r => {
                const dk = reportDateKey(r)
                return r.report_type === 'Emergency' && dk !== null && dk >= from && dk <= to
            })

            const patientsAffected = filtered.reduce((sum, r) => sum + (r.clients?.length ?? 0), 0)

            const [nabuaB64, mdrrmoB64] = await Promise.all([
                loadImgBase64(nabuaLogoUrl).catch(() => ''),
                loadImgBase64(mdrrmoLogoUrl).catch(() => ''),
            ])

            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
            const pageWidth = doc.internal.pageSize.getWidth()
            const generatedAt = new Date().toLocaleString()
            const fmtDate = (d: string) =>
                new Date(d + 'T00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

            drawPdfHeader(doc, pageWidth, nabuaB64, mdrrmoB64)

            doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(0, 0, 0)
            doc.text('Daily Reports Summary', pageWidth / 2, 200, { align: 'center' })
            doc.setFont('times', 'normal'); doc.setFontSize(11)
            const periodLabel = from === to
                ? `Date: ${fmtDate(from)}`
                : `Period: ${fmtDate(from)} – ${fmtDate(to)}`
            doc.text(periodLabel, pageWidth / 2, 218, { align: 'center' })
            doc.text(`Generated: ${generatedAt}`, 40, 218)

            autoTable(doc, {
                startY: 232,
                head: [['Total Emergency Reports', 'Patients Affected']],
                body: [[
                    String(filtered.length),
                    String(patientsAffected),
                ]],
                styles: { fontSize: 11, halign: 'center', cellPadding: 6 },
                headStyles: { fillColor: [15, 118, 110] },
                theme: 'grid',
            })

            const dateTag = from === to ? from : `${from}_to_${to}`
            doc.save(`daily-report-${dateTag}.pdf`)
            setShowDailyModal(false)
        } finally {
            setIsDailyGenerating(false)
        }
    }

    // ── Section header helper ─────────────────────────────
    const SectionHeader = ({ icon, iconBg, iconColor, title, sub }: {
        icon: string; iconBg: string; iconColor: string; title: string; sub?: string
    }) => (
        <div className="db-section-header">
            <div className="db-section-icon" style={{ background: iconBg }}>
                <i className={`bi ${icon}`} style={{ color: iconColor }} />
            </div>
            <div>
                <h5>{title}</h5>
                {sub && <p>{sub}</p>}
            </div>
        </div>
    )

    return (
        <>
        <OnboardingTour onStart={() => setDashTab('emergency')} onSwitchTab={tab => setDashTab(tab as DashboardTab)} />
        <div className="db-page">

            {/* ── Page header with tab switcher ───────────── */}
            <div className="db-page-header">
                <div className="db-page-title">
                    <div className={`db-page-title-icon ${dashTab === 'emergency' ? 'db-page-title-icon--red' : 'db-page-title-icon--blue'}`}>
                        <i className={`bi ${dashTab === 'emergency' ? 'bi-heart-pulse-fill' : 'bi-cloud-lightning-rain-fill'}`}
                            style={{ color: dashTab === 'emergency' ? '#dc2626' : '#1d4ed8' }} />
                    </div>
                    <div>
                        <h4>{dashTab === 'emergency' ? 'Emergency Response Dashboard' : 'Disaster Report Overview'}</h4>
                        <p>Nabua MDRRMO · {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {dashTab === 'emergency' && (
                        <>
                        <button
                            type="button"
                            onClick={() => { void handleDownloadEmergencyPdf() }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                height: 38, padding: '0 1rem',
                                border: 'none', borderRadius: 10,
                                background: 'linear-gradient(135deg,#dc2626,#991b1b)',
                                color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                                cursor: 'pointer', whiteSpace: 'nowrap',
                                boxShadow: '0 3px 10px rgba(220,38,38,0.35)',
                            }}
                        >
                            <i className="bi bi-file-earmark-pdf-fill" />
                            Download PDF
                        </button>
                        <button
                            type="button"
                            onClick={openDailyModal}
                            className="db-daily-btn"
                            id="tour-daily-btn"
                        >
                            <i className="bi bi-calendar2-week-fill" />
                            Daily Reports
                        </button>
                        </>
                    )}
                    {dashTab === 'disaster' && (
                        <button
                            type="button"
                            onClick={() => { void handleDownloadDisasterPdf() }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                height: 38, padding: '0 1rem',
                                border: 'none', borderRadius: 10,
                                background: 'linear-gradient(135deg,#1d4ed8,#1e40af)',
                                color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                                cursor: 'pointer', whiteSpace: 'nowrap',
                                boxShadow: '0 3px 10px rgba(29,78,216,0.35)',
                            }}
                        >
                            <i className="bi bi-file-earmark-pdf-fill" />
                            Download PDF
                        </button>
                    )}
                    <div className="db-tab-switcher" id="tour-tabs">
                        <button type="button" className={`db-tab-btn tab-emergency ${dashTab === 'emergency' ? 'active' : ''}`}
                            onClick={() => setDashTab('emergency')}>
                            <i className="bi bi-heart-pulse-fill" />
                            Emergency
                        </button>
                        <button type="button" className={`db-tab-btn tab-disaster ${dashTab === 'disaster' ? 'active' : ''}`}
                            onClick={() => setDashTab('disaster')}>
                            <i className="bi bi-cloud-lightning-rain-fill" />
                            Disaster Reports
                        </button>
                    </div>
                </div>
            </div>

            {/* ══════════════ EMERGENCY TAB ══════════════ */}
            {dashTab === 'emergency' && (<>

                {/* Stat cards — 5 cards */}
                <div className="db-grid-top" id="tour-stat-cards">
                    <article className="db-stat-card db-stat-card-v1">
                        <p className="db-stat-title">Cases Today</p>
                        <h3>{isLoading ? '—' : todayCount}</h3>
                        <p className="db-stat-sub"><i className="bi bi-calendar3" /> {todayKey}</p>
                        <i className="bi bi-alarm-fill db-stat-icon" />
                    </article>
                    <article className="db-stat-card db-stat-card-v2">
                        <p className="db-stat-title">Cases This Month</p>
                        <h3>{isLoading ? '—' : monthCount}</h3>
                        <p className="db-stat-sub"><i className="bi bi-calendar2-week" /> {monthLabel}</p>
                        <i className="bi bi-calendar-check-fill db-stat-icon" />
                    </article>
                    <article className="db-stat-card db-stat-card-v3">
                        <p className="db-stat-title">Total Emergency Cases</p>
                        <h3>{isLoading ? '—' : emergencyReports.length}</h3>
                        <p className="db-stat-sub"><i className="bi bi-archive-fill" /> All Time</p>
                        <i className="bi bi-bar-chart-fill db-stat-icon" />
                    </article>
                    <article className="db-stat-card db-stat-card-v4">
                        <p className="db-stat-title">Total Patients Affected</p>
                        <h3>{isLoading ? '—' : totalPatientsAffected}</h3>
                        <p className="db-stat-sub"><i className="bi bi-people-fill" /> All Patients</p>
                        <i className="bi bi-heart-pulse-fill db-stat-icon" />
                    </article>
                    <article className="db-stat-card db-stat-card-v3">
                        <p className="db-stat-title">Active Staff / Responders</p>
                        <h3>{isLoading ? '—' : staffCount}</h3>
                        <p className="db-stat-sub"><i className="bi bi-people-fill" /> On Record</p>
                        <i className="bi bi-shield-fill-check db-stat-icon" />
                    </article>
                </div>

                {/* Zone cards */}
                <div className="db-grid-zones" id="tour-zone-cards">
                    {ZONE_NAMES.map(zone => (
                        <article key={zone} className="db-zone-card" style={{
                            '--zone-color': ZONE_COLORS[zone],
                            borderColor: ZONE_COLORS[zone] + '40',
                        } as React.CSSProperties}>
                            <div className="db-zone-header">
                                <p className="db-zone-name">{zone}</p>
                                <i className="bi bi-geo-alt-fill db-zone-icon" style={{ color: ZONE_COLORS[zone] }} />
                            </div>
                            <h4 style={{ color: ZONE_COLORS[zone] }}>{isLoading ? '—' : zoneCounts[zone] ?? 0}</h4>
                            <p className="db-zone-sub">Emergency Cases</p>
                            <span className="db-zone-pulse" />
                        </article>
                    ))}
                </div>

                {/* Map + Accident Type Breakdown side by side */}
                <div className="db-map-row">
                    <div className="db-map-row-map" id="tour-map">
                        <DashboardMap reports={mapReports} isLoading={isLoading} />
                    </div>
                    <section className="db-panel db-map-row-panel" id="tour-accident-panel">
                        <SectionHeader icon="bi-bar-chart-fill" iconBg="#fff1f2" iconColor="#dc2626"
                            title="Accident Types" sub="Cases by incident type" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
                            {accidentTypeBars.map(({ type, count, pct, color }) => (
                                <div key={type} className="db-acc-row">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                        <span className="db-acc-label" style={{ color: count > 0 ? '#1f2937' : '#9ca3af' }}>
                                            <span className="db-acc-dot" style={{ background: count > 0 ? color : '#e5e7eb' }} />
                                            {type}
                                        </span>
                                        <span className="db-acc-count" style={{ color: count > 0 ? color : '#d1d5db' }}>
                                            {count > 0 ? `${count} ${count === 1 ? 'case' : 'cases'}` : '—'}
                                        </span>
                                    </div>
                                    <div className="db-bar-track" style={{ height: 7, borderRadius: 6, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: count > 0 ? color : 'transparent', borderRadius: 6, transition: 'width .5s ease' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Emergency Trend — full-width comparison panel */}
                <article className="db-panel" style={{ marginBottom: 14 }}>
                    <SectionHeader icon="bi-graph-up-arrow" iconBg="#fef2f2" iconColor="#dc2626"
                        title="Emergency Trend" sub="Month-over-month comparison" />
                    <div className="db-trend-grid">
                        {/* This month */}
                        <div className="db-trend-box db-trend-box--current">
                            <p className="db-trend-box-label">
                                <i className="bi bi-calendar2-check me-1" style={{ color: '#dc2626' }} />
                                This Month
                            </p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span className="db-trend-count db-trend-count--current">{isLoading ? '—' : trend.current}</span>
                                <span className="db-trend-count-unit">cases</span>
                            </div>
                            <p className="db-trend-box-sub">{monthLabel}</p>
                        </div>

                        {/* Last month */}
                        <div className="db-trend-box db-trend-box--prev">
                            <p className="db-trend-box-label">
                                <i className="bi bi-calendar2 me-1" />
                                Last Month
                            </p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span className="db-trend-count db-trend-count--prev">{isLoading ? '—' : trend.previous}</span>
                                <span className="db-trend-count-unit">cases</span>
                            </div>
                            <p className="db-trend-box-sub">Previous period</p>
                        </div>

                        {/* Comparison bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }} className="db-trend-bar-label">
                                    <span style={{ color: '#dc2626', fontWeight: 600 }}>This Month</span>
                                    <span>{isLoading ? '—' : trend.current}</span>
                                </div>
                                <div className="db-bar-track" style={{ height: 10, borderRadius: 6, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 6, background: '#dc2626',
                                        width: `${trend.current === 0 && trend.previous === 0 ? 0 : Math.round((trend.current / Math.max(trend.current, trend.previous, 1)) * 100)}%`,
                                        transition: 'width .5s',
                                    }} />
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }} className="db-trend-bar-label">
                                    <span style={{ fontWeight: 600 }}>Last Month</span>
                                    <span>{isLoading ? '—' : trend.previous}</span>
                                </div>
                                <div className="db-bar-track" style={{ height: 10, borderRadius: 6, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 6, background: '#9ca3af',
                                        width: `${trend.current === 0 && trend.previous === 0 ? 0 : Math.round((trend.previous / Math.max(trend.current, trend.previous, 1)) * 100)}%`,
                                        transition: 'width .5s',
                                    }} />
                                </div>
                            </div>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                                {trend.current === 0 && trend.previous === 0
                                    ? 'No data recorded yet'
                                    : trend.previous === 0
                                        ? 'First month with records'
                                        : trend.current > trend.previous
                                            ? `↑ ${trend.current - trend.previous} more than last month`
                                            : trend.current < trend.previous
                                                ? `↓ ${trend.previous - trend.current} fewer than last month`
                                                : 'Same as last month'}
                            </p>
                        </div>

                        {/* Change pill */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <span className={`db-trend-pill ${trend.pct === null || trend.pct === 0 ? 'neutral' : trend.pct > 0 ? 'positive' : 'negative'}`}
                                style={{ fontSize: 20, fontWeight: 800, padding: '10px 18px' }}>
                                {trend.pct === null || trend.pct === 0 ? '0%' : `${trend.pct > 0 ? '+' : ''}${trend.pct}%`}
                            </span>
                            <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
                                {trend.pct === null || trend.pct === 0
                                    ? 'No change'
                                    : trend.pct > 0 ? 'Increase' : 'Decrease'}
                            </span>
                        </div>
                    </div>
                </article>

                {/* Affected Emergency Cases — age/gender table */}
                <section className="db-panel">
                    <SectionHeader icon="bi-person-lines-fill" iconBg="#fef2f2" iconColor="#dc2626"
                        title="Affected Emergency Cases" sub="Age group breakdown by type of emergency" />
                    <div className="db-tabs">
                        <button type="button" className={genderTab === 'all' ? 'active' : ''} onClick={() => setGenderTab('all')}>
                            <i className="bi bi-people" /> All
                        </button>
                        <button type="button" className={genderTab === 'male' ? 'active' : ''} onClick={() => setGenderTab('male')}>
                            <i className="bi bi-gender-male" /> Male
                        </button>
                        <button type="button" className={genderTab === 'female' ? 'active' : ''} onClick={() => setGenderTab('female')}>
                            <i className="bi bi-gender-female" /> Female
                        </button>
                    </div>
                    <div className="table-responsive">
                        <table className="table db-table mb-0">
                            <thead>
                                <tr><th>Age Range</th><th>Medical</th><th>Trauma</th><th>Latest Date</th></tr>
                            </thead>
                            <tbody>
                                {populatedAgeBuckets.map(item => {
                                    const hasData = item.medical > 0 || item.trauma > 0
                                    return (
                                        <tr key={item.label} style={{ opacity: hasData ? 1 : 0.45 }}>
                                            <td><span style={{ fontWeight: 700 }} className="db-table-label">{item.label}</span></td>
                                            <td><span style={{ color: item.medical > 0 ? '#db2777' : '#9ca3af', fontWeight: 600 }}>{item.medical}</span></td>
                                            <td><span style={{ color: item.trauma > 0 ? '#dc2626' : '#9ca3af', fontWeight: 600 }}>{item.trauma}</span></td>
                                            <td style={{ color: '#6b7280', fontSize: 12 }}>{item.latestDate ? formatShortDate(item.latestDate) : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Most Affected Barangays */}
                <section className="db-panel">
                    <SectionHeader icon="bi-geo-alt-fill" iconBg="#fff1f2" iconColor="#dc2626"
                        title="Most Affected Barangays" sub="Areas with highest emergency case frequency" />
                    <div className="table-responsive">
                        <table className="table db-table mb-0">
                            <thead>
                                <tr><th>Rank</th><th>Barangay / Area</th><th>Emergency Cases</th><th>Most Common Type</th></tr>
                            </thead>
                            <tbody>
                                {mostAffectedBarangays.length > 0 ? mostAffectedBarangays.map(item => (
                                    <tr key={`${item.barangay}-${item.rank}`}>
                                        <td>
                                            <span className="db-rank-badge db-rank-badge--red">
                                                {item.rank}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{item.barangay}</td>
                                        <td>
                                            <span style={{ fontWeight: 800, color: '#dc2626', fontSize: 15 }}>{item.total}</span>
                                        </td>
                                        <td>
                                            <span className="db-type-chip db-type-chip--red">
                                                {item.topType}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="text-center text-muted py-3">No data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Donuts: accident type + gender */}
                <div className="db-grid-bottom">
                    <article className="db-panel">
                        <SectionHeader icon="bi-pie-chart-fill" iconBg="#fff1f2" iconColor="#dc2626"
                            title="Accident Type Distribution" sub="Emergency cases by accident type" />
                        <DonutChart data={accidentTypeData.length > 0 ? accidentTypeData : [{ label: 'No Data', value: 1, color: '#e5e7eb' }]} />
                    </article>
                    <article className="db-panel">
                        <SectionHeader icon="bi-gender-ambiguous" iconBg="#eff6ff" iconColor="#2563eb"
                            title="Gender Distribution" sub="Emergency patients by gender" />
                        <DonutChart data={genderData} />
                    </article>
                </div>

                {/* Monthly trends bar chart */}
                <section className="db-panel">
                    <SectionHeader icon="bi-bar-chart-fill" iconBg="#eff6ff" iconColor="#2563eb"
                        title="Monthly Zonal Reports" sub={`${new Date().getFullYear()} — cases per zone by month`} />
                    <GroupedBarChart series={monthlyZoneSeries} title="Monthly Zonal Reports Comparison" />
                </section>

            </>)}

            {/* ══════════════ DISASTER TAB ══════════════ */}
            {dashTab === 'disaster' && (<>

                {/* Live weather + earthquakes */}
                <div id="tour-disaster-weather">
                <DisasterWeatherPanel />
                </div>

                {/* Hazard map + Hazard count panel + Decision Support Notes */}
                <div className="db-disaster-map-row">
                    {/* Map */}
                    <section className="db-panel" id="tour-hazard-map" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                        <HazardMap reports={hazardMapReports} isLoading={isLoading} />
                    </section>

                    {/* Right column — two separate panels stacked */}
                    <div className="db-disaster-map-aside">

                        {/* Panel 1 — Decision Support Notes */}
                        <section className="db-panel" id="tour-decision-notes" style={{ marginBottom: 0 }}>
                            <SectionHeader icon="bi-lightbulb-fill" iconBg="#fefce8" iconColor="#d97706"
                                title="Decision Support Notes" sub="Guidance based on active hazards" />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                {ALL_HAZARDS
                                    .filter(h => disasterHazardCounts[h] > 0)
                                    .sort((a, b) => disasterHazardCounts[b] - disasterHazardCounts[a])
                                    .map(hazard => (
                                        <div key={hazard} className={`db-ds-note db-ds-note--${hazard.replace(/\s+/g, '-').toLowerCase()}`}>
                                            <i className={`bi ${HAZARD_ICONS[hazard]}`} style={{ color: HAZARD_COLORS[hazard], fontSize: 15, marginTop: 2, flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: HAZARD_COLORS[hazard] }}>
                                                    {hazard} — {disasterHazardCounts[hazard]} report{disasterHazardCounts[hazard] !== 1 ? 's' : ''}
                                                </div>
                                                <p style={{ margin: 0, fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                                    {hazard === 'Flood' && 'Pre-position rescue boats; clear drainage in low-lying areas.'}
                                                    {hazard === 'Earthquake' && 'Inspect critical structures; activate search & rescue.'}
                                                    {hazard === 'Typhoon' && 'Issue evacuation advisories; coordinate with PAGASA.'}
                                                    {hazard === 'Landslide' && 'Restrict mountain access; monitor slope stability.'}
                                                    {hazard === 'Tsunami' && 'Activate coastal evacuation; move residents to high ground immediately.'}
                                                    {hazard === 'Volcanic Eruption' && 'Establish exclusion zones; prepare ash fall protection and evacuation routes.'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                {ALL_HAZARDS.every(h => disasterHazardCounts[h] === 0) && (
                                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: '16px 0', fontSize: 12 }}>
                                        <i className="bi bi-check-circle-fill me-2" style={{ color: '#16a34a' }} />
                                        No active hazard reports.
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Panel 2 — Hazard Types 2-column grid */}
                        <section className="db-panel" id="tour-hazard-types" style={{ marginBottom: 0 }}>
                            <SectionHeader icon="bi-shield-exclamation" iconBg="#eff6ff" iconColor="#1d4ed8"
                                title="Hazard Types" sub="Total disaster reports per type" />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 7, marginTop: 10 }}>
                                {ALL_HAZARDS.map(hazard => {
                                    const count = isLoading ? null : disasterHazardCounts[hazard]
                                    return (
                                        <div key={hazard} className={`db-ht-card db-ht-card--${hazard.replace(/\s+/g, '-').toLowerCase()}${!count ? ' db-ht-card--empty' : ''}`}>
                                            <div className={`db-ht-icon db-ht-icon--${hazard.replace(/\s+/g, '-').toLowerCase()}`}>
                                                <i className={`bi ${HAZARD_ICONS[hazard]}`} style={{ color: HAZARD_COLORS[hazard], fontSize: 14 }} />
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: 8.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.2, wordBreak: 'break-word' }}>{hazard}</div>
                                                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1, color: count ? HAZARD_COLORS[hazard] : '#d1d5db' }}>
                                                    {count ?? '—'}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                    </div>
                </div>

                {/* Zone distribution */}
                <section className="db-panel" id="tour-disaster-zones">
                    <SectionHeader icon="bi-map-fill" iconBg="#eff6ff" iconColor="#1d4ed8"
                        title="Disaster Cases by Zone" sub="Which zones are most affected" />
                    <div className="table-responsive">
                        <table className="table db-table mb-0">
                            <thead>
                                <tr><th>Zone</th><th>Disaster Cases</th><th>Share</th></tr>
                            </thead>
                            <tbody>
                                {ZONE_NAMES.map(zone => {
                                    const count = disasterZoneCounts[zone] ?? 0
                                    const pct = incidentReports.length > 0 ? Math.round((count / incidentReports.length) * 100) : 0
                                    return (
                                        <tr key={zone}>
                                            <td>
                                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: ZONE_COLORS[zone], marginRight: 6 }} />
                                                <span style={{ fontWeight: 600 }}>{zone}</span>
                                            </td>
                                            <td style={{ fontWeight: 700, color: '#1d4ed8' }}>{count}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="db-bar-track" style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: ZONE_COLORS[zone], borderRadius: 3 }} />
                                                    </div>
                                                    <span style={{ fontSize: 11, color: '#6b7280', minWidth: 32 }}>{pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Most Affected Barangays — Disaster */}
                <section className="db-panel" id="tour-disaster-barangays">
                    <SectionHeader icon="bi-geo-alt-fill" iconBg="#fff1f2" iconColor="#dc2626"
                        title="Most Affected Barangays" sub="Areas with highest disaster incident frequency" />
                    <div className="table-responsive">
                        <table className="table db-table mb-0">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Barangay / Area</th>
                                    <th>Disaster Cases</th>
                                    <th>Dominant Hazard</th>
                                    <th>Highest Severity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {disasterMostAffectedBarangays.length > 0 ? disasterMostAffectedBarangays.map(item => {
                                    const maxTotal = disasterMostAffectedBarangays[0]?.total ?? 1
                                    const pct = Math.round((item.total / maxTotal) * 100)
                                    const hIcon  = HAZARD_ICONS[item.topHazard]  ?? 'bi-shield-exclamation'
                                    const sevIcons: Record<string, string> = {
                                        High: 'bi-exclamation-triangle-fill',
                                        Moderate: 'bi-dash-circle-fill',
                                        Low: 'bi-check-circle-fill',
                                    }
                                    const svIcon = sevIcons[item.topSeverity] ?? 'bi-check-circle-fill'
                                    return (
                                        <tr key={`dis-${item.barangay}-${item.rank}`}>
                                            <td>
                                                <span className={`db-rank-badge ${item.rank <= 3 ? 'db-rank-badge--blue' : 'db-rank-badge--gray'}`}>
                                                    {item.rank}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{item.barangay}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontWeight: 800, color: '#1d4ed8', fontSize: 15, minWidth: 20 }}>{item.total}</span>
                                                    <div className="db-bar-track" style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: '#1d4ed8', borderRadius: 3, transition: 'width .3s' }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {item.topHazard !== '—' ? (
                                                    <span className={`db-hazard-chip db-hazard-chip--${item.topHazard.replace(/\s+/g, '-').toLowerCase()}`}>
                                                        <i className={`bi ${hIcon}`} style={{ fontSize: 11 }} />
                                                        {item.topHazard}
                                                    </span>
                                                ) : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                                            </td>
                                            <td>
                                                <span className={`db-sev-chip db-sev-chip--${item.topSeverity.toLowerCase()}`}>
                                                    <i className={`bi ${svIcon}`} style={{ fontSize: 11 }} />
                                                    {item.topSeverity}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr><td colSpan={5} className="text-center text-muted py-3">No disaster incident data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Hazard donut + monthly disaster trend */}
                <div className="db-grid-bottom" id="tour-disaster-charts">
                    <article className="db-panel">
                        <SectionHeader icon="bi-pie-chart-fill" iconBg="#eff6ff" iconColor="#1d4ed8"
                            title="Hazard Distribution" sub="Disaster reports by hazard type" />
                        <DonutChart data={disasterHazardData.length > 0 ? disasterHazardData : [{ label: 'No Data', value: 1, color: '#e5e7eb' }]} />
                    </article>
                    <article className="db-panel">
                        <SectionHeader icon="bi-bar-chart-fill" iconBg="#eff6ff" iconColor="#1d4ed8"
                            title="Monthly Zonal Reports" sub={`${new Date().getFullYear()} — reports per zone`} />
                        <GroupedBarChart series={disasterMonthlyZone} title="Monthly Zonal Reports Comparison" />
                    </article>
                </div>

            </>)}

        </div>

        {/* ── Daily Reports modal ─────────────────────────── */}
        {showDailyModal && (
            <div className="db-daily-pick-backdrop" role="dialog" aria-modal="true" aria-label="Daily Reports"
                onClick={e => { if (e.target === e.currentTarget) setShowDailyModal(false) }}>
                <div className="db-daily-pick-card">
                    <div className="db-daily-pick-head">
                        <div className="db-daily-pick-title">
                            <i className="bi bi-calendar2-week-fill" style={{ color: '#0f766e' }} />
                            Daily Reports
                        </div>
                        <button type="button" className="daily-pdf-close" onClick={() => setShowDailyModal(false)} aria-label="Close">
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>

                    <div className="db-daily-pick-body">
                        <p className="db-daily-pick-desc">
                            Select a date range to generate a PDF summary of all reports within that period.
                        </p>
                        <div className="db-daily-pick-row">
                            <div className="db-daily-pick-field">
                                <label className="db-daily-pick-label" htmlFor="daily-from">Date From</label>
                                <input
                                    id="daily-from"
                                    type="date"
                                    className="db-daily-pick-input"
                                    value={dailyFrom}
                                    max={dailyTo || undefined}
                                    onChange={e => setDailyFrom(e.target.value)}
                                />
                            </div>
                            <div className="db-daily-pick-field">
                                <label className="db-daily-pick-label" htmlFor="daily-to">Date To</label>
                                <input
                                    id="daily-to"
                                    type="date"
                                    className="db-daily-pick-input"
                                    value={dailyTo}
                                    min={dailyFrom || undefined}
                                    onChange={e => setDailyTo(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="db-daily-pick-foot">
                        <button type="button" className="db-daily-pick-cancel" onClick={() => setShowDailyModal(false)}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="db-daily-pick-generate"
                            disabled={!dailyFrom || !dailyTo || isDailyGenerating}
                            onClick={() => { void handleGenerateDailyPdf() }}
                        >
                            {isDailyGenerating
                                ? <><i className="bi bi-hourglass-split" /> Generating…</>
                                : <><i className="bi bi-file-earmark-pdf-fill" /> Generate PDF</>}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
