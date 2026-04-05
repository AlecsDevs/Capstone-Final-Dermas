interface AssessmentCareStepProps {
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
  errors?: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function AssessmentCareStep({
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
  errors = {},
  onChange,
}: AssessmentCareStepProps) {
  return (
    <div className="step-content">
      <div className="step-header mb-4">
        <h4 className="fw-bold mb-1">
          <i className="bi bi-heart-pulse me-2 text-danger"></i>
          Assessment & Care Management
        </h4>
        <p className="text-muted mb-0">Document the medical assessment and care provided.</p>
      </div>

      <div className="zr-step-card">
        <div className="zr-section-label">
          <i className="bi bi-clipboard2-pulse me-2"></i>
          Client Assessment
        </div>
        <textarea
          className={`form-control zr-step-input zr-step-textarea${errors.assessment ? ' is-invalid' : ''}`}
          placeholder="Chief Complaint"
          value={assessment}
          onChange={e => onChange('assessment', e.target.value)}
          rows={3}
        ></textarea>
        {errors.assessment && <div className="zr-field-error">{errors.assessment}</div>}

        <div className="zr-section-label mt-3">
          <i className="bi bi-shield-plus me-2"></i>
          Care Management
        </div>

        <div className="row g-2">
          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">Airway</label>
              <select className={`form-select zr-mini-input${errors.airway ? ' is-invalid' : ''}`} value={airway} onChange={e => onChange('airway', e.target.value)}>
                <option value="">Choose...</option>
                <option value="Suction">Suction</option>
                <option value="Manual Clearance">Manual Clearance</option>
                <option value="Head Tilt Maneuver">Head Tilt Maneuver</option>
                <option value="Jaw Thrust Maneuver">Jaw Thrust Maneuver</option>
              </select>
              {errors.airway && <div className="zr-field-error">{errors.airway}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">Breathing</label>
              <select className={`form-select zr-mini-input${errors.breathing ? ' is-invalid' : ''}`} value={breathing} onChange={e => onChange('breathing', e.target.value)}>
                <option value="">Choose...</option>
                <option value="OPA">OPA</option>
                <option value="NPA">NPA</option>
                <option value="Pocket Mask">Pocket Mask</option>
                <option value="Nasal Cannula">Nasal Cannula</option>
                <option value="Simple Facemask">Simple Facemask</option>
                <option value="NRM">NRM</option>
                <option value="BVM">BVM</option>
              </select>
              {errors.breathing && <div className="zr-field-error">{errors.breathing}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">Circulation Support</label>
              <select className={`form-select zr-mini-input${errors.circulation ? ' is-invalid' : ''}`} value={circulation} onChange={e => onChange('circulation', e.target.value)}>
                <option value="">Choose...</option>
                <option value="CPR">CPR</option>
                <option value="AED">AED</option>
              </select>
              {errors.circulation && <div className="zr-field-error">{errors.circulation}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">Wound Care</label>
              <select className={`form-select zr-mini-input${errors.woundCare ? ' is-invalid' : ''}`} value={woundCare} onChange={e => onChange('woundCare', e.target.value)}>
                <option value="">Choose...</option>
                <option value="Bleeding Control">Bleeding Control</option>
                <option value="Cleaning/Disinfecting">Cleaning/Disinfecting</option>
                <option value="Dressing">Dressing</option>
              </select>
              {errors.woundCare && <div className="zr-field-error">{errors.woundCare}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">Miscellaneous</label>
              <select className={`form-select zr-mini-input${errors.miscellaneous ? ' is-invalid' : ''}`} value={miscellaneous} onChange={e => onChange('miscellaneous', e.target.value)}>
                <option value="">Choose...</option>
                <option value="Cold Compress">Cold Compress</option>
                <option value="Warm Compress">Warm Compress</option>
                <option value="Shock Position">Shock Position</option>
              </select>
              {errors.miscellaneous && <div className="zr-field-error">{errors.miscellaneous}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">History of Coronary Disease</label>
              <select className={`form-select zr-mini-input${errors.coronary ? ' is-invalid' : ''}`} value={coronary} onChange={e => onChange('coronary', e.target.value)}>
                <option value="">Choose...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Undetermined">Undetermined</option>
              </select>
              {errors.coronary && <div className="zr-field-error">{errors.coronary}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">Collapse Witness</label>
              <select className={`form-select zr-mini-input${errors.collapseWitness ? ' is-invalid' : ''}`} value={collapseWitness} onChange={e => onChange('collapseWitness', e.target.value)}>
                <option value="">Choose...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              {errors.collapseWitness && <div className="zr-field-error">{errors.collapseWitness}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">Time of Collapse</label>
              <input type="time" className={`form-control zr-mini-input${errors.timeCollapse ? ' is-invalid' : ''}`} value={timeCollapse} onChange={e => onChange('timeCollapse', e.target.value)} />
              {errors.timeCollapse && <div className="zr-field-error">{errors.timeCollapse}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">Start of CPR</label>
              <input type="time" className={`form-control zr-mini-input${errors.startCpr ? ' is-invalid' : ''}`} value={startCpr} onChange={e => onChange('startCpr', e.target.value)} />
              {errors.startCpr && <div className="zr-field-error">{errors.startCpr}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">Defibrillation Time</label>
              <input type="time" className={`form-control zr-mini-input${errors.defibrillation ? ' is-invalid' : ''}`} value={defibrillation} onChange={e => onChange('defibrillation', e.target.value)} />
              {errors.defibrillation && <div className="zr-field-error">{errors.defibrillation}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">CPR Duration (min)</label>
              <input type="number" className={`form-control zr-mini-input${errors.durationCpr ? ' is-invalid' : ''}`} value={durationCpr} onChange={e => onChange('durationCpr', e.target.value)} min={0} />
              {errors.durationCpr && <div className="zr-field-error">{errors.durationCpr}</div>}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="zr-mini-card">
              <label className="zr-mini-label">ROSC</label>
              <input type="text" className={`form-control zr-mini-input${errors.rosc ? ' is-invalid' : ''}`} placeholder="Return of spontaneous circulation" value={rosc} onChange={e => onChange('rosc', e.target.value)} />
              {errors.rosc && <div className="zr-field-error">{errors.rosc}</div>}
            </div>
          </div>
        </div>

        <div className="mt-2">
          <label className="zr-mini-label">Transferred to Hospital</label>
          <input
            type="text"
            className={`form-control zr-mini-input${errors.hospitalTransfer ? ' is-invalid' : ''}`}
            placeholder="Hospital name / Yes / No"
            value={hospitalTransfer}
            onChange={e => onChange('hospitalTransfer', e.target.value)}
          />
          {errors.hospitalTransfer && <div className="zr-field-error">{errors.hospitalTransfer}</div>}
        </div>
      </div>
    </div>
  )
}
