import { useEffect, useMemo, useState } from 'react'
import api from '../../api/axios'
import '../../style/dashboard.css'

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
}

interface ApiReport {
    id: number
    report_type: ReportType
    date_reported: string
    time_reported: string
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

interface BarangayRow {
    rank: number
    barangay: string
    emergency: number
    conduction: number
    searchAndRescue: number
    total: number
}

const ZONE_NAMES = ['Real Road', 'Poblacion', 'Mountain Area', 'River Side']

const ZONE_COLORS: Record<string, string> = {
    'Real Road': '#1d6fe8',
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

const extractIncidentDetails = (report: ApiReport): ApiIncidentDetails | null => {
    return report.incidentDetails ?? report.incident_details ?? null
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

const LineChart = ({ series }: { series: Record<string, number[]> }) => {
    const width = 740
    const height = 250
    const padding = { top: 20, right: 20, bottom: 35, left: 35 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    const allValues = Object.values(series).flat()
    const maxValue = Math.max(1, ...allValues)
    const yTicks = Math.min(5, maxValue)

    const getX = (index: number) => padding.left + (index * plotWidth) / (MONTH_LABELS.length - 1)
    const getY = (value: number) => padding.top + ((maxValue - value) / maxValue) * plotHeight

    return (
        <div className="db-line-wrap">
            <svg viewBox={`0 0 ${width} ${height}`} className="db-line-svg" role="img" aria-label="Monthly zonal reports comparison">
                {Array.from({ length: yTicks + 1 }).map((_, index) => {
                    const yValue = Math.round((maxValue / yTicks) * index)
                    const y = getY(yValue)
                    return (
                        <g key={`grid-${index}`}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="db-grid-line" />
                            <text x={8} y={y + 4} className="db-axis-text">{yValue}</text>
                        </g>
                    )
                })}

                {MONTH_LABELS.map((month, index) => (
                    <text key={month} x={getX(index)} y={height - 10} className="db-axis-text db-axis-month">{month}</text>
                ))}

                {Object.entries(series).map(([zone, values]) => {
                    const points = values.map((value, index) => `${getX(index)},${getY(value)}`).join(' ')
                    return (
                        <polyline
                            key={zone}
                            points={points}
                            fill="none"
                            stroke={ZONE_COLORS[zone] ?? '#64748b'}
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )
                })}
            </svg>

            <div className="db-zone-legend">
                {Object.keys(series).map((zone) => (
                    <span key={zone} className="db-zone-legend-item">
                        <span className="db-dot" style={{ background: ZONE_COLORS[zone] ?? '#64748b' }}></span>
                        {zone}
                    </span>
                ))}
            </div>
        </div>
    )
}

export const Dashboard = () => {
    const [reports, setReports] = useState<ApiReport[]>([])
    const [staffCount, setStaffCount] = useState(0)
    const [genderTab, setGenderTab] = useState<GenderTab>('all')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setIsLoading(true)

                let loadedReports: ApiReport[] = []

                try {
                    const summaryResponse = await api.get<ApiReport[]>('/reports/summary', {
                        params: { limit: 2000 },
                    })
                    loadedReports = Array.isArray(summaryResponse.data) ? summaryResponse.data : []
                } catch {
                    loadedReports = []
                }

                if (loadedReports.length === 0) {
                    try {
                        const fullResponse = await api.get<ApiReport[]>('/reports')
                        loadedReports = Array.isArray(fullResponse.data) ? fullResponse.data : []
                    } catch {
                        loadedReports = []
                    }
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

    const todayCount = useMemo(() => {
        return reports.filter((report) => reportDateKey(report) === todayKey).length
    }, [reports, todayKey])

    const monthCount = useMemo(() => {
        const currentMonthKey = `${yearNow}-${`${monthNow + 1}`.padStart(2, '0')}`
        return reports.filter((report) => {
            const key = reportDateKey(report)
            return key !== null && monthKeyFromDate(key) === currentMonthKey
        }).length
    }, [reports, monthNow, yearNow])

    const zoneCounts = useMemo(() => {
        const output: Record<string, number> = Object.fromEntries(ZONE_NAMES.map((zone) => [zone, 0]))
        reports.forEach((report) => {
            const zone = normalizeZone(report)
            if (zone in output) {
                output[zone] += 1
            }
        })
        return output
    }, [reports])

    const trend = useMemo(() => {
        const currentDate = new Date(yearNow, monthNow, 1)
        const previousDate = new Date(yearNow, monthNow - 1, 1)
        const currentMonthKey = `${currentDate.getFullYear()}-${`${currentDate.getMonth() + 1}`.padStart(2, '0')}`
        const previousMonthKey = `${previousDate.getFullYear()}-${`${previousDate.getMonth() + 1}`.padStart(2, '0')}`

        const current = reports.filter((report) => {
            const key = reportDateKey(report)
            return key !== null && monthKeyFromDate(key) === currentMonthKey
        }).length

        const previous = reports.filter((report) => {
            const key = reportDateKey(report)
            return key !== null && monthKeyFromDate(key) === previousMonthKey
        }).length

        if (previous === 0) {
            return { current, previous, pct: null as number | null }
        }

        return {
            current,
            previous,
            pct: Math.round(((current - previous) / previous) * 100),
        }
    }, [reports, monthNow, yearNow])

    const ageBuckets = useMemo(() => {
        const emergencyReports = reports.filter((report) => report.report_type === 'Emergency')

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
    }, [reports, genderTab])

    const populatedAgeBuckets = useMemo(
        () => ageBuckets.filter((item) => item.medical > 0 || item.trauma > 0),
        [ageBuckets]
    )

    const mostAffectedBarangays = useMemo(() => {
        const map = new Map<string, Omit<BarangayRow, 'rank'>>()

        reports.forEach((report) => {
            const primaryAddress =
                report.clients?.find((client) => (client.incident_address ?? '').trim() !== '')?.incident_address ??
                normalizeZone(report)
            const barangay = inferBarangay(primaryAddress)
            const existing = map.get(barangay) ?? { barangay, emergency: 0, conduction: 0, searchAndRescue: 0, total: 0 }

            if (report.report_type === 'Emergency') {
                existing.emergency += 1
            } else {
                const call = (extractIncidentDetails(report)?.nature_of_call ?? '').toLowerCase()
                if (call.includes('search and rescue')) {
                    existing.searchAndRescue += 1
                } else {
                    existing.conduction += 1
                }
            }

            existing.total += 1
            map.set(barangay, existing)
        })

        return [...map.values()]
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map((item, index) => ({ ...item, rank: index + 1 }))
    }, [reports])

    const hazardData = useMemo(() => {
        const hazardMap = new Map<string, number>()

        reports
            .filter((report) => report.report_type === 'Incident')
            .forEach((report) => {
                const hazard = extractIncidentDetails(report)?.type_of_hazard?.trim() || 'Unknown'
                hazardMap.set(hazard, (hazardMap.get(hazard) ?? 0) + 1)
            })

        const palette = ['#1d6fe8', '#16a34a', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4']
        return [...hazardMap.entries()].map(([label, value], index) => ({
            label,
            value,
            color: palette[index % palette.length],
        }))
    }, [reports])

    const monthlyZoneSeries = useMemo(() => {
        const year = new Date().getFullYear()
        const result: Record<string, number[]> = Object.fromEntries(ZONE_NAMES.map((zone) => [zone, Array(12).fill(0)]))

        reports.forEach((report) => {
            const date = new Date(report.date_reported)
            if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return

            const zone = normalizeZone(report)
            if (!(zone in result)) return

            result[zone][date.getMonth()] += 1
        })

        return result
    }, [reports])

    return (
        <div className="db-page">
            <div className="db-grid-top">
                <article className="db-stat-card db-stat-card-dark">
                    <p className="db-stat-title">Total Incidents Today</p>
                    <h3>{isLoading ? '...' : todayCount}</h3>
                    <p className="db-stat-sub"><i className="bi bi-calendar3"></i> {todayKey}</p>
                    <i className="bi bi-exclamation-triangle-fill db-stat-icon text-danger"></i>
                </article>

                <article className="db-stat-card db-stat-card-dark">
                    <p className="db-stat-title">Total Incidents This Month</p>
                    <h3>{isLoading ? '...' : monthCount}</h3>
                    <p className="db-stat-sub"><i className="bi bi-calendar2-week"></i> {monthLabel}</p>
                    <i className="bi bi-calendar-check-fill db-stat-icon text-warning"></i>
                </article>

                <article className="db-stat-card db-stat-card-dark">
                    <p className="db-stat-title">Total Incidents (All Time)</p>
                    <h3>{isLoading ? '...' : reports.length}</h3>
                    <p className="db-stat-sub"><i className="bi bi-file-earmark-text"></i> All Reports</p>
                    <i className="bi bi-bar-chart-fill db-stat-icon text-primary"></i>
                </article>
            </div>

            <div className="db-grid-zones">
                {ZONE_NAMES.map((zone) => (
                    <article key={zone} className="db-zone-card" style={{ borderLeftColor: ZONE_COLORS[zone] }}>
                        <p className="db-zone-name">{zone}</p>
                        <h4 style={{ color: ZONE_COLORS[zone] }}>{isLoading ? '...' : zoneCounts[zone] ?? 0}</h4>
                        <p className="db-zone-sub">Total Incidents</p>
                        <i className="bi bi-folder-fill db-zone-icon" style={{ color: ZONE_COLORS[zone] }}></i>
                    </article>
                ))}
            </div>

            <div className="db-grid-meta">
                <article className="db-panel">
                    <h5><i className="bi bi-graph-up-arrow"></i> Report Trends</h5>
                    <div className="db-trend-row">
                        <div>
                            <p className="mb-1 fw-semibold">Compared to Last Month:</p>
                            <p className="mb-0 text-muted">
                                {trend.previous === 0 && trend.current === 0
                                    ? 'No reports yet'
                                    : trend.previous === 0
                                        ? `${trend.current} this month, no reports last month`
                                        : `${trend.current} this month vs ${trend.previous} last month`}
                            </p>
                        </div>
                        <span className={`db-trend-pill ${trend.pct === null || trend.pct >= 0 ? 'positive' : 'negative'}`}>
                            {trend.pct === null ? '0%' : `${trend.pct}%`}
                        </span>
                    </div>
                </article>

                <article className="db-panel">
                    <h5><i className="bi bi-people-fill"></i> Staff Information</h5>
                    <div className="d-flex align-items-center justify-content-between">
                        <span className="fw-semibold">Total Staff Members:</span>
                        <strong>{isLoading ? '...' : staffCount}</strong>
                    </div>
                </article>
            </div>

            <section className="db-panel">
                <h5><i className="bi bi-exclamation-triangle-fill text-warning"></i> Affected Emergency Cases</h5>
                <div className="db-tabs">
                    <button type="button" className={genderTab === 'all' ? 'active' : ''} onClick={() => setGenderTab('all')}><i className="bi bi-person-fill"></i> By Age</button>
                    <button type="button" className={genderTab === 'male' ? 'active' : ''} onClick={() => setGenderTab('male')}><i className="bi bi-gender-male"></i> Male</button>
                    <button type="button" className={genderTab === 'female' ? 'active' : ''} onClick={() => setGenderTab('female')}><i className="bi bi-gender-female"></i> Female</button>
                </div>

                <div className="table-responsive">
                    <table className="table db-table mb-0">
                        <thead>
                            <tr>
                                <th>AGE RANGE</th>
                                <th>MEDICAL</th>
                                <th>TRAUMA</th>
                                <th>LATEST DATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {populatedAgeBuckets.length > 0 ? (
                                populatedAgeBuckets.map((item) => (
                                    <tr key={item.label}>
                                        <td>{item.label}</td>
                                        <td>{item.medical}</td>
                                        <td>{item.trauma}</td>
                                        <td>{formatShortDate(item.latestDate)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center text-muted py-3">No emergency data available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="db-panel">
                <h5><i className="bi bi-geo-alt-fill text-danger"></i> Most Affected Barangays</h5>
                <div className="table-responsive">
                    <table className="table db-table mb-0">
                        <thead>
                            <tr>
                                <th>RANK</th>
                                <th>BARANGAY</th>
                                <th>EMERGENCY</th>
                                <th>CONDUCTION</th>
                                <th>SEARCH AND RESCUE</th>
                                <th>TOTAL INCIDENTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mostAffectedBarangays.length > 0 ? (
                                mostAffectedBarangays.map((item) => (
                                    <tr key={`${item.barangay}-${item.rank}`}>
                                        <td>{item.rank}</td>
                                        <td>{item.barangay}</td>
                                        <td>{item.emergency}</td>
                                        <td>{item.conduction}</td>
                                        <td>{item.searchAndRescue}</td>
                                        <td>{item.total}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted py-3">No data available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="db-grid-bottom">
                <article className="db-panel">
                    <h5 className="text-center mb-2">Hazard Status</h5>
                    <p className="text-center text-muted mb-2 fw-semibold">Hazard Status Distribution</p>
                    <DonutChart data={hazardData} />
                </article>

                <article className="db-panel">
                    <h5 className="text-center mb-2">Zonal Reports</h5>
                    <p className="text-center text-muted mb-2 fw-semibold">Monthly Zonal Reports Comparison</p>
                    <LineChart series={monthlyZoneSeries} />
                </article>
            </div>
        </div>
    )
}