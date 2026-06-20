import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { PageTour } from '../../components/PageTour'
import type { Step } from 'react-joyride'
import { createRoot } from 'react-dom/client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import '../../style/zone_report.css'
import { Modal } from '../../components/Modal'
import blankTemplatePdfUrl from '../../assets/template_Emeregency_reports.pdf?url'
import nabuaLogoUrl from '../../assets/nabua_logo.png?url'
import mdrrmoLogoUrl from '../../assets/Mdrrmo_logo.png?url'
import '../../style/emergency-report.css'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ClientInformationStep } from './zone-report/steps/ClientInformationStep'
import { EmergencyIncidentDetailsStep } from './zone-report/steps/EmergencyIncidentDetailsStep'
import { AssessmentCareStep } from './zone-report/steps/AssessmentCareStep'
import { AmbulanceTransferStep } from './zone-report/steps/AmbulanceTransferStep'
import { ReviewSubmitStep } from './zone-report/steps/ReviewSubmitStep'
import { ZoneReportStepper } from './zone-report/stepper/ZoneReportStepper'
import { EMERGENCY_STEPS } from './zone-report/stepper/emergencySteps'
import { ReportDocumentModal, type ReportDocumentData } from './zone-report/components/ReportDocumentModal'
import { ReportEditModal, type EditReportPayload } from './zone-report/components/ReportEditModal'
import { PatientCareReportView } from './zone-report/views/PatientCareReportView'
import { buildPcrData, capturePcrToPdf } from './zone-report/utils/pcrUtils'
import api from '../../api/axios'
import {
  INITIAL_FORM,
  createEmptyPerson,
  createEmptyPersonForm,
  createEmptyVitalSign,
  createEmptyGlasgow,
  type PersonFormData,
  type PersonInfo,
  type ReportKind,
  type VitalSignRow,
  type GlasgowRow,
} from '../../types/zoneReport'
import {
  type ApiErrorPayload,
  type CreateReportDraft,
  type FieldErrorMap,
  type GeographicTypeItem,
  type MessageState,
  type RawReportPayload,
  type ReportClientItem,
  type ReportTableItem,
} from '../../types/zoneReportPage'

const ZONES = ['Rail Road', 'Poblacion', 'Mountain Area', 'River Side']

const toZoneSlug = (zoneName: string) =>
  zoneName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const getZoneNameFromSlug = (slug?: string) => {
  if (!slug) return null
  return ZONES.find(zone => toZoneSlug(zone) === slug) ?? null
}

const FILTER_TYPES = ['All Reports', 'Emergency']
const FILTER_GENDERS = ['All Genders', 'Male', 'Female']
const FILTER_SORT = ['Most Recent', 'Oldest First']

const toHHMM = (value?: string | null) => {
  if (!value) return ''
  const match = value.match(/^(\d{2}):(\d{2})/)
  if (!match) return value
  return `${match[1]}:${match[2]}`
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ZONE_REPORT_DRAFT_PREFIX = 'zone_report_create_draft_v1:'

const slugifyFileName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')


const toTableItem = (raw: RawReportPayload | null | undefined): ReportTableItem | null => {
  if (!raw || !raw.id || !raw.report_type) {
    return null
  }

  return {
    id: Number(raw.id),
    report_type: raw.report_type,
    date_reported: raw.date_reported ?? '',
    time_reported: raw.time_reported ?? '',
    geographicType: raw.geographicType ?? raw.geographic_type ?? null,
    geographic_type: raw.geographic_type ?? raw.geographicType ?? null,
    clients: Array.isArray(raw.clients) ? raw.clients : [],
    emergencyDetails: raw.emergencyDetails ?? raw.emergency_details ?? null,
    emergency_details: raw.emergency_details ?? raw.emergencyDetails ?? null,
    incidentDetails: raw.incidentDetails ?? raw.incident_details ?? null,
    incident_details: raw.incident_details ?? raw.incidentDetails ?? null,
    responders: Array.isArray(raw.responders) ? raw.responders : [],
    ambulanceTransfer: raw.ambulanceTransfer ?? raw.ambulance_transfer ?? null,
    ambulance_transfer: raw.ambulance_transfer ?? raw.ambulanceTransfer ?? null,
  }
}

const normalizeExistingClient = (client: Partial<ReportClientItem> & Record<string, unknown>) => ({
  full_name: typeof client.full_name === 'string' ? client.full_name : '',
  age: typeof client.age === 'number' ? client.age : null,
  gender: typeof client.gender === 'string' ? client.gender : 'Male',
  nationality: typeof client.nationality === 'string' ? client.nationality : null,
  contact_number: typeof client.contact_number === 'string' ? client.contact_number : null,
  permanent_address: typeof client.permanent_address === 'string' ? client.permanent_address : null,
  incident_address: typeof client.incident_address === 'string' ? client.incident_address : null,
})

const extractApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as { response?: { data?: ApiErrorPayload } } | undefined
  const apiMessage = apiError?.response?.data?.message
  const firstValidation = apiError?.response?.data?.errors
  const firstValidationMessage = firstValidation ? Object.values(firstValidation)[0]?.[0] : null
  return apiMessage || firstValidationMessage || fallback
}

const extractApiErrorIssues = (error: unknown) => {
  const apiError = error as { response?: { data?: ApiErrorPayload } } | undefined
  const details = apiError?.response?.data?.errors
  if (!details) {
    return ''
  }

  const flattened = Object.values(details).flat().filter(Boolean)
  if (flattened.length < 1) {
    return ''
  }

  return `\n- ${flattened.join('\n- ')}`
}

export default function Zone_Report() {
  const { zoneSlug } = useParams<{ zoneSlug: string }>()
  const { pathname } = useLocation()
  const roleBase = pathname.startsWith('/staff') ? '/staff' : '/admin'
  const zoneName = getZoneNameFromSlug(zoneSlug)
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [reportKind, setReportKind] = useState<Exclude<ReportKind, null>>('emergency')
  const [isSaving, setIsSaving] = useState(false)
  const [geographicTypes, setGeographicTypes] = useState<GeographicTypeItem[]>([])
  const [tableReports, setTableReports] = useState<ReportTableItem[]>([])
  const [hasLoadedReports, setHasLoadedReports] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportDocumentData | null>(null)
  const [editingReport, setEditingReport] = useState<ReportDocumentData | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isEditSaving, setIsEditSaving] = useState(false)
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 })
  const [isModalDragging, setIsModalDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragOriginRef = useRef({ x: 0, y: 0 })
  const [people, setPeople] = useState<PersonInfo[]>([createEmptyPerson()])
  const [personForms, setPersonForms] = useState<PersonFormData[]>([createEmptyPersonForm()])
  const [uploadedPhotoFiles, setUploadedPhotoFiles] = useState<(File | null)[]>([null])
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})
  const [activePersonIdx, setActivePersonIdx] = useState(0)
  const [filterType, setFilterType] = useState('All Reports')
  const [filterDispatcher, setFilterDispatcher] = useState('All Dispatchers')
  const [filterGender, setFilterGender] = useState('All Genders')
  const [filterSort, setFilterSort] = useState('Most Recent')
  const [viewingReportId, setViewingReportId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [messageState, setMessageState] = useState<MessageState>({ open: false, title: '', body: '' })
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const [pendingDeleteReportId, setPendingDeleteReportId] = useState<number | null>(null)
  const [deletingReportIds, setDeletingReportIds] = useState<number[]>([])
  const [isTableRefreshing, setIsTableRefreshing] = useState(false)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [downloadAllProgress, setDownloadAllProgress] = useState(0)
  const [downloadsOpen, setDownloadsOpen] = useState(false)
  const downloadsMenuRef = useRef<HTMLDivElement>(null)
  const draftStorageKey = useMemo(() => `${ZONE_REPORT_DRAFT_PREFIX}${zoneName ?? 'unknown'}`, [zoneName])

  const showMessage = (title: string, body: string) => {
    setMessageState({ open: true, title, body })
  }


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (downloadsMenuRef.current && !downloadsMenuRef.current.contains(e.target as Node)) {
        setDownloadsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])


  const upsertTableReport = (raw: RawReportPayload | null | undefined) => {
    const item = toTableItem(raw)
    if (!item) {
      return
    }

    setTableReports(prev => {
      const index = prev.findIndex(report => report.id === item.id)
      if (index < 0) {
        return [item, ...prev]
      }

      const next = [...prev]
      next[index] = { ...next[index], ...item }
      return next
    })
  }

  const closeMessage = () => {
    setMessageState({ open: false, title: '', body: '' })
  }

  const hasFilledPerson = people.some(person =>
    [
      person.firstName,
      person.middleName,
      person.lastName,
      person.age,
      person.gender,
      person.nationality,
      person.contactNumber,
      person.permanentAddress,
      person.incidentLocation,
    ].some(value => value.trim() !== '')
  )

  const hasFilledForm = personForms.some(pf =>
    Object.entries(pf).some(([key, value]) =>
      key !== 'vitalSigns' && key !== 'glasgowScores' && key !== 'uploadedPhoto' &&
      String(value ?? '').trim() !== ''
    )
  )

  const hasStepperChanges =
    hasFilledPerson ||
    hasFilledForm ||
    personForms.some(pf => pf.uploadedPhoto !== null) ||
    uploadedPhotoFiles.some(f => f !== null)

  const clearCreateDraft = useCallback(() => {
    localStorage.removeItem(draftStorageKey)
  }, [draftStorageKey])

  const saveCreateDraft = useCallback(() => {
    if (!open) {
      return
    }

    if (!hasStepperChanges) {
      clearCreateDraft()
      return
    }

    const draft: CreateReportDraft = {
      reportKind,
      currentStep,
      people,
      form: INITIAL_FORM,
      uploadedPhoto: null,
      updatedAt: Date.now(),
      personForms: personForms.map(pf => ({ ...pf, uploadedPhoto: pf.uploadedPhoto })),
    }

    localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  }, [open, hasStepperChanges, clearCreateDraft, reportKind, currentStep, people, personForms, draftStorageKey])

  const loadCreateDraft = (): boolean => {
    const rawDraft = localStorage.getItem(draftStorageKey)
    if (!rawDraft) {
      return false
    }

    try {
      const parsed = JSON.parse(rawDraft) as Partial<CreateReportDraft>
      const nextKind: Exclude<ReportKind, null> = 'emergency'
      const nextStep = Math.min(Math.max(Number(parsed.currentStep ?? 1), 1), EMERGENCY_STEPS.length)

      const parsedPeople = Array.isArray(parsed.people) && parsed.people.length > 0 ? parsed.people : [createEmptyPerson()]
      setReportKind(nextKind)
      setCurrentStep(nextStep)
      setPeople(parsedPeople)
      const savedForms = Array.isArray(parsed.personForms) && parsed.personForms.length > 0
        ? parsed.personForms.map(pf => ({ ...createEmptyPersonForm(), ...pf }))
        : parsedPeople.map(() => createEmptyPersonForm())
      setPersonForms(savedForms)
      setUploadedPhotoFiles(parsedPeople.map(() => null))
      return true
    } catch {
      clearCreateDraft()
      return false
    }
  }

  const getGeographicTypeId = useCallback(() => {
    const matchingGeo = geographicTypes.find(item => item.name === zoneName)
    const fallbackGeoId = zoneName ? ZONES.findIndex(name => name === zoneName) + 1 : 0
    return matchingGeo?.id ?? (fallbackGeoId > 0 ? fallbackGeoId : null)
  }, [geographicTypes, zoneName])

  const refreshReports = useCallback(async () => {
    if (!zoneName) {
      return
    }

    setIsTableRefreshing(true)

    const geographicTypeId = getGeographicTypeId()

    try {
      let response
      let incoming: ReportTableItem[] = []

      try {
        response = await api.get('/reports', {
          params: {
            ...(geographicTypeId ? { geographic_type_id: geographicTypeId } : {}),
          },
        })
      } catch {
        response = await api.get('/reports/summary', {
          params: {
            ...(geographicTypeId ? { geographic_type_id: geographicTypeId } : {}),
            limit: 500,
          },
        })
      }

      incoming = Array.isArray(response.data) ? (response.data as ReportTableItem[]) : []

      if (!geographicTypeId) {
        incoming = incoming.filter(report => {
          const reportZone = report.geographicType?.name ?? report.geographic_type?.name ?? ''
          return reportZone === zoneName
        })
      }

      setTableReports(incoming)
    } catch {
      setTableReports([])
    } finally {
      setHasLoadedReports(true)
      setIsTableRefreshing(false)
    }
  }, [zoneName, getGeographicTypeId])

  const steps = EMERGENCY_STEPS

  const dispatcherOptions = useMemo(() => {
    const names = tableReports
      .map(r => (r.ambulanceTransfer ?? r.ambulance_transfer)?.dispatcher?.trim())
      .filter((d): d is string => Boolean(d))
    return ['All Dispatchers', ...Array.from(new Set(names)).sort()]
  }, [tableReports])

  const displayedReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    let result = tableReports.filter(report => {
      if (filterType !== 'All Reports' && report.report_type !== filterType) return false

      const primaryClient = report.clients?.[0]
      if (filterGender !== 'All Genders' && primaryClient?.gender !== filterGender) return false

      if (filterDispatcher !== 'All Dispatchers') {
        const d = (report.ambulanceTransfer ?? report.ambulance_transfer)?.dispatcher?.trim() || ''
        if (d !== filterDispatcher) return false
      }

      if (!normalizedSearch) return true

      const location =
        primaryClient?.incident_address?.trim() || report.geographicType?.name || report.geographic_type?.name || zoneName || ''
      const transfer = report.ambulanceTransfer ?? report.ambulance_transfer
      const responders = transfer?.responders || (report.responders ?? [])
        .map(r => r.name).filter((n): n is string => Boolean(n?.trim())).join(', ')

      const searchable = [
        primaryClient?.full_name,
        location,
        responders,
        report.report_type,
        transfer?.dispatcher,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(normalizedSearch)
    })

    if (filterSort === 'Oldest First') result = [...result].reverse()
    return result
  }, [tableReports, filterType, filterGender, filterDispatcher, filterSort, searchTerm, zoneName])

  const highlightMatch = (value: string | number | null | undefined): ReactNode => {
    const text = value === null || value === undefined ? 'N/A' : String(value)
    const query = searchTerm.trim()

    if (!query) {
      return text
    }

    const regex = new RegExp(`(${escapeRegex(query)})`, 'ig')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark className="zr-search-highlight" key={`${part}-${index}`}>
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    )
  }

  const resetStepper = () => {
    setCurrentStep(1)
    setReportKind('emergency')
    setIsSaving(false)
    setPeople([createEmptyPerson()])
    setPersonForms([createEmptyPersonForm()])
    setUploadedPhotoFiles([null])
    setFieldErrors({})
  }

  const closeModal = () => {
    setOpen(false)
    setModalOffset({ x: 0, y: 0 })
    setIsModalDragging(false)
    clearCreateDraft()
    resetStepper()
  }

  const requestCloseCreateModal = () => {
    if (isSaving) {
      return
    }

    if (hasStepperChanges) {
      setIsCloseConfirmOpen(true)
      return
    }

    closeModal()
  }

  const confirmDiscardCreate = async () => {
    setIsCloseConfirmOpen(false)
    closeModal()
  }


  const closeEditModal = () => {
    setIsEditOpen(false)
    setIsEditSaving(false)
    setEditingReport(null)
  }

  const openCreateModal = () => {
    resetStepper()
    setModalOffset({ x: 0, y: 0 })
    setIsModalDragging(false)
    loadCreateDraft()
    setOpen(true)
  }

  useEffect(() => {
    if (!isModalDragging) {
      return
    }

    const onMouseMove = (event: MouseEvent) => {
      const nextX = dragOriginRef.current.x + (event.clientX - dragStartRef.current.x)
      const nextY = dragOriginRef.current.y + (event.clientY - dragStartRef.current.y)
      setModalOffset({ x: nextX, y: nextY })
    }

    const onMouseUp = () => {
      setIsModalDragging(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isModalDragging])


  const dataUrlToFile = (dataUrl: string, baseName: string) => {
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/)
    if (!match) {
      return null
    }

    const mime = match[1]
    const encoded = match[2]
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }

    const extension = mime.includes('/') ? mime.split('/')[1] : 'jpg'
    return new File([bytes], `${baseName}.${extension}`, { type: mime })
  }

  const openViewModal = async (id: number) => {
    setIsViewOpen(true)
    setIsViewLoading(true)
    setViewingReportId(id)

    try {
      const response = await api.get(`/reports/${id}`)
      setSelectedReport(response.data as ReportDocumentData)
    } catch {
      setSelectedReport(null)
      showMessage('Load Failed', 'Unable to load report details.')
    } finally {
      setIsViewLoading(false)
    }
  }

  const closeViewModal = () => {
    setIsViewOpen(false)
    setSelectedReport(null)
    setViewingReportId(null)
  }

  const openEditModal = async (id: number) => {
    try {
      const response = await api.get(`/reports/${id}`)
      const report = response.data as ReportDocumentData

      setEditingReport(report)
      setIsEditOpen(true)
    } catch {
      showMessage('Load Failed', 'Unable to load report for editing.')
    }
  }

  const saveEditedReport = async (payload: EditReportPayload) => {
    if (!editingReport) {
      return
    }

    setIsEditSaving(true)
    try {
      const geographicTypeId = getGeographicTypeId()
      if (!geographicTypeId) {
        showMessage('Missing Geographic Type', 'Geographic type was not found. Please try again.')
        return
      }

      const normalizedFullName = payload.client_full_name?.trim() ?? ''
      const normalizedGender = payload.client_gender?.trim() ?? ''
      if (!normalizedFullName || !normalizedGender) {
        showMessage('Required Fields', 'Primary client full name and gender are required.')
        return
      }

      await api.put(`/reports/${editingReport.id}`, {
        geographic_type_id: geographicTypeId,
        date_reported: payload.date_reported,
        time_reported: toHHMM(payload.time_reported),
      })

      const currentClients = editingReport.clients ?? []
      const updatedClients = payload.all_clients
        ? payload.all_clients.map(c => ({
            full_name: c.full_name,
            age: c.age,
            gender: c.gender,
            nationality: null,
            contact_number: c.contact_number,
            permanent_address: c.permanent_address,
            incident_address: null,
            accident_type: c.accident_type || null,
          }))
        : (currentClients.length > 0 ? currentClients : [{}]).map((client, index) => {
            if (index !== 0) {
              return normalizeExistingClient((client ?? {}) as Partial<ReportClientItem> & Record<string, unknown>)
            }
            return {
              full_name: normalizedFullName,
              age: payload.client_age ? Number(payload.client_age) : null,
              gender: normalizedGender,
              nationality: payload.client_nationality || null,
              contact_number: payload.client_contact_number || null,
              permanent_address: payload.client_permanent_address || null,
              incident_address: payload.client_incident_address || null,
              accident_type: payload.client_accident_type || null,
            }
          })

      await api.put(`/reports/${editingReport.id}/clients`, {
        clients: updatedClients,
      })

      // Emergency details
      if (editingReport.report_type === 'Emergency') {
        await api.put(`/reports/${editingReport.id}/emergency-details`, {
          type_of_emergency: payload.type_of_emergency || null,
          nature_of_call: payload.nature_of_call || null,
          nature_of_illness: payload.nature_of_illness || null,
          mechanism_of_injury: payload.mechanism_of_injury || null,
          incident_date: payload.incident_date || null,
          incident_time: payload.incident_time ? toHHMM(payload.incident_time) : null,
        })

        await api.put(`/reports/${editingReport.id}/assessment`, {
          chief_complaint: payload.assessment || null,
          loc: payload.loc || null,
          airway: payload.airway || null,
          breathing: payload.breathing || null,
          circulation: payload.circulation || null,
          circulation_support: payload.circulation || null,
          capillary_refill: payload.capillary_refill || null,
          pupils: payload.pupils || null,
          wound_care: payload.wound_care || null,
          miscellaneous: payload.miscellaneous || null,
          history_of_coronary_disease: payload.coronary || null,
          collapse_witness: payload.collapse_witness || null,
          time_of_collapse: payload.time_of_collapse ? toHHMM(payload.time_of_collapse) : null,
          start_of_cpr: payload.start_of_cpr ? toHHMM(payload.start_of_cpr) : null,
          defibrillation_time: payload.defibrillation_time ? toHHMM(payload.defibrillation_time) : null,
          cpr_duration: payload.cpr_duration ? Number(payload.cpr_duration) : null,
          rosc: payload.rosc || null,
          transferred_to_hospital: payload.transferred_to_hospital || null,
          vital_signs: payload.vital_signs?.length ? payload.vital_signs : undefined,
          glasgow_scores: payload.glasgow_scores?.length ? payload.glasgow_scores.map(g => ({
            eye: g.eye ? Number(g.eye) : null,
            verbal: g.verbal ? Number(g.verbal) : null,
            motor: g.motor ? Number(g.motor) : null,
          })) : undefined,
          ob_lmp: payload.ob_lmp || null,
          ob_aog: payload.ob_aog || null,
          ob_edd: payload.ob_edd || null,
          ob_gravida: payload.ob_gravida ? Number(payload.ob_gravida) : null,
          ob_para: payload.ob_para ? Number(payload.ob_para) : null,
          ob_term: payload.ob_term ? Number(payload.ob_term) : null,
          ob_preterm: payload.ob_preterm ? Number(payload.ob_preterm) : null,
          ob_abortion: payload.ob_abortion ? Number(payload.ob_abortion) : null,
          ob_living: payload.ob_living ? Number(payload.ob_living) : null,
        })
      }

      // Incident details
      if (editingReport.report_type === 'Incident') {
        await api.put(`/reports/${editingReport.id}/incident-details`, {
          type_of_incident:  payload.type_of_incident || null,
          type_of_hazard:    payload.type_of_hazard || null,
          severity_level:    payload.severity_level || null,
          incident_barangay: payload.incident_barangay || null,
          incident_date:     payload.incident_date || null,
          incident_time:     payload.incident_time ? toHHMM(payload.incident_time) : null,
        })
      }

      // Ambulance transfer
      if (payload.ambulance_driver !== undefined || payload.dispatcher !== undefined ||
          payload.responders !== undefined || payload.receiving_facility !== undefined ||
          payload.receiving_personnel !== undefined) {
        await api.put(`/reports/${editingReport.id}/ambulance-transfer`, {
          ambulance_driver: payload.ambulance_driver || null,
          dispatcher: payload.dispatcher || null,
          responders: payload.responders || null,
          receiving_facility: payload.receiving_facility || null,
          receiving_personnel: payload.receiving_personnel || null,
        })
      }

      if (payload.photo_file) {
        const formData = new FormData()
        formData.append('photo', payload.photo_file)

        await api.post(`/reports/${editingReport.id}/photos/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      }

      // Optimistic update for immediate UI feedback.
      const currentGeo = geographicTypes.find(item => item.id === geographicTypeId)
      upsertTableReport({
        id: editingReport.id,
        report_type: editingReport.report_type,
        date_reported: payload.date_reported,
        time_reported: toHHMM(payload.time_reported),
        geographicType: currentGeo ? { id: currentGeo.id, name: currentGeo.name } : editingReport.geographicType,
        clients: [
          {
            id: editingReport.clients?.[0]?.id ?? 0,
            full_name: normalizedFullName,
            age: payload.client_age ? Number(payload.client_age) : null,
            gender: normalizedGender,
            nationality: payload.client_nationality || null,
            contact_number: payload.client_contact_number || null,
            permanent_address: payload.client_permanent_address || null,
            incident_address: payload.client_incident_address || null,
          },
        ],
        emergencyDetails: editingReport.emergencyDetails ?? editingReport.emergency_details ?? null,
        incidentDetails: editingReport.incidentDetails ?? editingReport.incident_details ?? null,
        responders: editingReport.responders ?? [],
      })

      refreshReports().catch(() => undefined)
      closeEditModal()
      showMessage('Success', 'Report updated successfully.')
    } catch (error: unknown) {
      showMessage('Update Failed', extractApiErrorMessage(error, 'Unable to update report.'))
    } finally {
      setIsEditSaving(false)
    }
  }

  const deleteReport = (id: number) => {
    setPendingDeleteReportId(id)
  }

  const confirmDeleteReport = async () => {
    if (!pendingDeleteReportId) {
      return
    }

    const reportId = pendingDeleteReportId
    setPendingDeleteReportId(null)

    const snapshot = tableReports
    setDeletingReportIds(prev => (prev.includes(reportId) ? prev : [...prev, reportId]))
    setTableReports(prev => prev.filter(report => report.id !== reportId))

    try {
      await api.delete(`/reports/${reportId}`)
    } catch {
      setTableReports(snapshot)
      showMessage('Delete Failed', 'Unable to move this report to trash.')
    } finally {
      setDeletingReportIds(prev => prev.filter(id => id !== reportId))
    }
  }

  const refreshTableNow = () => {
    refreshReports().catch(() => undefined)
  }

  const updatePersonFormField = (personIdx: number, key: keyof PersonFormData, value: PersonFormData[typeof key]) => {
    setPersonForms(prev => {
      const next = [...prev]
      next[personIdx] = { ...next[personIdx], [key]: value }
      return next
    })
    if (typeof value === 'string' && value.trim() !== '') {
      setFieldErrors(prev => {
        const errorKey = `p${personIdx}-${key}`
        if (!prev[errorKey] && !prev[key as string]) return prev
        const next = { ...prev }
        delete next[errorKey]
        delete next[key as string]
        return next
      })
    }
  }

  const updatePerson = (index: number, key: keyof PersonInfo, value: string) => {
    setPeople(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })

    if (value.trim() !== '') {
      const errorKey = `person-${index}-${key}`
      setFieldErrors(prev => {
        if (!prev[errorKey]) {
          return prev
        }
        const next = { ...prev }
        delete next[errorKey]
        return next
      })
    }
  }

  const addPerson = () => {
    setPeople(prev => {
      const first = prev[0]
      return [...prev, {
        ...createEmptyPerson(),
        permanentAddress: first?.permanentAddress ?? '',
        incidentLocation: first?.incidentLocation ?? '',
      }]
    })
    setPersonForms(prev => {
      const first = prev[0] ?? createEmptyPersonForm()
      return [...prev, {
        ...createEmptyPersonForm(),
        incidentDate: first.incidentDate,
        incidentTime: first.incidentTime,
        natureOfCall: first.natureOfCall,
        typeEmergency: first.typeEmergency,
        typeOfHazard: first.typeOfHazard,
      }]
    })
    setUploadedPhotoFiles(prev => [...prev, null])
  }

  const removePerson = (index: number) => {
    if (people.length === 1) return
    setPeople(prev => prev.filter((_, i) => i !== index))
    setPersonForms(prev => prev.filter((_, i) => i !== index))
    setUploadedPhotoFiles(prev => prev.filter((_, i) => i !== index))
  }

  const makeVitalUpdater = (personIdx: number) => ({
    update: (rowIdx: number, key: keyof VitalSignRow, value: string) =>
      setPersonForms(prev => {
        const next = [...prev]; const pf = { ...next[personIdx] }
        const vs = [...pf.vitalSigns]; vs[rowIdx] = { ...vs[rowIdx], [key]: value }
        pf.vitalSigns = vs; next[personIdx] = pf; return next
      }),
    add: () => setPersonForms(prev => {
      const next = [...prev]; const pf = { ...next[personIdx] }
      pf.vitalSigns = [...pf.vitalSigns, createEmptyVitalSign()]; next[personIdx] = pf; return next
    }),
    remove: (rowIdx: number) => setPersonForms(prev => {
      const next = [...prev]; const pf = { ...next[personIdx] }
      if (pf.vitalSigns.length === 1) return prev
      pf.vitalSigns = pf.vitalSigns.filter((_, i) => i !== rowIdx); next[personIdx] = pf; return next
    }),
  })

  const makeGlasgowUpdater = (personIdx: number) => ({
    update: (rowIdx: number, key: keyof GlasgowRow, value: string) =>
      setPersonForms(prev => {
        const next = [...prev]; const pf = { ...next[personIdx] }
        const gs = [...pf.glasgowScores]; gs[rowIdx] = { ...gs[rowIdx], [key]: value }
        pf.glasgowScores = gs; next[personIdx] = pf; return next
      }),
    add: () => setPersonForms(prev => {
      const next = [...prev]; const pf = { ...next[personIdx] }
      pf.glasgowScores = [...pf.glasgowScores, createEmptyGlasgow()]; next[personIdx] = pf; return next
    }),
    remove: (rowIdx: number) => setPersonForms(prev => {
      const next = [...prev]; const pf = { ...next[personIdx] }
      if (pf.glasgowScores.length === 1) return prev
      pf.glasgowScores = pf.glasgowScores.filter((_, i) => i !== rowIdx); next[personIdx] = pf; return next
    }),
  })

  const makePhotoHandler = (personIdx: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      updatePersonFormField(personIdx, 'uploadedPhoto', null)
      setUploadedPhotoFiles(prev => { const n = [...prev]; n[personIdx] = null; return n })
      return
    }
    setUploadedPhotoFiles(prev => { const n = [...prev]; n[personIdx] = file; return n })
    const reader = new FileReader()
    reader.onload = e => updatePersonFormField(personIdx, 'uploadedPhoto', (e.target?.result as string) ?? null)
    reader.readAsDataURL(file)
  }

  const maxStep = Math.max(steps.length, 1)

  const getRequiredErrorsForStep = (step: number): FieldErrorMap => {
    const errors: FieldErrorMap = {}

    if (step === 1) {
      people.forEach((person, index) => {
        if (!person.firstName.trim()) errors[`person-${index}-firstName`] = 'First name is required.'
        if (!person.lastName.trim()) errors[`person-${index}-lastName`] = 'Last name is required.'
        if (!person.gender.trim()) errors[`person-${index}-gender`] = 'Gender is required.'
        if (!person.nationality.trim()) errors[`person-${index}-nationality`] = 'Nationality is required.'
        if (!person.permanentAddress.trim()) errors[`person-${index}-permanentAddress`] = 'Permanent address is required.'
        if (!person.incidentLocation.trim()) errors[`person-${index}-incidentLocation`] = 'Location of incident is required.'
      })
      return errors
    }
    if (step === 2) {
      personForms.forEach((pf, i) => {
        const pfx = `p${i}-`
        if (!pf.mechanism.trim()) errors[`${pfx}mechanism`] = 'Mechanism of injury/illness is required.'
        if (!pf.natureIllness.trim()) errors[`${pfx}natureIllness`] = 'Nature of illness is required.'
        if (!pf.typeEmergency.trim()) errors[`${pfx}typeEmergency`] = 'Type of emergency is required.'
        if (!pf.incidentDate.trim()) errors[`${pfx}incidentDate`] = 'Incident date is required.'
        if (!pf.incidentTime.trim()) errors[`${pfx}incidentTime`] = 'Incident time is required.'
      })
    }
    if (step === 3) {
      personForms.forEach((pf, i) => {
        if (pf.typeEmergency !== 'OB') return
        const pfx = `p${i}-`
        if (!pf.obLmp.trim()) errors[`${pfx}obLmp`] = 'LMP is required for OB emergencies.'
        if (!pf.obAog.trim()) errors[`${pfx}obAog`] = 'AOG is required for OB emergencies.'
        if (!pf.obEdd.trim()) errors[`${pfx}obEdd`] = 'EDD is required for OB emergencies.'
        if (!pf.obGravida.trim()) errors[`${pfx}obGravida`] = 'Gravida is required for OB emergencies.'
        if (!pf.obPara.trim()) errors[`${pfx}obPara`] = 'Para is required for OB emergencies.'
        if (!pf.obTerm.trim()) errors[`${pfx}obTerm`] = 'Term is required for OB emergencies.'
        if (!pf.obPreterm.trim()) errors[`${pfx}obPreterm`] = 'Preterm is required for OB emergencies.'
        if (!pf.obAbortion.trim()) errors[`${pfx}obAbortion`] = 'Abortion is required for OB emergencies.'
        if (!pf.obLiving.trim()) errors[`${pfx}obLiving`] = 'Living is required for OB emergencies.'
      })
    }
    return errors
  }

  const applyStepErrors = (step: number) => {
    const errors = getRequiredErrorsForStep(step)
    setFieldErrors(errors)
    return Object.keys(errors).length < 1
  }

  const validateAllRequiredForSubmit = () => {
    const s1 = getRequiredErrorsForStep(1)
    if (Object.keys(s1).length > 0) return { errors: s1, firstInvalidStep: 1 }
    for (let s = 2; s < maxStep; s++) {
      const errs = getRequiredErrorsForStep(s)
      if (Object.keys(errs).length > 0) return { errors: errs, firstInvalidStep: s }
    }
    return { errors: {}, firstInvalidStep: null as number | null }
  }

  const goNext = async () => {
    if (isSaving) {
      return
    }

    setIsSaving(true)
    try {
      const isValid = applyStepErrors(currentStep)
      if (!isValid) {
        throw new Error('Please complete the required fields.')
      }

      setCurrentStep(prev => Math.min(prev + 1, maxStep))
    } catch {
      // Inline field validation is shown on the form.
    } finally {
      setIsSaving(false)
    }
  }

  const goPrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }


  const submitReport = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const { errors, firstInvalidStep } = validateAllRequiredForSubmit()
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        if (firstInvalidStep) setCurrentStep(firstInvalidStep)
        throw new Error('Please complete the required fields.')
      }

      const geographicTypeId = getGeographicTypeId()
      if (!geographicTypeId) throw new Error('Geographic type was not found. Please try again.')
      const now = new Date()
      const fallbackDate = now.toISOString().slice(0, 10)
      const fallbackTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      let lastResponse: { data: { report?: RawReportPayload } } | null = null

      for (let i = 0; i < people.length; i++) {
        const person = people[i]
        const pf = personForms[i] ?? createEmptyPersonForm()
        const fullName = [person.firstName, person.middleName, person.lastName].map(p => p.trim()).filter(Boolean).join(' ')
        if (!fullName || !person.gender) continue

        const sharedPf = pf
        const reportRes = await api.post('/reports', {
          report_type: 'Emergency',
          geographic_type_id: geographicTypeId,
          date_reported: sharedPf.incidentDate || fallbackDate,
          time_reported: toHHMM(sharedPf.incidentTime) || fallbackTime,
          latitude: person.latitude ? parseFloat(person.latitude) : null,
          longitude: person.longitude ? parseFloat(person.longitude) : null,
        })
        const id = reportRes.data?.report?.id as number | undefined
        if (!id) throw new Error('Failed to create report draft.')

        await api.put(`/reports/${id}/clients`, {
          clients: [{
            full_name: fullName,
            age: person.age ? Number(person.age) : null,
            gender: person.gender,
            nationality: person.nationality.trim() || null,
            contact_number: person.contactNumber.trim() || null,
            permanent_address: person.permanentAddress.trim() || null,
            incident_address: person.incidentLocation.trim() || null,
            accident_type: person.accidentType.trim() || null,
          }],
        })

        if (reportKind === 'emergency') {
          await api.put(`/reports/${id}/emergency-details`, {
            mechanism_of_injury: pf.mechanism || null,
            nature_of_illness: pf.natureIllness || null,
            type_of_emergency: pf.typeEmergency || null,
            nature_of_call: pf.natureOfCall || null,
            incident_date: pf.incidentDate,
            incident_time: toHHMM(pf.incidentTime),
          })
          await api.put(`/reports/${id}/assessment`, {
            chief_complaint: pf.chiefComplaint || null,
            loc: pf.loc || null,
            airway: pf.airway || null,
            breathing: pf.breathing || null,
            circulation: pf.circulation || null,
            capillary_refill: pf.capillaryRefill || null,
            pupils: pf.pupils || null,
            vital_signs: pf.vitalSigns.filter(vs => vs.bp || vs.rr || vs.pr || vs.temp || vs.spo2),
            glasgow_scores: pf.glasgowScores.filter(g => g.eye || g.verbal || g.motor).map(g => ({
              eye: g.eye ? Number(g.eye) : null,
              verbal: g.verbal ? Number(g.verbal) : null,
              motor: g.motor ? Number(g.motor) : null,
            })),
            ob_lmp: pf.obLmp || null, ob_aog: pf.obAog || null, ob_edd: pf.obEdd || null,
            ob_gravida: pf.obGravida ? Number(pf.obGravida) : null,
            ob_para: pf.obPara ? Number(pf.obPara) : null,
            ob_term: pf.obTerm ? Number(pf.obTerm) : null,
            ob_preterm: pf.obPreterm ? Number(pf.obPreterm) : null,
            ob_abortion: pf.obAbortion ? Number(pf.obAbortion) : null,
            ob_living: pf.obLiving ? Number(pf.obLiving) : null,
          })
        }

        const photoFile = uploadedPhotoFiles[i] ?? (pf.uploadedPhoto ? dataUrlToFile(pf.uploadedPhoto, `report-${id}-photo`) : null)
        if (photoFile) {
          const fd = new FormData(); fd.append('photo', photoFile)
          await api.post(`/reports/${id}/photos/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        }

        const ambulancePf = pf
        await api.put(`/reports/${id}/ambulance-transfer`, {
          ambulance_driver: ambulancePf.ambulanceDriver || null,
          dispatcher: ambulancePf.dispatcher || null,
          responders: ambulancePf.ambulanceResponders || null,
          receiving_facility: ambulancePf.receivingFacility || null,
          receiving_personnel: ambulancePf.receivingPersonnel || null,
        })

        lastResponse = await api.post(`/reports/${id}/submit`)
        if (lastResponse?.data?.report) upsertTableReport(lastResponse.data.report)
      }

      refreshReports().catch(() => undefined)
      clearCreateDraft()
      closeModal()
      const n = people.length
      showMessage('Success', n > 1 ? `${n} reports submitted successfully.` : 'Report submitted successfully.')
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Please complete the required fields.') return
      showMessage('Submit Failed', extractApiErrorMessage(error, 'Unable to submit report.') + extractApiErrorIssues(error))
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    saveCreateDraft()
  }, [open, reportKind, currentStep, people, personForms, hasStepperChanges, draftStorageKey, saveCreateDraft])

  useEffect(() => {
    let ignore = false

    const loadGeographicTypes = async () => {
      try {
        const response = await api.get('/geographic-types')
        if (!ignore && Array.isArray(response.data)) {
          setGeographicTypes(response.data)
        }
      } catch {
        if (!ignore) {
          setGeographicTypes([])
        }
      }
    }

    loadGeographicTypes()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    const loadReports = async () => {
      if (!zoneName || ignore) {
        return
      }

      await refreshReports()
    }

    loadReports()

    return () => {
      ignore = true
    }
  }, [zoneName, geographicTypes, filterType, refreshReports])

  const formatDate = (value: string) => {
    if (!value) return '—'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString()
  }

  const formatTime = (value: string) => {
    if (!value) return '—'
    const parsed = new Date(`1970-01-01T${value}`)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const buildExportRows = () => {
    return displayedReports.map(report => {
      const primaryClient = report.clients?.[0]
      const emergencyDetail = report.emergencyDetails ?? report.emergency_details
      const incidentDetail = report.incidentDetails ?? report.incident_details
      const detail = report.report_type === 'Emergency' ? emergencyDetail : incidentDetail
      const dispatcher = detail?.dispatcher_name || '—'
      const location =
        primaryClient?.incident_address?.trim() ||
        incidentDetail?.incident_barangay?.trim() ||
        report.geographicType?.name || report.geographic_type?.name || zoneName || '—'
      const responders = (report.responders ?? [])
        .map(responder => responder.name)
        .filter((name): name is string => Boolean(name && name.trim()))

      return [
        formatDate(report.date_reported),
        primaryClient?.full_name || '—',
        primaryClient?.age ?? '—',
        primaryClient?.gender || '—',
        report.report_type,
        location,
        dispatcher,
        responders.length > 0 ? responders.join(', ') : '—',
        formatTime(detail?.incident_time || report.time_reported),
      ]
    })
  }

  const loadImageAsBase64 = (url: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = url
    })

  const handleDownloadPdf = async () => {
    if (!zoneName) {
      showMessage('Export Failed', 'Zone name is missing.')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const generatedAt = new Date().toLocaleString()
    const rows = buildExportRows()

    try {
      const [nabuaBase64, mdrrmoBase64] = await Promise.all([
        loadImageAsBase64(nabuaLogoUrl),
        loadImageAsBase64(mdrrmoLogoUrl),
      ])
      doc.addImage(nabuaBase64, 'PNG', 30, 14, 110, 110)
      doc.addImage(mdrrmoBase64, 'PNG', pageWidth - 140, 14, 110, 110)
    } catch {
      // logo failed to load — continue without it
    }

    doc.setFont('times', 'normal')
    doc.setFontSize(18)
    doc.text('Republic of the Philippines', pageWidth / 2, 42, { align: 'center' })
    doc.setFontSize(16)
    doc.text('Province of Camarines Sur', pageWidth / 2, 64, { align: 'center' })
    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.text('Local Government Unit of Nabua', pageWidth / 2, 86, { align: 'center' })
    doc.setTextColor(0, 56, 192)
    doc.setFontSize(19)
    doc.text('Municipal Disaster Risk Reduction & Management Office', pageWidth / 2, 118, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    doc.setFont('times', 'normal')
    doc.setFontSize(12)
    doc.text(
      'Emergency Hotline: (054) 288-10-23 Smart: 0947-1819-217 Globe: 0915-2062-265 Radio Freq: 147.075',
      pageWidth / 2,
      138,
      { align: 'center' }
    )
    doc.text('Email Address: mdrrmonabua@yahoo.com/mdrrmonabua@gmail.com', pageWidth / 2, 156, { align: 'center' })

    doc.setDrawColor(255, 204, 0)
    doc.setLineWidth(2)
    doc.line(30, 168, pageWidth - 30, 168)
    doc.line(30, 174, pageWidth - 30, 174)

    doc.setFont('times', 'bold')
    doc.setFontSize(14)
    doc.text(`${zoneName} Zone Reports`, 40, 206)
    doc.setFont('times', 'normal')
    doc.setFontSize(11)
    doc.text(`Generated: ${generatedAt}`, 40, 226)
    doc.text(`Total Reports: ${rows.length}`, 40, 244)

    autoTable(doc, {
      startY: 258,
      head: [['Date', 'Name', 'Age', 'Gender', 'Type', 'Location', 'Dispatcher', 'Responders', 'Time']],
      body: rows,
      styles: {
        fontSize: 10,
        cellPadding: 6,
      },
      headStyles: {
        fillColor: [30, 99, 220],
      },
      theme: 'striped',
    })

    const fileName = `${slugifyFileName(zoneName)}-zone-reports.pdf`
    doc.save(fileName)
  }

  const handleExportExcel = () => {
    if (!zoneName) {
      showMessage('Export Failed', 'Zone name is missing.')
      return
    }

    const rows = displayedReports.map(report => {
      const primaryClient = report.clients?.[0]
      const emergencyDetail = report.emergencyDetails ?? report.emergency_details
      const incidentDetail = report.incidentDetails ?? report.incident_details
      const detail = report.report_type === 'Emergency' ? emergencyDetail : incidentDetail
      const dispatcher = detail?.dispatcher_name || 'N/A'
      const location =
        primaryClient?.incident_address?.trim() || report.geographicType?.name || report.geographic_type?.name || zoneName || 'N/A'
      const responders = (report.responders ?? [])
        .map(responder => responder.name)
        .filter((name): name is string => Boolean(name && name.trim()))

      return {
        Date: formatDate(report.date_reported),
        Name: primaryClient?.full_name || 'N/A',
        Age: primaryClient?.age ?? 'N/A',
        Gender: primaryClient?.gender || 'N/A',
        Type: report.report_type,
        Location: location,
        Dispatcher: dispatcher,
        Responders: responders.length > 0 ? responders.join(', ') : 'N/A',
        Time: formatTime(detail?.incident_time || report.time_reported),
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Zone Reports')

    const fileName = `${slugifyFileName(zoneName)}-zone-reports.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  const handleDownloadBlankTemplate = () => {
    const a = document.createElement('a')
    a.href = blankTemplatePdfUrl
    a.download = 'template_Emergency_reports.pdf'
    a.click()
  }

  const handleDownloadAllZip = async () => {
    if (displayedReports.length === 0 || isDownloadingAll) return
    setIsDownloadingAll(true)
    setDownloadAllProgress(0)

    const waitForImages = (el: HTMLElement) =>
      Promise.all(
        Array.from(el.querySelectorAll('img')).map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res() })
        )
      )

    const zip = new JSZip()

    for (let i = 0; i < displayedReports.length; i++) {
      const row = displayedReports[i]
      setDownloadAllProgress(i + 1)
      try {
        const response = await api.get(`/reports/${row.id}`)
        const fullReport = response.data as ReportDocumentData
        const pcrData = buildPcrData(fullReport)

        const container = document.createElement('div')
        container.style.cssText = 'position:absolute;left:-9999px;top:0;width:740px;pointer-events:none'
        document.body.appendChild(container)

        const root = createRoot(container)
        await new Promise<void>(res => {
          root.render(<PatientCareReportView data={pcrData} />)
          requestAnimationFrame(() => requestAnimationFrame(() => res()))
        })
        await waitForImages(container)

        const doc = await capturePcrToPdf(container)
        const name = (pcrData.patientName || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        zip.file(`${String(i + 1).padStart(2, '0')}-${name}-${pcrData.date || 'unknown'}.pdf`, doc.output('arraybuffer'))

        root.unmount()
        document.body.removeChild(container)
      } catch {
        // skip failed report and continue
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugifyFileName(zoneName ?? 'zone')}-all-reports-${new Date().toISOString().slice(0, 10)}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setIsDownloadingAll(false)
    setDownloadAllProgress(0)
  }

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <ClientInformationStep
          people={people}
          reportLabel="emergency"
          errors={fieldErrors}
          onChangePerson={updatePerson}
          onAddPerson={addPerson}
          onRemovePerson={removePerson}
        />
      )
    }

    if (currentStep === maxStep) {
      return (
        <ReviewSubmitStep
          reportKind={reportKind}
          zoneName={zoneName ?? 'N/A'}
          people={people}
          personForms={personForms}
          onChangePerson={updatePerson}
          onChangePersonForm={(idx, key, value) => updatePersonFormField(idx, key as keyof PersonFormData, value)}
          onChangeVitalSign={(personIdx, rowIdx, key, value) => {
            setPersonForms(prev => {
              const next = [...prev]
              const vitals = [...(next[personIdx]?.vitalSigns ?? [])]
              if (vitals[rowIdx]) vitals[rowIdx] = { ...vitals[rowIdx], [key]: value }
              next[personIdx] = { ...next[personIdx], vitalSigns: vitals }
              return next
            })
          }}
          onChangeGlasgow={(personIdx, rowIdx, key, value) => {
            setPersonForms(prev => {
              const next = [...prev]
              const scores = [...(next[personIdx]?.glasgowScores ?? [])]
              if (scores[rowIdx]) scores[rowIdx] = { ...scores[rowIdx], [key]: value }
              next[personIdx] = { ...next[personIdx], glasgowScores: scores }
              return next
            })
          }}
          onAddPerson={addPerson}
          onRemovePerson={removePerson}
        />
      )
    }

    const clampedPersonIdx = Math.min(activePersonIdx, people.length - 1)
    const showPersonTabs = people.length > 1
    return (
      <div>
        {showPersonTabs && (
          <div className="d-flex align-items-center gap-2 flex-wrap mb-3 pb-2" style={{ borderBottom: '1px solid #e9ecef' }}>
            {people.map((p, pi) => {
              const tabName = [p.firstName, p.lastName].filter(Boolean).join(' ') || `Person ${pi + 1}`
              const isActive = pi === clampedPersonIdx
              return (
                <button
                  key={pi}
                  type="button"
                  className={`btn btn-sm fw-semibold ${isActive ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ borderRadius: 20, fontSize: 13 }}
                  onClick={() => setActivePersonIdx(pi)}
                >
                  <i className="bi bi-person me-1" />
                  {tabName}
                </button>
              )
            })}
          </div>
        )}
        {people.map((person, pi) => {
          if (people.length > 1 && pi !== clampedPersonIdx) return null
          const pf = personForms[pi] ?? createEmptyPersonForm()
          const patientName = [person.firstName, person.lastName].filter(Boolean).join(' ') || `Person ${pi + 1}`
          const pfx = `p${pi}-`
          const errorsForPerson: Record<string, string> = {}
          Object.entries(fieldErrors).forEach(([k, v]) => {
            if (k.startsWith(pfx)) errorsForPerson[k.slice(pfx.length)] = v
          })
          const onPfChange = (key: string, value: string) => updatePersonFormField(pi, key as keyof PersonFormData, value)
          const vitals = makeVitalUpdater(pi)
          const glasgows = makeGlasgowUpdater(pi)
          const multiPerson = people.length > 1
          const multiPatientName = multiPerson ? patientName : undefined

          if (reportKind === 'emergency') {
            if (currentStep === 2) return (
              <EmergencyIncidentDetailsStep key={pi}
                patientName={multiPatientName}
                mechanism={pf.mechanism} natureIllness={pf.natureIllness}
                typeEmergency={pf.typeEmergency} natureOfCall={pf.natureOfCall}
                incidentDate={pf.incidentDate} incidentTime={pf.incidentTime}
                obLmp={pf.obLmp} obAog={pf.obAog} obEdd={pf.obEdd}
                obGravida={pf.obGravida} obPara={pf.obPara} obTerm={pf.obTerm}
                obPreterm={pf.obPreterm} obAbortion={pf.obAbortion} obLiving={pf.obLiving}
                errors={errorsForPerson} onChange={onPfChange}
              />
            )
            if (currentStep === 3) return (
              <AssessmentCareStep key={pi}
                patientName={multiPatientName}
                chiefComplaint={pf.chiefComplaint} loc={pf.loc} airway={pf.airway}
                breathing={pf.breathing} circulation={pf.circulation}
                capillaryRefill={pf.capillaryRefill} pupils={pf.pupils}
                typeEmergency={pf.typeEmergency}
                vitalSigns={pf.vitalSigns} glasgowScores={pf.glasgowScores}
                obLmp={pf.obLmp} obAog={pf.obAog} obEdd={pf.obEdd}
                obGravida={pf.obGravida} obPara={pf.obPara} obTerm={pf.obTerm}
                obPreterm={pf.obPreterm} obAbortion={pf.obAbortion} obLiving={pf.obLiving}
                errors={errorsForPerson} onChange={onPfChange}
                onVitalSignChange={vitals.update} onAddVitalSign={vitals.add} onRemoveVitalSign={vitals.remove}
                onGlasgowChange={glasgows.update} onAddGlasgow={glasgows.add} onRemoveGlasgow={glasgows.remove}
              />
            )
            if (currentStep === 4) return (
              <AmbulanceTransferStep key={pi}
                patientName={multiPatientName}
                ambulanceDriver={pf.ambulanceDriver} dispatcher={pf.dispatcher}
                ambulanceResponders={pf.ambulanceResponders}
                receivingFacility={pf.receivingFacility} receivingPersonnel={pf.receivingPersonnel}
                uploadedPhoto={pf.uploadedPhoto}
                onChange={onPfChange} onPhotoChange={makePhotoHandler(pi)}
              />
            )
          }

          return null
        })}
      </div>
    )
  }

  const handleModalHeaderMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button, input, select, textarea, a, label')) {
      return
    }
    dragStartRef.current = { x: event.clientX, y: event.clientY }
    dragOriginRef.current = { ...modalOffset }
    setIsModalDragging(true)
  }

  if (!zoneName) {
    return <Navigate to={`${roleBase}/zonal-reports`} replace />
  }

  const TOUR_STEPS: Step[] = [
    { target: '.zr-heading', placement: 'bottom', skipBeacon: true, title: 'Zone Reports', content: 'This page manages all emergency and incident reports for this specific zone.' },
    { target: '.zr-btn-create', placement: 'bottom', skipBeacon: true, title: 'Create Report', content: 'Click here to open the multi-step form and submit a new emergency report for this zone.' },
    { target: '.zr-btn-pdf', placement: 'bottom', skipBeacon: true, title: 'Download Options', content: 'Export the current list of reports as a PDF or Excel file, or download bulk report PDFs as a ZIP.' },
    { target: '.zr-card', placement: 'top', skipBeacon: true, title: 'Report Cards', content: 'Each card represents one submitted report. Click the eye icon to view the full document, or the edit icon to make corrections.' },
  ]

  return (
    <section className="zr-page">
      <PageTour steps={TOUR_STEPS} storageKey="dermas_tour_done_zr" />
      <div className="zr-top">
        <Modal open={isViewOpen} close={closeViewModal}>
          {(() => {
            const currentViewIdx = viewingReportId != null ? displayedReports.findIndex(r => r.id === viewingReportId) : -1
            const hasPrev = currentViewIdx > 0
            const hasNext = currentViewIdx >= 0 && currentViewIdx < displayedReports.length - 1
            const recordLabel = currentViewIdx >= 0 ? `Record ${currentViewIdx + 1} of ${displayedReports.length}` : undefined
            return (
              <ReportDocumentModal
                report={selectedReport}
                isLoading={isViewLoading}
                onClose={closeViewModal}
                hasPrev={hasPrev}
                hasNext={hasNext}
                recordLabel={recordLabel}
                onPrev={() => hasPrev && openViewModal(displayedReports[currentViewIdx - 1].id)}
                onNext={() => hasNext && openViewModal(displayedReports[currentViewIdx + 1].id)}
              />
            )
          })()}
        </Modal>

        <Modal open={isEditOpen} close={closeEditModal}>
          <ReportEditModal report={editingReport} isSaving={isEditSaving} onClose={closeEditModal} onSave={saveEditedReport} />
        </Modal>

        <Modal open={isCloseConfirmOpen} close={() => setIsCloseConfirmOpen(false)}>
          <div className="zr-doc-backdrop" role="dialog" aria-modal="true">
            <div className="zr-doc-modal" style={{ maxWidth: 520 }}>
              <div className="zr-doc-modal-header">
                <div>
                  <h5 className="mb-0">Discard Report Draft?</h5>
                  <small>You have unsaved changes in this report.</small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setIsCloseConfirmOpen(false)}
                ></button>
              </div>
              <div className="zr-doc-modal-body">
                <p className="mb-3">If you close now, your in-progress draft will be canceled.</p>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setIsCloseConfirmOpen(false)}>
                    Continue Editing
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDiscardCreate}>
                    Discard Draft
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        <Modal open={pendingDeleteReportId !== null} close={() => setPendingDeleteReportId(null)}>
          <div className="zr-doc-backdrop" role="dialog" aria-modal="true">
            <div className="zr-doc-modal" style={{ maxWidth: 520 }}>
              <div className="zr-doc-modal-header">
                <div>
                  <h5 className="mb-0">Move Report to Trash?</h5>
                  <small>It will be permanently deleted after 30 days.</small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setPendingDeleteReportId(null)}
                ></button>
              </div>
              <div className="zr-doc-modal-body">
                <p className="mb-3">The report will be moved to Trash. You can restore it within 30 days.</p>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setPendingDeleteReportId(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteReport}>
                    Move to Trash
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        <Modal open={messageState.open} close={closeMessage}>
          <div className="zr-doc-backdrop" role="dialog" aria-modal="true">
            <div className="zr-doc-modal" style={{ maxWidth: 520 }}>
              <div className="zr-doc-modal-header">
                <div>
                  <h5 className="mb-0">{messageState.title}</h5>
                </div>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeMessage}></button>
              </div>
              <div className="zr-doc-modal-body">
                <p className="mb-3" style={{ whiteSpace: 'pre-line' }}>
                  {messageState.body}
                </p>
                <div className="d-flex justify-content-end">
                  <button type="button" className="btn btn-primary" onClick={closeMessage}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        <Modal open={open} close={requestCloseCreateModal}>
          <div className="zr-modal-backdrop" role="dialog" aria-modal="true">
              <div
                className={`zr-modal-panel${isModalDragging ? ' is-dragging' : ''}`}
                style={{ transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }}
              >
              <div className="zr-modal-header" onMouseDown={handleModalHeaderMouseDown}>
                <h5 className="mb-0">
                  <i className="bi bi-clipboard-plus me-2"></i>
                  Create Emergency Report
                  <span className="zr-modal-badge">MDRRMO</span>
                </h5>

                <div className="zr-modal-header-actions">
                  <button type="button" className="btn-close btn-close-white" onClick={requestCloseCreateModal}></button>
                </div>
              </div>

              <div className="zr-modal-content-wrap">
                <div className="zr-modal-stepper-shell">
                  <div className="zr-modal-stepper">
                    <ZoneReportStepper steps={steps} currentStep={currentStep} />
                  </div>
                </div>

                <div className="zr-modal-step-shell">
                  <div className="zr-modal-body">{renderStepContent()}</div>
                </div>
              </div>

              <div className="zr-modal-footer">
                  <div className="zr-modal-footer-left">
                    <button
                      type="button"
                      className="btn btn-stepper-prev"
                      onClick={goPrev}
                      style={{ visibility: currentStep === 1 ? 'hidden' : 'visible' }}
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      Previous
                    </button>
                  </div>

                  {currentStep < maxStep ? (
                    <button type="button" className="btn btn-stepper-next" onClick={goNext} disabled={isSaving}>
                      Next
                      <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  ) : (
                    <button type="button" className="btn btn-stepper-submit" onClick={submitReport} disabled={isSaving}>
                      <i className="bi bi-check-circle me-1"></i>
                      {isSaving ? 'Submitting...' : 'Submit Report'}
                    </button>
                  )}
                </div>
              </div>
            </div>
        </Modal>
        <div className="zr-heading">
          <h1 className="zr-title mb-1">{zoneName} Zone Reports</h1>
          <p className="zr-breadcrumb mb-0">
            <Link to={`${roleBase}/zonal-reports`} className="zr-crumb-link">
              Manage Reports
            </Link>
            <span className="zr-crumb-sep">/</span>
            <span className="zr-crumb-current">{zoneName}</span>
          </p>
        </div>

        <div className="zr-actions">
          {/* Primary action */}
          <button onClick={openCreateModal} type="button" className="zr-btn zr-btn-create">
            <i className="bi bi-clipboard2-plus me-2"></i>
            Create Emergency Report
          </button>

          <Link to={`${roleBase}/zonal-reports`} className="zr-btn zr-btn-back">
            <i className="bi bi-arrow-left me-2"></i>
            Back to Zones
          </Link>

          {/* Downloads dropdown */}
          <div className="zr-dl-menu-wrap" ref={downloadsMenuRef}>
            <button
              type="button"
              className={`zr-btn zr-btn-pdf${downloadsOpen ? ' zr-btn-pdf--open' : ''}`}
              onClick={() => setDownloadsOpen(o => !o)}
            >
              <i className="bi bi-download me-2"></i>
              Downloads
              <i className={`bi bi-chevron-down ms-2 zr-dl-chevron${downloadsOpen ? ' zr-dl-chevron--up' : ''}`}></i>
            </button>

            {downloadsOpen && (
              <div className="zr-dl-menu">
                <button
                  type="button"
                  className="zr-dl-item"
                  onClick={() => { handleDownloadPdf(); setDownloadsOpen(false) }}
                >
                  <i className="bi bi-file-earmark-pdf zr-dl-icon zr-dl-icon--pdf"></i>
                  <span>
                    <strong>Download PDF</strong>
                    <small>Zone summary table</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="zr-dl-item"
                  onClick={() => { handleDownloadAllZip(); setDownloadsOpen(false) }}
                  disabled={isDownloadingAll || displayedReports.length === 0}
                >
                  <i className="bi bi-file-zip zr-dl-icon zr-dl-icon--zip"></i>
                  <span>
                    {isDownloadingAll ? (
                      <><strong>Downloading…</strong><small>{downloadAllProgress} / {displayedReports.length} reports</small></>
                    ) : (
                      <><strong>Download All (ZIP)</strong><small>{displayedReports.length} individual PDFs</small></>
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className="zr-dl-item"
                  onClick={() => { handleExportExcel(); setDownloadsOpen(false) }}
                >
                  <i className="bi bi-file-earmark-excel zr-dl-icon zr-dl-icon--excel"></i>
                  <span>
                    <strong>Export Excel</strong>
                    <small>Spreadsheet format</small>
                  </span>
                </button>

                <div className="zr-dl-divider"></div>

                <button
                  type="button"
                  className="zr-dl-item"
                  onClick={() => { handleDownloadBlankTemplate(); setDownloadsOpen(false) }}
                >
                  <i className="bi bi-file-earmark-arrow-down zr-dl-icon zr-dl-icon--template"></i>
                  <span>
                    <strong>Blank Template</strong>
                    <small>Empty report form PDF</small>
                  </span>
                </button>
              </div>
            )}
          </div>

          <button type="button" className="zr-btn zr-btn-back" onClick={refreshTableNow} disabled={isTableRefreshing}>
            <i className={`bi bi-arrow-clockwise me-2${isTableRefreshing ? ' zr-spin' : ''}`}></i>
            {isTableRefreshing ? 'Refreshing…' : 'Refresh Table'}
          </button>
        </div>
      </div>

      <div className="zr-card">
        <div className="row g-3">
          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Filter By Type</label>
            <select className="zr-select form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              {FILTER_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Filter By Gender</label>
            <select className="zr-select form-select" value={filterGender} onChange={e => setFilterGender(e.target.value)}>
              {FILTER_GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Filter By Dispatcher</label>
            <select className="zr-select form-select" value={filterDispatcher} onChange={e => setFilterDispatcher(e.target.value)}>
              {dispatcherOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Sort By Date</label>
            <select className="zr-select form-select" value={filterSort} onChange={e => setFilterSort(e.target.value)}>
              {FILTER_SORT.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="col-12 col-xl-4">
            <label className="zr-label">Search</label>
            <div className="zr-search-wrap">
              <i className="bi bi-search zr-search-icon"></i>
              <input
                type="text"
                className="zr-search-input"
                placeholder="Search by name, location, age, responders..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="zr-table-wrap">
        <div className="table-responsive">
          <table className="table zr-table zr-reports-table mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Type</th>
                <th>Location</th>
                <th>Dispatcher</th>
                <th>Responders</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedReports.length < 1 ? (
                hasLoadedReports ? (
                <tr>
                  <td colSpan={10} className="zr-empty">
                    No reports found
                  </td>
                </tr>
                ) : null
              ) : (
                displayedReports.map(report => {
                  const primaryClient = report.clients?.[0]
                  const emergencyDetail = report.emergencyDetails ?? report.emergency_details
                  const incidentDetail = report.incidentDetails ?? report.incident_details
                  const detail = report.report_type === 'Emergency' ? emergencyDetail : incidentDetail
                  const transfer = report.ambulanceTransfer ?? report.ambulance_transfer
                  const dispatcher = transfer?.dispatcher?.trim() || detail?.dispatcher_name?.trim() || '—'
                  const location = report.report_type === 'Incident'
                    ? (incidentDetail?.incident_barangay?.trim() || primaryClient?.incident_address?.trim() || '—')
                    : (primaryClient?.incident_address?.trim() || report.geographicType?.name || report.geographic_type?.name || zoneName || '—')
                  const responderStr = transfer?.responders?.trim() ||
                    (report.responders ?? []).map(r => r.name).filter((n): n is string => Boolean(n?.trim())).join(', ') || '—'
                  const typeClass = report.report_type === 'Emergency' ? 'zr-type-emergency' : 'zr-type-incident'
                  const isDeleting = deletingReportIds.includes(report.id)
                  const isViewing = viewingReportId === report.id

                  return (
                    <tr key={report.id} style={isViewing ? { background: '#e8f4fd', outline: '2px solid #0d6efd' } : undefined}>
                      <td data-label="Date">{formatDate(report.date_reported)}</td>
                      <td data-label="Client Name">{highlightMatch(primaryClient?.full_name || '—')}</td>
                      <td data-label="Age">{primaryClient?.age ?? '—'}</td>
                      <td data-label="Gender">{primaryClient?.gender || '—'}</td>
                      <td data-label="Type">
                        <span className={`zr-type-badge ${typeClass}`}>{highlightMatch(report.report_type)}</span>
                      </td>
                      <td data-label="Location">{highlightMatch(location)}</td>
                      <td data-label="Dispatcher">{highlightMatch(dispatcher)}</td>
                      <td data-label="Responders">{highlightMatch(responderStr)}</td>
                      <td data-label="Time">{formatTime(detail?.incident_time || report.time_reported)}</td>
                      <td data-label="Actions" className="zr-actions-cell">
                        <div className="zr-actions-group">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => openEditModal(report.id)}
                            disabled={isDeleting}
                            title="Edit"
                          >
                            <i className="bi bi-pencil-square"></i>
                            <span className="zr-action-text"> Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() => openViewModal(report.id)}
                            disabled={isDeleting}
                            title="View"
                          >
                            <i className="bi bi-eye"></i>
                            <span className="zr-action-text"> View</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteReport(report.id)}
                            disabled={isDeleting}
                            title={isDeleting ? 'Deleting...' : 'Delete'}
                          >
                            <i className={`bi ${isDeleting ? 'bi-arrow-repeat' : 'bi-trash3'}`}></i>
                            <span className="zr-action-text"> {isDeleting ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </section>
  )
}
