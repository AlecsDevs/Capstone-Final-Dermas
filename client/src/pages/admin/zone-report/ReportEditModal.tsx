import { useEffect, useMemo, useState } from 'react'
import type { ReportDocumentData } from './ReportDocumentModal'

export interface EditReportPayload {
  date_reported: string
  time_reported: string
  client_full_name: string
  client_age: string
  client_gender: string
  client_contact_number: string
  client_incident_address: string
  incident_date: string
  incident_time: string
  dispatcher_name: string
  responders: string[]
  type_of_emergency?: string
  mechanism_of_injury?: string
  nature_of_illness?: string
  type_of_hazard?: string
  nature_of_call?: string
  photo_file?: File | null
}

interface ReportEditModalProps {
  report: ReportDocumentData | null
  isSaving: boolean
  onClose: () => void
  onSave: (payload: EditReportPayload) => Promise<void>
}

const toDateInput = (value?: string | null) => {
  if (!value) return ''
  return value.slice(0, 10)
}

const toHHMM = (value?: string | null) => {
  if (!value) return ''
  const match = value.match(/^(\d{2}):(\d{2})/)
  if (!match) return ''
  return `${match[1]}:${match[2]}`
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000/api'

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')

const resolvePhotoUrl = (path?: string | null) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }
  if (path.startsWith('/')) {
    return `${SERVER_BASE_URL}${path}`
  }
  return `${SERVER_BASE_URL}/${path}`
}

const DISPATCHER_OPTIONS = ['Kabochi', 'Fox', 'Pastor']
const TYPE_OF_EMERGENCY_OPTIONS = ['Medical', 'Trauma']

const hasOption = (options: string[], value: string) => options.includes(value)

export function ReportEditModal({ report, isSaving, onClose, onSave }: ReportEditModalProps) {
  const emergencyDetail = report?.emergencyDetails ?? report?.emergency_details
  const incidentDetail = report?.incidentDetails ?? report?.incident_details
  const detail = report?.report_type === 'Emergency' ? emergencyDetail : incidentDetail
  const primaryClient = report?.clients?.[0]

  const initialResponders = useMemo(
    () =>
      (report?.responders ?? [])
        .map(item => item.name)
        .filter((name): name is string => Boolean(name && name.trim())),
    [report]
  )

  const [dateReported, setDateReported] = useState('')
  const [timeReported, setTimeReported] = useState('')
  const [clientFullName, setClientFullName] = useState('')
  const [clientAge, setClientAge] = useState('')
  const [clientGender, setClientGender] = useState('')
  const [clientContactNumber, setClientContactNumber] = useState('')
  const [clientIncidentAddress, setClientIncidentAddress] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [incidentTime, setIncidentTime] = useState('')
  const [dispatcherName, setDispatcherName] = useState('')
  const [respondersText, setRespondersText] = useState('')

  const [typeOfEmergency, setTypeOfEmergency] = useState('')
  const [mechanismOfInjury, setMechanismOfInjury] = useState('')
  const [natureOfIllness, setNatureOfIllness] = useState('')

  const [typeOfHazard, setTypeOfHazard] = useState('')
  const [natureOfCall, setNatureOfCall] = useState('')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)

  useEffect(() => {
    setDateReported(toDateInput(report?.date_reported))
    setTimeReported(toHHMM(report?.time_reported))
    setClientFullName(primaryClient?.full_name ?? '')
    setClientAge(primaryClient?.age !== null && primaryClient?.age !== undefined ? String(primaryClient.age) : '')
    setClientGender(primaryClient?.gender ?? '')
    setClientContactNumber(primaryClient?.contact_number ?? '')
    setClientIncidentAddress(primaryClient?.incident_address ?? '')
    setIncidentDate(toDateInput(detail?.incident_date))
    setIncidentTime(toHHMM(detail?.incident_time))
    setDispatcherName(detail?.dispatcher_name ?? '')
    setRespondersText(initialResponders.join(', '))

    setTypeOfEmergency(emergencyDetail?.type_of_emergency ?? '')
    setMechanismOfInjury(emergencyDetail?.mechanism_of_injury ?? '')
    setNatureOfIllness(emergencyDetail?.nature_of_illness ?? '')

    setTypeOfHazard(incidentDetail?.type_of_hazard ?? '')
    setNatureOfCall(incidentDetail?.nature_of_call ?? '')
    setSelectedPhotoFile(null)
    setPreviewPhoto(report?.photos?.[0]?.photo_path ?? null)
  }, [
    report,
    primaryClient?.full_name,
    primaryClient?.age,
    primaryClient?.gender,
    primaryClient?.contact_number,
    primaryClient?.incident_address,
    detail?.incident_date,
    detail?.incident_time,
    detail?.dispatcher_name,
    emergencyDetail?.type_of_emergency,
    emergencyDetail?.mechanism_of_injury,
    emergencyDetail?.nature_of_illness,
    incidentDetail?.type_of_hazard,
    incidentDetail?.nature_of_call,
    initialResponders,
    report?.photos,
  ])

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedPhotoFile(file)

    const reader = new FileReader()
    reader.onload = e => {
      setPreviewPhoto((e.target?.result as string) ?? null)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    const responders = respondersText
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)

    await onSave({
      date_reported: dateReported,
      time_reported: timeReported,
      client_full_name: clientFullName,
      client_age: clientAge,
      client_gender: clientGender,
      client_contact_number: clientContactNumber,
      client_incident_address: clientIncidentAddress,
      incident_date: incidentDate,
      incident_time: incidentTime,
      dispatcher_name: dispatcherName,
      responders,
      type_of_emergency: typeOfEmergency,
      mechanism_of_injury: mechanismOfInjury,
      nature_of_illness: natureOfIllness,
      type_of_hazard: typeOfHazard,
      nature_of_call: natureOfCall,
      photo_file: selectedPhotoFile,
    })
  }

  if (!report) {
    return null
  }

  return (
    <div className="zr-doc-backdrop" role="dialog" aria-modal="true">
      <div className="zr-doc-modal">
        <div className="zr-doc-modal-header">
          <div>
            <h5 className="mb-0">Edit Report</h5>
            <small>Update report fields without using stepper</small>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>

        <div className="zr-doc-modal-body">
          <article className="zr-report-paper">
            <header className="zr-paper-header">
              <div>
                <p className="zr-paper-org mb-1">MDRRMO</p>
                <h2 className="zr-paper-title mb-1">Edit Report #{report.id}</h2>
                <p className="zr-paper-subtitle mb-0">{report.report_type}</p>
              </div>
            </header>

            <section className="zr-paper-section">
              <h3>Report Information</h3>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Date Reported</label>
                  <input type="date" className="form-control" value={dateReported} onChange={e => setDateReported(e.target.value)} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Time Reported</label>
                  <input type="time" className="form-control" value={timeReported} onChange={e => setTimeReported(e.target.value)} />
                </div>
              </div>
            </section>

            <section className="zr-paper-section">
              <h3>Primary Client</h3>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" value={clientFullName} onChange={e => setClientFullName(e.target.value)} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label">Age</label>
                  <input type="number" className="form-control" value={clientAge} onChange={e => setClientAge(e.target.value)} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={clientGender} onChange={e => setClientGender(e.target.value)}>
                    <option value="">Choose</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Contact Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={clientContactNumber}
                    onChange={e => setClientContactNumber(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Incident Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={clientIncidentAddress}
                    onChange={e => setClientIncidentAddress(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="zr-paper-section">
              <h3>{report.report_type === 'Emergency' ? 'Emergency Details' : 'Incident Details'}</h3>
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label">Incident Date</label>
                  <input type="date" className="form-control" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Incident Time</label>
                  <input type="time" className="form-control" value={incidentTime} onChange={e => setIncidentTime(e.target.value)} />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Dispatcher</label>
                  <select className="form-select" value={dispatcherName} onChange={e => setDispatcherName(e.target.value)}>
                    <option value="">Choose Dispatcher</option>
                    {dispatcherName && !hasOption(DISPATCHER_OPTIONS, dispatcherName) && (
                      <option value={dispatcherName}>{dispatcherName}</option>
                    )}
                    {DISPATCHER_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {report.report_type === 'Emergency' ? (
                  <>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Type of Emergency</label>
                      <select className="form-select" value={typeOfEmergency} onChange={e => setTypeOfEmergency(e.target.value)}>
                        <option value="">Choose</option>
                        {typeOfEmergency && !hasOption(TYPE_OF_EMERGENCY_OPTIONS, typeOfEmergency) && (
                          <option value={typeOfEmergency}>{typeOfEmergency}</option>
                        )}
                        {TYPE_OF_EMERGENCY_OPTIONS.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Mechanism of Injury</label>
                      <input
                        type="text"
                        className="form-control"
                        value={mechanismOfInjury}
                        onChange={e => setMechanismOfInjury(e.target.value)}
                        placeholder="Mechanism of Injury / Illness"
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Nature of Illness</label>
                      <input
                        type="text"
                        className="form-control"
                        value={natureOfIllness}
                        onChange={e => setNatureOfIllness(e.target.value)}
                        placeholder="Nature of Illness"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Type of Hazard</label>
                      <select className="form-select" value={typeOfHazard} onChange={e => setTypeOfHazard(e.target.value)}>
                        <option value="">Choose</option>
                        <option value="Flood">Flood</option>
                        <option value="Earthquake">Earthquake</option>
                        <option value="Typhoon">Typhoon</option>
                        <option value="Landslide">Landslide</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Nature of Call</label>
                      <select className="form-select" value={natureOfCall} onChange={e => setNatureOfCall(e.target.value)}>
                        <option value="">Choose</option>
                        <option value="Emergency">Emergency</option>
                        <option value="Coordination">Coordination</option>
                        <option value="Search and Rescue">Search and Rescue</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="zr-paper-section">
              <h3>Responders</h3>
              <label className="form-label">Names (comma-separated)</label>
              <input type="text" className="form-control" value={respondersText} onChange={e => setRespondersText(e.target.value)} />
            </section>

            <section className="zr-paper-section">
              <h3>Photo</h3>
              {previewPhoto ? (
                <div className="zr-review-photo-wrap mb-3">
                  <img src={resolvePhotoUrl(previewPhoto)} alt="Edit report photo" className="zr-review-photo" />
                </div>
              ) : (
                <p className="mb-2">No photo uploaded yet.</p>
              )}
              <label className="form-label">Replace Photo (optional)</label>
              <input type="file" className="form-control" accept="image/*" onChange={handlePhotoChange} />
            </section>

            <div className="d-flex justify-content-end gap-2 pt-2">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
