import type { VitalSignRow, GlasgowRow } from '../../../../types/zoneReport'
import { useState, useEffect } from 'react'

const LOC_OPTIONS = ['Alert', 'Verbal', 'Pain', 'Unresponsive']
const AIRWAY_OPTIONS = ['Patent', 'Obstructed']
const BREATHING_OPTIONS = ['Normal', 'Labored', 'Deep', 'Shallow', 'Retraction', 'Gasping', 'Absent']
const CIRCULATION_OPTIONS = ['Normal', 'Strong', 'Weak', 'Regular', 'Irregular']
const CAPILLARY_REFILL_OPTIONS = ['<2 SEC', '>2 SEC']
const PUPILS_OPTIONS = ['Normal', 'Dilated L/R', 'Constricted L/R', 'No Reaction L/R']

function AssessRow({
  label, value, options, fieldKey, onChange,
}: {
  label: string
  value: string
  options: string[]
  fieldKey: string
  onChange: (key: string, val: string) => void
}) {
  const isCustom = value !== '' && !options.includes(value)
  const [showManual, setShowManual] = useState(isCustom)

  useEffect(() => {
    if (value === '') setShowManual(false)
    else if (!options.includes(value)) setShowManual(true)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <label className="form-label mb-1" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </label>
      {showManual ? (
        <div className="input-group input-group-sm">
          <input
            type="text"
            className="form-control"
            value={value}
            onChange={e => onChange(fieldKey, e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => { setShowManual(false); onChange(fieldKey, '') }}
          >✕</button>
        </div>
      ) : (
        <select
          className="form-select form-select-sm"
          value={options.includes(value) ? value : ''}
          onChange={e => {
            if (e.target.value === '__other__') { setShowManual(true); onChange(fieldKey, '') }
            else { setShowManual(false); onChange(fieldKey, e.target.value) }
          }}
        >
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
          <option value="__other__">Other…</option>
        </select>
      )}
    </div>
  )
}

interface AssessmentCareStepProps {
  chiefComplaint: string
  loc: string
  airway: string
  breathing: string
  circulation: string
  capillaryRefill: string
  pupils: string
  typeEmergency: string
  vitalSigns: VitalSignRow[]
  glasgowScores: GlasgowRow[]
  obLmp: string; obAog: string; obEdd: string
  obGravida: string; obPara: string; obTerm: string
  obPreterm: string; obAbortion: string; obLiving: string
  errors?: Record<string, string>
  onChange: (key: string, value: string) => void
  onVitalSignChange: (index: number, key: keyof VitalSignRow, value: string) => void
  onAddVitalSign: () => void
  onRemoveVitalSign: (index: number) => void
  onGlasgowChange: (index: number, key: keyof GlasgowRow, value: string) => void
  onAddGlasgow: () => void
  onRemoveGlasgow: (index: number) => void
  patientName?: string
}

export function AssessmentCareStep({
  chiefComplaint, loc, airway, breathing, circulation, capillaryRefill, pupils,
  typeEmergency, vitalSigns, glasgowScores,
  obLmp, obAog, obEdd, obGravida, obPara, obTerm, obPreterm, obAbortion, obLiving,
  errors = {}, onChange,
  onVitalSignChange, onAddVitalSign, onRemoveVitalSign,
  onGlasgowChange, onAddGlasgow, onRemoveGlasgow,
  patientName,
}: AssessmentCareStepProps) {
  const isOB = typeEmergency === 'OB'

  const calcGlasgowTotal = (row: GlasgowRow) => {
    const t = (parseInt(row.eye) || 0) + (parseInt(row.verbal) || 0) + (parseInt(row.motor) || 0)
    return t > 0 ? t : 0
  }

  const gcsBadge = (total: number) => {
    if (total === 0) return 'bg-secondary'
    if (total >= 13) return 'bg-success'
    if (total >= 9) return 'bg-warning text-dark'
    return 'bg-danger'
  }

  return (
    <div className="step-content">
      {/* Header */}
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 mb-1">
          <i className="bi bi-heart-pulse text-danger" style={{ fontSize: 18 }} />
          <h5 className="mb-0 fw-bold" style={{ fontSize: 16 }}>
            Assessment &amp; Care{patientName ? ` — ${patientName}` : ''}
          </h5>
        </div>
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>Document the medical assessment and care provided.</p>
      </div>

      {/* Chief Complaint */}
      <div className="mb-3">
        <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
          Chief Complaint
        </label>
        <textarea
          className="form-control form-control-sm"
          rows={2}
          placeholder="Describe the patient's chief complaint…"
          value={chiefComplaint}
          onChange={e => onChange('chiefComplaint', e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Client Assessment */}
      <div className="mb-3 p-3 rounded-2 zr-assess-box">
        <div className="d-flex align-items-center gap-1 mb-2" style={{ fontSize: 13, fontWeight: 600 }}>
          <i className="bi bi-clipboard2-pulse text-primary" /> Client Assessment
        </div>
        <div className="row g-2">
          <div className="col-12 col-sm-6 col-md-4">
            <AssessRow label="LOC" value={loc} options={LOC_OPTIONS} fieldKey="loc" onChange={onChange} />
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <AssessRow label="Airway" value={airway} options={AIRWAY_OPTIONS} fieldKey="airway" onChange={onChange} />
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <AssessRow label="Breathing" value={breathing} options={BREATHING_OPTIONS} fieldKey="breathing" onChange={onChange} />
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <AssessRow label="Circulation" value={circulation} options={CIRCULATION_OPTIONS} fieldKey="circulation" onChange={onChange} />
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <AssessRow label="Capillary Refill" value={capillaryRefill} options={CAPILLARY_REFILL_OPTIONS} fieldKey="capillaryRefill" onChange={onChange} />
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <AssessRow label="Pupils" value={pupils} options={PUPILS_OPTIONS} fieldKey="pupils" onChange={onChange} />
          </div>
        </div>
      </div>

      {/* Vital Signs */}
      <div className="mb-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            <i className="bi bi-activity text-danger me-1" /> Vital Signs
          </span>
          <button type="button" className="btn btn-sm btn-outline-primary py-0 px-2" style={{ fontSize: 12 }} onClick={onAddVitalSign}>
            <i className="bi bi-plus me-1" />Add Row
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
            <thead className="zr-table-head">
              <tr>
                <th className="text-center">#</th>
                <th>BP</th>
                <th>RR</th>
                <th>PR</th>
                <th>Temp</th>
                <th>SpO2</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {vitalSigns.map((row, i) => (
                <tr key={i}>
                  <td className="text-center align-middle text-muted" style={{ width: 30 }}>{i + 1}</td>
                  {(['bp', 'rr', 'pr', 'temp', 'spo2'] as const).map(k => (
                    <td key={k}>
                      <input
                        type="text"
                        className="form-control form-control-sm border-0 p-1"
                        value={row[k]}
                        onChange={e => onVitalSignChange(i, k, e.target.value)}
                        placeholder="—"
                        style={{ minWidth: 50 }}
                      />
                    </td>
                  ))}
                  <td className="text-center align-middle">
                    {vitalSigns.length > 1 && (
                      <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => onRemoveVitalSign(i)}>
                        <i className="bi bi-x-lg" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Glasgow Coma Scale */}
      <div className="mb-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            <i className="bi bi-diagram-3 text-primary me-1" /> Glasgow Coma Scale
          </span>
          <button type="button" className="btn btn-sm btn-outline-primary py-0 px-2" style={{ fontSize: 12 }} onClick={onAddGlasgow}>
            <i className="bi bi-plus me-1" />Add Row
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
            <thead className="zr-table-head">
              <tr>
                <th className="text-center">#</th>
                <th>Eye (1–4)</th>
                <th>Verbal (1–5)</th>
                <th>Motor (1–6)</th>
                <th className="text-center">Total</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {glasgowScores.map((row, i) => {
                const total = calcGlasgowTotal(row)
                return (
                  <tr key={i}>
                    <td className="text-center align-middle text-muted" style={{ width: 30 }}>{i + 1}</td>
                    {(['eye', 'verbal', 'motor'] as const).map((k, ki) => (
                      <td key={k}>
                        <input
                          type="number"
                          className="form-control form-control-sm border-0 p-1"
                          min={1} max={[4, 5, 6][ki]}
                          value={row[k]}
                          onChange={e => onGlasgowChange(i, k, e.target.value)}
                          placeholder="—"
                          style={{ minWidth: 50 }}
                        />
                      </td>
                    ))}
                    <td className="text-center align-middle">
                      {total > 0 ? (
                        <span className={`badge ${gcsBadge(total)}`} style={{ fontSize: 11 }}>{total}</span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-center align-middle">
                      {glasgowScores.length > 1 && (
                        <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => onRemoveGlasgow(i)}>
                          <i className="bi bi-x-lg" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="text-muted mt-1" style={{ fontSize: 11 }}>
          13–15 Mild · 9–12 Moderate · 3–8 Severe
        </div>
      </div>

      {/* OB Section */}
      {isOB && (
        <div className="p-3 rounded-2 zr-form-body">
          <div className="fw-semibold mb-2 d-flex align-items-center gap-1" style={{ fontSize: 13 }}>
            <i className="bi bi-clipboard2-heart" /> Obstetrics Data
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {([
                [
                  { key: 'obLmp',      label: 'LMP', val: obLmp,      type: 'text'   },
                  { key: 'obGravida',  label: 'G',   val: obGravida,  type: 'number' },
                  { key: 'obPara',     label: 'P',   val: obPara,     type: 'number' },
                ],
                [
                  { key: 'obAog',      label: 'AOG', val: obAog,      type: 'text'   },
                  { key: 'obPreterm',  label: 'P',   val: obPreterm,  type: 'number' },
                  { key: 'obAbortion', label: 'A',   val: obAbortion, type: 'number' },
                ],
                [
                  { key: 'obEdd',      label: 'EDD', val: obEdd,      type: 'text'   },
                  { key: 'obTerm',     label: 'T',   val: obTerm,     type: 'number' },
                  { key: 'obLiving',   label: 'L',   val: obLiving,   type: 'number' },
                ],
              ] as const).map((row, ri) => (
                <tr key={ri}>
                  {row.map(({ key, label, val, type }) => (
                    <td key={key} style={{ border: '1px solid #dee2e6', padding: '4px 8px', width: '33.3%' }}>
                      <div className="d-flex align-items-center gap-1">
                        <span style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', minWidth: 30 }}>{label}:</span>
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
