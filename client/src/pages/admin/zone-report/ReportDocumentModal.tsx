interface GeographicTypeItem {
  id: number
  name: string
}

interface ReportDetailItem {
  mechanism_of_injury?: string | null
  nature_of_illness?: string | null
  type_of_emergency?: string | null
  type_of_hazard?: string | null
  nature_of_call?: string | null
  incident_date?: string | null
  incident_time?: string | null
  dispatcher_name?: string | null
}

interface ClientAssessmentItem {
  chief_complaint?: string | null
  airway?: string | null
  breathing?: string | null
  circulation_support?: string | null
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

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000/api'

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')

export interface ReportDocumentData {
  id: number
  report_type: 'Emergency' | 'Incident'
  status?: string | null
  date_reported: string
  time_reported: string
  created_at?: string | null
  geographicType?: GeographicTypeItem | null
  geographic_type?: GeographicTypeItem | null
  clients?: ReportClientItem[]
  emergencyDetails?: ReportDetailItem | null
  emergency_details?: ReportDetailItem | null
  incidentDetails?: ReportDetailItem | null
  incident_details?: ReportDetailItem | null
  responders?: ReportResponderItem[]
  photos?: ReportPhotoItem[]
}

interface ReportDocumentModalProps {
  report: ReportDocumentData | null
  isLoading: boolean
  onClose: () => void
}

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString()
}

const formatTime = (value?: string | null) => {
  if (!value) return 'N/A'
  const parsed = new Date(`1970-01-01T${value}`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const textOrNA = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return 'N/A'
  return String(value)
}

const hasValue = (value?: string | number | null) => value !== null && value !== undefined && value !== ''

const filterFilledRows = (rows: Array<{ label: string; value?: string | number | null }>) =>
  rows.filter(row => hasValue(row.value))

const resolvePhotoUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }
  if (path.startsWith('/')) {
    return `${SERVER_BASE_URL}${path}`
  }
  return `${SERVER_BASE_URL}/${path}`
}

export function ReportDocumentModal({ report, isLoading, onClose }: ReportDocumentModalProps) {
  const emergencyDetail = report?.emergencyDetails ?? report?.emergency_details
  const incidentDetail = report?.incidentDetails ?? report?.incident_details
  const detail = report?.report_type === 'Emergency' ? emergencyDetail : incidentDetail
  const geographicName = report?.geographicType?.name ?? report?.geographic_type?.name ?? 'N/A'
  const responders = (report?.responders ?? []).map(item => item.name).filter((name): name is string => Boolean(name))
  const photos = report?.photos ?? []
  const clients = report?.clients ?? []
  const namedClients = clients.filter(client => hasValue(client.full_name))
  const primaryAssessment = clients[0]?.assessment

  const reportInfoRows = filterFilledRows([
    { label: 'Geographic Type', value: geographicName === 'N/A' ? null : geographicName },
    { label: 'Date Reported', value: report ? formatDate(report.date_reported) : null },
    { label: 'Time Reported', value: report ? formatTime(report.time_reported) : null },
    { label: 'Created At', value: report ? formatDate(report.created_at ?? null) : null },
    { label: 'Incident Date', value: detail?.incident_date ? formatDate(detail.incident_date) : null },
    { label: 'Incident Time', value: detail?.incident_time ? formatTime(detail.incident_time) : null },
    { label: 'Dispatcher', value: detail?.dispatcher_name },
  ])

  const patientAssessmentRows = filterFilledRows([
    { label: 'Chief Complaint', value: primaryAssessment?.chief_complaint },
    { label: 'History of Coronary Disease', value: primaryAssessment?.history_of_coronary_disease },
    { label: 'Collapse Witness', value: primaryAssessment?.collapse_witness },
    { label: 'Transferred to Hospital', value: primaryAssessment?.transferred_to_hospital },
  ])

  const vitalCareRows = filterFilledRows([
    { label: 'Airway', value: primaryAssessment?.airway },
    { label: 'Breathing', value: primaryAssessment?.breathing },
    { label: 'Circulation Support', value: primaryAssessment?.circulation_support },
    { label: 'Wound Care', value: primaryAssessment?.wound_care },
    { label: 'Time of Collapse', value: primaryAssessment?.time_of_collapse ? formatTime(primaryAssessment.time_of_collapse) : null },
    { label: 'Start of CPR', value: primaryAssessment?.start_of_cpr ? formatTime(primaryAssessment.start_of_cpr) : null },
    { label: 'Defibrillation Time', value: primaryAssessment?.defibrillation_time ? formatTime(primaryAssessment.defibrillation_time) : null },
    { label: 'CPR Duration (mins)', value: primaryAssessment?.cpr_duration },
    { label: 'ROSC', value: primaryAssessment?.rosc },
    { label: 'Notes', value: primaryAssessment?.miscellaneous },
  ])

  const reportSpecificRows =
    report?.report_type === 'Emergency'
      ? filterFilledRows([
          { label: 'Type of Emergency', value: detail?.type_of_emergency },
          { label: 'Mechanism of Injury / Illness', value: detail?.mechanism_of_injury },
          { label: 'Nature of Illness', value: detail?.nature_of_illness },
        ])
      : filterFilledRows([
          { label: 'Type of Hazard', value: detail?.type_of_hazard },
          { label: 'Nature of Call', value: detail?.nature_of_call },
        ])

  return (
    <div className="zr-doc-backdrop" role="dialog" aria-modal="true">
      <div className="zr-doc-modal">
        <div className="zr-doc-modal-header">
          <div>
            <h5 className="mb-0">Report View</h5>
            <small>Complete report details in document layout</small>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>

        <div className="zr-doc-modal-body">
          <article className="zr-report-paper">
            {isLoading ? (
              <p className="zr-doc-loading mb-0">Loading report details...</p>
            ) : !report ? (
              <p className="zr-doc-loading mb-0">Unable to load report details.</p>
            ) : (
              <>
                <header className="zr-paper-header">
                  <div>
                    <p className="zr-paper-org mb-1">Municipal Disaster Risk Reduction and Management Office</p>
                    <h2 className="zr-paper-title mb-1">Incident Report Document</h2>
                    <p className="zr-paper-subtitle mb-0">Report ID: #{report.id}</p>
                  </div>
                  <div className="zr-paper-badges">
                    <span className="zr-paper-badge">{report.report_type}</span>
                    <span className="zr-paper-badge zr-paper-badge-muted">{textOrNA(report.status)}</span>
                  </div>
                </header>

                <section className="zr-paper-section">
                  <h3>Report Information</h3>
                  <div className="zr-paper-grid zr-paper-grid-compact">
                    <div><strong>Report ID</strong><span>#{report.id}</span></div>
                    <div><strong>Type</strong><span>{report.report_type}</span></div>
                    {reportInfoRows.map(row => (
                      <div key={row.label}>
                        <strong>{row.label}</strong>
                        <span>{textOrNA(row.value)}</span>
                      </div>
                    ))}
                    {reportInfoRows.length === 0 && <p className="mb-0">No report information recorded.</p>}
                  </div>
                </section>

                <section className="zr-paper-section">
                  <h3>Patient / Client Information</h3>
                  {namedClients.length < 1 ? (
                    <p className="mb-0">No named client records.</p>
                  ) : (
                    <div className="zr-client-grid">
                      {namedClients.map((client, index) => (
                        <article className="zr-client-card" key={client.id}>
                          <h4>Client #{index + 1}</h4>
                          <div className="zr-paper-grid zr-paper-grid-compact">
                            {filterFilledRows([
                              { label: 'Full Name', value: client.full_name },
                              { label: 'Age', value: client.age },
                              { label: 'Gender', value: client.gender },
                              { label: 'Contact Number', value: client.contact_number },
                              { label: 'Nationality', value: client.nationality },
                              { label: 'Incident Address', value: client.incident_address },
                              { label: 'Permanent Address', value: client.permanent_address },
                            ]).map(row => (
                              <div key={`${client.id}-${row.label}`}>
                                <strong>{row.label}</strong>
                                <span>{textOrNA(row.value)}</span>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="zr-paper-section">
                  <h3>{report.report_type === 'Emergency' ? 'Emergency Details' : 'Incident Details'}</h3>
                  <div className="zr-paper-grid zr-paper-grid-compact">
                    {reportSpecificRows.map(row => (
                      <div key={row.label}>
                        <strong>{row.label}</strong>
                        <span>{textOrNA(row.value)}</span>
                      </div>
                    ))}
                    {reportSpecificRows.length === 0 && <p className="mb-0">No detail records found.</p>}
                  </div>
                </section>

                {report.report_type === 'Emergency' && (
                  <>
                    <section className="zr-paper-section">
                      <h3>Patient Assessment</h3>
                      <div className="zr-paper-grid zr-paper-grid-compact">
                        {patientAssessmentRows.map(row => (
                          <div key={row.label}>
                            <strong>{row.label}</strong>
                            <span>{textOrNA(row.value)}</span>
                          </div>
                        ))}
                        {patientAssessmentRows.length === 0 && <p className="mb-0">No patient assessment data recorded.</p>}
                      </div>
                    </section>

                    <section className="zr-paper-section">
                      <h3>Vital Signs and Care</h3>
                      <div className="zr-paper-grid zr-paper-grid-compact">
                        {vitalCareRows.map(row => (
                          <div key={row.label}>
                            <strong>{row.label}</strong>
                            <span>{textOrNA(row.value)}</span>
                          </div>
                        ))}
                        {vitalCareRows.length === 0 && <p className="mb-0">No vital signs or care records found.</p>}
                      </div>
                    </section>
                  </>
                )}

                <section className="zr-paper-section">
                  <h3>Responders</h3>
                  {responders.length < 1 ? (
                    <p className="mb-0">No responders listed.</p>
                  ) : (
                    <div className="zr-chip-list">
                      {responders.map((name, index) => (
                        <span key={`${name}-${index}`} className="zr-chip">{name}</span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="zr-paper-section">
                  <h3>Photos</h3>
                  {photos.length < 1 ? (
                    <p className="mb-0">No photos attached.</p>
                  ) : (
                    <div className="zr-photo-grid">
                      {photos.map(photo => (
                        <figure className="zr-photo-card" key={photo.id}>
                          <img
                            src={resolvePhotoUrl(photo.photo_path)}
                            alt={`Report photo ${photo.id}`}
                            className="zr-photo-image"
                            loading="lazy"
                          />
                        </figure>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
