import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useEffect, useRef, useState } from 'react'
import '../../../../style/zone_report.css'
import { PatientCareReportView } from '../views/PatientCareReportView'
import { IncidentReportView } from '../views/IncidentReportView'

function trimCanvasBottom(canvas: HTMLCanvasElement, padding = 20): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let lastRow = 0
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x += 6) {
      const i = (y * width + x) * 4
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) { lastRow = y; break }
    }
    if (lastRow) break
  }
  const newH = Math.min(lastRow + padding, height)
  const out = document.createElement('canvas')
  out.width = width; out.height = newH
  out.getContext('2d')!.drawImage(canvas, 0, 0)
  return out
}

interface GeographicTypeItem {
  id: number
  name: string
}

interface ReportDetailItem {
  mechanism_of_injury?: string | null
  nature_of_illness?: string | null
  type_of_emergency?: string | null
  type_of_incident?: string | null
  type_of_hazard?: string | null
  severity_level?: string | null
  incident_barangay?: string | null
  nature_of_call?: string | null
  incident_date?: string | null
  incident_time?: string | null
  dispatcher_name?: string | null
}

interface VitalSignItem {
  id?: number
  bp?: string | null
  rr?: string | null
  pr?: string | null
  temp?: string | null
  spo2?: string | null
}

interface GlasgowScoreItem {
  id?: number
  eye?: number | null
  verbal?: number | null
  motor?: number | null
}

interface ClientAssessmentItem {
  chief_complaint?: string | null
  loc?: string | null
  airway?: string | null
  breathing?: string | null
  circulation?: string | null
  circulation_support?: string | null
  capillary_refill?: string | null
  pupils?: string | null
  wound_care?: string | null
  miscellaneous?: string | null
  history_of_coronary_disease?: string | null
  collapse_witness?: string | null
  time_of_collapse?: string | null
  start_of_cpr?: string | null
  defibrillation_time?: string | null
  cpr_duration?: number | null
  rosc?: string | null
  transferred_to_hospital?: string | null
  ob_lmp?: string | null
  ob_aog?: string | null
  ob_edd?: string | null
  ob_gravida?: number | null
  ob_para?: number | null
  ob_term?: number | null
  ob_preterm?: number | null
  ob_abortion?: number | null
  ob_living?: number | null
  vital_signs?: VitalSignItem[]
  vitalSigns?: VitalSignItem[]
  glasgow_scores?: GlasgowScoreItem[]
  glasgowScores?: GlasgowScoreItem[]
}

interface ReportClientItem {
  id: number
  full_name: string
  age: number | null
  gender: string | null
  nationality?: string | null
  contact_number?: string | null
  permanent_address?: string | null
  incident_address?: string | null
  accident_type?: string | null
  assessment?: ClientAssessmentItem | null
}

interface ReportResponderItem {
  id: number
  name: string | null
}

interface ReportPhotoItem {
  id: number
  photo_path: string
}

const _RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
const API_BASE_URL = _RAW_API_URL
  ? (/^https?:\/\/[^/]+$/i.test(_RAW_API_URL) ? `${_RAW_API_URL}/api` : _RAW_API_URL)
  : '/api'

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')
const encodePathSegments = (value: string) => value.split('/').map(segment => encodeURIComponent(segment)).join('/')

interface AmbulanceTransferItem {
  ambulance_driver?: string | null
  dispatcher?: string | null
  responders?: string | null
  receiving_facility?: string | null
  receiving_personnel?: string | null
}

export interface ReportDocumentData {
  id: number
  report_type: 'Emergency' | 'Incident'
  status?: string | null
  date_reported: string
  time_reported: string
  created_at?: string | null
  latitude?: number | null
  longitude?: number | null
  geographicType?: GeographicTypeItem | null
  geographic_type?: GeographicTypeItem | null
  clients?: ReportClientItem[]
  emergencyDetails?: ReportDetailItem | null
  emergency_details?: ReportDetailItem | null
  incidentDetails?: ReportDetailItem | null
  incident_details?: ReportDetailItem | null
  responders?: ReportResponderItem[]
  photos?: ReportPhotoItem[]
  ambulanceTransfer?: AmbulanceTransferItem | null
  ambulance_transfer?: AmbulanceTransferItem | null
}

interface ReportDocumentModalProps {
  report: ReportDocumentData | null
  isLoading: boolean
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
  recordLabel?: string
}

const resolvePhotoUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Prevent mixed-content blocking for legacy http URLs saved before HTTPS was enabled.
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && path.startsWith('http://')) {
      return `https://${path.slice('http://'.length)}`
    }
    return path
  }

  if (path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }

  const storageRelative = path.replace(/^\/?storage\//, '')
  if (storageRelative !== path) {
    return `${API_BASE_URL}/files/public/${encodePathSegments(storageRelative)}`
  }

  // Legacy records may store bare relative paths like "reports/8/file.jpg".
  // Treat them as public disk paths instead of website-root paths.
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/files/public/${encodePathSegments(path)}`
  }

  if (path.startsWith('/')) {
    return `${SERVER_BASE_URL}${path}`
  }
  return `${SERVER_BASE_URL}/${path}`
}

const slugifyFileName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatDateForFile = (value?: string | null) => {
  if (!value) return 'unknown-date'
  const datePart = value.includes('T') ? value.slice(0, 10) : value
  const parsed = new Date(datePart)
  if (Number.isNaN(parsed.getTime())) {
    return slugifyFileName(datePart)
  }
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}


export function ReportDocumentModal({ report, isLoading, onClose, onPrev, onNext, hasPrev, hasNext, recordLabel }: ReportDocumentModalProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const [docZoom, setDocZoom] = useState(isMobile ? 0.75 : 1)
  const pcrContainerRef = useRef<HTMLDivElement>(null)
  const hiddenCaptureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext()
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hasPrev, hasNext, onPrev, onNext])
  const emergencyDetail = report?.emergencyDetails ?? report?.emergency_details
  const incidentDetail = report?.incidentDetails ?? report?.incident_details
  const detail = report?.report_type === 'Emergency' ? emergencyDetail : incidentDetail
  const geographicName = report?.geographicType?.name ?? report?.geographic_type?.name ?? 'N/A'
  const responders = (report?.responders ?? []).map(item => item.name).filter((name): name is string => Boolean(name))
  const photos = report?.photos ?? []
  const clients = report?.clients ?? []
  const primaryClient = clients[0]
  const primaryAssessment = clients[0]?.assessment


  const primaryClientName = clients[0]?.full_name || 'unknown-client'
  const pdfFileName = `${slugifyFileName(primaryClientName)}-${slugifyFileName(geographicName)}-${formatDateForFile(
    report?.date_reported
  )}.pdf`

  useEffect(() => {
    setDocZoom(1)
  }, [report?.id])

  const adjustZoom = (delta: number) => {
    setDocZoom((prev) => {
      const next = prev + delta
      return Math.max(0.75, Math.min(1.5, Number(next.toFixed(2))))
    })
  }

  const handleDownloadReportPdf = async () => {
    if (!report || !hiddenCaptureRef.current) return
    const pageClass = report.report_type === 'Incident' ? '.incident-page' : '.pcr-page'
    const pages = hiddenCaptureRef.current.querySelectorAll<HTMLElement>(pageClass)
    if (!pages.length) return

    const pgW = 215.9
    const pgH = 279.4
    const margin = 6
    const drawW = pgW - margin * 2
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage()
      const el = pages[i]
      const saved = { border: el.style.border, boxShadow: el.style.boxShadow, maxWidth: el.style.maxWidth, margin: el.style.margin, borderRadius: el.style.borderRadius }
      el.style.border = 'none'; el.style.boxShadow = 'none'; el.style.maxWidth = 'none'; el.style.margin = '0'; el.style.borderRadius = '0'
      const raw = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff', windowWidth: el.scrollWidth })
      el.style.border = saved.border; el.style.boxShadow = saved.boxShadow; el.style.maxWidth = saved.maxWidth; el.style.margin = saved.margin; el.style.borderRadius = saved.borderRadius
      const canvas = trimCanvasBottom(raw)
      const drawH = Math.min((canvas.height * drawW) / canvas.width, pgH - margin * 2)
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, drawW, drawH)
    }
    doc.save(pdfFileName)
  }

  return (
    <div className="zr-doc-backdrop" role="dialog" aria-modal="true">
      <div className="zr-doc-modal">
        <div className="zr-doc-modal-header">
          <div className="d-flex align-items-center gap-3">
            <div>
              <h5 className="mb-0">Report View</h5>
              <small>Complete report details in document layout</small>
            </div>
          </div>
          {/* Patient record navigator — single pill */}
          {(onPrev || onNext) && (
            <div
              className="d-flex align-items-center zr-nav-pill"
              style={{ border: '1.5px solid #dee2e6', borderRadius: 30, overflow: 'hidden' }}
            >
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev || isLoading}
                title="Previous record"
                style={{
                  border: 'none',
                  background: hasPrev ? '#f8f9fa' : '#fff',
                  padding: '5px 14px',
                  cursor: hasPrev ? 'pointer' : 'default',
                  color: hasPrev ? '#212529' : '#adb5bd',
                  fontWeight: 700,
                  fontSize: 16,
                  borderRight: '1.5px solid #dee2e6',
                  lineHeight: 1,
                }}
              >&lt;</button>

              <span style={{ padding: '4px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: '#212529' }}>
                {recordLabel ?? 'Patient Record'}
              </span>

              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext || isLoading}
                title="Next record"
                style={{
                  border: 'none',
                  background: hasNext ? '#f8f9fa' : '#fff',
                  padding: '5px 14px',
                  cursor: hasNext ? 'pointer' : 'default',
                  color: hasNext ? '#212529' : '#adb5bd',
                  fontWeight: 700,
                  fontSize: 16,
                  borderLeft: '1.5px solid #dee2e6',
                  lineHeight: 1,
                }}
              >&gt;</button>
            </div>
          )}
          <div className="zr-doc-actions">
            <div className="zr-doc-zoom-controls" aria-label="Document zoom controls">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary zr-doc-zoom-btn"
                onClick={() => adjustZoom(-0.1)}
                disabled={isLoading}
                aria-label="Zoom out"
                title="Zoom out"
              >
                <i className="bi bi-zoom-out"></i>
              </button>
              <span className="zr-doc-zoom-label">{Math.round(docZoom * 100)}%</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary zr-doc-zoom-btn"
                onClick={() => adjustZoom(0.1)}
                disabled={isLoading}
                aria-label="Zoom in"
                title="Zoom in"
              >
                <i className="bi bi-zoom-in"></i>
              </button>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={handleDownloadReportPdf}
              disabled={!report || isLoading}
            >
              <i className="bi bi-file-earmark-pdf me-1"></i>
              Download PDF
            </button>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
        </div>

        <div className="zr-doc-modal-body">
          {isLoading && <p className="zr-doc-loading mb-0 p-4">Loading report details...</p>}
          {!isLoading && !report && <p className="zr-doc-loading mb-0 p-4">Unable to load report details.</p>}
          {!isLoading && report && (
            <div
              ref={pcrContainerRef}
              className="zr-doc-zoom-surface"
              style={{
                transform: `scale(${docZoom})`,
                transformOrigin: 'top left',
                width: `${100 / docZoom}%`,
              }}
            >
              {report.report_type === 'Incident' ? (
                <IncidentReportView data={{
                  zone: geographicName,
                  typeOfIncident: incidentDetail?.type_of_incident ?? '',
                  hazard: incidentDetail?.type_of_hazard ?? '',
                  severityLevel: incidentDetail?.severity_level ?? '',
                  barangay: incidentDetail?.incident_barangay ?? '',
                  date: incidentDetail?.incident_date ?? report.date_reported,
                  time: incidentDetail?.incident_time ?? report.time_reported,
                  persons: clients.map((c, idx) => ({
                    id: idx + 1,
                    name: c.full_name ?? '',
                    age: c.age != null ? String(c.age) : '',
                    gender: c.gender ?? '',
                    contactNumber: c.contact_number ?? '',
                    address: c.permanent_address ?? '',
                  })),
                  ambulanceDriver: (report.ambulanceTransfer ?? report.ambulance_transfer)?.ambulance_driver ?? '',
                  dispatcher: (report.ambulanceTransfer ?? report.ambulance_transfer)?.dispatcher ?? '',
                  responders: (report.ambulanceTransfer ?? report.ambulance_transfer)?.responders ?? responders.join(', '),
                  photoUrl: photos.length > 0 ? resolvePhotoUrl(photos[0].photo_path) : null,
                }} />
              ) : (
                <PatientCareReportView
                  data={{
                    reportId: report.id,
                    reportType: report.report_type,
                    zone: geographicName,
                    patientName: primaryClient?.full_name ?? '',
                    age: primaryClient?.age !== null && primaryClient?.age !== undefined ? String(primaryClient.age) : '',
                    gender: primaryClient?.gender ?? '',
                    nationality: primaryClient?.nationality ?? '',
                    contactNumber: primaryClient?.contact_number ?? '',
                    permanentAddress: primaryClient?.permanent_address ?? '',
                    locationOfIncident: primaryClient?.incident_address ?? '',
                    accidentType: primaryClient?.accident_type ?? '',
                    date: detail?.incident_date ?? report.date_reported,
                    timeOfCall: detail?.incident_time ?? report.time_reported,
                    natureOfCall: detail?.nature_of_call ?? '',
                    typeOfEmergency: detail?.type_of_emergency ?? '',
                    natureOfIllness: detail?.nature_of_illness ?? '',
                    mechanismOfInjury: detail?.mechanism_of_injury ?? '',
                    chiefComplaint: primaryAssessment?.chief_complaint ?? '',
                    loc: primaryAssessment?.loc ?? '',
                    airway: primaryAssessment?.airway ?? '',
                    breathing: primaryAssessment?.breathing ?? '',
                    circulation: primaryAssessment?.circulation ?? primaryAssessment?.circulation_support ?? '',
                    capillaryRefill: primaryAssessment?.capillary_refill ?? '',
                    pupils: primaryAssessment?.pupils ?? '',
                    obLmp: primaryAssessment?.ob_lmp ?? '',
                    obAog: primaryAssessment?.ob_aog ?? '',
                    obEdd: primaryAssessment?.ob_edd ?? '',
                    obGravida: primaryAssessment?.ob_gravida !== null && primaryAssessment?.ob_gravida !== undefined ? String(primaryAssessment.ob_gravida) : '',
                    obPara: primaryAssessment?.ob_para !== null && primaryAssessment?.ob_para !== undefined ? String(primaryAssessment.ob_para) : '',
                    obTerm: primaryAssessment?.ob_term !== null && primaryAssessment?.ob_term !== undefined ? String(primaryAssessment.ob_term) : '',
                    obPreterm: primaryAssessment?.ob_preterm !== null && primaryAssessment?.ob_preterm !== undefined ? String(primaryAssessment.ob_preterm) : '',
                    obAbortion: primaryAssessment?.ob_abortion !== null && primaryAssessment?.ob_abortion !== undefined ? String(primaryAssessment.ob_abortion) : '',
                    obLiving: primaryAssessment?.ob_living !== null && primaryAssessment?.ob_living !== undefined ? String(primaryAssessment.ob_living) : '',
                    vitalSigns: (primaryAssessment?.vitalSigns ?? primaryAssessment?.vital_signs ?? []).map(vs => ({
                      bp: vs.bp ?? '', rr: vs.rr ?? '', pr: vs.pr ?? '', temp: vs.temp ?? '', spo2: vs.spo2 ?? '',
                    })),
                    glasgowScores: (primaryAssessment?.glasgowScores ?? primaryAssessment?.glasgow_scores ?? []).map(g => ({
                      eye: g.eye !== null && g.eye !== undefined ? String(g.eye) : '',
                      verbal: g.verbal !== null && g.verbal !== undefined ? String(g.verbal) : '',
                      motor: g.motor !== null && g.motor !== undefined ? String(g.motor) : '',
                    })),
                    ambulanceDriver: (report.ambulanceTransfer ?? report.ambulance_transfer)?.ambulance_driver ?? '',
                    dispatcher: (report.ambulanceTransfer ?? report.ambulance_transfer)?.dispatcher ?? '',
                    responders: (report.ambulanceTransfer ?? report.ambulance_transfer)?.responders ?? responders.join(', '),
                    receivingFacility: (report.ambulanceTransfer ?? report.ambulance_transfer)?.receiving_facility ?? '',
                    receivingPersonnel: (report.ambulanceTransfer ?? report.ambulance_transfer)?.receiving_personnel ?? '',
                    photoUrl: photos.length > 0 ? resolvePhotoUrl(photos[0].photo_path) : null,
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Hidden off-screen render at 740px — used for PDF capture */}
        {report && (
          <div ref={hiddenCaptureRef} style={{ position: 'absolute', left: -9999, top: 0, width: 740, pointerEvents: 'none' }} aria-hidden="true">
            {report.report_type === 'Incident' ? (
              <IncidentReportView data={{
                zone: geographicName,
                typeOfIncident: incidentDetail?.type_of_incident ?? '',
                hazard: incidentDetail?.type_of_hazard ?? '',
                severityLevel: incidentDetail?.severity_level ?? '',
                barangay: incidentDetail?.incident_barangay ?? '',
                date: incidentDetail?.incident_date ?? report.date_reported,
                time: incidentDetail?.incident_time ?? report.time_reported,
                persons: clients.map((c, idx) => ({
                  id: idx + 1,
                  name: c.full_name ?? '',
                  gender: c.gender ?? '',
                  contactNumber: c.contact_number ?? '',
                  address: c.permanent_address ?? '',
                })),
                ambulanceDriver: (report.ambulanceTransfer ?? report.ambulance_transfer)?.ambulance_driver ?? '',
                dispatcher: (report.ambulanceTransfer ?? report.ambulance_transfer)?.dispatcher ?? '',
                responders: (report.ambulanceTransfer ?? report.ambulance_transfer)?.responders ?? responders.join(', '),
                photoUrl: photos.length > 0 ? resolvePhotoUrl(photos[0].photo_path) : null,
              }} />
            ) : (
              <PatientCareReportView
                data={{
                  reportId: report.id,
                  reportType: report.report_type,
                  zone: geographicName,
                  patientName: primaryClient?.full_name ?? '',
                  age: primaryClient?.age !== null && primaryClient?.age !== undefined ? String(primaryClient.age) : '',
                  gender: primaryClient?.gender ?? '',
                  nationality: primaryClient?.nationality ?? '',
                  contactNumber: primaryClient?.contact_number ?? '',
                  permanentAddress: primaryClient?.permanent_address ?? '',
                  locationOfIncident: primaryClient?.incident_address ?? '',
                  accidentType: primaryClient?.accident_type ?? '',
                  date: detail?.incident_date ?? report.date_reported,
                  timeOfCall: detail?.incident_time ?? report.time_reported,
                  natureOfCall: detail?.nature_of_call ?? '',
                  typeOfEmergency: detail?.type_of_emergency ?? '',
                  natureOfIllness: detail?.nature_of_illness ?? '',
                  mechanismOfInjury: detail?.mechanism_of_injury ?? '',
                  chiefComplaint: primaryAssessment?.chief_complaint ?? '',
                  loc: primaryAssessment?.loc ?? '',
                  airway: primaryAssessment?.airway ?? '',
                  breathing: primaryAssessment?.breathing ?? '',
                  circulation: primaryAssessment?.circulation ?? primaryAssessment?.circulation_support ?? '',
                  capillaryRefill: primaryAssessment?.capillary_refill ?? '',
                  pupils: primaryAssessment?.pupils ?? '',
                  obLmp: primaryAssessment?.ob_lmp ?? '',
                  obAog: primaryAssessment?.ob_aog ?? '',
                  obEdd: primaryAssessment?.ob_edd ?? '',
                  obGravida: primaryAssessment?.ob_gravida != null ? String(primaryAssessment.ob_gravida) : '',
                  obPara: primaryAssessment?.ob_para != null ? String(primaryAssessment.ob_para) : '',
                  obTerm: primaryAssessment?.ob_term != null ? String(primaryAssessment.ob_term) : '',
                  obPreterm: primaryAssessment?.ob_preterm != null ? String(primaryAssessment.ob_preterm) : '',
                  obAbortion: primaryAssessment?.ob_abortion != null ? String(primaryAssessment.ob_abortion) : '',
                  obLiving: primaryAssessment?.ob_living != null ? String(primaryAssessment.ob_living) : '',
                  vitalSigns: (primaryAssessment?.vitalSigns ?? primaryAssessment?.vital_signs ?? []).map(vs => ({ bp: vs.bp ?? '', rr: vs.rr ?? '', pr: vs.pr ?? '', temp: vs.temp ?? '', spo2: vs.spo2 ?? '' })),
                  glasgowScores: (primaryAssessment?.glasgowScores ?? primaryAssessment?.glasgow_scores ?? []).map(g => ({ eye: g.eye != null ? String(g.eye) : '', verbal: g.verbal != null ? String(g.verbal) : '', motor: g.motor != null ? String(g.motor) : '' })),
                  ambulanceDriver: (report.ambulanceTransfer ?? report.ambulance_transfer)?.ambulance_driver ?? '',
                  dispatcher: (report.ambulanceTransfer ?? report.ambulance_transfer)?.dispatcher ?? '',
                  responders: (report.ambulanceTransfer ?? report.ambulance_transfer)?.responders ?? responders.join(', '),
                  receivingFacility: (report.ambulanceTransfer ?? report.ambulance_transfer)?.receiving_facility ?? '',
                  receivingPersonnel: (report.ambulanceTransfer ?? report.ambulance_transfer)?.receiving_personnel ?? '',
                  photoUrl: photos.length > 0 ? resolvePhotoUrl(photos[0].photo_path) : null,
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
