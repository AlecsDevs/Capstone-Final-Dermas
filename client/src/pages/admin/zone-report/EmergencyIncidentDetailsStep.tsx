interface EmergencyIncidentDetailsStepProps {
  mechanism: string
  natureIllness: string
  typeEmergency: string
  incidentDate: string
  incidentTime: string
  dispatchOfficer: string
  responders: string[]
  errors?: Record<string, string>
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
  errors = {},
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
                    className={`form-control zr-step-input${errors.mechanism ? ' is-invalid' : ''}`}
                    value={mechanism}
                    onChange={e => onChange('mechanism', e.target.value)}
                    placeholder="Mechanism of Injury / Illness"
                  />
                  <label htmlFor="emMechanism">Mechanism of Injury / Illness</label>
                  {errors.mechanism && <div className="zr-field-error">{errors.mechanism}</div>}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="text"
                    id="emNatureIllness"
                    className={`form-control zr-step-input${errors.natureIllness ? ' is-invalid' : ''}`}
                    value={natureIllness}
                    onChange={e => onChange('natureIllness', e.target.value)}
                    placeholder="Nature of Illness"
                  />
                  <label htmlFor="emNatureIllness">Nature of Illness</label>
                  {errors.natureIllness && <div className="zr-field-error">{errors.natureIllness}</div>}
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12">
                <div className="form-floating">
                  <select
                    id="emTypeEmergency"
                    className={`form-select zr-step-input${errors.typeEmergency ? ' is-invalid' : ''}`}
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
                  {errors.typeEmergency && <div className="zr-field-error">{errors.typeEmergency}</div>}
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="date"
                    id="emIncidentDate"
                    className={`form-control zr-step-input${errors.incidentDate ? ' is-invalid' : ''}`}
                    value={incidentDate}
                    onChange={e => onChange('incidentDate', e.target.value)}
                    placeholder="Date of Incident"
                  />
                  <label htmlFor="emIncidentDate">Date of Incident</label>
                  {errors.incidentDate && <div className="zr-field-error">{errors.incidentDate}</div>}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-floating">
                  <input
                    type="time"
                    id="emIncidentTime"
                    className={`form-control zr-step-input${errors.incidentTime ? ' is-invalid' : ''}`}
                    value={incidentTime}
                    onChange={e => onChange('incidentTime', e.target.value)}
                    placeholder="Time of Incident"
                  />
                  <label htmlFor="emIncidentTime">Time of Incident</label>
                  {errors.incidentTime && <div className="zr-field-error">{errors.incidentTime}</div>}
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12">
                <div className="form-floating">
                  <select
                    id="emDispatch"
                    className={`form-select zr-step-input${errors.dispatchOfficer ? ' is-invalid' : ''}`}
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
                  {errors.dispatchOfficer && <div className="zr-field-error">{errors.dispatchOfficer}</div>}
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

            {errors.responders && <div className="zr-field-error mt-1">{errors.responders}</div>}

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
