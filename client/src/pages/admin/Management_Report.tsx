import { useState, useRef, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { useNavigate, useLocation } from 'react-router-dom'
import JSZip from 'jszip'
import '../../style/management_report.css'
import api from '../../api/axios'
import { Modal } from '../../components/Modal'
import { PageTour } from '../../components/PageTour'
import type { Step } from 'react-joyride'
import { ReportDocumentModal, type ReportDocumentData } from './zone-report/components/ReportDocumentModal'
import { PatientCareReportView } from './zone-report/views/PatientCareReportView'
import { IncidentReportView } from './zone-report/views/IncidentReportView'
import { buildPcrData, buildIncidentViewData, capturePcrToPdf, captureIncidentToPdf } from './zone-report/utils/pcrUtils'

// ── Report types ───────────────────────────────────────────────────────
interface Report {
  id: number
  date: string
  name: string
  zone: string
  barangay: string
  reportType: 'Emergency' | 'Incident'
  natureOfCall: string
  emergencyType: string
  callNature?: string
  details: string
  severityLevel?: string
}

interface ApiGeographicType { name: string }
interface ApiClient {
  full_name?: string | null
  incident_address?: string | null
}
interface ApiEmergencyDetails {
  type_of_emergency?: string | null
  mechanism_of_injury?: string | null
  nature_of_illness?: string | null
}
interface ApiIncidentDetails {
  nature_of_call?: string | null
  type_of_hazard?: string | null
  severity_level?: string | null
  incident_barangay?: string | null
}
interface ApiReport {
  id: number
  report_type: 'Emergency' | 'Incident'
  date_reported: string
  geographicType?: ApiGeographicType | null
  geographic_type?: ApiGeographicType | null
  clients?: ApiClient[]
  emergencyDetails?: ApiEmergencyDetails | null
  emergency_details?: ApiEmergencyDetails | null
  incidentDetails?: ApiIncidentDetails | null
  incident_details?: ApiIncidentDetails | null
}

// ── Zones ─────────────────────────────────────────────────────────────
const ZONES = [
  { name: 'Rail Road',     color: '#2563eb' },
  { name: 'Poblacion',     color: '#15803d' },
  { name: 'Mountain Area', color: '#f59e0b' },
  { name: 'River Side',    color: '#06b6d4' },
]

const INCIDENT_GROUPS = [
  {
    group: 'Nature of Call',
    items: ['Emergency', 'Conduction'],
  },
  {
    group: 'Emergency Types',
    items: ['Medical', 'Trauma', 'OB', 'PSYCHE', 'RTA'],
  },
  {
    group: 'Hazard Types',
    items: ['Flood', 'Earthquake', 'Typhoon', 'Landslide'],
  },
]


const toZoneSlug = (zoneName: string) =>
  zoneName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const formatDateCell = (value: string) => {
  if (!value) return 'N/A'
  const normalized = value.includes('T') ? value.split('T')[0] : value
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const REPORTS_CACHE_KEY = 'management_reports_cache_v3'
const REPORTS_CACHE_TTL_MS = 60 * 1000

export const Management_Report = () => {
  const [keyword, setKeyword]               = useState('')
  const [selectedTypes, setSelectedTypes]   = useState<string[]>([])
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'Emergency' | 'Incident'>('all')
  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const [allReports, setAllReports]         = useState<Report[]>([])
  const [isLoadingAllReports, setIsLoadingAllReports] = useState(true)
  const [isViewOpen, setIsViewOpen]         = useState(false)
  const [isViewLoading, setIsViewLoading]   = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportDocumentData | null>(null)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const roleBase = pathname.startsWith('/staff') ? '/staff' : '/admin'
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    let ignore = false

    try {
      const rawCache = sessionStorage.getItem(REPORTS_CACHE_KEY)
      if (rawCache) {
        const parsed = JSON.parse(rawCache) as { ts: number; data: Report[] }
        if (Array.isArray(parsed?.data) && Date.now() - Number(parsed.ts ?? 0) <= REPORTS_CACHE_TTL_MS) {
          setAllReports(parsed.data)
          setIsLoadingAllReports(false)
        }
      }
    } catch { /* ignore */ }

    const toViewReport = (report: ApiReport): Report => {
      const geographicName = report.geographicType?.name ?? report.geographic_type?.name ?? 'Unknown Zone'
      const primaryClient  = report.clients?.[0]
      const emergencyDetail = report.emergencyDetails ?? report.emergency_details
      const incidentDetail  = report.incidentDetails  ?? report.incident_details

      if (report.report_type === 'Emergency') {
        return {
          id:           report.id,
          date:         report.date_reported,
          name:         primaryClient?.full_name ?? '—',
          zone:         geographicName,
          barangay:     primaryClient?.incident_address?.trim() || '—',
          reportType:   'Emergency',
          natureOfCall: 'Emergency',
          emergencyType: emergencyDetail?.type_of_emergency ?? 'N/A',
          callNature:   undefined,
          details:      emergencyDetail?.mechanism_of_injury ?? emergencyDetail?.nature_of_illness ?? primaryClient?.incident_address ?? 'N/A',
          severityLevel: undefined,
        }
      }

      return {
        id:           report.id,
        date:         report.date_reported,
        name:         primaryClient?.full_name ?? '—',
        zone:         geographicName,
        barangay:     incidentDetail?.incident_barangay?.trim() || primaryClient?.incident_address?.trim() || '—',
        reportType:   'Incident',
        natureOfCall: 'Incident',
        emergencyType: incidentDetail?.type_of_hazard ?? 'N/A',
        callNature:   incidentDetail?.nature_of_call ?? 'N/A',
        details:      primaryClient?.incident_address ?? incidentDetail?.type_of_hazard ?? 'N/A',
        severityLevel: incidentDetail?.severity_level ?? undefined,
      }
    }

    const loadReports = async () => {
      setIsLoadingAllReports(true)
      try {
        let response
        try { response = await api.get('/reports/summary', { params: { limit: 500 } }) }
        catch { response = await api.get('/reports') }
        if (ignore) return
        const data   = Array.isArray(response.data) ? (response.data as ApiReport[]) : []
        const mapped = data.map(toViewReport)
        setAllReports(mapped)
        try { sessionStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: mapped })) }
        catch { /* ignore */ }
      } catch {
        if (!ignore) setAllReports([])
      } finally {
        if (!ignore) setIsLoadingAllReports(false)
      }
    }

    loadReports()
    return () => { ignore = true }
  }, [])

  // ── Live filtering ────────────────────────────────────────────────────
  const filteredReports = useMemo(() => {
    let f = allReports

    if (reportTypeFilter !== 'all')
      f = f.filter(r => r.reportType === reportTypeFilter)

    if (keyword.trim()) {
      const kw = keyword.toLowerCase()
      f = f.filter(r =>
        r.name.toLowerCase().includes(kw) ||
        r.zone.toLowerCase().includes(kw) ||
        r.details.toLowerCase().includes(kw)
      )
    }

    if (selectedTypes.length > 0) {
      const norm = (s?: string) => (s ?? '').toLowerCase()
      f = f.filter(r =>
        selectedTypes.some(t => {
          const tl = t.toLowerCase()
          return (
            tl === norm(r.natureOfCall) ||
            tl === norm(r.emergencyType) ||
            (r.callNature ? tl === norm(r.callNature) : false) ||
            // "Conduction" in filter also matches old "Coordination" records
            (tl === 'conduction' && norm(r.callNature) === 'coordination')
          )
        })
      )
    }

    if (dateFrom) f = f.filter(r => r.date >= dateFrom)
    if (dateTo)   f = f.filter(r => r.date <= dateTo)

    return f
  }, [allReports, keyword, selectedTypes, dateFrom, dateTo, reportTypeFilter])

  const hasActiveFilters = Boolean(
    keyword.trim() || selectedTypes.length > 0 || dateFrom || dateTo || reportTypeFilter !== 'all'
  )

  const handleClearFilters = () => {
    setKeyword('')
    setSelectedTypes([])
    setDateFrom('')
    setDateTo('')
    setReportTypeFilter('all')
  }

  const toggleType = (type: string) =>
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])

  const typeLabel =
    selectedTypes.length === 0 ? 'Incident Types' :
    selectedTypes.length === 1 ? selectedTypes[0] :
    `${selectedTypes.length} types selected`

  const countReportsByZone = (zoneName: string) => allReports.filter(r => r.zone === zoneName).length

  const handleZoneOpen = (zoneName: string) => navigate(`${roleBase}/zonal-reports/${toZoneSlug(zoneName)}`)

  const closeViewModal = () => { setIsViewOpen(false); setIsViewLoading(false); setSelectedReport(null) }

  const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  const waitForImages = (el: HTMLElement) =>
    Promise.all(Array.from(el.querySelectorAll('img')).map(img =>
      img.complete ? Promise.resolve() :
      new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res() })
    ))

  const handleDownloadAll = async () => {
    if (filteredReports.length === 0 || isDownloadingAll) return
    setIsDownloadingAll(true)
    setDownloadProgress(0)
    const zip = new JSZip()
    for (let i = 0; i < filteredReports.length; i++) {
      const row = filteredReports[i]
      setDownloadProgress(i + 1)
      try {
        const response = await api.get(`/reports/${row.id}`)
        const fullReport = response.data as ReportDocumentData
        const container = document.createElement('div')
        container.style.cssText = 'position:absolute;left:-9999px;top:0;width:740px;pointer-events:none'
        document.body.appendChild(container)
        const root = createRoot(container)
        let fileName: string
        let doc: Awaited<ReturnType<typeof capturePcrToPdf>>
        if (fullReport.report_type === 'Incident') {
          const incidentData = buildIncidentViewData(fullReport)
          await new Promise<void>(res => {
            root.render(<IncidentReportView data={incidentData} />)
            requestAnimationFrame(() => requestAnimationFrame(() => res()))
          })
          await waitForImages(container)
          doc = await captureIncidentToPdf(container)
          const personName = fullReport.clients?.[0]?.full_name || 'report'
          fileName = `${String(i + 1).padStart(2, '0')}-incident-${slugify(personName)}-${fullReport.date_reported || 'unknown'}.pdf`
        } else {
          const pcrData = buildPcrData(fullReport)
          await new Promise<void>(res => {
            root.render(<PatientCareReportView data={pcrData} />)
            requestAnimationFrame(() => requestAnimationFrame(() => res()))
          })
          await waitForImages(container)
          doc = await capturePcrToPdf(container)
          fileName = `${String(i + 1).padStart(2, '0')}-${slugify(pcrData.patientName || 'report')}-${pcrData.date || 'unknown'}.pdf`
        }
        zip.file(fileName, doc.output('arraybuffer'))
        root.unmount()
        document.body.removeChild(container)
      } catch { /* skip */ }
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `reports-${new Date().toISOString().slice(0, 10)}.zip`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    setIsDownloadingAll(false); setDownloadProgress(0)
  }

  const openViewModal = async (id: number) => {
    setIsViewOpen(true); setIsViewLoading(true)
    try {
      const response = await api.get(`/reports/${id}`)
      setSelectedReport(response.data as ReportDocumentData)
    } catch { setSelectedReport(null) }
    finally { setIsViewLoading(false) }
  }

  // ── Severity row style — purely frontend condition ────────────────────
  const getSeverityRowStyle = (report: Report): React.CSSProperties => {
    if (report.reportType !== 'Incident') return {}
    switch ((report.severityLevel ?? '').toLowerCase()) {
      case 'low':      return { background: '#f0fdf4', borderLeft: '4px solid #16a34a' }
      case 'moderate': return { background: '#fefce8', borderLeft: '4px solid #d97706' }
      case 'high':     return { background: '#fff7ed', borderLeft: '4px solid #ea580c' }
      case 'critical': return { background: '#fef2f2', borderLeft: '4px solid #dc2626' }
      default:         return {}
    }
  }

  const TOUR_STEPS: Step[] = [
    { target: '.mr-page-title', placement: 'bottom', skipBeacon: true, title: 'Manage Reports', content: 'This page shows all submitted reports from every zone in one place — emergency and incident reports combined.' },
    { target: '.mr-zones-row', placement: 'bottom', skipBeacon: true, title: 'Zone Filter', content: 'Filter reports by zone — Rail Road, Poblacion, Mountain Area, or River Side — or view all zones at once.' },
    { target: '.mr-card', placement: 'top', skipBeacon: true, title: 'Search & Filter Panel', content: 'Narrow down reports by date range, report type, or keyword. Use this to quickly find a specific record.' },
    { target: '.mr-table', placement: 'top', skipBeacon: true, title: 'Report Table', content: 'Each row is one submitted report. Click the view icon to see its full document, or download a PDF copy directly.' },
  ]

  return (
    <div className="px-1">
      <PageTour steps={TOUR_STEPS} storageKey="dermas_tour_done_mr" />
      <Modal open={isViewOpen} close={closeViewModal}>
        <ReportDocumentModal report={selectedReport} isLoading={isViewLoading} onClose={closeViewModal} />
      </Modal>

      {/* ── Page heading ── */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="mr-page-title mb-0">Manage Reports</h1>
        <span className="mr-total-pill">
          <i className="bi bi-file-earmark-text me-1" />
          {isLoadingAllReports ? '…' : allReports.length} total
        </span>
      </div>

      {/* ── Zone Cards ── */}
      <div className="mr-zones-row mb-4">
        {ZONES.map(zone => (
          <button
            key={zone.name}
            type="button"
            className="mr-zone-card"
            onClick={() => handleZoneOpen(zone.name)}
            style={{ '--zone-color': zone.color } as React.CSSProperties}
            aria-label={`Open ${zone.name} reports`}
          >
            <span className="mr-zone-card-bar" />
            <span className="mr-zone-card-icon">
              <i className="bi bi-folder-fill" />
            </span>
            <span className="mr-zone-card-body">
              <span className="mr-zone-card-name">{zone.name}</span>
              <span className="mr-zone-card-sub">
                {isLoadingAllReports
                  ? <span className="mr-zone-card-loading">loading…</span>
                  : `${countReportsByZone(zone.name)} report${countReportsByZone(zone.name) !== 1 ? 's' : ''}`}
              </span>
            </span>
            <span className="mr-zone-card-badge">
              {isLoadingAllReports ? '…' : countReportsByZone(zone.name)}
            </span>
            <i className="bi bi-chevron-right mr-zone-card-arrow" />
          </button>
        ))}
      </div>

      {/* ── Filter Card ── */}
      <div className="card mr-card mb-3">
        <div className="card-body px-4 py-3">

          {/* Filter header */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="mr-card-icon d-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10">
                <i className="bi bi-funnel-fill text-success" style={{ fontSize: '0.8rem' }} />
              </span>
              <span className="mr-card-title">Filter Reports</span>
            </div>
            {hasActiveFilters && (
              <button type="button" className="mr-clear-btn" onClick={handleClearFilters}>
                <i className="bi bi-x-circle me-1" />Clear
              </button>
            )}
          </div>

          {/* Row 1: keyword, type, date range */}
          <div className="row g-3 align-items-end mr-row mb-3">

            {/* Keyword */}
            <div className="col-12 col-sm-6 col-md-3">
              <label className="mr-field-label">Keyword</label>
              <div className="mr-input-group">
                <i className="bi bi-search mr-icon" />
                <input
                  type="text"
                  className="mr-input form-control"
                  placeholder="Search name, zone, details…"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                />
                {keyword && (
                  <button type="button" className="mr-input-clear" onClick={() => setKeyword('')} aria-label="Clear">
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>
            </div>

            {/* Incident Types */}
            <div className="col-12 col-sm-6 col-md-3" ref={dropdownRef}>
              <label className="mr-field-label">Incident Type</label>
              <div className="mr-dd-wrapper">
                <button
                  type="button"
                  className={`mr-dropdown-btn${dropdownOpen ? ' mr-dropdown-btn--open' : ''}`}
                  onClick={() => setDropdownOpen(o => !o)}
                  aria-expanded={dropdownOpen}
                >
                  <span className="d-flex align-items-center gap-2 text-truncate">
                    <i className="bi bi-exclamation-circle text-success" />
                    <span>{typeLabel}</span>
                  </span>
                  <i className={`bi bi-chevron-down mr-chevron${dropdownOpen ? ' mr-chevron--up' : ''}`} />
                </button>
                <div className={`mr-dropdown-panel${dropdownOpen ? ' mr-dropdown-panel--open' : ''}`}>
                  {INCIDENT_GROUPS.map((section, si) => (
                    <div key={section.group}>
                      {si > 0 && <hr className="mr-group-divider" />}
                      <p className="mr-group-heading">{section.group}</p>
                      {section.items.map(item => (
                        <label key={item} className="mr-check-row">
                          <input
                            type="checkbox"
                            className="mr-check-input"
                            checked={selectedTypes.includes(item)}
                            onChange={() => toggleType(item)}
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Date From */}
            <div className="col-6 col-md-3">
              <label className="mr-field-label">Date From</label>
              <div className="mr-label-group">
                <span className="mr-prefix"><i className="bi bi-calendar3 me-1" />From</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
            </div>

            {/* Date To */}
            <div className="col-6 col-md-3">
              <label className="mr-field-label">Date To</label>
              <div className="mr-label-group">
                <span className="mr-prefix"><i className="bi bi-calendar3 me-1" />To</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>

          </div>

          {/* Row 2: Report Type + Severity Level chips */}
          <div className="mr-chip-row">

            {/* Report Type */}
            <div className="mr-chip-group">
              <span className="mr-field-label mb-0 me-2">Report Type</span>
              {(['all', 'Emergency', 'Incident'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  className={`mr-type-chip${reportTypeFilter === type ? ' mr-type-chip--active' : ''} mr-type-chip--${type.toLowerCase()}`}
                  onClick={() => setReportTypeFilter(type)}
                >
                  {type === 'all' ? (
                    <><i className="bi bi-grid-3x2-gap me-1" />All</>
                  ) : type === 'Emergency' ? (
                    <><i className="bi bi-activity me-1" />Emergency</>
                  ) : (
                    <><i className="bi bi-exclamation-triangle me-1" />Incident</>
                  )}
                </button>
              ))}
            </div>


          </div>

        </div>
      </div>

      {/* ── Reports Table ── */}
      <div className="card mr-card mr-results-card mb-4">

        <div className="mr-results-header">
          <span className="d-flex align-items-center gap-2">
            <i className="bi bi-table" />
            {hasActiveFilters ? 'Filtered Results' : 'All Reports'}
            <span className="mr-results-count">
              {isLoadingAllReports ? '…' : filteredReports.length}
            </span>
          </span>
          {filteredReports.length > 0 && !isLoadingAllReports && (
            <button
              className="btn btn-sm btn-light border"
              onClick={handleDownloadAll}
              disabled={isDownloadingAll}
              title="Download all results as a ZIP of PDFs"
            >
              {isDownloadingAll
                ? <><i className="bi bi-hourglass-split me-1" />Downloading {downloadProgress}/{filteredReports.length}…</>
                : <><i className="bi bi-file-zip me-1" />Download ZIP</>}
            </button>
          )}
        </div>

        <div className="table-responsive">
          {isLoadingAllReports ? (
            <div className="mr-no-results">
              <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
              Loading reports…
            </div>
          ) : filteredReports.length > 0 ? (
            <table className="table mr-table mr-table-mobile-cards align-middle mb-0">
              <thead>
                <tr>
                  <th className="mr-th-num">#</th>
                  <th>Date</th>
                  <th>Full Name</th>
                  <th>Zone</th>
                  <th>Barangay</th>
                  <th>Report Type</th>
                  <th>Incident Type</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report, idx) => (
                    <tr
                      key={report.id}
                      className={idx % 2 === 0 ? 'mr-row-even' : 'mr-row-odd'}
                      style={getSeverityRowStyle(report)}
                    >

                      <td data-label="#" className="mr-td-num">{idx + 1}</td>

                      <td data-label="Date" className="mr-td-date">
                        <div className="mr-date-wrap">
                          <i className="bi bi-calendar2 mr-date-icon" />
                          {formatDateCell(report.date)}
                        </div>
                      </td>

                      <td data-label="Full Name" className="mr-td-name">
                        <div className="d-flex align-items-center gap-2">
                          <span className="mr-avatar-dot" />
                          {report.name}
                        </div>
                      </td>

                      <td data-label="Zone" className="mr-td-zone">
                        <span className="mr-zone-pill">{report.zone}</span>
                      </td>

                      <td data-label="Barangay">
                        <span style={{ fontSize: 12, color: report.barangay === '—' ? '#9ca3af' : '#374151' }}>
                          {report.barangay}
                        </span>
                      </td>

                      <td data-label="Report Type">
                        <span className={`mr-badge-nature ${
                          report.reportType === 'Emergency'
                            ? 'mr-badge-nature--emergency'
                            : 'mr-badge-nature--incident'
                        }`}>
                          {report.reportType === 'Emergency'
                            ? <><i className="bi bi-activity me-1" />Emergency</>
                            : <><i className="bi bi-exclamation-triangle me-1" />Incident</>}
                        </span>
                      </td>

                      <td data-label="Incident Type" className="mr-type-cell">
                        <div className="mr-type-meta">
                          {report.emergencyType && report.emergencyType !== 'N/A' && (
                            <span className="mr-mini-chip mr-mini-chip--accent">{report.emergencyType}</span>
                          )}
                          {report.callNature && report.callNature !== 'N/A' && (
                            <span className="mr-mini-chip">{report.callNature}</span>
                          )}
                        </div>
                      </td>

                      <td data-label="Action" className="mr-actions-cell">
                        <button className="mr-view-btn" onClick={() => openViewModal(report.id)}>
                          <i className="bi bi-eye me-1" />View
                        </button>
                      </td>

                    </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mr-no-results">
              <i className="bi bi-inbox fs-4 d-block mb-2 opacity-50" />
              {hasActiveFilters ? 'No reports match your filters.' : 'No reports found.'}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default Management_Report
