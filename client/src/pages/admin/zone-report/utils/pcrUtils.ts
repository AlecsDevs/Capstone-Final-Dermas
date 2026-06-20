import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { PatientCareReportViewData } from '../views/PatientCareReportView'
import type { IncidentReportViewData } from '../views/IncidentReportView'
import type { ReportDocumentData } from '../components/ReportDocumentModal'

/* ── canvas helper ─────────────────────────────────── */
export function trimCanvasBottom(canvas: HTMLCanvasElement, padding = 20): HTMLCanvasElement {
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

/* ── photo URL resolver ────────────────────────────── */
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')
const encodePathSegments = (v: string) => v.split('/').map(encodeURIComponent).join('/')

function resolvePhoto(path?: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (window.location.protocol === 'https:' && path.startsWith('http://'))
      return `https://${path.slice('http://'.length)}`
    return path
  }
  if (path.startsWith('data:') || path.startsWith('blob:')) return path
  const rel = path.replace(/^\/?storage\//, '')
  if (rel !== path) return `${API_BASE_URL}/files/public/${encodePathSegments(rel)}`
  if (!path.startsWith('/')) return `${API_BASE_URL}/files/public/${encodePathSegments(path)}`
  return `${SERVER_BASE_URL}${path}`
}

/* ── build PCR view data from API report ───────────── */
export function buildPcrData(report: ReportDocumentData): PatientCareReportViewData {
  const client = report.clients?.[0]
  const a = client?.assessment
  const emergencyDetail = report.emergencyDetails ?? report.emergency_details
  const incidentDetail = report.incidentDetails ?? report.incident_details
  const detail = report.report_type === 'Emergency' ? emergencyDetail : incidentDetail
  const transfer = report.ambulanceTransfer ?? report.ambulance_transfer
  const responders = (report.responders ?? []).map(r => r.name).filter(Boolean).join(', ')

  const vitalSigns = (a?.vital_signs ?? a?.vitalSigns ?? []).map(v => ({
    bp: String(v.bp ?? ''), rr: String(v.rr ?? ''), pr: String(v.pr ?? ''),
    temp: String(v.temp ?? ''), spo2: String(v.spo2 ?? ''),
  }))
  const glasgowScores = (a?.glasgow_scores ?? a?.glasgowScores ?? []).map(g => ({
    eye: String(g.eye ?? ''), verbal: String(g.verbal ?? ''), motor: String(g.motor ?? ''),
  }))

  return {
    reportId: report.id,
    reportType: report.report_type as 'Emergency' | 'Incident',
    patientName: client?.full_name ?? '',
    age: client?.age != null ? String(client.age) : '',
    gender: client?.gender ?? '',
    nationality: client?.nationality ?? '',
    contactNumber: client?.contact_number ?? '',
    permanentAddress: client?.permanent_address ?? '',
    locationOfIncident: client?.incident_address ?? '',
    accidentType: client?.accident_type ?? '',
    date: report.date_reported ?? '',
    timeOfCall: report.time_reported ?? '',
    natureOfCall: detail?.nature_of_call ?? '',
    typeOfEmergency: emergencyDetail?.type_of_emergency ?? '',
    natureOfIllness: emergencyDetail?.nature_of_illness ?? '',
    mechanismOfInjury: emergencyDetail?.mechanism_of_injury ?? '',
    chiefComplaint: a?.chief_complaint ?? '',
    loc: a?.loc ?? '',
    airway: a?.airway ?? '',
    breathing: a?.breathing ?? '',
    circulation: a?.circulation_support ?? a?.circulation ?? '',
    capillaryRefill: a?.capillary_refill ?? '',
    pupils: a?.pupils ?? '',
    obLmp: a?.ob_lmp ?? '',
    obAog: a?.ob_aog ?? '',
    obEdd: a?.ob_edd ?? '',
    obGravida: a?.ob_gravida != null ? String(a.ob_gravida) : '',
    obPara: a?.ob_para != null ? String(a.ob_para) : '',
    obTerm: a?.ob_term != null ? String(a.ob_term) : '',
    obPreterm: a?.ob_preterm != null ? String(a.ob_preterm) : '',
    obAbortion: a?.ob_abortion != null ? String(a.ob_abortion) : '',
    obLiving: a?.ob_living != null ? String(a.ob_living) : '',
    vitalSigns: vitalSigns.length > 0 ? vitalSigns : [{ bp: '', rr: '', pr: '', temp: '', spo2: '' }],
    glasgowScores: glasgowScores.length > 0 ? glasgowScores : [{ eye: '', verbal: '', motor: '' }],
    ambulanceDriver: transfer?.ambulance_driver ?? '',
    dispatcher: transfer?.dispatcher ?? '',
    responders,
    receivingFacility: transfer?.receiving_facility ?? '',
    receivingPersonnel: transfer?.receiving_personnel ?? '',
    photoUrl: resolvePhoto(report.photos?.[0]?.photo_path),
  }
}

/* ── build Incident view data from API report ───────── */
export function buildIncidentViewData(report: ReportDocumentData): IncidentReportViewData {
  const incidentDetail = report.incidentDetails ?? report.incident_details
  const transfer = report.ambulanceTransfer ?? report.ambulance_transfer
  const respondersStr = (report.responders ?? []).map(r => r.name).filter(Boolean).join(', ')
  const clients = report.clients ?? []
  const geographicName = report.geographicType?.name ?? report.geographic_type?.name ?? ''

  return {
    zone: geographicName,
    typeOfIncident: incidentDetail?.type_of_incident ?? '',
    hazard: incidentDetail?.type_of_hazard ?? '',
    severityLevel: incidentDetail?.severity_level ?? '',
    barangay: incidentDetail?.incident_barangay ?? '',
    date: incidentDetail?.incident_date ?? report.date_reported ?? '',
    time: incidentDetail?.incident_time ?? report.time_reported ?? '',
    persons: clients.map((c, idx) => ({
      id: idx + 1,
      name: c.full_name ?? '',
      age: c.age != null ? String(c.age) : '',
      gender: c.gender ?? '',
      contactNumber: c.contact_number ?? '',
      address: c.permanent_address ?? '',
    })),
    ambulanceDriver: transfer?.ambulance_driver ?? '',
    dispatcher: transfer?.dispatcher ?? '',
    responders: transfer?.responders ?? respondersStr,
    photoUrl: resolvePhoto(report.photos?.[0]?.photo_path),
  }
}

/* ── capture helper: strip decorative styles, render pages to jsPDF ── */
async function capturePagesToPdf(container: HTMLElement, pageClass: string): Promise<jsPDF> {
  const pages = container.querySelectorAll<HTMLElement>(pageClass)
  const pgW = 215.9; const pgH = 279.4; const margin = 6; const drawW = pgW - margin * 2
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
  return doc
}

/* ── generate single PDF from a rendered .pcr-page container ── */
export async function capturePcrToPdf(container: HTMLElement): Promise<jsPDF> {
  return capturePagesToPdf(container, '.pcr-page')
}

/* ── generate single PDF from a rendered .incident-page container ── */
export async function captureIncidentToPdf(container: HTMLElement): Promise<jsPDF> {
  return capturePagesToPdf(container, '.incident-page')
}
