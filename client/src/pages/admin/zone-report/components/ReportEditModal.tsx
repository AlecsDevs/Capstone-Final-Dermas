import { useEffect, useState } from 'react'
import type { ReportDocumentData } from './ReportDocumentModal'
import { PatientCareReportView } from '../views/PatientCareReportView'
import { IncidentReportView } from '../views/IncidentReportView'
import { ClientInformationStep } from '../steps/ClientInformationStep'
import { EmergencyIncidentDetailsStep } from '../steps/EmergencyIncidentDetailsStep'
import { IncidentReportDetailsStep } from '../steps/IncidentReportDetailsStep'
import { AssessmentCareStep } from '../steps/AssessmentCareStep'
import { AmbulanceTransferStep } from '../steps/AmbulanceTransferStep'
import {
  createEmptyPerson,
  createEmptyPersonForm,
  createEmptyVitalSign,
  createEmptyGlasgow,
  type PersonInfo,
  type PersonFormData,
  type VitalSignRow,
  type GlasgowRow,
} from '../../../../types/zoneReport'
import { normalizeNabuaLocation } from '../data/nabuaBarangays'

export interface EditReportPayload {
  date_reported: string
  time_reported: string
  client_full_name: string
  client_age: string
  client_gender: string
  client_nationality: string
  client_contact_number: string
  client_permanent_address: string
  client_incident_address: string
  client_accident_type?: string
  nature_of_call?: string
  type_of_emergency?: string
  type_of_incident?: string
  type_of_hazard?: string
  severity_level?: string
  incident_barangay?: string
  nature_of_illness?: string
  mechanism_of_injury?: string
  incident_date?: string
  incident_time?: string
  assessment?: string
  loc?: string
  airway?: string
  breathing?: string
  circulation?: string
  capillary_refill?: string
  pupils?: string
  wound_care?: string
  miscellaneous?: string
  coronary?: string
  collapse_witness?: string
  time_of_collapse?: string
  start_of_cpr?: string
  defibrillation_time?: string
  cpr_duration?: string
  rosc?: string
  transferred_to_hospital?: string
  vital_signs?: VitalSignRow[]
  glasgow_scores?: GlasgowRow[]
  ob_lmp?: string
  ob_aog?: string
  ob_edd?: string
  ob_gravida?: string
  ob_para?: string
  ob_term?: string
  ob_preterm?: string
  ob_abortion?: string
  ob_living?: string
  ambulance_driver?: string
  dispatcher?: string
  responders?: string
  receiving_facility?: string
  receiving_personnel?: string
  photo_file?: File | null
  all_clients?: Array<{
    full_name: string; age: number | null; gender: string
    contact_number: string | null; permanent_address: string | null
    accident_type?: string | null
  }>
}

interface ReportEditModalProps {
  report: ReportDocumentData | null
  isSaving: boolean
  onClose: () => void
  onSave: (payload: EditReportPayload) => Promise<void>
}

const toDateInput = (v?: string | null) => v?.slice(0, 10) ?? ''
const toHHMM = (v?: string | null) => {
  if (!v) return ''
  const m = v.match(/^(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : ''
}

const _RAW_API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
const API_BASE_URL = _RAW_API_BASE
  ? (/^https?:\/\/[^/]+$/i.test(_RAW_API_BASE) ? `${_RAW_API_BASE}/api` : _RAW_API_BASE)
  : '/api'
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')
const encodePathSegments = (v: string) => v.split('/').map(encodeURIComponent).join('/')

const resolvePhotoUrl = (path?: string | null) => {
  if (!path) return ''
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

function EditSection({
  icon, color, label, defaultOpen = true, children,
}: {
  icon: string
  color: string
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid #e9ecef' }}>
      <button
        type="button"
        className="w-100 d-flex align-items-center justify-content-between text-start"
        style={{
          border: 'none',
          borderLeft: `4px solid ${color}`,
          background: open ? '#fff' : '#fafbfc',
          padding: '13px 16px',
          cursor: 'pointer',
          outline: 'none',
        }}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="d-flex align-items-center gap-2">
          <span
            className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
            style={{ width: 30, height: 30, background: `${color}18` }}
          >
            <i className={`bi bi-${icon}`} style={{ color, fontSize: 15 }} />
          </span>
          <span className="fw-semibold" style={{ fontSize: 14 }}>{label}</span>
        </span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'} text-muted`} style={{ fontSize: 13 }} />
      </button>
      {open && (
        <div className="zr-form-body" style={{ padding: '0 4px 8px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

const splitFullName = (full: string): Pick<PersonInfo, 'firstName' | 'middleName' | 'lastName'> => {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' }
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] }
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), lastName: parts[parts.length - 1] }
}

type EditTab = 'system' | 'document'

export function ReportEditModal({ report, isSaving, onClose, onSave }: ReportEditModalProps) {
  const [tab, setTab] = useState<EditTab>('system')
  const [docEditMode, setDocEditMode] = useState(false)
  const [dateReported, setDateReported] = useState('')
  const [timeReported, setTimeReported] = useState('')
  const [editPerson, setEditPerson] = useState<PersonInfo>(createEmptyPerson)
  const [editPersonsList, setEditPersonsList] = useState<PersonInfo[]>([createEmptyPerson()])
  const [editPf, setEditPf] = useState<PersonFormData>(createEmptyPersonForm)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const isEmergency = report?.report_type === 'Emergency'
  const emergencyDetail = report?.emergencyDetails ?? report?.emergency_details
  const incidentDetail = report?.incidentDetails ?? report?.incident_details
  const detail = isEmergency ? emergencyDetail : incidentDetail
  const transfer = report?.ambulanceTransfer ?? report?.ambulance_transfer

  useEffect(() => {
    if (!report) return
    const client = report.clients?.[0]
    const a = client?.assessment

    setDateReported(toDateInput(report.date_reported))
    setTimeReported(toHHMM(report.time_reported))

    const nameParts = splitFullName(client?.full_name ?? '')
    const primaryPerson: PersonInfo = {
      firstName: nameParts.firstName,
      middleName: nameParts.middleName,
      lastName: nameParts.lastName,
      age: client?.age != null ? String(client.age) : '',
      gender: client?.gender ?? '',
      nationality: client?.nationality ?? 'Filipino',
      contactNumber: client?.contact_number ?? '',
      permanentAddress: client?.permanent_address ?? '',
      incidentLocation: client?.incident_address ?? '',
      accidentType: client?.accident_type ?? '',
      latitude: '',
      longitude: '',
    }
    setEditPerson(primaryPerson)

    // For incident reports, load all clients into the persons list
    const allClients = report.clients ?? []
    setEditPersonsList(
      allClients.length > 0
        ? allClients.map((c, idx) => {
            if (idx === 0) return primaryPerson
            const np = splitFullName(c.full_name ?? '')
            return {
              firstName: np.firstName, middleName: np.middleName, lastName: np.lastName,
              age: c.age != null ? String(c.age) : '',
              gender: c.gender ?? '', nationality: c.nationality ?? 'Filipino',
              contactNumber: c.contact_number ?? '',
              permanentAddress: c.permanent_address ?? '',
              incidentLocation: c.incident_address ?? '',
              accidentType: c.accident_type ?? '',
              latitude: '',
              longitude: '',
            }
          })
        : [primaryPerson]
    )

    const vitalSigns = (a?.vital_signs ?? a?.vitalSigns ?? [createEmptyVitalSign()])
      .map(v => ({
        bp: String(v.bp ?? ''), rr: String(v.rr ?? ''), pr: String(v.pr ?? ''),
        temp: String(v.temp ?? ''), spo2: String(v.spo2 ?? ''),
      }))
    const glasgowScores = (a?.glasgow_scores ?? a?.glasgowScores ?? [createEmptyGlasgow()])
      .map(g => ({
        eye: String(g.eye ?? ''), verbal: String(g.verbal ?? ''), motor: String(g.motor ?? ''),
      }))

    setEditPf({
      incidentDate: toDateInput(detail?.incident_date),
      incidentTime: toHHMM(detail?.incident_time),
      typeEmergency: emergencyDetail?.type_of_emergency ?? '',
      typeOfIncident: incidentDetail?.type_of_incident ?? '',
      typeOfHazard: incidentDetail?.type_of_hazard ?? '',
      severityLevel: incidentDetail?.severity_level ?? '',
      incidentBarangay: incidentDetail?.incident_barangay ?? '',
      natureOfCall: detail?.nature_of_call ?? '',
      mechanism: emergencyDetail?.mechanism_of_injury ?? '',
      natureIllness: emergencyDetail?.nature_of_illness ?? '',
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
      vitalSigns: vitalSigns.length > 0 ? vitalSigns : [createEmptyVitalSign()],
      glasgowScores: glasgowScores.length > 0 ? glasgowScores : [createEmptyGlasgow()],
      ambulanceDriver: transfer?.ambulance_driver ?? '',
      dispatcher: transfer?.dispatcher ?? '',
      ambulanceResponders: transfer?.responders ?? (report.responders ?? []).map(r => r.name).filter(Boolean).join(', '),
      receivingFacility: transfer?.receiving_facility ?? '',
      receivingPersonnel: transfer?.receiving_personnel ?? '',
      uploadedPhoto: null,
    })

    setPreviewPhoto(report.photos?.[0]?.photo_path ?? null)
    setPhotoFile(null)
    setDocEditMode(false)
  }, [report?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── handlers ─────────────────────────── */
  const updatePerson = (_: number, key: keyof PersonInfo, value: string) =>
    setEditPerson(prev => ({ ...prev, [key]: value }))

  const updatePf = (key: string, value: string) =>
    setEditPf(prev => ({ ...prev, [key]: value }))

  const updateVitalSign = (_: number, rowIdx: number, key: keyof VitalSignRow, value: string) =>
    setEditPf(prev => {
      const vs = [...prev.vitalSigns]; vs[rowIdx] = { ...vs[rowIdx], [key]: value }
      return { ...prev, vitalSigns: vs }
    })

  const addVitalSign = () =>
    setEditPf(prev => ({ ...prev, vitalSigns: [...prev.vitalSigns, createEmptyVitalSign()] }))

  const removeVitalSign = (_: number, rowIdx: number) =>
    setEditPf(prev => {
      if (prev.vitalSigns.length === 1) return prev
      return { ...prev, vitalSigns: prev.vitalSigns.filter((_, i) => i !== rowIdx) }
    })

  const updateGlasgow = (_: number, rowIdx: number, key: keyof GlasgowRow, value: string) =>
    setEditPf(prev => {
      const gs = [...prev.glasgowScores]; gs[rowIdx] = { ...gs[rowIdx], [key]: value }
      return { ...prev, glasgowScores: gs }
    })

  const addGlasgow = () =>
    setEditPf(prev => ({ ...prev, glasgowScores: [...prev.glasgowScores, createEmptyGlasgow()] }))

  const removeGlasgow = (_: number, rowIdx: number) =>
    setEditPf(prev => {
      if (prev.glasgowScores.length === 1) return prev
      return { ...prev, glasgowScores: prev.glasgowScores.filter((_, i) => i !== rowIdx) }
    })

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPreviewPhoto((ev.target?.result as string) ?? null)
    reader.readAsDataURL(file)
  }

  /* ── build payload ─────────────────────── */
  const buildPayload = (): EditReportPayload => {
    const fullName = [editPerson.firstName, editPerson.middleName, editPerson.lastName]
      .map(s => s.trim()).filter(Boolean).join(' ')
    return {
      date_reported: dateReported,
      time_reported: timeReported,
      client_full_name: fullName,
      client_age: editPerson.age,
      client_gender: editPerson.gender,
      client_nationality: editPerson.nationality,
      client_contact_number: editPerson.contactNumber,
      client_permanent_address: editPerson.permanentAddress,
      client_incident_address: normalizeNabuaLocation(editPerson.incidentLocation),
      client_accident_type: editPerson.accidentType || undefined,
      nature_of_call: editPf.natureOfCall || undefined,
      type_of_emergency: editPf.typeEmergency || undefined,
      type_of_incident: editPf.typeOfIncident || undefined,
      type_of_hazard: editPf.typeOfHazard || undefined,
      severity_level: editPf.severityLevel || undefined,
      incident_barangay: editPf.incidentBarangay || undefined,
      nature_of_illness: editPf.natureIllness || undefined,
      mechanism_of_injury: editPf.mechanism || undefined,
      incident_date: editPf.incidentDate || undefined,
      incident_time: editPf.incidentTime || undefined,
      assessment: editPf.chiefComplaint,
      loc: editPf.loc || undefined,
      airway: editPf.airway || undefined,
      breathing: editPf.breathing || undefined,
      circulation: editPf.circulation || undefined,
      capillary_refill: editPf.capillaryRefill || undefined,
      pupils: editPf.pupils || undefined,
      vital_signs: editPf.vitalSigns.filter(v => v.bp || v.rr || v.pr || v.temp || v.spo2),
      glasgow_scores: editPf.glasgowScores.filter(g => g.eye || g.verbal || g.motor),
      ob_lmp: editPf.obLmp || undefined,
      ob_aog: editPf.obAog || undefined,
      ob_edd: editPf.obEdd || undefined,
      ob_gravida: editPf.obGravida || undefined,
      ob_para: editPf.obPara || undefined,
      ob_term: editPf.obTerm || undefined,
      ob_preterm: editPf.obPreterm || undefined,
      ob_abortion: editPf.obAbortion || undefined,
      ob_living: editPf.obLiving || undefined,
      ambulance_driver: editPf.ambulanceDriver || undefined,
      dispatcher: editPf.dispatcher || undefined,
      responders: editPf.ambulanceResponders || undefined,
      receiving_facility: editPf.receivingFacility || undefined,
      receiving_personnel: editPf.receivingPersonnel || undefined,
      photo_file: photoFile,
      all_clients: isEmergency ? undefined : editPersonsList.map(p => ({
        full_name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '),
        age: p.age ? Number(p.age) : null,
        gender: p.gender,
        contact_number: p.contactNumber || null,
        permanent_address: p.permanentAddress || null,
        nationality: null,
        incident_address: null,
        accident_type: p.accidentType || null,
      })),
    }
  }

  const addIncidentPerson = () =>
    setEditPersonsList(prev => [...prev, createEmptyPerson()])

  const removeIncidentPerson = (idx: number) =>
    setEditPersonsList(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  const updateIncidentPerson = (idx: number, key: keyof PersonInfo, value: string) => {
    setEditPersonsList(prev => {
      const next = [...prev]; next[idx] = { ...next[idx], [key]: value }; return next
    })
    if (idx === 0) setEditPerson(p => ({ ...p, [key]: value }))
  }

  /* ── inline edit for incident Full Document tab ── */
  const handleIncidentDocFieldEdit = (fieldKey: string, value: string) => {
    switch (fieldKey) {
      case 'hazard':         updatePf('typeOfHazard', value); break
      case 'severityLevel':  updatePf('severityLevel', value); break
      case 'barangay':       updatePf('incidentBarangay', value); break
      case 'date':           updatePf('incidentDate', value); break
      case 'time':           updatePf('incidentTime', value); break
      case 'ambulanceDriver':updatePf('ambulanceDriver', value); break
      case 'dispatcher':     updatePf('dispatcher', value); break
      case 'responders':     updatePf('ambulanceResponders', value); break
      default: {
        const m = fieldKey.match(/^person_(\d+)_(.+)$/)
        if (!m) break
        const pi = parseInt(m[1]); const f = m[2]
        if (f === 'firstName')       updateIncidentPerson(pi, 'firstName', value)
        else if (f === 'middleName') updateIncidentPerson(pi, 'middleName', value)
        else if (f === 'lastName')   updateIncidentPerson(pi, 'lastName', value)
        else if (f === 'age')        updateIncidentPerson(pi, 'age', value)
        else if (f === 'gender')     updateIncidentPerson(pi, 'gender', value)
        else if (f === 'contact')    updateIncidentPerson(pi, 'contactNumber', value)
        else if (f === 'address')    updateIncidentPerson(pi, 'permanentAddress', value)
      }
    }
  }

  /* ── inline edit for Full Document tab ── */
  const handleDocFieldEdit = (fieldKey: string, value: string) => {
    switch (fieldKey) {
      case 'patientName':        setEditPerson(p => ({ ...p, firstName: value })); break
      case 'age':                setEditPerson(p => ({ ...p, age: value })); break
      case 'gender':             setEditPerson(p => ({ ...p, gender: value })); break
      case 'nationality':        setEditPerson(p => ({ ...p, nationality: value })); break
      case 'contactNumber':      setEditPerson(p => ({ ...p, contactNumber: value })); break
      case 'permanentAddress':   setEditPerson(p => ({ ...p, permanentAddress: value })); break
      case 'locationOfIncident': setEditPerson(p => ({ ...p, incidentLocation: value })); break
      case 'natureOfCall':       updatePf('natureOfCall', value); break
      case 'typeOfEmergency':    updatePf(isEmergency ? 'typeEmergency' : 'typeOfHazard', value); break
      case 'natureOfIllness':    updatePf('natureIllness', value); break
      case 'mechanismOfInjury':  updatePf('mechanism', value); break
      case 'chiefComplaint':     updatePf('chiefComplaint', value); break
      case 'loc':                updatePf('loc', value); break
      case 'airway':             updatePf('airway', value); break
      case 'breathing':          updatePf('breathing', value); break
      case 'circulation':        updatePf('circulation', value); break
      case 'capillaryRefill':    updatePf('capillaryRefill', value); break
      case 'pupils':             updatePf('pupils', value); break
      case 'ambulanceDriver':    updatePf('ambulanceDriver', value); break
      case 'dispatcher':         updatePf('dispatcher', value); break
      case 'responders':         updatePf('ambulanceResponders', value); break
      case 'receivingFacility':  updatePf('receivingFacility', value); break
      case 'receivingPersonnel': updatePf('receivingPersonnel', value); break
      default: {
        const vsMatch = fieldKey.match(/^vs_(\d+)_(.+)$/)
        if (vsMatch) { updateVitalSign(0, parseInt(vsMatch[1]), vsMatch[2] as keyof VitalSignRow, value); break }
        const gcsMatch = fieldKey.match(/^gcs_(\d+)_(.+)$/)
        if (gcsMatch) { updateGlasgow(0, parseInt(gcsMatch[1]), gcsMatch[2] as keyof GlasgowRow, value) }
      }
    }
  }

  if (!report) return null

  const fullName = [editPerson.firstName, editPerson.middleName, editPerson.lastName]
    .map(s => s.trim()).filter(Boolean).join(' ')

  const pcrData = {
    reportType: report.report_type as 'Emergency' | 'Incident',
    patientName: fullName,
    age: editPerson.age,
    gender: editPerson.gender,
    nationality: editPerson.nationality,
    contactNumber: editPerson.contactNumber,
    permanentAddress: editPerson.permanentAddress,
    locationOfIncident: editPerson.incidentLocation,
    date: report.date_reported,
    timeOfCall: report.time_reported,
    natureOfCall: editPf.natureOfCall,
    typeOfEmergency: isEmergency ? editPf.typeEmergency : editPf.typeOfHazard,
    natureOfIllness: editPf.natureIllness,
    mechanismOfInjury: editPf.mechanism,
    chiefComplaint: editPf.chiefComplaint,
    loc: editPf.loc,
    airway: editPf.airway,
    breathing: editPf.breathing,
    circulation: editPf.circulation,
    capillaryRefill: editPf.capillaryRefill,
    pupils: editPf.pupils,
    obLmp: editPf.obLmp, obAog: editPf.obAog, obEdd: editPf.obEdd,
    obGravida: editPf.obGravida, obPara: editPf.obPara, obTerm: editPf.obTerm,
    obPreterm: editPf.obPreterm, obAbortion: editPf.obAbortion, obLiving: editPf.obLiving,
    vitalSigns: editPf.vitalSigns,
    glasgowScores: editPf.glasgowScores,
    ambulanceDriver: editPf.ambulanceDriver,
    dispatcher: editPf.dispatcher,
    responders: editPf.ambulanceResponders,
    receivingFacility: editPf.receivingFacility,
    receivingPersonnel: editPf.receivingPersonnel,
    photoUrl: previewPhoto ? resolvePhotoUrl(previewPhoto) : null,
  }

  const incidentViewData = {
    zone: (report.geographicType ?? report.geographic_type)?.name ?? '',
    hazard: editPf.typeOfHazard,
    severityLevel: editPf.severityLevel,
    barangay: editPf.incidentBarangay,
    date: editPf.incidentDate || report.date_reported,
    time: editPf.incidentTime || report.time_reported,
    persons: editPersonsList.map((p, idx) => ({
      id: idx + 1,
      name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '),
      age: p.age,
      gender: p.gender,
      contactNumber: p.contactNumber,
      address: p.permanentAddress,
    })),
    ambulanceDriver: editPf.ambulanceDriver,
    dispatcher: editPf.dispatcher,
    responders: editPf.ambulanceResponders,
    photoUrl: previewPhoto ? resolvePhotoUrl(previewPhoto) : null,
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '12px 0', fontWeight: 600, fontSize: 13,
    border: 'none', background: 'none', cursor: 'pointer',
    borderBottom: active ? '3px solid #0d6efd' : '3px solid transparent',
    color: active ? '#0d6efd' : '#6c757d',
    transition: 'all 0.15s',
  })

  const reportLabel = isEmergency ? 'emergency' : 'incident'

  return (
    <div className="zr-doc-backdrop" role="dialog" aria-modal="true">
      <div className="zr-doc-modal">

        {/* Header */}
        <div className="zr-doc-modal-header">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6c757d', letterSpacing: '0.5px', textTransform: 'uppercase' }}>MDRRMO</div>
            <h5 className="mb-0 fw-bold">Edit Report #{report.id}</h5>
            <small className={isEmergency ? 'text-danger' : 'text-primary'}>{report.report_type}</small>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        {/* Tabs */}
        <div className="d-flex zr-edit-tabbar">
          <button type="button" style={tabStyle(tab === 'system')} onClick={() => setTab('system')}>
            <i className="bi bi-ui-checks-grid me-2" />System Edit
          </button>
          <button type="button" style={tabStyle(tab === 'document')} onClick={() => setTab('document')}>
            <i className="bi bi-file-earmark-text me-2" />Full Document
          </button>
        </div>

        {/* Body */}
        <div className="zr-doc-modal-body" style={tab === 'system' ? { padding: 0 } : undefined}>

          {/* ── SYSTEM EDIT ───────────────────── */}
          {tab === 'system' && (
            <div>
              {/* Report date/time — always visible compact bar */}
              <div className="zr-assess-box" style={{ padding: '12px 16px' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-calendar3 text-primary" style={{ fontSize: 14 }} />
                  <span className="fw-bold" style={{ fontSize: 13 }}>Report Date &amp; Time</span>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label mb-1" style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#6c757d' }}>Date Reported</label>
                    <input type="date" className="form-control form-control-sm" value={dateReported} onChange={e => setDateReported(e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label mb-1" style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#6c757d' }}>Time Reported</label>
                    <input type="time" className="form-control form-control-sm" value={timeReported} onChange={e => setTimeReported(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Accordion sections */}
              <EditSection icon="people-fill" color="#0d6efd" label="Client Information" defaultOpen>
                {isEmergency ? (
                  <ClientInformationStep
                    people={[editPerson]}
                    reportLabel={reportLabel}
                    onChangePerson={updatePerson}
                    onAddPerson={() => {}}
                    onRemovePerson={() => {}}
                    showAddButton={false}
                  />
                ) : (
                  <ClientInformationStep
                    people={editPersonsList}
                    reportLabel="incident"
                    onChangePerson={(idx, key, value) => {
                      updateIncidentPerson(idx, key, value)
                    }}
                    onAddPerson={addIncidentPerson}
                    onRemovePerson={removeIncidentPerson}
                    incidentMode
                  />
                )}
              </EditSection>

              <EditSection icon="geo-alt-fill" color="#dc3545" label="Incident Details" defaultOpen>
                {isEmergency ? (
                  <EmergencyIncidentDetailsStep
                    mechanism={editPf.mechanism}
                    natureIllness={editPf.natureIllness}
                    typeEmergency={editPf.typeEmergency}
                    natureOfCall={editPf.natureOfCall}
                    incidentDate={editPf.incidentDate}
                    incidentTime={editPf.incidentTime}
                    obLmp={editPf.obLmp} obAog={editPf.obAog} obEdd={editPf.obEdd}
                    obGravida={editPf.obGravida} obPara={editPf.obPara} obTerm={editPf.obTerm}
                    obPreterm={editPf.obPreterm} obAbortion={editPf.obAbortion} obLiving={editPf.obLiving}
                    onChange={(key, value) => updatePf(key, value)}
                  />
                ) : (
                  <IncidentReportDetailsStep
                    typeOfHazard={editPf.typeOfHazard}
                    severityLevel={editPf.severityLevel}
                    incidentBarangay={editPf.incidentBarangay}
                    incidentDate={editPf.incidentDate}
                    incidentTime={editPf.incidentTime}
                    onChange={(key, value) => updatePf(key, value)}
                  />
                )}
              </EditSection>

              {isEmergency && (
                <EditSection icon="heart-pulse-fill" color="#198754" label="Assessment & Care" defaultOpen>
                  <AssessmentCareStep
                    chiefComplaint={editPf.chiefComplaint}
                    loc={editPf.loc}
                    airway={editPf.airway}
                    breathing={editPf.breathing}
                    circulation={editPf.circulation}
                    capillaryRefill={editPf.capillaryRefill}
                    pupils={editPf.pupils}
                    typeEmergency={editPf.typeEmergency}
                    vitalSigns={editPf.vitalSigns}
                    glasgowScores={editPf.glasgowScores}
                    obLmp={editPf.obLmp} obAog={editPf.obAog} obEdd={editPf.obEdd}
                    obGravida={editPf.obGravida} obPara={editPf.obPara} obTerm={editPf.obTerm}
                    obPreterm={editPf.obPreterm} obAbortion={editPf.obAbortion} obLiving={editPf.obLiving}
                    onChange={(key, value) => updatePf(key, value)}
                    onVitalSignChange={(i, key, value) => updateVitalSign(0, i, key, value)}
                    onAddVitalSign={addVitalSign}
                    onRemoveVitalSign={(i) => removeVitalSign(0, i)}
                    onGlasgowChange={(i, key, value) => updateGlasgow(0, i, key, value)}
                    onAddGlasgow={addGlasgow}
                    onRemoveGlasgow={(i) => removeGlasgow(0, i)}
                  />
                </EditSection>
              )}

              <EditSection icon="truck" color="#0d6efd" label={isEmergency ? 'Ambulance Transfer' : 'Response & Documentation'} defaultOpen>
                <AmbulanceTransferStep
                  key={`transfer-${report.id}`}
                  ambulanceDriver={editPf.ambulanceDriver}
                  dispatcher={editPf.dispatcher}
                  ambulanceResponders={editPf.ambulanceResponders}
                  receivingFacility={editPf.receivingFacility}
                  receivingPersonnel={editPf.receivingPersonnel}
                  uploadedPhoto={previewPhoto}
                  incidentMode={!isEmergency}
                  onChange={(key, value) => {
                    if (key === 'ambulanceResponders' || key === 'ambulanceDriver' || key === 'dispatcher' ||
                        key === 'receivingFacility' || key === 'receivingPersonnel') {
                      updatePf(key, value)
                    }
                  }}
                  onPhotoChange={handlePhotoChange}
                />
              </EditSection>

            </div>
          )}

          {/* ── FULL DOCUMENT ─────────────────── */}
          {tab === 'document' && (
            <div>
              <div className="px-3 pt-3 pb-2 d-flex justify-content-center">
                {!docEditMode ? (
                  <button
                    type="button"
                    className="btn btn-outline-primary d-flex align-items-center gap-2"
                    style={{ borderRadius: 20, paddingLeft: 20, paddingRight: 20, fontWeight: 600, fontSize: 13 }}
                    onClick={() => setDocEditMode(true)}
                  >
                    <i className="bi bi-pencil-square" style={{ fontSize: 15 }} />
                    Edit Report
                  </button>
                ) : (
                  <div className="d-flex align-items-center justify-content-between w-100 px-3 py-2 rounded-2"
                    style={{ background: '#fff8e1', border: '1px solid #ffc107' }}>
                    <span className="d-flex align-items-center gap-2" style={{ fontSize: 13, color: '#856404', fontWeight: 600 }}>
                      <i className="bi bi-pencil-fill" />
                      Edit mode — click any ✏ on the document to modify a field
                    </span>
                    <button type="button" className="btn btn-sm btn-success d-flex align-items-center gap-1"
                      style={{ borderRadius: 20, fontWeight: 600, fontSize: 12 }}
                      onClick={() => setDocEditMode(false)}>
                      <i className="bi bi-check-lg" /> Done
                    </button>
                  </div>
                )}
              </div>
              <div style={{ padding: '0 16px 16px', overflowX: 'auto' }}>
                <div style={{ minWidth: 700 }}>
                  {isEmergency ? (
                    <PatientCareReportView
                      isDraft={false}
                      data={pcrData}
                      onFieldEdit={docEditMode ? handleDocFieldEdit : undefined}
                    />
                  ) : (
                    <IncidentReportView
                      data={incidentViewData}
                      onFieldEdit={docEditMode ? handleIncidentDocFieldEdit : undefined}
                      onAddPerson={docEditMode ? addIncidentPerson : undefined}
                      onRemovePerson={docEditMode ? removeIncidentPerson : undefined}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="d-flex justify-content-end gap-2 px-4 py-3" style={{ borderTop: '1px solid #dee2e6' }}>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => onSave(buildPayload())} disabled={isSaving}>
            {isSaving
              ? <><i className="bi bi-arrow-repeat me-1" />Saving…</>
              : <><i className="bi bi-check-lg me-1" />Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  )
}
