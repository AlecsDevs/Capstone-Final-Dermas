interface EmergencyIncidentDetailsStepProps {
  mechanism: string
  natureIllness: string
  typeEmergency: string
  natureOfCall: string
  incidentDate: string
  incidentTime: string
  obLmp: string
  obAog: string
  obEdd: string
  obGravida: string
  obPara: string
  obTerm: string
  obPreterm: string
  obAbortion: string
  obLiving: string
  errors?: Record<string, string>
  onChange: (key: string, value: string) => void
  patientName?: string
}

function Field({
  label, children, error,
}: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#495057' }}>
        {label}
      </label>
      {children}
      {error && <div className="text-danger mt-1" style={{ fontSize: 11 }}>{error}</div>}
    </div>
  )
}

export function EmergencyIncidentDetailsStep({
  mechanism,
  natureIllness,
  typeEmergency,
  natureOfCall,
  incidentDate,
  incidentTime,
  obLmp, obAog, obEdd,
  obGravida, obPara, obTerm,
  obPreterm, obAbortion, obLiving,
  errors = {},
  onChange,
  patientName,
}: EmergencyIncidentDetailsStepProps) {
  const isOB = typeEmergency === 'OB'

  return (
    <div className="step-content">
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 mb-1">
          <i className="bi bi-shield-exclamation" style={{ color: '#0f5b77', fontSize: 18 }} />
          <h5 className="mb-0 fw-bold" style={{ fontSize: 16 }}>
            Incident Details{patientName ? ` — ${patientName}` : ''}
          </h5>
        </div>
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>Describe the emergency incident</p>
      </div>

      <div className="row g-2 mb-2">
        <div className="col-12 col-sm-6">
          <Field label="Mechanism of Injury / Illness" error={errors.mechanism}>
            <input
              type="text"
              className={`form-control form-control-sm${errors.mechanism ? ' is-invalid' : ''}`}
              value={mechanism}
              onChange={e => onChange('mechanism', e.target.value)}
              placeholder="e.g. Vehicular Accident"
            />
          </Field>
        </div>
        <div className="col-12 col-sm-6">
          <Field label="Nature of Illness" error={errors.natureIllness}>
            <input
              type="text"
              className={`form-control form-control-sm${errors.natureIllness ? ' is-invalid' : ''}`}
              value={natureIllness}
              onChange={e => onChange('natureIllness', e.target.value)}
              placeholder="e.g. Chest Pain"
            />
          </Field>
        </div>
        <div className="col-12 col-sm-6">
          <Field label="Type of Emergency" error={errors.typeEmergency}>
            <select
              className={`form-select form-select-sm${errors.typeEmergency ? ' is-invalid' : ''}`}
              value={typeEmergency}
              onChange={e => onChange('typeEmergency', e.target.value)}
            >
              <option value="">— Select —</option>
              <option value="Medical">Medical</option>
              <option value="Trauma">Trauma</option>
              <option value="PSYCHE">PSYCHE</option>
              <option value="RTA">RTA</option>
              <option value="OB">OB (Obstetrics)</option>
            </select>
          </Field>
        </div>
        <div className="col-12 col-sm-6">
          <Field label="Nature of Call" error={errors.natureOfCall}>
            <select
              className={`form-select form-select-sm${errors.natureOfCall ? ' is-invalid' : ''}`}
              value={natureOfCall}
              onChange={e => onChange('natureOfCall', e.target.value)}
            >
              <option value="">— Select —</option>
              <option value="Emergency">Emergency</option>
              <option value="Conduction">Conduction</option>
            </select>
          </Field>
        </div>
        <div className="col-12 col-sm-6">
          <Field label="Date of Incident" error={errors.incidentDate}>
            <input
              type="date"
              className={`form-control form-control-sm${errors.incidentDate ? ' is-invalid' : ''}`}
              value={incidentDate}
              onChange={e => onChange('incidentDate', e.target.value)}
            />
          </Field>
        </div>
        <div className="col-12 col-sm-6">
          <Field label="Time of Incident" error={errors.incidentTime}>
            <input
              type="time"
              className={`form-control form-control-sm${errors.incidentTime ? ' is-invalid' : ''}`}
              value={incidentTime}
              onChange={e => onChange('incidentTime', e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* OB Section */}
      {isOB && (
        <div className="mt-3 p-3 rounded-2 zr-form-body">
          <div className="fw-semibold mb-2 d-flex align-items-center gap-1" style={{ fontSize: 13, color: '#212529' }}>
            <i className="bi bi-clipboard2-heart" /> Obstetrics Data
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {([
                [
                  { key: 'obLmp',     label: 'LMP', val: obLmp,      type: 'text'   },
                  { key: 'obGravida', label: 'G',   val: obGravida,  type: 'number' },
                  { key: 'obPara',    label: 'P',   val: obPara,     type: 'number' },
                ],
                [
                  { key: 'obAog',     label: 'AOG', val: obAog,      type: 'text'   },
                  { key: 'obPreterm', label: 'P',   val: obPreterm,  type: 'number' },
                  { key: 'obAbortion',label: 'A',   val: obAbortion, type: 'number' },
                ],
                [
                  { key: 'obEdd',     label: 'EDD', val: obEdd,      type: 'text'   },
                  { key: 'obTerm',    label: 'T',   val: obTerm,     type: 'number' },
                  { key: 'obLiving',  label: 'L',   val: obLiving,   type: 'number' },
                ],
              ] as const).map((row, ri) => (
                <tr key={ri}>
                  {row.map(({ key, label, val, type }) => (
                    <td key={key} style={{ border: '1px solid #dee2e6', padding: '4px 8px', width: '33.3%' }}>
                      <div className="d-flex align-items-center gap-1">
                        <span style={{ fontWeight: 700, fontSize: 12, color: '#495057', whiteSpace: 'nowrap', minWidth: 30 }}>{label}:</span>
                        <input
                          type={type}
                          min={type === 'number' ? 0 : undefined}
                          className={`form-control form-control-sm border-0 p-0 px-1${errors[key] ? ' is-invalid' : ''}`}
                          style={{ background: 'transparent', fontSize: 13 }}
                          value={val}
                          onChange={e => onChange(key, e.target.value)}
                        />
                      </div>
                      {errors[key] && <div className="text-danger" style={{ fontSize: 10 }}>{errors[key]}</div>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
