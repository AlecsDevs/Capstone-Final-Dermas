import { createContext, useContext, useState } from 'react'
import MdrrmoLogo from '../../../../assets/Mdrrmo_logo.png'
import NabuaLogo from '../../../../assets/nabua_logo.png'
import { BarangayAutocomplete } from '../components/BarangayAutocomplete'

export interface PcrVsRow {
  bp?: string; rr?: string; pr?: string; temp?: string; spo2?: string
}
export interface PcrGcsRow {
  eye?: string | number; verbal?: string | number; motor?: string | number
}
export interface PatientCareReportViewData {
  reportId?: number | string
  reportType: 'Emergency' | 'Incident'
  zone?: string
  patientName: string; age: string; gender: string; nationality: string
  contactNumber: string; permanentAddress: string; locationOfIncident: string
  accidentType?: string
  date: string; timeOfCall: string; natureOfCall: string; typeOfEmergency: string
  natureOfIllness: string; mechanismOfInjury: string; chiefComplaint: string
  loc: string; airway: string; breathing: string; circulation: string
  capillaryRefill: string; pupils: string
  obLmp: string; obAog: string; obEdd: string; obGravida: string; obPara: string
  obTerm: string; obPreterm: string; obAbortion: string; obLiving: string
  vitalSigns: PcrVsRow[]; glasgowScores: PcrGcsRow[]
  ambulanceDriver: string; dispatcher: string; responders: string
  receivingFacility: string; receivingPersonnel: string
  photoUrl?: string | null
}

const GreenCbCtx = createContext(false)

/* ─── styles ──────────────────────────────────── */
const page: React.CSSProperties = {
  background: '#fff', fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#000',
  padding: '16px 14px 10px', maxWidth: 800, margin: '0 auto',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '1px solid #ccc',
}
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }
const th: React.CSSProperties = {
  border: '1px solid #555', padding: '3px 6px', fontWeight: 'bold',
  background: '#fff', fontSize: '9px', letterSpacing: '0.3px', verticalAlign: 'top',
}
const td: React.CSSProperties = { border: '1px solid #555', padding: '4px 6px', verticalAlign: 'top', fontSize: '10px' }
const banner: React.CSSProperties = {
  textAlign: 'center', fontWeight: 'bold', fontSize: '11px',
  border: '1px solid #555', borderTop: 'none', padding: '3px 0', letterSpacing: '0.5px',
}
const divider: React.CSSProperties = { borderBottom: '3px solid #F0C000', margin: '3px 0' }

/* ─── helpers ─────────────────────────────────── */
const blank = (val?: string | number | null) =>
  val !== null && val !== undefined && String(val).trim() !== '' ? String(val) : ''

const fmtDate = (val: string) => {
  if (!val) return ''
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}
const fmtTime = (val: string) => {
  if (!val) return ''
  const m = val.match(/^(\d{2}):(\d{2})/)
  if (!m) return val
  const d = new Date(`1970-01-01T${m[1]}:${m[2]}`)
  return isNaN(d.getTime()) ? `${m[1]}:${m[2]}` : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ─── checkbox ────────────────────────────────── */
const Cb = ({ checked }: { checked: boolean }) => {
  useContext(GreenCbCtx)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 14, height: 9, border: '1px solid #16a34a', background: '#fff',
      flexShrink: 0, marginRight: 3, verticalAlign: 'middle',
    }}>
      {checked && <span style={{ color: '#000', fontSize: 8, lineHeight: 1 }}>✓</span>}
    </span>
  )
}
const CbRow = ({ label, checked }: { label: string; checked: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
    <Cb checked={checked} /><span style={{ fontSize: 9 }}>{label}</span>
  </div>
)
const DC = ({ children, style, colSpan }: { children?: React.ReactNode; style?: React.CSSProperties; colSpan?: number }) => (
  <td style={{ ...td, ...style }} colSpan={colSpan}><div style={{ minHeight: 16 }}>{children}</div></td>
)

/* ─── inline editable value ───────────────────── */
function EVal({
  value, fieldKey, onEdit, type = 'text', options, display,
}: {
  value: string
  fieldKey: string
  onEdit?: (key: string, val: string) => void
  type?: 'text' | 'select' | 'date' | 'time'
  options?: string[]
  display?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!onEdit) return <>{display ?? blank(value)}</>

  const commit = (v = draft) => { setEditing(false); onEdit(fieldKey, v) }
  const cancel = () => { setEditing(false); setDraft(value) }

  if (editing) {
    const inputStyle: React.CSSProperties = {
      width: '100%', fontSize: 9, padding: '1px 3px',
      border: '1.5px solid #2563eb', borderRadius: 2, outline: 'none',
    }
    if (type === 'select' && options) {
      return (
        <select autoFocus value={draft} style={inputStyle}
          onChange={e => { setDraft(e.target.value); commit(e.target.value) }}
          onBlur={() => commit()}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    return (
      <input autoFocus type={type} value={draft} style={inputStyle}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
      />
    )
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <span>{display ?? blank(value)}</span>
      <button type="button" title={`Edit ${fieldKey}`}
        onClick={() => { setDraft(value); setEditing(true) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px',
          color: '#2563eb', fontSize: 9, lineHeight: 1, opacity: 0.65, flexShrink: 0,
        }}
      >✏</button>
    </span>
  )
}

/* ─── barangay field with autocomplete ────────── */
function LocationEVal({
  value, fieldKey, onEdit,
}: { value: string; fieldKey: string; onEdit?: (k: string, v: string) => void }) {
  const [editing, setEditing] = useState(false)
  if (!onEdit) return <>{blank(value)}</>
  if (editing) {
    return (
      <BarangayAutocomplete
        value={value}
        onChange={v => onEdit(fieldKey, v)}
        onBlur={() => setEditing(false)}
        className=""
      />
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <span>{blank(value)}</span>
      <button type="button" title="Edit location"
        onClick={() => setEditing(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', color: '#2563eb', fontSize: 9, lineHeight: 1, opacity: 0.65 }}>
        ✏
      </button>
    </span>
  )
}

/* ─── select-only editable (for checkbox rows) ── */
function ESelect({
  value, fieldKey, options, onEdit,
}: { value: string; fieldKey: string; options: string[]; onEdit?: (k: string, v: string) => void }) {
  return <EVal value={value} fieldKey={fieldKey} onEdit={onEdit} type="select" options={options} />
}

/* ─── component ───────────────────────────────── */
export function PatientCareReportView({
  data, isDraft = false, onFieldEdit,
}: {
  data: PatientCareReportViewData
  isDraft?: boolean
  onFieldEdit?: (fieldKey: string, value: string) => void
}) {
  const hasPhoto = Boolean(data.photoUrl)
  const totalRows = Math.max(data.vitalSigns.length, data.glasgowScores.length, 4)
  const calcTotal = (g: PcrGcsRow) => {
    const t = (Number(g.eye) || 0) + (Number(g.verbal) || 0) + (Number(g.motor) || 0)
    return t > 0 ? t : ''
  }

  const E = (fieldKey: string, value: string, opts?: { type?: 'text'|'select'|'date'|'time'; options?: string[]; display?: string }) =>
    <EVal value={value} fieldKey={fieldKey} onEdit={onFieldEdit} type={opts?.type} options={opts?.options} display={opts?.display} />

  return (
    <GreenCbCtx.Provider value={isDraft}>
    <div>
      <div style={page} className="pcr-page">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <img src={NabuaLogo} alt="LGU Nabua" style={{ width: 54, height: 54, objectFit: 'contain' }} />
          <div style={{ textAlign: 'center', flex: 1, lineHeight: 1.45 }}>
            <div style={{ fontSize: 10 }}>Republic of the Philippines</div>
            <div style={{ fontSize: 15 }}>Province of Camarines Sur</div>
            <div style={{ fontSize: 10 }}>Local Government Unit of Nabua</div>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1155CC' }}>
              Municipal Disaster Risk Reduction &amp; Management Office
            </div>
            <div style={{ fontSize: 8.5, color: '#333' }}>
              Emergency Hotline: (054) 288-10-23 · Smart: 0947-1819-217 · Globe: 0915-2062-265 · Radio Freq: 147.075
            </div>
            <div style={{ fontSize: 8.5, color: '#333' }}>
              Email Address: mdrrmcnabua@yahoo.com / mdrrmonabua@gmail.com
            </div>
          </div>
          <img src={MdrrmoLogo} alt="MDRRMO" style={{ width: 54, height: 54, objectFit: 'contain' }} />
        </div>
        <div style={divider} />

        <div style={{ ...banner, borderTop: '1px solid #555' }}>
          PATIENT CARE REPORT{isDraft ? ' — DRAFT' : ''}
        </div>

        {/* ── Patient block ─────────────────────── */}
        <table style={tbl}>
          <colgroup>
            <col style={{ width: '25%' }} /><col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} /><col style={{ width: '11%' }} />
            <col style={{ width: '21%' }} /><col style={{ width: '26%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td style={th}>PATIENT NAME</td><td style={th}>AGE</td>
              <td style={th}>GENDER</td><td style={th}>NATIONALITY</td>
              <td style={th}>NATURE OF CALL</td><td style={th}>DATE / TIME OF CALL</td>
            </tr>
            <tr>
              <DC style={{ fontWeight: 'bold' }}>{E('patientName', data.patientName)}</DC>
              <DC>{E('age', data.age)}</DC>
              <DC>{E('gender', data.gender, { type: 'select', options: ['Male', 'Female'] })}</DC>
              <DC>{E('nationality', data.nationality)}</DC>
              <DC>
                <CbRow label="EMERGENCY"  checked={data.natureOfCall === 'Emergency'} />
                <CbRow label="CONDUCTION" checked={data.natureOfCall === 'Coordination' || data.natureOfCall === 'Conduction'} />
                {onFieldEdit && (
                  <ESelect value={data.natureOfCall} fieldKey="natureOfCall"
                    options={['Emergency', 'Coordination']} onEdit={onFieldEdit} />
                )}
              </DC>
              <DC>
                <div><b>DATE: </b>{E('date', data.date, { type: 'date', display: fmtDate(data.date) })}</div>
                <div><b>TIME OF CALL: </b>{E('timeOfCall', data.timeOfCall, { type: 'time', display: fmtTime(data.timeOfCall) })}</div>
              </DC>
            </tr>

            {data.accidentType && (
              <tr>
                <td style={th} colSpan={6}>TYPE OF ACCIDENT / EMERGENCY</td>
              </tr>
            )}
            {data.accidentType && (
              <tr>
                <DC colSpan={6}>
                  <span style={{ fontWeight: 700, fontSize: 10 }}>{data.accidentType}</span>
                </DC>
              </tr>
            )}
            <tr>
              <td style={th} colSpan={3}>PERMANENT ADDRESS</td>
              <td style={th} colSpan={2}>CONTACT NUMBER</td>
              <td style={th}>TYPE OF EMERGENCY</td>
            </tr>
            <tr>
              <DC colSpan={3}>{E('permanentAddress', data.permanentAddress)}</DC>
              <DC colSpan={2}>{E('contactNumber', data.contactNumber)}</DC>
              <DC>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingRight: 4 }}><CbRow label="MEDICAL" checked={data.typeOfEmergency === 'Medical'} /></td>
                      <td style={{ paddingRight: 4 }}><CbRow label="PSYCHE"  checked={data.typeOfEmergency === 'PSYCHE'} /></td>
                      <td><CbRow label="OB" checked={data.typeOfEmergency === 'OB'} /></td>
                    </tr>
                    <tr>
                      <td><CbRow label="TRAUMA" checked={data.typeOfEmergency === 'Trauma'} /></td>
                      <td><CbRow label="RTA"    checked={data.typeOfEmergency === 'RTA'} /></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                {onFieldEdit && (
                  <ESelect value={data.typeOfEmergency} fieldKey="typeOfEmergency"
                    options={['Medical', 'Trauma', 'PSYCHE', 'RTA', 'OB']} onEdit={onFieldEdit} />
                )}
              </DC>
            </tr>

            <tr>
              <td style={th} colSpan={2}>LOCATION OF INCIDENT</td>
              <td style={th} colSpan={2}>NATURE OF ILLNESS</td>
              <td style={th} colSpan={2}>MECHANISM OF INJURY</td>
            </tr>
            <tr>
              <DC colSpan={2}><LocationEVal value={data.locationOfIncident} fieldKey="locationOfIncident" onEdit={onFieldEdit} /></DC>
              <DC colSpan={2}>{E('natureOfIllness', data.natureOfIllness)}</DC>
              <DC colSpan={2}>{E('mechanismOfInjury', data.mechanismOfInjury)}</DC>
            </tr>
          </tbody>
        </table>

        {/* ── Assessment ────────────────────────── */}
        <div style={banner}>PATIENT ASSESSMENT</div>
        <table style={tbl}>
          <colgroup>
            <col style={{ width: '50%' }} /><col style={{ width: '50%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td style={{ ...td, verticalAlign: 'top' }} rowSpan={2}>
                <span style={{ fontWeight: 'bold', fontSize: 9 }}>CHIEF COMPLAINT: </span>
                {E('chiefComplaint', data.chiefComplaint)}
              </td>
              <td style={th}>OBSTETRICS DATA</td>
            </tr>
            <tr>
              <td style={{ ...td, padding: 0 }}>
                <table style={tbl}>
                  <colgroup>
                    <col style={{ width: '34%' }} /><col style={{ width: '33%' }} /><col style={{ width: '33%' }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td style={{ ...td, borderTop: 'none', borderLeft: 'none' }}><b>LMP: </b>{blank(data.obLmp)}</td>
                      <td style={{ ...td, borderTop: 'none' }}><b>G: </b>{blank(data.obGravida)}</td>
                      <td style={{ ...td, borderTop: 'none', borderRight: 'none' }}><b>P: </b>{blank(data.obPara)}</td>
                    </tr>
                    <tr>
                      <td style={{ ...td, borderLeft: 'none' }}><b>AOG: </b>{blank(data.obAog)}</td>
                      <td style={td}><b>P: </b>{blank(data.obPreterm)}</td>
                      <td style={{ ...td, borderRight: 'none' }}><b>A: </b>{blank(data.obAbortion)}</td>
                    </tr>
                    <tr>
                      <td style={{ ...td, borderBottom: 'none', borderLeft: 'none' }}><b>EDD: </b>{blank(data.obEdd)}</td>
                      <td style={{ ...td, borderBottom: 'none' }}><b>T: </b>{blank(data.obTerm)}</td>
                      <td style={{ ...td, borderBottom: 'none', borderRight: 'none' }}><b>L: </b>{blank(data.obLiving)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Assessment checkboxes */}
        <table style={tbl}>
          <colgroup>
            <col style={{ width: '14%' }} /><col style={{ width: '12%' }} />
            <col style={{ width: '17%' }} /><col style={{ width: '17%' }} />
            <col style={{ width: '17%' }} /><col style={{ width: '23%' }} />
          </colgroup>
          <tbody>
            <tr>
              {(['LOC','AIRWAY','BREATHING','CIRCULATION','CAPILLARY REFILL','PUPILS'] as const).map(h => (
                <td key={h} style={{ ...th, textAlign: 'center' }}>{h}</td>
              ))}
            </tr>
            <tr>
              <td style={{ ...td, verticalAlign: 'top' }}>
                {['Alert','Verbal','Pain','Unresponsive'].map(o => <CbRow key={o} label={o.toUpperCase()} checked={data.loc === o} />)}
                {data.loc && !['Alert','Verbal','Pain','Unresponsive'].includes(data.loc) && <CbRow label={data.loc.toUpperCase()} checked />}
                {onFieldEdit && <ESelect value={data.loc} fieldKey="loc" options={['Alert','Verbal','Pain','Unresponsive']} onEdit={onFieldEdit} />}
              </td>
              <td style={{ ...td, verticalAlign: 'top' }}>
                {['Patent','Obstructed'].map(o => <CbRow key={o} label={o.toUpperCase()} checked={data.airway === o} />)}
                {data.airway && !['Patent','Obstructed'].includes(data.airway) && <CbRow label={data.airway.toUpperCase()} checked />}
                {onFieldEdit && <ESelect value={data.airway} fieldKey="airway" options={['Patent','Obstructed']} onEdit={onFieldEdit} />}
              </td>
              <td style={{ ...td, verticalAlign: 'top' }}>
                {['Normal','Labored','Deep','Shallow','Retraction','Gasping','Absent'].map(o => <CbRow key={o} label={o.toUpperCase()} checked={data.breathing === o} />)}
                {data.breathing && !['Normal','Labored','Deep','Shallow','Retraction','Gasping','Absent'].includes(data.breathing) && <CbRow label={data.breathing.toUpperCase()} checked />}
                {onFieldEdit && <ESelect value={data.breathing} fieldKey="breathing" options={['Normal','Labored','Deep','Shallow','Retraction','Gasping','Absent']} onEdit={onFieldEdit} />}
              </td>
              <td style={{ ...td, verticalAlign: 'top' }}>
                {['Normal','Strong','Weak','Regular','Irregular'].map(o => <CbRow key={o} label={o.toUpperCase()} checked={data.circulation === o} />)}
                {data.circulation && !['Normal','Strong','Weak','Regular','Irregular'].includes(data.circulation) && <CbRow label={data.circulation.toUpperCase()} checked />}
                {onFieldEdit && <ESelect value={data.circulation} fieldKey="circulation" options={['Normal','Strong','Weak','Regular','Irregular']} onEdit={onFieldEdit} />}
              </td>
              <td style={{ ...td, verticalAlign: 'top' }}>
                {['<2 SEC','>2 SEC'].map(o => <CbRow key={o} label={o} checked={data.capillaryRefill === o} />)}
                {data.capillaryRefill && !['<2 SEC','>2 SEC'].includes(data.capillaryRefill) && <CbRow label={data.capillaryRefill.toUpperCase()} checked />}
                {onFieldEdit && <ESelect value={data.capillaryRefill} fieldKey="capillaryRefill" options={['<2 SEC','>2 SEC']} onEdit={onFieldEdit} />}
              </td>
              <td style={{ ...td, verticalAlign: 'top' }}>
                {['Normal','Dilated L/R','Constricted L/R','No Reaction L/R'].map(o => <CbRow key={o} label={o.toUpperCase()} checked={data.pupils === o} />)}
                {data.pupils && !['Normal','Dilated L/R','Constricted L/R','No Reaction L/R'].includes(data.pupils) && <CbRow label={data.pupils.toUpperCase()} checked />}
                {onFieldEdit && <ESelect value={data.pupils} fieldKey="pupils" options={['Normal','Dilated L/R','Constricted L/R','No Reaction L/R']} onEdit={onFieldEdit} />}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Vital Signs ───────────────────────── */}
        <div style={banner}>VITAL SIGN</div>
        <table style={tbl}>
          <colgroup>
            <col style={{ width: '13%' }} /><col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} /><col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} /><col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} /><col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'center', verticalAlign: 'middle' }} rowSpan={2}>BP</th>
              <th style={{ ...th, textAlign: 'center', verticalAlign: 'middle' }} rowSpan={2}>RR</th>
              <th style={{ ...th, textAlign: 'center', verticalAlign: 'middle' }} rowSpan={2}>PR</th>
              <th style={{ ...th, textAlign: 'center', verticalAlign: 'middle' }} rowSpan={2}>TEMP</th>
              <th style={{ ...th, textAlign: 'center', verticalAlign: 'middle' }} rowSpan={2}>SPO2</th>
              <th style={{ ...th, textAlign: 'center', background: '#fff' }} colSpan={4}>GLASCOW COMA SCALE</th>
            </tr>
            <tr>
              <th style={{ ...th, textAlign: 'center', background: '#fff' }}>EYE</th>
              <th style={{ ...th, textAlign: 'center', background: '#fff' }}>VERBAL</th>
              <th style={{ ...th, textAlign: 'center', background: '#fff' }}>MOTOR</th>
              <th style={{ ...th, textAlign: 'center', background: '#fff' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: totalRows }, (_, i) => {
              const vs = data.vitalSigns[i] ?? {}
              const gcs = data.glasgowScores[i] ?? {}
              const tot = calcTotal(gcs)
              return (
                <tr key={i}>
                  <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle', height: 26 }}>{E(`vs_${i}_bp`,   String(vs.bp   ?? ''))}</td>
                  <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{E(`vs_${i}_rr`,   String(vs.rr   ?? ''))}</td>
                  <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{E(`vs_${i}_pr`,   String(vs.pr   ?? ''))}</td>
                  <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{E(`vs_${i}_temp`, String(vs.temp ?? ''))}</td>
                  <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{E(`vs_${i}_spo2`, String(vs.spo2 ?? ''))}</td>
                  <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{E(`gcs_${i}_eye`,   String(gcs.eye   ?? ''))}</td>
                  <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{E(`gcs_${i}_verbal`, String(gcs.verbal ?? ''))}</td>
                  <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{E(`gcs_${i}_motor`,  String(gcs.motor  ?? ''))}</td>
                  <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{tot !== '' ? tot : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* ── Team / Endorsements ───────────────── */}
        {(() => {
          const responders = data.responders ? data.responders.split(',').map(r => r.trim()).filter(Boolean) : []
          return (
            <table style={tbl}>
              <colgroup>
                <col style={{ width: '50%' }} /><col style={{ width: '50%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ ...th, textAlign: 'center' }}>TEAM INFORMATION</td>
                  <td style={{ ...th, textAlign: 'center' }}>ENDORSEMENTS</td>
                </tr>
                <tr>
                  <td style={{ ...td, minHeight: 20 }}>
                    <span style={{ fontWeight: 'bold', fontSize: 9 }}>AMBULANCE DRIVER: </span>
                    {E('ambulanceDriver', data.ambulanceDriver)}
                  </td>
                  <td style={{ ...td, minHeight: 20 }}>
                    <span style={{ fontWeight: 'bold', fontSize: 9 }}>RECEIVING FACILITY: </span>
                    {E('receivingFacility', data.receivingFacility)}
                  </td>
                </tr>
                <tr>
                  <td style={{ ...td, verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 'bold', fontSize: 9, whiteSpace: 'nowrap', marginRight: 4 }}>RESPONDERS: </span>
                      {responders.length > 0 && (() => {
                        const n = responders.length
                        const colCount = n <= 1 ? 1 : Math.max(2, Math.ceil(n / 2))
                        const numRows = Math.ceil(n / colCount)
                        return (
                          <table style={{ borderCollapse: 'collapse' }}>
                            <tbody>
                              {Array.from({ length: numRows }, (_, rowIdx) => (
                                <tr key={rowIdx}>
                                  {Array.from({ length: colCount }, (_, colIdx) => {
                                    const rIdx = colIdx * numRows + rowIdx
                                    return (
                                      <td key={colIdx} style={{ paddingRight: 14, lineHeight: '14px', whiteSpace: 'nowrap', verticalAlign: 'top', fontSize: 10 }}>
                                        {rIdx < responders.length ? responders[rIdx] : ''}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )
                      })()}
                    </div>
                    {onFieldEdit && (
                      <div style={{ marginTop: 2 }}>
                        <EVal value={data.responders} fieldKey="responders" onEdit={onFieldEdit} />
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{ fontWeight: 'bold', fontSize: 9 }}>RECEIVING PERSONNEL: </span>
                    {E('receivingPersonnel', data.receivingPersonnel)}
                  </td>
                </tr>
                <tr>
                  <td style={td} colSpan={2}>
                    <span style={{ fontWeight: 'bold', fontSize: 9 }}>DISPATCHER: </span>
                    {E('dispatcher', data.dispatcher)}
                  </td>
                </tr>
              </tbody>
            </table>
          )
        })()}
      </div>

      {/* ── Page 2 — photo ────────────────────── */}
      {hasPhoto && (
        <div style={{ ...page, marginTop: 16 }} className="pcr-page pcr-page-photo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <img src={NabuaLogo} alt="LGU Nabua" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1155CC' }}>
                Municipal Disaster Risk Reduction &amp; Management Office
              </div>
              <div style={{ fontSize: 10 }}>Local Government Unit of Nabua, Camarines Sur</div>
            </div>
            <img src={MdrrmoLogo} alt="MDRRMO" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          </div>
          <div style={divider} />
          <div style={{ ...banner, borderTop: '1px solid #555' }}>PHOTO ATTACHMENT</div>
          <div style={{ padding: '12px 0', textAlign: 'center', border: '1px solid #ccc', borderTop: 'none', minHeight: 200 }}>
            <img src={data.photoUrl!} alt="Incident documentation"
              style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }} />
          </div>
        </div>
      )}
    </div>
    </GreenCbCtx.Provider>
  )
}
