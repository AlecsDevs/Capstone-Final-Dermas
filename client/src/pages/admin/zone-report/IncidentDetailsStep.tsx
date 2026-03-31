type ReportKind = 'emergency' | 'incident'

interface IncidentDetailsStepProps {
  reportKind: ReportKind
  mechanism: string
  natureIllness: string
  typeEmergency: string
  typeOfHazard: string
  natureOfCall: string
  incidentDate: string
  incidentTime: string
  dispatchOfficer: string
  responders: string[]
  onChange: (key: string, value: string) => void
  onChangeResponder: (index: number, value: string) => void
  onAddResponder: () => void
  onRemoveResponder: (index: number) => void
}

export function IncidentDetailsStep({
  reportKind,
  mechanism,
  natureIllness,
  typeEmergency,
  typeOfHazard,
  natureOfCall,
  incidentDate,
  incidentTime,
  dispatchOfficer,
  responders,
  onChange,
  onChangeResponder,
  onAddResponder,
  onRemoveResponder,
}: IncidentDetailsStepProps) {
  const isEmergency = reportKind === 'emergency'

  return (
    <div className="step-content">
      <div className="step-header mb-4">
        <h4 className="fw-bold mb-1">
          <i className="bi bi-file-earmark-text me-2 text-info"></i>
          Incident Details
        </h4>
        <p className="text-muted mb-0">
          {isEmergency ? 'Describe the emergency incident' : 'Describe the hazard incident'}
        </p>
      </div>

      <div className="zr-step-card">
        <div className="row g-3">
          {isEmergency ? (
            <>
              <div className="col-12 col-md-6">
                <input
                  type="text"
                  className="form-control zr-step-input"
                  placeholder="Mechanism of Injury / Illness"
                  value={mechanism}
                  onChange={e => onChange('mechanism', e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <input
                  type="text"
                  className="form-control zr-step-input"
                  placeholder="Nature of Illness"
                  value={natureIllness}
                  onChange={e => onChange('natureIllness', e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <select
                  className="form-select zr-step-input"
                  value={typeEmergency}
                  onChange={e => onChange('typeEmergency', e.target.value)}
                >
                  <option value="">Type of Emergency</option>
                  <option value="Medical">Medical</option>
                  <option value="Trauma">Trauma</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="col-12 col-md-6">
                <select
                  className="form-select zr-step-input"
                  value={typeOfHazard}
                  onChange={e => onChange('typeOfHazard', e.target.value)}
                >
                  <option value="">Type of Hazard</option>
                  <option value="Flood">Flood</option>
                  <option value="Earthquake">Earthquake</option>
                  <option value="Typhoon">Typhoon</option>
                  <option value="Landslide">Landslide</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <select
                  className="form-select zr-step-input"
                  value={natureOfCall}
                  onChange={e => onChange('natureOfCall', e.target.value)}
                >
                  <option value="">Nature of Call</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Conduction">Conduction</option>
                  <option value="Search and Rescue">Search and Rescue</option>
                </select>
              </div>
            </>
          )}

          <div className="col-12 col-md-6">
            <input
              type="date"
              className="form-control zr-step-input"
              value={incidentDate}
              onChange={e => onChange('incidentDate', e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <input
              type="time"
              className="form-control zr-step-input"
              value={incidentTime}
              onChange={e => onChange('incidentTime', e.target.value)}
            />
          </div>

          <div className="col-12 col-md-6">
            <select
              className="form-select zr-step-input"
              value={dispatchOfficer}
              onChange={e => onChange('dispatchOfficer', e.target.value)}
            >
              <option value="">Choose Dispatcher</option>
              <option value="Kabochi">Kabochi</option>
              <option value="Fox">Fox</option>
              <option value="Pastor">Pastor</option>
            </select>
          </div>
        </div>

        <div className="zr-responder-head">
          <i className="bi bi-people me-2"></i>
          Responders
        </div>

        {responders.map((responder, index) => (
          <div className="zr-responder-row" key={`responder-${index}`}>
            <input
              type="text"
              className="form-control zr-step-input"
              placeholder={`Responder #${index + 1} name`}
              value={responder}
              onChange={e => onChangeResponder(index, e.target.value)}
            />
            {responders.length > 1 && (
              <button
                type="button"
                className="zr-remove-person-btn"
                onClick={() => onRemoveResponder(index)}
                aria-label={`Remove responder ${index + 1}`}
              >
                <i className="bi bi-trash3"></i>
              </button>
            )}
          </div>
        ))}

        <button type="button" className="zr-add-person-btn mt-3" onClick={onAddResponder}>
          <i className="bi bi-person-plus-fill me-2"></i>
          Add Responder
        </button>
      </div>
    </div>
  )
}
