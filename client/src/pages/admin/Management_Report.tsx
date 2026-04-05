import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../style/management_report.css'
import api from '../../api/axios'
import { Modal } from '../../components/Modal'
import { ReportDocumentModal, type ReportDocumentData } from './zone-report/ReportDocumentModal'

// ── Report type ────────────────────────────────────────────────────────
interface Report {
  id: number
  date: string
  name: string
  zone: string
  natureOfCall: string
  emergencyType: string
  callNature?: string
  details: string
}

interface ApiGeographicType {
  name: string
}

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

// ── Zones ────────────────────────────────────────────────────────────
// To add a zone: { name: 'Zone Name', color: '#hexcolor' }
const ZONES = [
  { name: 'Real Road',     color: '#2563eb' },
  { name: 'Poblacion',     color: '#15803d' },
  { name: 'Mountain Area', color: '#f59e0b' },
  { name: 'River Side',    color: '#06b6d4' },
]

const INCIDENT_GROUPS = [
  {
    group: 'Nature of Call',
    items: ['Emergency', 'Coordination', 'Search and Rescue'],
  },
  {
    group: 'Emergency Types',
    items: ['Medical', 'Trauma'],
  },  
  {
    group: 'Hazard Types',
    items: ['Flood', 'Earthquake', 'Typhoon', 'Landslide'],
  },
]

const toZoneSlug = (zoneName: string) =>
  zoneName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatDateCell = (value: string) => {
  if (!value) return 'N/A'

  const normalized = value.includes('T') ? value.split('T')[0] : value
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return normalized
  }

  return parsed.toLocaleDateString()
}

const REPORTS_CACHE_KEY = 'management_reports_cache_v1'
const REPORTS_CACHE_TTL_MS = 60 * 1000

export const Management_Report = () => {
  const [keyword, setKeyword]             = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [dropdownOpen, setDropdownOpen]   = useState(false)
  const [results, setResults]             = useState<Report[]>([])
  const [showResults, setShowResults]     = useState(false)
  const [allReports, setAllReports]       = useState<Report[]>([])
  const [isLoadingAllReports, setIsLoadingAllReports] = useState(true)
  const [isViewOpen, setIsViewOpen]       = useState(false)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportDocumentData | null>(null)
  const navigate = useNavigate()

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {      
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
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
        }
      }
    } catch {
      // Ignore cache parse issues.
    }

    const toViewReport = (report: ApiReport): Report => {
      const geographicName = report.geographicType?.name ?? report.geographic_type?.name ?? 'Unknown Zone'
      const primaryClient = report.clients?.[0]
      const emergencyDetail = report.emergencyDetails ?? report.emergency_details
      const incidentDetail = report.incidentDetails ?? report.incident_details

      if (report.report_type === 'Emergency') {
        return {
          id: report.id,
          date: report.date_reported,
          name: primaryClient?.full_name ?? 'N/A',
          zone: geographicName,
          natureOfCall: 'Emergency',
          emergencyType: emergencyDetail?.type_of_emergency ?? 'N/A',
          callNature: undefined,
          details:
            emergencyDetail?.mechanism_of_injury ??
            emergencyDetail?.nature_of_illness ??
            primaryClient?.incident_address ??
            'N/A',
        }
      }

      return {
        id: report.id,
        date: report.date_reported,
        name: primaryClient?.full_name ?? 'N/A',
        zone: geographicName,
        natureOfCall: 'Incident',
        emergencyType: incidentDetail?.type_of_hazard ?? 'N/A',
        callNature: incidentDetail?.nature_of_call ?? 'N/A',
        details: primaryClient?.incident_address ?? incidentDetail?.type_of_hazard ?? 'N/A',
      }
    }

    const loadReports = async () => {
      setIsLoadingAllReports(true)
      try {
        let response

        try {
          response = await api.get('/reports/summary', {
            params: {
              limit: 500,
            },
          })
        } catch {
          response = await api.get('/reports')
        }

        if (ignore) {
          return
        }

        const data = Array.isArray(response.data) ? (response.data as ApiReport[]) : []
        const mapped = data.map(toViewReport)
        setAllReports(mapped)
        try {
          sessionStorage.setItem(
            REPORTS_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data: mapped })
          )
        } catch {
          // Ignore cache write issues.
        }
      } catch {
        if (!ignore) {
          setAllReports([])
        }
      } finally {
        if (!ignore) {
          setIsLoadingAllReports(false)
        }
      }
    }

    loadReports()

    return () => {
      ignore = true
    }
  }, [])

  const toggleType = (type: string) =>
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )

  const typeLabel =
    selectedTypes.length === 0
      ? 'Incident Types'
      : selectedTypes.length === 1
      ? selectedTypes[0]
      : `${selectedTypes.length} types selected`

  const countReportsByZone = (zoneName: string) =>
    allReports.filter(r => r.zone === zoneName).length

  const handleZoneOpen = (zoneName: string) => {
    navigate(`/admin/zonal-reports/${toZoneSlug(zoneName)}`)
  }

  const handleSearch = () => {
    setDropdownOpen(false)

    let filtered = allReports

    if (keyword.trim()) {
      const kw = keyword.toLowerCase()
      filtered = filtered.filter(
        r =>
          r.name.toLowerCase().includes(kw) ||
          r.zone.toLowerCase().includes(kw) ||
          r.details.toLowerCase().includes(kw)
      )
    }

    if (selectedTypes.length > 0) {
      filtered = filtered.filter(
        r =>
          selectedTypes.includes(r.natureOfCall) ||
          selectedTypes.includes(r.emergencyType) ||
          (r.callNature ? selectedTypes.includes(r.callNature) : false)
      )
    }

    if (dateFrom) filtered = filtered.filter(r => r.date >= dateFrom)
    if (dateTo)   filtered = filtered.filter(r => r.date <= dateTo)

    setResults(filtered)
    setShowResults(true)
  }

  const handleClose = () => {
    setShowResults(false)
    setResults([])
  }

  const closeViewModal = () => {
    setIsViewOpen(false)
    setIsViewLoading(false)
    setSelectedReport(null)
  }

  const openViewModal = async (id: number) => {
    setIsViewOpen(true)
    setIsViewLoading(true)

    try {
      const response = await api.get(`/reports/${id}`)
      setSelectedReport(response.data as ReportDocumentData)
    } catch {
      setSelectedReport(null)
    } finally {
      setIsViewLoading(false)
    }
  }

  return (
    <div className="px-1">
      <Modal open={isViewOpen} close={closeViewModal}>
        <ReportDocumentModal report={selectedReport} isLoading={isViewLoading} onClose={closeViewModal} />
      </Modal>

      {/* Page heading */}
      <h1 className="mr-page-title mb-4">Manage Reports</h1>

      {/* ── Search Card ── */}
      <div className="card mr-card mb-4">
        <div className="card-body px-4 py-3">

          {/* Card header row */}
          <div className="d-flex align-items-center mb-3 gap-2">
            <span className="mr-card-icon d-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10">
              <i className="bi bi-search text-success"></i>
            </span>
            <span className="mr-card-title">Search Report</span>
          </div>

          <div className="row g-3 align-items-end mr-row">

            {/* Keyword */}
            <div className="col-12 col-sm-6 col-md-3">
              <label className="mr-field-label">Keyword</label>
              <div className="mr-input-group">
                <i className="bi bi-search mr-icon"></i>
                <input
                  type="text"
                  className="mr-input form-control"
                  placeholder="Search name, zone, details…"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            {/* Incident Types — custom controlled dropdown */}
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
                    <i className="bi bi-exclamation-circle text-success"></i>
                    <span>{typeLabel}</span>
                  </span>
                  <i className={`bi bi-chevron-down mr-chevron${dropdownOpen ? ' mr-chevron--up' : ''}`}></i>
                </button>

                {/* Dropdown panel */}
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
            <div className="col-6 col-md-2">
              <label className="mr-field-label">Date From</label>
              <div className="mr-label-group">
                <span className="mr-prefix">
                  <i className="bi bi-calendar3 me-1"></i>From
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
            </div>

            {/* Date To */}
            <div className="col-6 col-md-2">
              <label className="mr-field-label">Date To</label>
              <div className="mr-label-group">
                <span className="mr-prefix">
                  <i className="bi bi-calendar3 me-1"></i>To
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="col-12 col-md-2">
              <button
                className="btn text-white w-100 mr-search-btn"
                onClick={handleSearch}
              >
                <i className="bi bi-search me-2"></i>Search
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Search Results Table ── */}
      {showResults && (
        <div className="card mr-card mr-results-card mb-4">

          {/* Blue header */}
          <div className="mr-results-header">
            <span className="d-flex align-items-center gap-2">
              <i className="bi bi-list-ul"></i>
              Search Results
            </span>
            <button className="mr-close-btn" onClick={handleClose}>
              <i className="bi bi-x-lg me-1"></i>Close
            </button>
          </div>

          {/* Table */}
          <div className="table-responsive">
            {results.length > 0 ? (
              <table className="table mr-table mr-table-mobile-cards align-middle mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Full Name</th>
                    <th>Zone</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(report => (
                    <tr key={report.id}>
                      <td data-label="Date" className="mr-td-date">{formatDateCell(report.date)}</td>
                      <td data-label="Client Name" className="mr-td-name">{report.name}</td>
                      <td data-label="Location">{report.zone}</td>
                      <td data-label="Type" className="mr-type-cell">
                        <span
                          className={`mr-badge-nature ${
                            report.natureOfCall === 'Emergency' ? 'mr-badge-nature--emergency' : 'mr-badge-nature--incident'
                          }`}
                        >
                          {report.natureOfCall}
                        </span>
                        <div className="mr-type-meta">
                          {report.emergencyType && report.emergencyType !== 'N/A' && (
                            <span className="mr-mini-chip mr-mini-chip--accent">{report.emergencyType}</span>
                          )}
                          {report.callNature && report.callNature !== 'N/A' && (
                            <span className="mr-mini-chip">{report.callNature}</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Details" className="mr-td-details" title={report.details}>{report.details}</td>
                      <td data-label="Actions" className="mr-actions-cell">
                        <button className="mr-view-btn" onClick={() => openViewModal(report.id)}>
                          <i className="bi bi-eye me-1"></i>View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="mr-no-results">
                <i className="bi bi-inbox fs-4 d-block mb-2 opacity-50"></i>
                No reports found matching your criteria.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Zone Folders Grid ── */}
      <div className="mr-zones-section">
        <div className="mr-zones-grid">
          {ZONES.map(zone => (
              <button
                key={zone.name}
                type="button"
                className="mr-zone-item mr-zone-item-btn"
                onClick={() => handleZoneOpen(zone.name)}
                aria-label={`Open ${zone.name} reports`}
              >
                <div className="mr-zone-folder-wrap">
                  <span
                    className="mr-zone-badge"
                    style={{ background: '#dc2626', color: '#ffffff' }}
                  >
                    {isLoadingAllReports && allReports.length < 1 ? '...' : countReportsByZone(zone.name)}
                  </span>
                  <i
                    className="bi bi-folder-fill mr-zone-folder"
                    style={{ color: zone.color }}
                  ></i>
                </div>
                <span className="mr-zone-name">{zone.name}</span>
              </button>
          ))}
        </div>
      </div>

    </div>
  )
}

export default Management_Report
