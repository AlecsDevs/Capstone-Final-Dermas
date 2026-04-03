interface EmergencyIncidentDetailsStepProps {
  mechanism: string
  natureIllness: string
  typeEmergency: string
  incidentDate: string
  incidentTime: string
  dispatchOfficer: string
  responders: string[]
  onChange: (key: string, value: string) => void
  onChangeResponder: (index: number, value: string) => void
  onAddResponder: () => void
  onRemoveResponder: (index: number) => void
}

export function EmergencyIncidentDetailsStep({
  mechanism,
  natureIllness,
  typeEmergency,
  incidentDate,
  incidentTime,
  dispatchOfficer,
  responders,
  onChange,
  onChangeResponder,
  onAddResponder,
  onRemoveResponder,
}: EmergencyIncidentDetailsStepProps) {
  return (
    <div className="step-content">
      <div className="step-panel" id="stepEmergencyIncidentDetails">
        <div className="step-card">
          <div className="step-card-header">
            <i className="bi bi-shield-exclamation" style={{ color: 'var(--mdrrmo-blue, #0f5b77)' }}></i>
            <div>
              <h5>Incident Details</h5>
              <p>Describe the emergency incident</p>
            </div>
          </div>

          <div className="step-card-body">
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="text"
                    id="emMechanism"
                    className="form-control zr-step-input"
                    value={mechanism}
                    onChange={e => onChange('mechanism', e.target.value)}
                    placeholder="Mechanism of Injury / Illness"
                  />
                  <label htmlFor="emMechanism">Mechanism of Injury / Illness</label>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="text"
                    id="emNatureIllness"
                    className="form-control zr-step-input"
                    value={natureIllness}
                    onChange={e => onChange('natureIllness', e.target.value)}
                    placeholder="Nature of Illness"
                  />
                  <label htmlFor="emNatureIllness">Nature of Illness</label>
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12">
                <div className="form-floating">
                  <select
                    id="emTypeEmergency"
                    className="form-select zr-step-input"
                    value={typeEmergency}
                    onChange={e => onChange('typeEmergency', e.target.value)}
                  >
                    <option value="" disabled>
                      Choose
                    </option>
                    <option value="Medical">Medical</option>
                    <option value="Trauma">Trauma</option>
                  </select>
                  <label htmlFor="emTypeEmergency">Type of Emergency</label>
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="date"
                    id="emIncidentDate"
                    className="form-control zr-step-input"
                    value={incidentDate}
                    onChange={e => onChange('incidentDate', e.target.value)}
                    placeholder="Date of Incident"
                  />
                  <label htmlFor="emIncidentDate">Date of Incident</label>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="time"
                    id="emIncidentTime"
                    className="form-control zr-step-input"
                    value={incidentTime}
                    onChange={e => onChange('incidentTime', e.target.value)}
                    placeholder="Time of Incident"
                  />
                  <label htmlFor="emIncidentTime">Time of Incident</label>
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12">
                <div className="form-floating">
                  <select
                    id="emDispatch"
                    className="form-select zr-step-input"
                    value={dispatchOfficer}
                    onChange={e => onChange('dispatchOfficer', e.target.value)}
                  >
                    <option value="" disabled>
                      Choose Dispatcher
                    </option>
                    <option value="Kabochi">Kabochi</option>
                    <option value="Fox">Fox</option>
                    <option value="Pastor">Pastor</option>
                  </select>
                  <label htmlFor="emDispatch">Dispatch Officer</label>
                </div>
              </div>
            </div>

            <div className="section-divider">
              <i className="bi bi-people"></i> Responders
            </div>

            <div id="emRespondersContainer">
              {responders.map((responder, index) => (
                <div className="zr-responder-row" key={`responder-${index}`}>
                  <div className="form-floating flex-grow-1">
                    <input
                      type="text"
                      className="form-control zr-step-input"
                      id={`emResponder-${index}`}
                      placeholder="Responder name"
                      value={responder}
                      onChange={e => onChangeResponder(index, e.target.value)}
                    />
                    <label htmlFor={`emResponder-${index}`}>Responder name</label>
                  </div>
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
            </div>

            <button type="button" className="btn btn-add-responder mt-2" onClick={onAddResponder}>
              <i className="bi bi-person-plus-fill me-1"></i>
              Add Responder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
