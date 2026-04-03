import type { PersonInfo, ReportKind } from '../../../types/zoneReport'

type ReviewSubmitStepProps = {
  reportKind: Exclude<ReportKind, null>
  zoneName: string
  primaryPerson: PersonInfo
  peopleCount: number
  fallbackFullName: string
  incidentDate: string
  incidentTime: string
  dispatchOfficer: string
  responders: string[]
  typeEmergency: string
  typeOfHazard: string
  natureOfCall: string
  mechanism: string
  natureIllness: string
  assessment: string
  uploadedPhoto: string | null
}

export function ReviewSubmitStep({
  reportKind,
  zoneName,
  primaryPerson,
  peopleCount,
  fallbackFullName,
  incidentDate,
  incidentTime,
  dispatchOfficer,
  responders,
  typeEmergency,
  typeOfHazard,
  natureOfCall,
  mechanism,
  natureIllness,
  assessment,
  uploadedPhoto,
}: ReviewSubmitStepProps) {
  const isEmergency = reportKind === 'emergency'
  const fullName = `${primaryPerson.firstName} ${primaryPerson.middleName} ${primaryPerson.lastName}`
    .replace(/\s+/g, ' ')
    .trim()
  const responderList = responders.filter(name => name.trim() !== '')

  const formatDate = (value: string) => {
    if (!value) return 'N/A'
    const raw = value.includes('T') ? value.slice(0, 10) : value
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return raw
    return parsed.toLocaleDateString()
  }

  const formatTime = (value: string) => {
    if (!value) return 'N/A'
    const match = value.match(/^(\d{2}):(\d{2})/)
    if (!match) return value
    const parsed = new Date(`1970-01-01T${match[1]}:${match[2]}`)
    if (Number.isNaN(parsed.getTime())) return `${match[1]}:${match[2]}`
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="step-content">
      <article className="zr-report-paper">
        <header className="zr-paper-header">
          <div>
            <p className="zr-paper-org mb-1">Municipal Disaster Risk Reduction and Management Office</p>
            <h2 className="zr-paper-title mb-1">Review and Submit</h2>
            <p className="zr-paper-subtitle mb-0">Confirm all details before submitting.</p>
          </div>
          <div className="zr-paper-badges">
            <span className="zr-paper-badge">{isEmergency ? 'Emergency Report' : 'Incident Report'}</span>
          </div>
        </header>

        <section className="zr-paper-section">
          <h3>Client</h3>
          <div className="zr-paper-grid">
            <div><strong>Full Name</strong><span>{fullName || fallbackFullName || 'N/A'}</span></div>
            <div><strong>Age</strong><span>{primaryPerson.age || 'N/A'}</span></div>
            <div><strong>Gender</strong><span>{primaryPerson.gender || 'N/A'}</span></div>
            <div><strong>Contact</strong><span>{primaryPerson.contactNumber || 'N/A'}</span></div>
            <div><strong>Total Persons</strong><span>{peopleCount}</span></div>
          </div>
        </section>

        <section className="zr-paper-section">
          <h3>Incident</h3>
          <div className="zr-paper-grid">
            <div><strong>Zone</strong><span>{zoneName}</span></div>
            <div><strong>Date</strong><span>{formatDate(incidentDate)}</span></div>
            <div><strong>Time</strong><span>{formatTime(incidentTime)}</span></div>
            <div><strong>Location</strong><span>{primaryPerson.incidentLocation || 'N/A'}</span></div>
            <div><strong>Dispatcher</strong><span>{dispatchOfficer || 'N/A'}</span></div>
            <div><strong>Responders</strong><span>{responderList.length > 0 ? responderList.join(', ') : 'N/A'}</span></div>
          </div>
        </section>

        <section className="zr-paper-section">
          <h3>{isEmergency ? 'Emergency Details' : 'Incident Details'}</h3>
          <div className="zr-paper-grid">
            {isEmergency ? (
              <>
                <div><strong>Type</strong><span>{typeEmergency || 'N/A'}</span></div>
                <div><strong>Mechanism</strong><span>{mechanism || 'N/A'}</span></div>
                <div><strong>Nature of Illness</strong><span>{natureIllness || 'N/A'}</span></div>
                <div><strong>Assessment</strong><span>{assessment || 'N/A'}</span></div>
              </>
            ) : (
              <>
                <div><strong>Type of Hazard</strong><span>{typeOfHazard || 'N/A'}</span></div>
                <div><strong>Nature of Call</strong><span>{natureOfCall || 'N/A'}</span></div>
              </>
            )}
          </div>
        </section>

        <section className="zr-paper-section">
          <h3>Photo</h3>
          {uploadedPhoto ? (
            <div className="zr-review-photo-wrap">
              <img src={uploadedPhoto} alt="Report preview" className="zr-review-photo" />
            </div>
          ) : (
            <p className="mb-0">No photo selected.</p>
          )}
        </section>
      </article>
    </div>
  )
}
