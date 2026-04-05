import type { PersonInfo, ReportKind } from '../../../types/zoneReport'

type ReviewSubmitStepProps = {
  reportKind: Exclude<ReportKind, null>
  zoneName: string
  primaryPerson: PersonInfo
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
  airway: string
  breathing: string
  circulation: string
  woundCare: string
  miscellaneous: string
  coronary: string
  collapseWitness: string
  timeCollapse: string
  startCpr: string
  defibrillation: string
  durationCpr: string
  rosc: string
  hospitalTransfer: string
  uploadedPhoto: string | null
}

export function ReviewSubmitStep({
  reportKind,
  zoneName,
  primaryPerson,
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
  airway,
  breathing,
  circulation,
  woundCare,
  miscellaneous,
  coronary,
  collapseWitness,
  timeCollapse,
  startCpr,
  defibrillation,
  durationCpr,
  rosc,
  hospitalTransfer,
  uploadedPhoto,
}: ReviewSubmitStepProps) {
  const isEmergency = reportKind === 'emergency'
  const fullName = `${primaryPerson.firstName} ${primaryPerson.middleName} ${primaryPerson.lastName}`
    .replace(/\s+/g, ' ')
    .trim()
  const responderList = responders.filter(name => name.trim() !== '')

  const normalize = (value?: string | null) =>
    (value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()

  const hasSelection = (source: string | null | undefined, expected: string) => {
    const src = normalize(source)
    const exp = normalize(expected)
    return src.length > 0 && exp.length > 0 && src.includes(exp)
  }

  const splitValues = (source: string | null | undefined) => {
    if (!source) return [] as string[]
    return source
      .split(/[,/|;]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  const airwayOptions = ['Suction', 'Manual Clearance', 'Head Tilt Maneuver', 'Jaw Thrust Maneuver']
  const breathingOptions = ['OPA', 'NPA', 'Pocket Mask', 'Nasal Cannula', 'Simple Facemask', 'NRM', 'BVM']
  const circulationOptions = ['CPR', 'AED']
  const woundCareOptions = ['Bleeding Control', 'Cleaning / Disinfecting', 'Dressing']
  const miscOptions = ['Cold Compress', 'Warm Compress', 'Shock Position']

  const customValues = (source: string | null | undefined, options: string[]) =>
    splitValues(source).filter((value) => !options.some((option) => hasSelection(value, option) || hasSelection(option, value)))

  const customAirway = customValues(airway, airwayOptions)
  const customBreathing = customValues(breathing, breathingOptions)
  const customCirculation = customValues(circulation, circulationOptions)
  const customWoundCare = customValues(woundCare, woundCareOptions)
  const customMisc = customValues(miscellaneous, miscOptions)

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
      <article className="zr-report-paper zr-report-page">
        <section className="zr-paper-official-header" aria-label="Official Header">
          <p className="mb-0">Republic of the Philippines</p>
          <p className="mb-0 zr-paper-official-strong">Province of Camarines Sur</p>
          <p className="mb-0">Local Government Unit of Nabua</p>
          <p className="mb-0 zr-paper-official-office">Municipal Disaster Risk Reduction &amp; Management Office</p>
          <p className="mb-0 zr-paper-official-meta">Emergency Hotline: (054) 288-10-23 | Smart: 0947-1819-217 | Globe: 0915-2062-265</p>
          <p className="mb-0 zr-paper-official-meta">Email: mdrrmcnabua@yahoo.com / mdrrmonabua@gmail.com</p>
        </section>

        <header className="zr-paper-header">
          <div>
            <h2 className="zr-paper-title mb-1">Patient Care Report</h2>
            <p className="zr-paper-subtitle mb-0">Report ID: Pending | {zoneName || 'N/A'}</p>
          </div>
          <div className="zr-paper-badges">
            <span className="zr-paper-badge">{isEmergency ? 'Emergency' : 'Incident'}</span>
            <span className="zr-paper-badge zr-paper-badge-muted">Draft</span>
          </div>
        </header>

        <section className="zr-paper-section">
          <h3>Record Sheet</h3>
          <div className="zr-record-table-wrap">
            <table className="zr-record-table">
              <tbody>
                <tr className="zr-record-section-row">
                  <th colSpan={6}>Patient Record</th>
                </tr>
                <tr>
                  <th>Patient Name</th>
                  <td>{fullName || fallbackFullName || 'N/A'}</td>
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
                  <td>{formatDate(incidentDate)}</td>
                  <th>Report Time</th>
                  <td>{formatTime(incidentTime)}</td>
                  <th>Dispatcher</th>
                  <td>{dispatchOfficer || 'N/A'}</td>
                </tr>
                <tr>
                  <th>Incident Date</th>
                  <td>{formatDate(incidentDate)}</td>
                  <th>Incident Time</th>
                  <td>{formatTime(incidentTime)}</td>
                  <th>Type</th>
                  <td>{isEmergency ? 'Emergency' : 'Incident'}</td>
                </tr>

                <tr className="zr-record-section-row">
                  <th colSpan={6}>{isEmergency ? 'Incident Details (Emergency)' : 'Incident Details (Incident)'}</th>
                </tr>
                <tr>
                  <th>{isEmergency ? 'Type of Emergency' : 'Type of Hazard'}</th>
                  <td>{isEmergency ? (typeEmergency || 'N/A') : (typeOfHazard || 'N/A')}</td>
                  <th>{isEmergency ? 'Nature of Illness' : 'Nature of Call'}</th>
                  <td colSpan={3}>{isEmergency ? (natureIllness || 'N/A') : (natureOfCall || 'N/A')}</td>
                </tr>
                {isEmergency && (
                  <tr>
                    <th>Mechanism of Injury</th>
                    <td colSpan={5}>{mechanism || 'N/A'}</td>
                  </tr>
                )}
                <tr>
                  <th>Responders</th>
                  <td colSpan={5}>{responderList.length > 0 ? responderList.join(', ') : 'N/A'}</td>
                </tr>

                {isEmergency && (
                  <>
                    <tr className="zr-record-section-row">
                      <th colSpan={6}>Assessment &amp; Care Record</th>
                    </tr>
                    <tr>
                      <th>Chief Complaint</th>
                      <td colSpan={5}>{assessment || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Airway</th>
                      <td>{airway || 'N/A'}</td>
                      <th>Breathing</th>
                      <td>{breathing || 'N/A'}</td>
                      <th>Circulation</th>
                      <td>{circulation || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Wound Care</th>
                      <td>{woundCare || 'N/A'}</td>
                      <th>Coronary History</th>
                      <td>{coronary || 'N/A'}</td>
                      <th>Collapse Witness</th>
                      <td>{collapseWitness || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Miscellaneous</th>
                      <td colSpan={5}>{miscellaneous || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Time of Collapse</th>
                      <td>{formatTime(timeCollapse)}</td>
                      <th>Start of CPR</th>
                      <td>{formatTime(startCpr)}</td>
                      <th>Defibrillation</th>
                      <td>{formatTime(defibrillation)}</td>
                    </tr>
                    <tr>
                      <th>CPR Duration</th>
                      <td>{durationCpr || 'N/A'}</td>
                      <th>ROSC</th>
                      <td>{rosc || 'N/A'}</td>
                      <th>Transferred to Hospital</th>
                      <td>{hospitalTransfer || 'N/A'}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isEmergency && (
          <section className="zr-paper-section">
            <h3>Care Management (Original Form Style)</h3>
            <div className="zr-care-sheet">
              <div className="zr-care-group">
                <h4>Airway</h4>
                <div className="zr-care-options">
                  {airwayOptions.map((option) => (
                    <span className="zr-care-option" key={`review-airway-${option}`}>
                      <span className={`zr-check-box ${hasSelection(airway, option) ? 'is-checked' : ''}`}></span>
                      {option}
                    </span>
                  ))}
                  {customAirway.map((option) => (
                    <span className="zr-care-option" key={`review-airway-custom-${option}`}>
                      <span className="zr-check-box is-checked"></span>
                      {option}
                    </span>
                  ))}
                </div>

                <h4>Breathing</h4>
                <div className="zr-care-options">
                  {breathingOptions.map((option) => (
                    <span className="zr-care-option" key={`review-breathing-${option}`}>
                      <span className={`zr-check-box ${hasSelection(breathing, option) ? 'is-checked' : ''}`}></span>
                      {option}
                    </span>
                  ))}
                  {customBreathing.map((option) => (
                    <span className="zr-care-option" key={`review-breathing-custom-${option}`}>
                      <span className="zr-check-box is-checked"></span>
                      {option}
                    </span>
                  ))}
                </div>

                <h4>Circulation Support</h4>
                <div className="zr-care-options">
                  {circulationOptions.map((option) => (
                    <span className="zr-care-option" key={`review-circulation-${option}`}>
                      <span className={`zr-check-box ${hasSelection(circulation, option) ? 'is-checked' : ''}`}></span>
                      {option}
                    </span>
                  ))}
                  {customCirculation.map((option) => (
                    <span className="zr-care-option" key={`review-circulation-custom-${option}`}>
                      <span className="zr-check-box is-checked"></span>
                      {option}
                    </span>
                  ))}
                </div>
              </div>

              <div className="zr-care-group">
                <h4>Wound Care</h4>
                <div className="zr-care-options">
                  {woundCareOptions.map((option) => (
                    <span className="zr-care-option" key={`review-wound-${option}`}>
                      <span className={`zr-check-box ${hasSelection(woundCare, option) ? 'is-checked' : ''}`}></span>
                      {option}
                    </span>
                  ))}
                  {customWoundCare.map((option) => (
                    <span className="zr-care-option" key={`review-wound-custom-${option}`}>
                      <span className="zr-check-box is-checked"></span>
                      {option}
                    </span>
                  ))}
                </div>

                <h4>Miscellaneous</h4>
                <div className="zr-care-options">
                  {miscOptions.map((option) => (
                    <span className="zr-care-option" key={`review-misc-${option}`}>
                      <span className={`zr-check-box ${hasSelection(miscellaneous, option) ? 'is-checked' : ''}`}></span>
                      {option}
                    </span>
                  ))}
                  {customMisc.map((option) => (
                    <span className="zr-care-option" key={`review-misc-custom-${option}`}>
                      <span className="zr-check-box is-checked"></span>
                      {option}
                    </span>
                  ))}
                </div>
              </div>

              <div className="zr-care-group">
                <h4>Cessation of Resuscitation</h4>
                <div className="zr-care-data-list">
                  <div><strong>History of Coronary Disease:</strong> <span>{coronary || 'N/A'}</span></div>
                  <div><strong>Collapse Witness:</strong> <span>{collapseWitness || 'N/A'}</span></div>
                  <div><strong>Time of Collapse:</strong> <span>{formatTime(timeCollapse)}</span></div>
                  <div><strong>Start of CPR:</strong> <span>{formatTime(startCpr)}</span></div>
                  <div><strong>Defibrillation:</strong> <span>{formatTime(defibrillation)}</span></div>
                  <div><strong>Duration of CPR:</strong> <span>{durationCpr || 'N/A'}</span></div>
                  <div><strong>ROSC:</strong> <span>{rosc || 'N/A'}</span></div>
                  <div><strong>Transferred to Hospital:</strong> <span>{hospitalTransfer || 'N/A'}</span></div>
                </div>
              </div>
            </div>
          </section>
        )}
      </article>

      <article className="zr-report-paper zr-report-page zr-report-photo-page">
        <header className="zr-paper-header">
          <div>
            <h2 className="zr-paper-title mb-1">Photo Attachment</h2>
            <p className="zr-paper-subtitle mb-0">Second page for report images</p>
          </div>
          <div className="zr-paper-badges">
            <span className="zr-paper-badge">{isEmergency ? 'Emergency' : 'Incident'}</span>
            <span className="zr-paper-badge zr-paper-badge-muted">Pending</span>
          </div>
        </header>

        <section className="zr-paper-section">
          <h3>Photo Attachment</h3>
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
