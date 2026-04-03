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
      <div className="step-panel" id="stepHazardIncidentDetails">
        <div className="step-card">
          <div className="step-card-header">
            <i className="bi bi-shield-exclamation" style={{ color: 'var(--mdrrmo-blue, #0f5b77)' }}></i>
            <div>
              <h5>Incident Details</h5>
              <p>{isEmergency ? 'Describe the emergency incident' : 'Describe the hazard incident'}</p>
            </div>
          </div>

          <div className="step-card-body">
            {isEmergency ? (
              <>
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <div className="form-floating">
                      <select
                        id="emMechanism"
                        className="form-select zr-step-input"
                        value={mechanism}
                        onChange={e => onChange('mechanism', e.target.value)}
                      >
                        <option value="" disabled>
                          Choose
                        </option>
                        <option value="Vehicular Accident">Vehicular Accident</option>
                        <option value="Fall Injury">Fall Injury</option>
                        <option value="Burn Injury">Burn Injury</option>
                        <option value="Drowning">Drowning</option>
                        <option value="Others">Others</option>
                      </select>
                      <label htmlFor="emMechanism">Mechanism of Injury / Illness</label>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="form-floating">
                      <select
                        id="emNatureIllness"
                        className="form-select zr-step-input"
                        value={natureIllness}
                        onChange={e => onChange('natureIllness', e.target.value)}
                      >
                        <option value="" disabled>
                          Choose
                        </option>
                        <option value="Chest Pain">Chest Pain</option>
                        <option value="Difficulty Breathing">Difficulty Breathing</option>
                        <option value="Unconscious">Unconscious</option>
                        <option value="Fracture">Fracture</option>
                        <option value="Severe Bleeding">Severe Bleeding</option>
                        <option value="Others">Others</option>
                      </select>
                      <label htmlFor="emNatureIllness">Nature of Illness</label>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
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
              </>
            ) : (
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <div className="form-floating">
                    <select
                      id="hzTypeOfHazard"
                      className="form-select zr-step-input"
                      value={typeOfHazard}
                      onChange={e => onChange('typeOfHazard', e.target.value)}
                    >
                      <option value="" disabled>
                        Choose
                      </option>
                      <option value="Flood">Flood</option>
                      <option value="Earthquake">Earthquake</option>
                      <option value="Typhoon">Typhoon</option>
                      <option value="Landslide">Landslide</option>
                    </select>
                    <label htmlFor="hzTypeOfHazard">Type of Hazard</label>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="form-floating">
                    <select
                      id="hzNatureCall"
                      className="form-select zr-step-input"
                      value={natureOfCall}
                      onChange={e => onChange('natureOfCall', e.target.value)}
                    >
                      <option value="" disabled>
                        Choose
                      </option>
                      <option value="Emergency">Emergency</option>
                      <option value="Conduction">Conduction</option>
                      <option value="Search and Rescue">Search and Rescue</option>
                    </select>
                    <label htmlFor="hzNatureCall">Nature of Call</label>
                  </div>
                </div>
              </div>
            )}

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="date"
                    id="hzIncidentDate"
                    className="form-control zr-step-input"
                    value={incidentDate}
                    onChange={e => onChange('incidentDate', e.target.value)}
                    placeholder="Date of Incident"
                  />
                  <label htmlFor="hzIncidentDate">Date of Incident</label>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="time"
                    id="hzIncidentTime"
                    className="form-control zr-step-input"
                    value={incidentTime}
                    onChange={e => onChange('incidentTime', e.target.value)}
                    placeholder="Time of Incident"
                  />
                  <label htmlFor="hzIncidentTime">Time of Incident</label>
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <select
                    id="hzDispatch"
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
                  <label htmlFor="hzDispatch">Dispatch Officer</label>
                </div>
              </div>
            </div>

            <div className="section-divider">
              <i className="bi bi-people"></i> Responders
            </div>

            <div id="hzRespondersContainer">
              {responders.map((responder, index) => (
                <div className="zr-responder-row" key={`responder-${index}`}>
                  <div className="form-floating flex-grow-1">
                    <input
                      type="text"
                      className="form-control zr-step-input"
                      id={`hzResponder-${index}`}
                      placeholder="Responder name"
                      value={responder}
                      onChange={e => onChangeResponder(index, e.target.value)}
                    />
                    <label htmlFor={`hzResponder-${index}`}>Responder name</label>
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
