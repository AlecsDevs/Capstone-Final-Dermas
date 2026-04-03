import { Link, Navigate, useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import '../../style/zone_report.css'
import { Modal } from '../../components/Modal'
import '../../style/emergency-report.css'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
const ZONE_REPORTS_CACHE_PREFIX = 'zone_reports_cache_v1:'
const ZONE_REPORTS_CACHE_TTL_MS = 60 * 1000

const slugifyFileName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

interface GeographicTypeItem {
  id: number
  name: string
}

interface ReportClientItem {
  id: number
  full_name: string
  age: number | null
  gender: string | null
  incident_address?: string | null
}

interface ReportDetailItem {
  dispatcher_name?: string | null
  nature_of_call?: string | null
  incident_time?: string | null
}

interface ReportResponderItem {
  id: number
  name: string | null
}

interface ReportTableItem {
  id: number
  report_type: 'Emergency' | 'Incident'
  date_reported: string
  time_reported: string
  geographicType?: GeographicTypeItem | null
  geographic_type?: GeographicTypeItem | null
  clients?: ReportClientItem[]
  emergencyDetails?: ReportDetailItem | null
  emergency_details?: ReportDetailItem | null
  incidentDetails?: ReportDetailItem | null
  incident_details?: ReportDetailItem | null
  responders?: ReportResponderItem[]
}

const toTableItem = (raw: any): ReportTableItem | null => {
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

type MessageState = {
  open: boolean
  title: string
  body: string
}

export default function Zone_Report() {
  const { zoneSlug } = useParams<{ zoneSlug: string }>()
  const zoneName = getZoneNameFromSlug(zoneSlug)
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [reportKind, setReportKind] = useState<ReportKind>(null)
  const [reportId, setReportId] = useState<number | null>(null)
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
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null)
  const [uploadedPhotoFile, setUploadedPhotoFile] = useState<File | null>(null)
  const [people, setPeople] = useState<PersonInfo[]>([createEmptyPerson()])
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [filterType, setFilterType] = useState('All Reports')
  const [filterDispatcher, setFilterDispatcher] = useState('All Dispatchers')
  const [searchTerm, setSearchTerm] = useState('')
  const [messageState, setMessageState] = useState<MessageState>({ open: false, title: '', body: '' })
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const [pendingDeleteReportId, setPendingDeleteReportId] = useState<number | null>(null)

  const showMessage = (title: string, body: string) => {
    setMessageState({ open: true, title, body })
  }

  const upsertTableReport = (raw: any) => {
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
    reportId !== null ||
    hasFilledPerson ||
    hasFilledForm ||
    Boolean(uploadedPhoto) ||
    Boolean(uploadedPhotoFile)

  const getGeographicTypeId = () => {
    const matchingGeo = geographicTypes.find(item => item.name === zoneName)
    const fallbackGeoId = zoneName ? ZONES.findIndex(name => name === zoneName) + 1 : 0
    return matchingGeo?.id ?? (fallbackGeoId > 0 ? fallbackGeoId : null)
  }

  const refreshReports = async () => {
    if (!zoneName) {
      return
    }

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
      try {
        const cacheKey = `${ZONE_REPORTS_CACHE_PREFIX}${zoneName}:${filterType}`
        sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: incoming }))
      } catch {
        // Ignore cache write errors.
      }
    } catch {
      setTableReports([])
    } finally {
      setHasLoadedReports(true)
    }
  }

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
    setReportId(null)
    setIsSaving(false)
    setUploadedPhoto(null)
    setUploadedPhotoFile(null)
    setPeople([createEmptyPerson()])
    setForm(INITIAL_FORM)
  }

  const closeModal = () => {
    setOpen(false)
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
    if (reportId) {
      try {
        await api.delete(`/reports/${reportId}`)
        await refreshReports()
      } catch {
        // Ignore cleanup failures and still close the modal.
      }
    }

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
    setOpen(true)
  }

  const selectReportKind = (kind: Exclude<ReportKind, null>) => {
    setReportKind(kind)
    setCurrentStep(1)
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
          return {
            full_name: (client as any).full_name ?? '',
            age: (client as any).age ?? null,
            gender: (client as any).gender ?? 'Male',
            nationality: (client as any).nationality ?? null,
            contact_number: (client as any).contact_number ?? null,
            permanent_address: (client as any).permanent_address ?? null,
            incident_address: (client as any).incident_address ?? null,
          }
        }

        return {
          full_name: normalizedFullName,
          age: payload.client_age ? Number(payload.client_age) : null,
          gender: normalizedGender,
          nationality: (client as any).nationality ?? null,
          contact_number: payload.client_contact_number || null,
          permanent_address: (client as any).permanent_address ?? null,
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
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message
      const firstValidation = error?.response?.data?.errors as Record<string, string[]> | undefined
      const firstValidationMessage = firstValidation ? Object.values(firstValidation)[0]?.[0] : null
      showMessage('Update Failed', apiMessage || firstValidationMessage || 'Unable to update report.')
    } finally {
      setIsEditSaving(false)
    }
  }

  const deleteReport = async (id: number) => {
    setPendingDeleteReportId(id)
  }

  const confirmDeleteReport = async () => {
    if (!pendingDeleteReportId) {
      return
    }

    const snapshot = tableReports
    setTableReports(prev => prev.filter(report => report.id !== pendingDeleteReportId))

    try {
      await api.delete(`/reports/${pendingDeleteReportId}`)
      refreshReports().catch(() => undefined)
      showMessage('Success', 'Report deleted successfully.')
    } catch {
      setTableReports(snapshot)
      showMessage('Delete Failed', 'Unable to delete this report.')
    } finally {
      setPendingDeleteReportId(null)
    }
  }

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const updateResponder = (index: number, value: string) => {
    setForm(prev => {
      const nextResponders = [...prev.responders]
      nextResponders[index] = value
      return { ...prev, responders: nextResponders }
    })
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

  const ensureReportDraft = async (): Promise<number> => {
    if (reportId) {
      return reportId
    }

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

    setReportId(createdId)
    return createdId
  }

  const saveCurrentStep = async () => {
    if (!reportKind) {
      return
    }

    if (currentStep === 1) {
      const geographicTypeId = getGeographicTypeId()
      if (!geographicTypeId) {
        throw new Error('Geographic type was not found. Please try again.')
      }

      const clientsPayload = buildClientPayload()
      const id = await ensureReportDraft()

      const draftPayload: {
        geographic_type_id: number
        date_reported?: string
        time_reported?: string
      } = {
        geographic_type_id: geographicTypeId,
      }

      if (form.incidentDate) {
        draftPayload.date_reported = form.incidentDate
      }

      if (form.incidentTime) {
        draftPayload.time_reported = toHHMM(form.incidentTime)
      }

      await api.put(`/reports/${id}`, {
        ...draftPayload,
      })

      await api.put(`/reports/${id}/clients`, {
        clients: clientsPayload,
      })
      return
    }

    if (currentStep === 2 && reportKind === 'emergency') {
      const id = await ensureReportDraft()

      await api.put(`/reports/${id}/emergency-details`, {
        mechanism_of_injury: form.mechanism || null,
        nature_of_illness: form.natureIllness || null,
        type_of_emergency: form.typeEmergency || null,
        incident_date: form.incidentDate,
        incident_time: toHHMM(form.incidentTime),
        dispatcher_name: form.dispatchOfficer,
      })

      await api.put(`/reports/${id}/responders`, {
        responders: form.responders.filter(name => name.trim().length > 0),
      })
      return
    }

    if (currentStep === 2 && reportKind === 'incident') {
      const id = await ensureReportDraft()

      await api.put(`/reports/${id}/incident-details`, {
        type_of_hazard: form.typeOfHazard,
        nature_of_call: form.natureOfCall,
        incident_date: form.incidentDate,
        incident_time: toHHMM(form.incidentTime),
        dispatcher_name: form.dispatchOfficer,
      })

      await api.put(`/reports/${id}/responders`, {
        responders: form.responders.filter(name => name.trim().length > 0),
      })
      return
    }

    if (currentStep === 3 && reportKind === 'emergency') {
      const id = await ensureReportDraft()

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
      return
    }

    const isPhotoStep =
      (reportKind === 'emergency' && currentStep === 4) ||
      (reportKind === 'incident' && currentStep === 3)

    if (isPhotoStep) {
      const id = await ensureReportDraft()

      if (!uploadedPhotoFile && !uploadedPhoto) {
        throw new Error('Please upload a photo before proceeding.')
      }

      if (!uploadedPhotoFile) {
        return
      }

      const formData = new FormData()
      formData.append('photo', uploadedPhotoFile)

      await api.post(`/reports/${id}/photos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    }
  }

  const goNext = async () => {
    if (!reportKind || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      await saveCurrentStep()
      setCurrentStep(prev => Math.min(prev + 1, maxStep))
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message
      const firstValidation = error?.response?.data?.errors as Record<string, string[]> | undefined
      const firstValidationMessage = firstValidation ? Object.values(firstValidation)[0]?.[0] : null
      showMessage('Save Failed', apiMessage || firstValidationMessage || 'Unable to save this step. Please check your inputs.')
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
    setReportId(null)
    setUploadedPhoto(null)
    setUploadedPhotoFile(null)
    setPeople([createEmptyPerson()])
    setForm(INITIAL_FORM)
  }

  const submitReport = async () => {
    if (!reportKind || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      const id = await ensureReportDraft()
      const response = await api.post(`/reports/${id}/submit`)

      upsertTableReport(response.data?.report)
      refreshReports().catch(() => undefined)

      closeModal()
      showMessage('Success', 'Report submitted successfully.')
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message
      const details = error?.response?.data?.errors
      const issues = Array.isArray(details) && details.length > 0 ? `\n- ${details.join('\n- ')}` : ''
      showMessage('Submit Failed', (apiMessage || 'Unable to submit report.') + issues)
    } finally {
      setIsSaving(false)
    }
  }

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

      try {
        const cacheKey = `${ZONE_REPORTS_CACHE_PREFIX}${zoneName}:${filterType}`
        const rawCache = sessionStorage.getItem(cacheKey)
        if (rawCache) {
          const parsed = JSON.parse(rawCache) as { ts: number; data: ReportTableItem[] }
          if (Array.isArray(parsed?.data) && Date.now() - Number(parsed.ts ?? 0) <= ZONE_REPORTS_CACHE_TTL_MS) {
            setTableReports(parsed.data)
            setHasLoadedReports(true)
          }
        }
      } catch {
        // Ignore cache parse errors.
      }

      await refreshReports()
    }

    loadReports()

    return () => {
      ignore = true
    }
  }, [zoneName, geographicTypes])

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
            peopleCount={people.length}
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
            peopleCount={people.length}
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
            uploadedPhoto={uploadedPhoto}
          />
        )
      }
    }

    return null
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
          <div className="zr-modal-backdrop" role="dialog" aria-modal="true">
            <div className="zr-modal-panel">
              <div className="zr-modal-header">
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
                        <button type="button" className="btn btn-stepper-back-top" onClick={goBackToReportType}>
                          <i className="bi bi-arrow-left me-1"></i>
                          Back to Report Type
                        </button>
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
          <table className="table zr-table mb-0">
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

                  return (
                    <tr key={report.id}>
                      <td>{formatDate(report.date_reported)}</td>
                      <td>{highlightMatch(primaryClient?.full_name || 'N/A')}</td>
                      <td>{primaryClient?.age ?? 'N/A'}</td>
                      <td>{primaryClient?.gender || 'N/A'}</td>
                      <td>
                        <span className={`zr-type-badge ${typeClass}`}>{highlightMatch(report.report_type)}</span>
                      </td>
                      <td>{highlightMatch(location)}</td>
                      <td>{highlightMatch(dispatcher)}</td>
                      <td>{highlightMatch(responders.length > 0 ? responders.join(', ') : 'N/A')}</td>
                      <td>{formatTime(detail?.incident_time || report.time_reported)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => openEditModal(report.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openViewModal(report.id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger ms-1"
                          onClick={() => deleteReport(report.id)}
                        >
                          Delete
                        </button>
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
