import { Link, Navigate, useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import '../../style/zone_report.css'
import { Modal } from '../../components/Modal'
import '../../style/emergency-report.css'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ClientInformationStep } from './zone-report/ClientInformationStep'
import { EmergencyIncidentDetailsStep } from './zone-report/EmergencyIncidentDetailsStep'
import { IncidentReportDetailsStep } from './zone-report/IncidentReportDetailsStep'
import { AssessmentCareStep } from './zone-report/AssessmentCareStep'
import { UploadPhotoStep } from './zone-report/UploadPhotoStep'
import { ReviewSubmitStep } from './zone-report/ReviewSubmitStep'
import { ZoneReportStepper } from './zone-report/stepper/ZoneReportStepper'
import { ReportTypeSelectionStep } from './zone-report/stepper/ReportTypeSelectionStep'
import { EMERGENCY_STEPS } from './zone-report/stepper/emergencySteps'
import { INCIDENT_STEPS } from './zone-report/stepper/incidentSteps'
import { ReportDocumentModal, type ReportDocumentData } from './zone-report/ReportDocumentModal'
import { ReportEditModal, type EditReportPayload } from './zone-report/ReportEditModal'
import api from '../../api/axios'
import {
  INITIAL_FORM,
  createEmptyPerson,
  type FormState,
  type PersonInfo,
  type ReportKind,
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

const ZONES = ['Real Road', 'Poblacion', 'Mountain Area', 'River Side']

const toZoneSlug = (zoneName: string) =>
  zoneName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const getZoneNameFromSlug = (slug?: string) => {
  if (!slug) return null
  return ZONES.find(zone => toZoneSlug(zone) === slug) ?? null
}

const FILTER_TYPES = ['All Reports', 'Emergency', 'Incident']
const FILTER_GENDERS = ['All Genders', 'Male', 'Female']
const DEFAULT_DISPATCHERS = ['Kabochi', 'Fox', 'Pastor']
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
  const zoneName = getZoneNameFromSlug(zoneSlug)
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [reportKind, setReportKind] = useState<ReportKind>(null)
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
  const [isIncidentPreviewOpen, setIsIncidentPreviewOpen] = useState(false)
  const [isPreviewVisible, setIsPreviewVisible] = useState(true)
  const [isPreviewZoomed, setIsPreviewZoomed] = useState(false)
  const [isSmallViewport, setIsSmallViewport] = useState(false)
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 })
  const [isPreviewDragging, setIsPreviewDragging] = useState(false)
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 })
  const [isModalDragging, setIsModalDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragOriginRef = useRef({ x: 0, y: 0 })
  const previewDragStartRef = useRef({ x: 0, y: 0 })
  const previewDragOriginRef = useRef({ x: 0, y: 0 })
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null)
  const [uploadedPhotoFile, setUploadedPhotoFile] = useState<File | null>(null)
  const [people, setPeople] = useState<PersonInfo[]>([createEmptyPerson()])
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})
  const [filterType, setFilterType] = useState('All Reports')
  const [filterDispatcher, setFilterDispatcher] = useState('All Dispatchers')
  const [searchTerm, setSearchTerm] = useState('')
  const [messageState, setMessageState] = useState<MessageState>({ open: false, title: '', body: '' })
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const [pendingDeleteReportId, setPendingDeleteReportId] = useState<number | null>(null)
  const [deletingReportIds, setDeletingReportIds] = useState<number[]>([])
  const [isTableRefreshing, setIsTableRefreshing] = useState(false)
  const draftStorageKey = useMemo(() => `${ZONE_REPORT_DRAFT_PREFIX}${zoneName ?? 'unknown'}`, [zoneName])

  const showMessage = (title: string, body: string) => {
    setMessageState({ open: true, title, body })
  }

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

  const hasFilledForm =
    Object.entries(form).some(([key, value]) => {
      if (key === 'responders') {
        return (value as string[]).some(item => item.trim() !== '')
      }
      return String(value ?? '').trim() !== ''
    })

  const hasStepperChanges =
    reportKind !== null ||
    hasFilledPerson ||
    hasFilledForm ||
    Boolean(uploadedPhoto) ||
    Boolean(uploadedPhotoFile)

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
      form,
      uploadedPhoto,
      updatedAt: Date.now(),
    }

    localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  }, [open, hasStepperChanges, clearCreateDraft, reportKind, currentStep, people, form, uploadedPhoto, draftStorageKey])

  const loadCreateDraft = (): boolean => {
    const rawDraft = localStorage.getItem(draftStorageKey)
    if (!rawDraft) {
      return false
    }

    try {
      const parsed = JSON.parse(rawDraft) as Partial<CreateReportDraft>
      const nextKind = parsed.reportKind === 'emergency' || parsed.reportKind === 'incident' ? parsed.reportKind : null
      const maxForKind = nextKind === 'emergency' ? EMERGENCY_STEPS.length : nextKind === 'incident' ? INCIDENT_STEPS.length : 1
      const nextStep = Math.min(Math.max(Number(parsed.currentStep ?? 1), 1), maxForKind)

      setReportKind(nextKind)
      setCurrentStep(nextStep)
      setPeople(Array.isArray(parsed.people) && parsed.people.length > 0 ? parsed.people : [createEmptyPerson()])
      setForm({ ...INITIAL_FORM, ...(parsed.form ?? {}) })
      setUploadedPhoto(typeof parsed.uploadedPhoto === 'string' ? parsed.uploadedPhoto : null)
      setUploadedPhotoFile(null)
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
        response = await api.get('/reports/summary', {
          params: {
            ...(geographicTypeId ? { geographic_type_id: geographicTypeId } : {}),
            limit: 500,
          },
        })
      } catch {
        response = await api.get('/reports', {
          params: {
            ...(geographicTypeId ? { geographic_type_id: geographicTypeId } : {}),
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
  }, [zoneName, getGeographicTypeId, filterType])

  const steps = useMemo(() => {
    if (reportKind === 'emergency') return EMERGENCY_STEPS
    if (reportKind === 'incident') return INCIDENT_STEPS
    return []
  }, [reportKind])

  const dispatcherOptions = useMemo(() => {
    const available = new Set<string>(DEFAULT_DISPATCHERS)

    tableReports.forEach(report => {
      const emergencyDetail = report.emergencyDetails ?? report.emergency_details
      const incidentDetail = report.incidentDetails ?? report.incident_details
      const detail = report.report_type === 'Emergency' ? emergencyDetail : incidentDetail
      const dispatcher = detail?.dispatcher_name?.trim()
      if (dispatcher) {
        available.add(dispatcher)
      }
    })

    return ['All Dispatchers', ...Array.from(available)]
  }, [tableReports])

  useEffect(() => {
    if (!dispatcherOptions.includes(filterDispatcher)) {
      setFilterDispatcher('All Dispatchers')
    }
  }, [dispatcherOptions, filterDispatcher])

  const displayedReports = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return tableReports.filter(report => {
      if (filterType !== 'All Reports' && report.report_type !== filterType) {
        return false
      }

      const emergencyDetail = report.emergencyDetails ?? report.emergency_details
      const incidentDetail = report.incidentDetails ?? report.incident_details
      const detail = report.report_type === 'Emergency' ? emergencyDetail : incidentDetail
      if (filterDispatcher !== 'All Dispatchers' && detail?.dispatcher_name !== filterDispatcher) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const primaryClient = report.clients?.[0]
      const location =
        primaryClient?.incident_address?.trim() || report.geographicType?.name || report.geographic_type?.name || zoneName || ''
      const responders = (report.responders ?? [])
        .map(responder => responder.name)
        .filter((name): name is string => Boolean(name && name.trim()))
        .join(', ')

      const searchable = [
        primaryClient?.full_name,
        location,
        detail?.dispatcher_name,
        responders,
        report.report_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(normalizedSearch)
    })
  }, [tableReports, filterType, filterDispatcher, searchTerm, zoneName])

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
    setReportKind(null)
    setIsSaving(false)
    setUploadedPhoto(null)
    setUploadedPhotoFile(null)
    setPeople([createEmptyPerson()])
    setForm(INITIAL_FORM)
    setFieldErrors({})
  }

  const closeModal = () => {
    setOpen(false)
    setIsIncidentPreviewOpen(false)
    setIsPreviewVisible(true)
    setIsPreviewZoomed(false)
    setPreviewOffset({ x: 0, y: 0 })
    setIsPreviewDragging(false)
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

  const closeViewModal = () => {
    setIsViewOpen(false)
    setIsViewLoading(false)
    setSelectedReport(null)
  }

  const closeEditModal = () => {
    setIsEditOpen(false)
    setIsEditSaving(false)
    setEditingReport(null)
  }

  const openCreateModal = () => {
    resetStepper()
    setIsPreviewVisible(true)
    setIsPreviewZoomed(false)
    setPreviewOffset({ x: 0, y: 0 })
    setIsPreviewDragging(false)
    setModalOffset({ x: 0, y: 0 })
    setIsModalDragging(false)
    loadCreateDraft()
    setOpen(true)
  }

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)')
    const updateMatch = () => setIsSmallViewport(media.matches)
    updateMatch()
    media.addEventListener('change', updateMatch)
    return () => media.removeEventListener('change', updateMatch)
  }, [])

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

  useEffect(() => {
    if (!isPreviewDragging) {
      return
    }

    const onMouseMove = (event: MouseEvent) => {
      const nextX = previewDragOriginRef.current.x + (event.clientX - previewDragStartRef.current.x)
      const nextY = previewDragOriginRef.current.y + (event.clientY - previewDragStartRef.current.y)
      setPreviewOffset({ x: nextX, y: nextY })
    }

    const onMouseUp = () => {
      setIsPreviewDragging(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isPreviewDragging])

  const selectReportKind = (kind: Exclude<ReportKind, null>) => {
    setReportKind(kind)
    setCurrentStep(1)
  }

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
      const updatedClients = (currentClients.length > 0 ? currentClients : [{}]).map((client, index) => {
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
        }
      })

      await api.put(`/reports/${editingReport.id}/clients`, {
        clients: updatedClients,
      })

      if (editingReport.report_type === 'Emergency') {
        await api.put(`/reports/${editingReport.id}/emergency-details`, {
          mechanism_of_injury: payload.mechanism_of_injury || null,
          nature_of_illness: payload.nature_of_illness || null,
          type_of_emergency: payload.type_of_emergency || null,
          incident_date: payload.incident_date,
          incident_time: toHHMM(payload.incident_time),
          dispatcher_name: payload.dispatcher_name,
        })

        await api.put(`/reports/${editingReport.id}/assessment`, {
          chief_complaint: payload.assessment || null,
          airway: payload.airway || null,
          breathing: payload.breathing || null,
          circulation_support: payload.circulation || null,
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
        })
      } else {
        await api.put(`/reports/${editingReport.id}/incident-details`, {
          type_of_hazard: payload.type_of_hazard,
          nature_of_call: payload.nature_of_call,
          incident_date: payload.incident_date,
          incident_time: toHHMM(payload.incident_time),
          dispatcher_name: payload.dispatcher_name,
        })
      }

      await api.put(`/reports/${editingReport.id}/responders`, {
        responders: payload.responders,
      })

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
        emergencyDetails:
          editingReport.report_type === 'Emergency'
            ? {
                dispatcher_name: payload.dispatcher_name,
                incident_time: toHHMM(payload.incident_time),
                nature_of_call: null,
              }
            : null,
        incidentDetails:
          editingReport.report_type === 'Incident'
            ? {
                dispatcher_name: payload.dispatcher_name,
                incident_time: toHHMM(payload.incident_time),
                nature_of_call: payload.nature_of_call || null,
              }
            : null,
        responders: payload.responders.map((name, index) => ({ id: index + 1, name })),
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
      showMessage('Success', 'Report deleted successfully.')
      refreshReports().catch(() => undefined)
    } catch {
      setTableReports(snapshot)
      showMessage('Delete Failed', 'Unable to delete this report.')
    } finally {
      setDeletingReportIds(prev => prev.filter(id => id !== reportId))
    }
  }

  const refreshTableNow = () => {
    refreshReports().catch(() => undefined)
  }

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))

    if (typeof value === 'string' && value.trim() !== '') {
      setFieldErrors(prev => {
        if (!prev[key as string]) {
          return prev
        }
        const next = { ...prev }
        delete next[key as string]
        return next
      })
    }
  }

  const updateResponder = (index: number, value: string) => {
    setForm(prev => {
      const nextResponders = [...prev.responders]
      nextResponders[index] = value
      return { ...prev, responders: nextResponders }
    })

    if (value.trim() !== '') {
      setFieldErrors(prev => {
        if (!prev.responders) {
          return prev
        }
        const next = { ...prev }
        delete next.responders
        return next
      })
    }
  }

  const addResponder = () => {
    setForm(prev => ({ ...prev, responders: [...prev.responders, ''] }))
  }

  const removeResponder = (index: number) => {
    setForm(prev => {
      if (prev.responders.length === 1) {
        return prev
      }
      return { ...prev, responders: prev.responders.filter((_, i) => i !== index) }
    })
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
    setPeople(prev => [...prev, createEmptyPerson()])
  }

  const removePerson = (index: number) => {
    setPeople(prev => {
      if (prev.length === 1) {
        return prev
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setUploadedPhoto(null)
      setUploadedPhotoFile(null)
      return
    }
    setUploadedPhotoFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      setUploadedPhoto((e.target?.result as string) ?? null)
    }
    reader.readAsDataURL(file)
  }

  const maxStep = Math.max(steps.length, 1)

  const buildClientPayload = () => {
    const clients = people
      .map(person => {
        const fullName = [person.firstName, person.middleName, person.lastName]
          .map(part => part.trim())
          .filter(Boolean)
          .join(' ')

        return {
          full_name: fullName,
          age: person.age ? Number(person.age) : null,
          gender: person.gender,
          nationality: person.nationality.trim() || null,
          contact_number: person.contactNumber.trim() || null,
          permanent_address: person.permanentAddress.trim() || null,
          incident_address: person.incidentLocation.trim() || null,
        }
      })
      .filter(client => client.full_name || client.gender)

    if (clients.length < 1) {
      throw new Error('Please add at least one client with a name and gender.')
    }

    clients.forEach(client => {
      if (!client.full_name || !client.gender) {
        throw new Error('Each client must have both full name and gender.')
      }
    })

    return clients
  }

  const createReportOnSubmit = async (): Promise<number> => {
    const geographicTypeId = getGeographicTypeId()
    if (!geographicTypeId) {
      throw new Error('Geographic type was not found. Please try again.')
    }

    const now = new Date()
    const fallbackDate = now.toISOString().slice(0, 10)
    const fallbackTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const response = await api.post('/reports', {
      report_type: reportKind === 'emergency' ? 'Emergency' : 'Incident',
      geographic_type_id: geographicTypeId,
      date_reported: form.incidentDate || fallbackDate,
      time_reported: toHHMM(form.incidentTime) || fallbackTime,
    })

    const createdId = response.data?.report?.id as number | undefined
    if (!createdId) {
      throw new Error('Failed to create a report draft.')
    }

    return createdId
  }

  const getRequiredErrorsForStep = (step: number): FieldErrorMap => {
    const errors: FieldErrorMap = {}

    if (step === 1) {
      people.forEach((person, index) => {
        if (!person.firstName.trim()) {
          errors[`person-${index}-firstName`] = 'First name is required.'
        }
        if (!person.lastName.trim()) {
          errors[`person-${index}-lastName`] = 'Last name is required.'
        }
        if (!person.gender.trim()) {
          errors[`person-${index}-gender`] = 'Gender is required.'
        }
        if (!person.nationality.trim()) {
          errors[`person-${index}-nationality`] = 'Nationality is required.'
        }
        if (!person.contactNumber.trim()) {
          errors[`person-${index}-contactNumber`] = 'Contact number is required.'
        }
        if (!person.permanentAddress.trim()) {
          errors[`person-${index}-permanentAddress`] = 'Permanent address is required.'
        }
        if (!person.incidentLocation.trim()) {
          errors[`person-${index}-incidentLocation`] = 'Location of incident is required.'
        }
      })
      return errors
    }

    if (reportKind === 'emergency' && step === 2) {
      if (!form.mechanism.trim()) {
        errors.mechanism = 'Mechanism of injury/illness is required.'
      }
      if (!form.natureIllness.trim()) {
        errors.natureIllness = 'Nature of illness is required.'
      }
      if (!form.typeEmergency.trim()) {
        errors.typeEmergency = 'Type of emergency is required.'
      }
      if (!form.incidentDate.trim()) {
        errors.incidentDate = 'Incident date is required.'
      }
      if (!form.incidentTime.trim()) {
        errors.incidentTime = 'Incident time is required.'
      }
      if (!form.dispatchOfficer.trim()) {
        errors.dispatchOfficer = 'Dispatch officer is required.'
      }
      if (!form.responders.some(name => name.trim().length > 0)) {
        errors.responders = 'At least one responder is required.'
      }
      return errors
    }

    if (reportKind === 'incident' && step === 2) {
      if (!form.typeOfHazard.trim()) {
        errors.typeOfHazard = 'Type of hazard is required.'
      }
      if (!form.natureOfCall.trim()) {
        errors.natureOfCall = 'Nature of call is required.'
      }
      if (!form.incidentDate.trim()) {
        errors.incidentDate = 'Incident date is required.'
      }
      if (!form.incidentTime.trim()) {
        errors.incidentTime = 'Incident time is required.'
      }
      if (!form.dispatchOfficer.trim()) {
        errors.dispatchOfficer = 'Dispatch officer is required.'
      }
      if (!form.responders.some(name => name.trim().length > 0)) {
        errors.responders = 'At least one responder is required.'
      }
      return errors
    }

    return errors
  }

  const applyStepErrors = (step: number) => {
    const errors = getRequiredErrorsForStep(step)
    setFieldErrors(errors)
    return Object.keys(errors).length < 1
  }

  const validateAllRequiredForSubmit = () => {
    const stepOneErrors = getRequiredErrorsForStep(1)
    if (Object.keys(stepOneErrors).length > 0) {
      return { errors: stepOneErrors, firstInvalidStep: 1 }
    }

    const stepTwoErrors = getRequiredErrorsForStep(2)
    if (Object.keys(stepTwoErrors).length > 0) {
      return { errors: stepTwoErrors, firstInvalidStep: 2 }
    }

    return { errors: {}, firstInvalidStep: null as number | null }
  }

  const goNext = async () => {
    if (!reportKind || isSaving) {
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

  const goBackToReportType = () => {
    setReportKind(null)
    setCurrentStep(1)
    setUploadedPhoto(null)
    setUploadedPhotoFile(null)
    setPeople([createEmptyPerson()])
    setForm(INITIAL_FORM)
    clearCreateDraft()
  }

  const submitReport = async () => {
    if (!reportKind || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      const { errors, firstInvalidStep } = validateAllRequiredForSubmit()
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        if (firstInvalidStep) {
          setCurrentStep(firstInvalidStep)
        }
        throw new Error('Please complete the required fields.')
      }

      const clientsPayload = buildClientPayload()
      const id = await createReportOnSubmit()

      await api.put(`/reports/${id}/clients`, {
        clients: clientsPayload,
      })

      if (reportKind === 'emergency') {
        await api.put(`/reports/${id}/emergency-details`, {
          mechanism_of_injury: form.mechanism || null,
          nature_of_illness: form.natureIllness || null,
          type_of_emergency: form.typeEmergency || null,
          incident_date: form.incidentDate,
          incident_time: toHHMM(form.incidentTime),
          dispatcher_name: form.dispatchOfficer,
        })

        await api.put(`/reports/${id}/assessment`, {
          assessment: form.assessment || null,
          airway: form.airway || null,
          breathing: form.breathing || null,
          circulation: form.circulation || null,
          wound_care: form.woundCare || null,
          miscellaneous: form.miscellaneous || null,
          coronary: form.coronary || null,
          collapse_witness: form.collapseWitness || null,
          time_of_collapse: toHHMM(form.timeCollapse) || null,
          start_of_cpr: toHHMM(form.startCpr) || null,
          defibrillation_time: toHHMM(form.defibrillation) || null,
          cpr_duration: form.durationCpr ? Number(form.durationCpr) : null,
          rosc: form.rosc || null,
          transferred_to_hospital: form.hospitalTransfer || null,
        })
      }

      if (reportKind === 'incident') {
        await api.put(`/reports/${id}/incident-details`, {
          type_of_hazard: form.typeOfHazard,
          nature_of_call: form.natureOfCall,
          incident_date: form.incidentDate,
          incident_time: toHHMM(form.incidentTime),
          dispatcher_name: form.dispatchOfficer,
        })
      }

      await api.put(`/reports/${id}/responders`, {
        responders: form.responders.filter(name => name.trim().length > 0),
      })

      const photoToUpload = uploadedPhotoFile ?? (uploadedPhoto ? dataUrlToFile(uploadedPhoto, `report-${id}-photo`) : null)
      if (photoToUpload) {
        const formData = new FormData()
        formData.append('photo', photoToUpload)

        await api.post(`/reports/${id}/photos/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      }

      const response = await api.post(`/reports/${id}/submit`)

      upsertTableReport(response.data?.report)
      refreshReports().catch(() => undefined)

      clearCreateDraft()
      closeModal()
      showMessage('Success', 'Report submitted successfully.')
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Please complete the required fields.') {
        return
      }

      const issues = extractApiErrorIssues(error)
      const message = extractApiErrorMessage(error, 'Unable to submit report.')
      showMessage('Submit Failed', message + issues)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    saveCreateDraft()
  }, [open, reportKind, currentStep, people, form, uploadedPhoto, hasStepperChanges, draftStorageKey, saveCreateDraft])

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
    if (!value) return 'N/A'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString()
  }

  const formatTime = (value: string) => {
    if (!value) return 'N/A'
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
      const dispatcher = detail?.dispatcher_name || 'N/A'
      const location =
        primaryClient?.incident_address?.trim() || report.geographicType?.name || report.geographic_type?.name || zoneName || 'N/A'
      const responders = (report.responders ?? [])
        .map(responder => responder.name)
        .filter((name): name is string => Boolean(name && name.trim()))

      return [
        formatDate(report.date_reported),
        primaryClient?.full_name || 'N/A',
        primaryClient?.age ?? 'N/A',
        primaryClient?.gender || 'N/A',
        report.report_type,
        location,
        dispatcher,
        responders.length > 0 ? responders.join(', ') : 'N/A',
        formatTime(detail?.incident_time || report.time_reported),
      ]
    })
  }

  const handleDownloadPdf = () => {
    if (!zoneName) {
      showMessage('Export Failed', 'Zone name is missing.')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const generatedAt = new Date().toLocaleString()
    const rows = buildExportRows()

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

  const renderStepContent = () => {
    if (!reportKind) {
      return <ReportTypeSelectionStep reportKind={reportKind} onSelect={selectReportKind} />
    }

    const primaryPerson = people[0] ?? createEmptyPerson()
    const reportLabel = reportKind === 'emergency' ? 'emergency' : 'incident'
    const onFormChange = (key: string, value: string) => updateField(key as keyof FormState, value)

    if (reportKind === 'emergency') {
      if (currentStep === 1) {
        return (
          <ClientInformationStep
            people={people}
            reportLabel={reportLabel}
            errors={fieldErrors}
            onChangePerson={updatePerson}
            onAddPerson={addPerson}
            onRemovePerson={removePerson}
          />
        )
      }

      if (currentStep === 2) {
        return (
          <EmergencyIncidentDetailsStep
            mechanism={form.mechanism}
            natureIllness={form.natureIllness}
            typeEmergency={form.typeEmergency}
            incidentDate={form.incidentDate}
            incidentTime={form.incidentTime}
            dispatchOfficer={form.dispatchOfficer}
            responders={form.responders}
            errors={fieldErrors}
            onChange={onFormChange}
            onChangeResponder={updateResponder}
            onAddResponder={addResponder}
            onRemoveResponder={removeResponder}
          />
        )
      }

      if (currentStep === 3) {
        return (
          <AssessmentCareStep
            assessment={form.assessment}
            airway={form.airway}
            breathing={form.breathing}
            circulation={form.circulation}
            woundCare={form.woundCare}
            miscellaneous={form.miscellaneous}
            coronary={form.coronary}
            collapseWitness={form.collapseWitness}
            timeCollapse={form.timeCollapse}
            startCpr={form.startCpr}
            defibrillation={form.defibrillation}
            durationCpr={form.durationCpr}
            rosc={form.rosc}
            hospitalTransfer={form.hospitalTransfer}
            errors={fieldErrors}
            onChange={onFormChange}
          />
        )
      }

      if (currentStep === 4) {
        return <UploadPhotoStep uploadedPhoto={uploadedPhoto} onPhotoChange={handlePhotoChange} />
      }

      if (currentStep === 5) {
        return (
          <ReviewSubmitStep
            reportKind="emergency"
            zoneName={zoneName ?? 'N/A'}
            primaryPerson={primaryPerson}
            fallbackFullName={form.fullName}
            incidentDate={form.incidentDate}
            incidentTime={form.incidentTime}
            dispatchOfficer={form.dispatchOfficer}
            responders={form.responders}
            typeEmergency={form.typeEmergency}
            typeOfHazard={form.typeOfHazard}
            natureOfCall={form.natureOfCall}
            mechanism={form.mechanism}
            natureIllness={form.natureIllness}
            assessment={form.assessment}
            airway={form.airway}
            breathing={form.breathing}
            circulation={form.circulation}
            woundCare={form.woundCare}
            miscellaneous={form.miscellaneous}
            coronary={form.coronary}
            collapseWitness={form.collapseWitness}
            timeCollapse={form.timeCollapse}
            startCpr={form.startCpr}
            defibrillation={form.defibrillation}
            durationCpr={form.durationCpr}
            rosc={form.rosc}
            hospitalTransfer={form.hospitalTransfer}
            uploadedPhoto={uploadedPhoto}
          />
        )
      }
    }

    if (reportKind === 'incident') {
      if (currentStep === 1) {
        return (
          <ClientInformationStep
            people={people}
            reportLabel={reportLabel}
            errors={fieldErrors}
            onChangePerson={updatePerson}
            onAddPerson={addPerson}
            onRemovePerson={removePerson}
          />
        )
      }

      if (currentStep === 2) {
        return (
          <IncidentReportDetailsStep
            typeOfHazard={form.typeOfHazard}
            natureOfCall={form.natureOfCall}
            incidentDate={form.incidentDate}
            incidentTime={form.incidentTime}
            dispatchOfficer={form.dispatchOfficer}
            responders={form.responders}
            errors={fieldErrors}
            onChange={onFormChange}
            onChangeResponder={updateResponder}
            onAddResponder={addResponder}
            onRemoveResponder={removeResponder}
          />
        )
      }

      if (currentStep === 3) {
        return <UploadPhotoStep uploadedPhoto={uploadedPhoto} onPhotoChange={handlePhotoChange} />
      }

      if (currentStep === 4) {
        return (
          <ReviewSubmitStep
            reportKind="incident"
            zoneName={zoneName ?? 'N/A'}
            primaryPerson={primaryPerson}
            fallbackFullName={form.fullName}
            incidentDate={form.incidentDate}
            incidentTime={form.incidentTime}
            dispatchOfficer={form.dispatchOfficer}
            responders={form.responders}
            typeEmergency={form.typeEmergency}
            typeOfHazard={form.typeOfHazard}
            natureOfCall={form.natureOfCall}
            mechanism={form.mechanism}
            natureIllness={form.natureIllness}
            assessment={form.assessment}
            airway={form.airway}
            breathing={form.breathing}
            circulation={form.circulation}
            woundCare={form.woundCare}
            miscellaneous={form.miscellaneous}
            coronary={form.coronary}
            collapseWitness={form.collapseWitness}
            timeCollapse={form.timeCollapse}
            startCpr={form.startCpr}
            defibrillation={form.defibrillation}
            durationCpr={form.durationCpr}
            rosc={form.rosc}
            hospitalTransfer={form.hospitalTransfer}
            uploadedPhoto={uploadedPhoto}
          />
        )
      }
    }

    return null
  }

  const showLivePreview = reportKind !== null && currentStep < maxStep
  const showDockPreview = showLivePreview && isPreviewVisible && !isSmallViewport

  const renderIncidentLivePreview = (enableDrag = false) => {
    const primaryPerson = people[0] ?? createEmptyPerson()
    const incidentResponders = form.responders.filter(name => name.trim() !== '')
    const isEmergencyPreview = reportKind === 'emergency'
    const fullName = [primaryPerson.firstName, primaryPerson.middleName, primaryPerson.lastName]
      .filter(Boolean)
      .join(' ') || 'N/A'

    return (
      <article className={`zr-live-preview-pane${isPreviewZoomed ? ' is-zoomed' : ''}`}>
        <div
          className={`zr-live-preview-header${enableDrag ? ' is-draggable' : ''}`}
          onMouseDown={enableDrag ? handlePreviewHeaderMouseDown : undefined}
        >
          <div>
            <h6 className="mb-1">Live {isEmergencyPreview ? 'Emergency' : 'Incident'} Preview</h6>
            <small>Updates while you type</small>
          </div>
          <button
            type="button"
            className={`btn zr-preview-zoom-btn${isPreviewZoomed ? ' is-zoomed' : ''}`}
            onClick={() => setIsPreviewZoomed(prev => !prev)}
            aria-label={isPreviewZoomed ? 'Zoom out preview' : 'Zoom in preview'}
            title={isPreviewZoomed ? 'Zoom out' : 'Zoom in'}
          >
            <i className={`bi ${isPreviewZoomed ? 'bi-zoom-out' : 'bi-zoom-in'}`}></i>
          </button>
        </div>

        <div className="zr-live-preview-paper">
          <div className={`zr-live-preview-canvas${isPreviewZoomed ? ' is-zoomed' : ''}`}>
            <table className="zr-record-table zr-live-preview-table">
              <tbody>
              <tr className="zr-record-section-row">
                <th colSpan={6}>Patient Record</th>
              </tr>
              <tr>
                <th>Patient Name</th>
                <td>{fullName}</td>
                <th>Age</th>
                <td>{primaryPerson.age || 'N/A'}</td>
                <th>Gender</th>
                <td>{primaryPerson.gender || 'N/A'}</td>
              </tr>
              <tr>
                <th>Nationality</th>
                <td>{primaryPerson.nationality || 'N/A'}</td>
                <th>Contact Number</th>
                <td colSpan={3}>{primaryPerson.contactNumber || 'N/A'}</td>
              </tr>
              <tr>
                <th>Permanent Address</th>
                <td colSpan={5}>{primaryPerson.permanentAddress || 'N/A'}</td>
              </tr>
              <tr>
                <th>Location of Incident</th>
                <td colSpan={5}>{primaryPerson.incidentLocation || 'N/A'}</td>
              </tr>

              <tr className="zr-record-section-row">
                <th colSpan={6}>Report Record</th>
              </tr>
              <tr>
                <th>Report Date</th>
                <td>{formatDate(form.incidentDate)}</td>
                <th>Report Time</th>
                <td>{formatTime(form.incidentTime)}</td>
                <th>Dispatcher</th>
                <td>{form.dispatchOfficer || 'N/A'}</td>
              </tr>
              <tr>
                <th>Incident Date</th>
                <td>{formatDate(form.incidentDate)}</td>
                <th>Incident Time</th>
                <td>{formatTime(form.incidentTime)}</td>
                <th>Type</th>
                <td>{isEmergencyPreview ? 'Emergency' : 'Incident'}</td>
              </tr>

              <tr className="zr-record-section-row">
                <th colSpan={6}>{isEmergencyPreview ? 'Incident Details (Emergency)' : 'Incident Details (Incident)'}</th>
              </tr>
              <tr>
                <th>{isEmergencyPreview ? 'Type of Emergency' : 'Type of Hazard'}</th>
                <td>{isEmergencyPreview ? (form.typeEmergency || 'N/A') : (form.typeOfHazard || 'N/A')}</td>
                <th>{isEmergencyPreview ? 'Nature of Illness' : 'Nature of Call'}</th>
                <td colSpan={3}>{isEmergencyPreview ? (form.natureIllness || 'N/A') : (form.natureOfCall || 'N/A')}</td>
              </tr>
              {isEmergencyPreview && (
                <tr>
                  <th>Mechanism of Injury</th>
                  <td colSpan={5}>{form.mechanism || 'N/A'}</td>
                </tr>
              )}
              <tr>
                <th>Responders</th>
                <td colSpan={5}>{incidentResponders.length > 0 ? incidentResponders.join(', ') : 'N/A'}</td>
              </tr>

              {isEmergencyPreview && (
                <>
                  <tr className="zr-record-section-row">
                    <th colSpan={6}>Assessment &amp; Care Record</th>
                  </tr>
                  <tr>
                    <th>Chief Complaint</th>
                    <td colSpan={5}>{form.assessment || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Airway</th>
                    <td>{form.airway || 'N/A'}</td>
                    <th>Breathing</th>
                    <td>{form.breathing || 'N/A'}</td>
                    <th>Circulation</th>
                    <td>{form.circulation || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Wound Care</th>
                    <td>{form.woundCare || 'N/A'}</td>
                    <th>Coronary History</th>
                    <td>{form.coronary || 'N/A'}</td>
                    <th>Collapse Witness</th>
                    <td>{form.collapseWitness || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Time of Collapse</th>
                    <td>{formatTime(form.timeCollapse)}</td>
                    <th>Start of CPR</th>
                    <td>{formatTime(form.startCpr)}</td>
                    <th>Defibrillation</th>
                    <td>{formatTime(form.defibrillation)}</td>
                  </tr>
                  <tr>
                    <th>CPR Duration</th>
                    <td>{form.durationCpr || 'N/A'}</td>
                    <th>ROSC</th>
                    <td>{form.rosc || 'N/A'}</td>
                    <th>Transferred to Hospital</th>
                    <td>{form.hospitalTransfer || 'N/A'}</td>
                  </tr>
                </>
              )}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    )
  }

  const handleModalHeaderMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isSmallViewport) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('button, input, select, textarea, a, label')) {
      return
    }

    dragStartRef.current = { x: event.clientX, y: event.clientY }
    dragOriginRef.current = { ...modalOffset }
    setIsModalDragging(true)
  }

  const handleTogglePreview = () => {
    if (isSmallViewport) {
      setIsIncidentPreviewOpen(true)
      return
    }
    setIsPreviewVisible(prev => !prev)
  }

  const handlePreviewHeaderMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isSmallViewport) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('button, input, select, textarea, a, label')) {
      return
    }

    previewDragStartRef.current = { x: event.clientX, y: event.clientY }
    previewDragOriginRef.current = { ...previewOffset }
    setIsPreviewDragging(true)
  }

  if (!zoneName) {
    return <Navigate to="/admin/zonal-reports" replace />
  }

  return (
    <section className="zr-page">
     
      <div className="zr-top">
        <Modal open={isViewOpen} close={closeViewModal}>
          <ReportDocumentModal report={selectedReport} isLoading={isViewLoading} onClose={closeViewModal} />
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
                  <h5 className="mb-0">Delete Report?</h5>
                  <small>This action cannot be undone.</small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setPendingDeleteReportId(null)}
                ></button>
              </div>
              <div className="zr-doc-modal-body">
                <p className="mb-3">Are you sure you want to delete this report permanently?</p>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setPendingDeleteReportId(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteReport}>
                    Delete
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
          <>
            {showDockPreview && (
              <aside
                className={`zr-live-preview-dock${isPreviewDragging ? ' is-dragging' : ''}${isPreviewZoomed ? ' is-zoomed' : ''}`}
                aria-label="Live Report Preview"
                style={{ transform: `translate(${previewOffset.x}px, ${previewOffset.y}px)` }}
              >
                {renderIncidentLivePreview(true)}
              </aside>
            )}

            <div className="zr-modal-backdrop" role="dialog" aria-modal="true">
              <div
                className={`zr-modal-panel${isModalDragging ? ' is-dragging' : ''}`}
                style={{ transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }}
              >
              <div className="zr-modal-header" onMouseDown={handleModalHeaderMouseDown}>
                <h5 className="mb-0">
                  <i className="bi bi-clipboard-plus me-2"></i>
                  {!reportKind
                    ? 'Create Incident Report'
                    : reportKind === 'emergency'
                      ? 'Create Emergency Report'
                      : 'Create Incident Report'}
                  <span className="zr-modal-badge">MDRRMO</span>
                </h5>

                <div className="zr-modal-header-actions">
                  <button type="button" className="btn-close btn-close-white" onClick={requestCloseCreateModal}></button>
                </div>
              </div>

              <div className="zr-modal-content-wrap">
                {reportKind && (
                    <>
                      <div className="zr-stepper-topbar">
                        <div className="d-flex align-items-center gap-2">
                          <button type="button" className="btn btn-stepper-back-top" onClick={goBackToReportType}>
                            <i className="bi bi-arrow-left me-1"></i>
                            Back to Report Type
                          </button>
                          {showLivePreview && (
                            <button
                              type="button"
                              className={`btn btn-stepper-preview-eye${showDockPreview ? ' is-open' : ''}`}
                              onClick={handleTogglePreview}
                              aria-label="Preview report"
                              title={isSmallViewport ? 'Open preview' : showDockPreview ? 'Hide preview' : 'Show preview'}
                            >
                              <i className={`bi ${isSmallViewport ? 'bi-eye' : showDockPreview ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                          )}
                        </div>
                      </div>

                  <div className="zr-modal-stepper-shell">
                    <div className="zr-modal-stepper">
                      <ZoneReportStepper steps={steps} currentStep={currentStep} />
                    </div>
                  </div>
                    </>
                )}

                <div className="zr-modal-step-shell">
                  <div className="zr-modal-body">{renderStepContent()}</div>
                </div>
              </div>

              {reportKind && (
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
              )}
              </div>
            </div>
          </>
        </Modal>

        <Modal open={isIncidentPreviewOpen} close={() => setIsIncidentPreviewOpen(false)}>
          <div className="zr-doc-backdrop" role="dialog" aria-modal="true">
            <div className="zr-doc-modal" style={{ maxWidth: 920 }}>
              <div className="zr-doc-modal-header">
                <div>
                  <h5 className="mb-0">Incident Preview</h5>
                  <small>Live data preview while creating report</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setIsIncidentPreviewOpen(false)} aria-label="Close"></button>
              </div>
              <div className="zr-doc-modal-body">{renderIncidentLivePreview(false)}</div>
            </div>
          </div>
        </Modal>
        <div className="zr-heading">
          <h1 className="zr-title mb-1">{zoneName} Zone Reports</h1>
          <p className="zr-breadcrumb mb-0">
            <Link to="/admin/zonal-reports" className="zr-crumb-link">
              Manage Reports
            </Link>
            <span className="zr-crumb-sep">/</span>
            <span className="zr-crumb-current">{zoneName}</span>
          </p>
        </div>

        <div className="zr-actions">
          <button
            onClick={openCreateModal}
            type="button"
            className="zr-btn zr-btn-create"
          >
            <i className="bi bi-clipboard2-plus me-2"></i>
            Create Incident Report
          </button>

          <Link to="/admin/zonal-reports" className="zr-btn zr-btn-back">
            <i className="bi bi-arrow-left me-2"></i>
            Back to Zones
          </Link>

          <button type="button" className="zr-btn zr-btn-pdf" onClick={handleDownloadPdf}>
            <i className="bi bi-file-earmark-pdf me-2"></i>
            Download PDF
          </button>

          <button type="button" className="zr-btn zr-btn-excel" onClick={handleExportExcel}>
            <i className="bi bi-file-earmark-excel me-2"></i>
            Export Excel
          </button>

          <button type="button" className="zr-btn zr-btn-back" onClick={refreshTableNow} disabled={isTableRefreshing}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            {isTableRefreshing ? 'Refreshing...' : 'Refresh Table'}
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
            <select className="zr-select form-select" defaultValue="All Genders">
              {FILTER_GENDERS.map(gender => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Filter By Dispatcher</label>
            <select className="zr-select form-select" value={filterDispatcher} onChange={e => setFilterDispatcher(e.target.value)}>
              {dispatcherOptions.map(dispatcher => (
                <option key={dispatcher} value={dispatcher}>
                  {dispatcher}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Sort By Date</label>
            <select className="zr-select form-select" defaultValue="Most Recent">
              {FILTER_SORT.map(sort => (
                <option key={sort} value={sort}>
                  {sort}
                </option>
              ))}
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
                  const dispatcher = detail?.dispatcher_name || 'N/A'
                  const location =
                    primaryClient?.incident_address?.trim() || report.geographicType?.name || report.geographic_type?.name || zoneName || 'N/A'
                  const responders = (report.responders ?? [])
                    .map(responder => responder.name)
                    .filter((name): name is string => Boolean(name && name.trim()))
                  const typeClass = report.report_type === 'Emergency' ? 'zr-type-emergency' : 'zr-type-incident'
                  const isDeleting = deletingReportIds.includes(report.id)

                  return (
                    <tr key={report.id}>
                      <td data-label="Date">{formatDate(report.date_reported)}</td>
                      <td data-label="Client Name">{highlightMatch(primaryClient?.full_name || 'N/A')}</td>
                      <td data-label="Age">{primaryClient?.age ?? 'N/A'}</td>
                      <td data-label="Gender">{primaryClient?.gender || 'N/A'}</td>
                      <td data-label="Type">
                        <span className={`zr-type-badge ${typeClass}`}>{highlightMatch(report.report_type)}</span>
                      </td>
                      <td data-label="Location">{highlightMatch(location)}</td>
                      <td data-label="Dispatcher">{highlightMatch(dispatcher)}</td>
                      <td data-label="Responders">{highlightMatch(responders.length > 0 ? responders.join(', ') : 'N/A')}</td>
                      <td data-label="Time">{formatTime(detail?.incident_time || report.time_reported)}</td>
                      <td data-label="Actions" className="zr-actions-cell">
                        <div className="zr-actions-group">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => openEditModal(report.id)}
                          disabled={isDeleting}
                          aria-label="Edit report"
                          title="Edit"
                        >
                          <i className="bi bi-pencil-square"></i>
                          <span className="zr-action-text">Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openViewModal(report.id)}
                          disabled={isDeleting}
                          aria-label="View report"
                          title="View"
                        >
                          <i className="bi bi-eye"></i>
                          <span className="zr-action-text">View</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger ms-1"
                          onClick={() => deleteReport(report.id)}
                          disabled={isDeleting}
                          aria-label={isDeleting ? 'Deleting report' : 'Delete report'}
                          title={isDeleting ? 'Deleting...' : 'Delete'}
                        >
                          <i className={`bi ${isDeleting ? 'bi-arrow-repeat' : 'bi-trash3'}`}></i>
                          <span className="zr-action-text">{isDeleting ? 'Deleting...' : 'Delete'}</span>
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
