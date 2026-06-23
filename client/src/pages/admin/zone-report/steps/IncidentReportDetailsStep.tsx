import { normalizeNabuaLocation } from '../data/nabuaBarangays'
import { BarangayAutocomplete } from '../components/BarangayAutocomplete'

const HAZARD_OPTIONS = ['Flood', 'Earthquake', 'Typhoon', 'Landslide', 'Tsunami', 'Volcanic Eruption']
const SEVERITY_OPTIONS = [
  { value: 'Low',      label: 'Low',      desc: 'Minor impact, localized' },
  { value: 'Moderate', label: 'Moderate', desc: 'Significant, some resources needed' },
  { value: 'High',     label: 'High',     desc: 'Major impact, large response required' },
]

const SEVERITY_COLOR: Record<string, string> = {
  Low:      '#16a34a',
  Moderate: '#d97706',
  High:     '#dc2626',
}

interface IncidentReportDetailsStepProps {
  typeOfHazard: string
  severityLevel: string
  incidentBarangay: string
  incidentDate: string
  incidentTime: string
  errors?: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function IncidentReportDetailsStep({
  typeOfHazard,
  severityLevel,
  incidentBarangay,
  incidentDate,
  incidentTime,
  errors = {},
  onChange,
}: IncidentReportDetailsStepProps) {
  const handleBarangayBlur = (value: string) => {
    const normalized = normalizeNabuaLocation(value)
    if (normalized !== value) onChange('incidentBarangay', normalized)
  }

  return (
    <div className="step-content">
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 mb-1">
          <i className="bi bi-shield-exclamation text-danger" style={{ fontSize: 20 }} />
          <h5 className="mb-0 fw-bold" style={{ fontSize: 16 }}>Disaster Details</h5>
        </div>
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
          Record the type, severity, and location of the incident.
        </p>
      </div>

      {/* Hazard + Severity */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6">
          <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
            Type of Hazard <span className="text-danger">*</span>
          </label>
          <select
            className={`form-select form-select-sm${errors.typeOfHazard ? ' is-invalid' : ''}`}
            value={typeOfHazard}
            onChange={e => onChange('typeOfHazard', e.target.value)}
          >
            <option value="">— Select hazard —</option>
            {HAZARD_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          {errors.typeOfHazard && <div className="invalid-feedback">{errors.typeOfHazard}</div>}
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
            Severity Level <span className="text-danger">*</span>
          </label>
          <div className="d-flex gap-2 flex-wrap">
            {SEVERITY_OPTIONS.map(opt => {
              const active = severityLevel === opt.value
              const color = SEVERITY_COLOR[opt.value]
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.desc}
                  onClick={() => onChange('severityLevel', opt.value)}
                  style={{
                    flex: '1 1 0',
                    minWidth: 70,
                    padding: '6px 4px',
                    border: `2px solid ${active ? color : '#dee2e6'}`,
                    borderRadius: 8,
                    background: active ? color : '#fff',
                    color: active ? '#fff' : '#495057',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {errors.severityLevel && (
            <div className="text-danger mt-1" style={{ fontSize: 11 }}>{errors.severityLevel}</div>
          )}
        </div>
      </div>

      {/* Barangay */}
      <div className="mb-3">
        <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
          Barangay / Location of Disaster <span className="text-danger">*</span>
        </label>
        <BarangayAutocomplete
          value={incidentBarangay}
          onChange={v => onChange('incidentBarangay', v)}
          onBlur={v => handleBarangayBlur(v)}
          placeholder="e.g. Nabua San Francisco (Pob.)"
          className={`form-control form-control-sm${errors.incidentBarangay ? ' is-invalid' : ''}`}
        />
        {errors.incidentBarangay && <div className="invalid-feedback">{errors.incidentBarangay}</div>}
      </div>

      {/* Date + Time */}
      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
            Date of Incident <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            className={`form-control form-control-sm${errors.incidentDate ? ' is-invalid' : ''}`}
            value={incidentDate}
            onChange={e => onChange('incidentDate', e.target.value)}
          />
          {errors.incidentDate && <div className="invalid-feedback">{errors.incidentDate}</div>}
        </div>
        <div className="col-12 col-sm-6">
          <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
            Time of Incident <span className="text-danger">*</span>
          </label>
          <input
            type="time"
            className={`form-control form-control-sm${errors.incidentTime ? ' is-invalid' : ''}`}
            value={incidentTime}
            onChange={e => onChange('incidentTime', e.target.value)}
          />
          {errors.incidentTime && <div className="invalid-feedback">{errors.incidentTime}</div>}
        </div>
      </div>
    </div>
  )
}
