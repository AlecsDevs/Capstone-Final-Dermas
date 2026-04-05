import type { FormState, PersonInfo, ReportKind } from './zoneReport'

export interface GeographicTypeItem {
  id: number
  name: string
}

export interface ReportClientItem {
  id: number
  full_name: string
  age: number | null
  gender: string | null
  nationality?: string | null
  contact_number?: string | null
  permanent_address?: string | null
  incident_address?: string | null
}

export interface ReportDetailItem {
  dispatcher_name?: string | null
  nature_of_call?: string | null
  incident_time?: string | null
}

export interface ReportResponderItem {
  id: number
  name: string | null
}

export interface ReportTableItem {
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

export interface CreateReportDraft {
  reportKind: ReportKind
  currentStep: number
  people: PersonInfo[]
  form: FormState
  uploadedPhoto: string | null
  updatedAt: number
}

export type RawReportPayload = Partial<ReportTableItem> & {
  id?: number | string
  report_type?: 'Emergency' | 'Incident' | string
}

export type ApiErrorPayload = {
  message?: string
  errors?: Record<string, string[]>
}

export type MessageState = {
  open: boolean
  title: string
  body: string
}

export type FieldErrorMap = Record<string, string>
