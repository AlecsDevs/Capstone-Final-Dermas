import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import MdrrmoLogo from '../../../../assets/Mdrrmo_logo.png'
import NabuaLogo from '../../../../assets/nabua_logo.png'
import { NABUA_LOCATION_OPTIONS } from '../data/nabuaBarangays'

export interface IncidentReportViewData {
  zone?: string
  typeOfIncident?: string
  hazard: string
  severityLevel: string
  barangay: string
  date: string
  time: string
  persons: Array<{
    id?: number | string
    name: string
    age?: string
    gender: string
    contactNumber: string
    address: string
  }>
  ambulanceDriver?: string
  dispatcher?: string
  responders?: string
  photoUrl?: string | null
  isDraft?: boolean
}

/* ── styles ─────────────────────────────────────── */
const page: React.CSSProperties = {
  background: '#fff',
  fontFamily: 'Arial, sans-serif',
  fontSize: '10px',
  color: '#000',
  padding: '20px 24px 20px',
  width: 816,
  minHeight: 1056,
  margin: '0 auto',
  boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
  border: '1px solid #bbb',
  boxSizing: 'border-box',
}
const divider: React.CSSProperties = { borderBottom: '3px solid #F0C000', margin: '3px 0' }
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }
const cell: React.CSSProperties = { border: '1px solid #000', padding: '4px 6px', verticalAlign: 'middle', fontSize: '10px' }
const hCell: React.CSSProperties = { ...cell, fontWeight: 'bold', background: '#f0f0f0', textAlign: 'center', fontSize: '10px' }

const fmtDate = (val: string) => {
  if (!val) return ''
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}
const fmtTime = (val: string) => {
  if (!val) return ''
  const m = val.match(/^(\d{2}):(\d{2})/)
  if (!m) return val
  const h = parseInt(m[1]); const min = m[2]
  return `${h % 12 || 12}:${min} ${h < 12 ? 'AM' : 'PM'}`
}

/* ── Inline editable field ──────────────────────── */
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

  if (!onEdit) return <>{display ?? value}</>

  const commit = (v = draft) => { setEditing(false); onEdit(fieldKey, v) }
  const cancel = () => { setEditing(false); setDraft(value) }

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 9, padding: '1px 3px',
    border: '1.5px solid #2563eb', borderRadius: 2, outline: 'none',
  }

  if (editing) {
    if (type === 'select' && options) {
      return (
        <select autoFocus value={draft} style={inputStyle}
          onChange={e => { setDraft(e.target.value); commit(e.target.value) }}
          onBlur={() => commit()}>
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
      <span>{display ?? value}</span>
      <button type="button" title={`Edit ${fieldKey}`}
        onClick={() => { setDraft(value); setEditing(true) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px',
          color: '#2563eb', fontSize: 9, lineHeight: 1, opacity: 0.65, flexShrink: 0,
        }}>✏</button>
    </span>
  )
}

/* ── Barangay autocomplete with portal dropdown ── */
function BarangayInput({
  value, fieldKey, onEdit,
}: {
  value: string
  fieldKey: string
  onEdit?: (key: string, val: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 9, padding: '1px 3px',
    border: '1.5px solid #2563eb', borderRadius: 2, outline: 'none',
  }

  const updateSuggestions = (v: string) => {
    const q = v.toLowerCase()
    setSuggestions(
      q.length === 0
        ? NABUA_LOCATION_OPTIONS.slice(0, 10)
        : NABUA_LOCATION_OPTIONS.filter(o => o.toLowerCase().includes(q)).slice(0, 10)
    )
  }

  const positionDrop = () => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setDropStyle({
      position: 'fixed',
      top: r.bottom + 2,
      left: r.left,
      width: Math.max(r.width, 200),
      zIndex: 99999,
      background: '#fff',
      border: '1px solid #93c5fd',
      borderRadius: 6,
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      maxHeight: 220,
      overflowY: 'auto',
    })
  }

  const open = (v: string) => {
    setDraft(v)
    updateSuggestions(v)
    positionDrop()
    setEditing(true)
  }

  const commit = (v = draft) => {
    setEditing(false)
    setSuggestions([])
    if (onEdit) onEdit(fieldKey, v)
  }

  const pick = (opt: string) => {
    setDraft(opt)
    setEditing(false)
    setSuggestions([])
    if (onEdit) onEdit(fieldKey, opt)
  }

  useEffect(() => {
    if (!editing) return
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        const drop = document.getElementById('barangay-portal-drop')
        if (drop && drop.contains(e.target as Node)) return
        commit()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editing, draft])

  if (!onEdit) return <>{value}</>

  if (!editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <span>{value}</span>
        <button type="button" title="Edit barangay"
          onClick={() => open(value)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', color: '#2563eb', fontSize: 9, lineHeight: 1, opacity: 0.65 }}>
          ✏
        </button>
      </span>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={draft}
        style={inputStyle}
        onChange={e => { setDraft(e.target.value); updateSuggestions(e.target.value); positionDrop() }}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setEditing(false); setSuggestions([]) }
        }}
      />
      {suggestions.length > 0 && createPortal(
        <div id="barangay-portal-drop" style={dropStyle}>
          {suggestions.map(opt => (
            <div
              key={opt}
              onMouseDown={() => pick(opt)}
              style={{
                padding: '5px 10px', fontSize: 12, cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9', color: '#1e293b',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {opt}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

/* ── Name field: First / Middle / Last inputs ──── */
function NameEVal({
  name, personIdx, onEdit,
}: { name: string; personIdx: number; onEdit?: (k: string, v: string) => void }) {
  const parse = (n: string) => {
    const p = n.trim().split(/\s+/)
    return {
      first: p[0] ?? '',
      middle: p.length > 2 ? p.slice(1, -1).join(' ') : '',
      last: p.length > 1 ? p[p.length - 1] : '',
    }
  }
  const [editing, setEditing] = useState(false)
  const [parts, setParts] = useState(() => parse(name))

  if (!onEdit) return <>{name}</>

  const commit = () => {
    setEditing(false)
    onEdit(`person_${personIdx}_firstName`, parts.first)
    onEdit(`person_${personIdx}_middleName`, parts.middle)
    onEdit(`person_${personIdx}_lastName`, parts.last)
  }

  const inputStyle: React.CSSProperties = {
    fontSize: 9, padding: '1px 3px', border: '1.5px solid #2563eb',
    borderRadius: 2, outline: 'none', minWidth: 0,
  }

  if (!editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <span>{name || <em style={{ color: '#aaa' }}>— empty —</em>}</span>
        <button type="button" onClick={() => { setParts(parse(name)); setEditing(true) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', color: '#2563eb', fontSize: 9, opacity: 0.65 }}>✏</button>
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 60px' }}>
          <span style={{ fontSize: 7, color: '#888', marginBottom: 1 }}>First *</span>
          <input autoFocus type="text" value={parts.first} style={inputStyle}
            onChange={e => setParts(p => ({ ...p, first: e.target.value }))}
            onKeyDown={e => e.key === 'Escape' && setEditing(false)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 60px' }}>
          <span style={{ fontSize: 7, color: '#888', marginBottom: 1 }}>Middle</span>
          <input type="text" value={parts.middle} style={inputStyle}
            onChange={e => setParts(p => ({ ...p, middle: e.target.value }))}
            onKeyDown={e => e.key === 'Escape' && setEditing(false)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 60px' }}>
          <span style={{ fontSize: 7, color: '#888', marginBottom: 1 }}>Last *</span>
          <input type="text" value={parts.last} style={inputStyle}
            onChange={e => setParts(p => ({ ...p, last: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false); if (e.key === 'Enter') commit() }}
          />
        </div>
        <button type="button" onClick={commit}
          style={{ alignSelf: 'flex-end', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 3, padding: '2px 6px', fontSize: 9, cursor: 'pointer', marginBottom: 0 }}>
          ✓
        </button>
      </div>
    </div>
  )
}

/* ── Dispatcher field: preset dropdown + manual ── */
const DISPATCHER_PRESETS = ['Fox', 'Kabochi', 'Pastor']

function DispatcherEVal({
  value, fieldKey, onEdit,
}: { value: string; fieldKey: string; onEdit?: (k: string, v: string) => void }) {
  const isPreset = value === '' || DISPATCHER_PRESETS.includes(value)
  const [editing, setEditing] = useState(false)
  const [manual, setManual] = useState(!isPreset)
  const [draft, setDraft] = useState(value)

  if (!onEdit) return <>{value}</>

  const commit = (v: string) => { setEditing(false); onEdit(fieldKey, v) }

  if (!editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <span>{value}</span>
        <button type="button" onClick={() => { setDraft(value); setManual(!DISPATCHER_PRESETS.includes(value) && value !== ''); setEditing(true) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', color: '#2563eb', fontSize: 9, opacity: 0.65 }}>✏</button>
      </span>
    )
  }

  const inputStyle: React.CSSProperties = { fontSize: 9, padding: '1px 3px', border: '1.5px solid #2563eb', borderRadius: 2, outline: 'none' }

  if (!manual) {
    return (
      <select autoFocus value={DISPATCHER_PRESETS.includes(draft) ? draft : ''} style={inputStyle}
        onChange={e => {
          if (e.target.value === '__manual__') { setManual(true); setDraft('') }
          else { setDraft(e.target.value); commit(e.target.value) }
        }}
        onBlur={() => { if (manual) return; commit(draft) }}
      >
        <option value="">— Select —</option>
        {DISPATCHER_PRESETS.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__manual__">Another…</option>
      </select>
    )
  }

  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      <input autoFocus type="text" value={draft} style={{ ...inputStyle, width: 90 }}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={e => { if (e.key === 'Enter') commit(draft); if (e.key === 'Escape') setEditing(false) }}
      />
      <button type="button" style={{ ...inputStyle, cursor: 'pointer', background: '#f1f5f9' }}
        onMouseDown={() => { setManual(false); setDraft('') }}>↩</button>
    </span>
  )
}

/* ── Official header ────────────────────────────── */
function OfficialHeader() {
  return (
    <>
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
    </>
  )
}

const HAZARD_OPTIONS = ['Flood', 'Earthquake', 'Typhoon', 'Landslide', 'Tsunami', 'Volcanic Eruption']
const SEVERITY_OPTIONS = ['Low', 'Moderate', 'High']
const GENDER_OPTIONS = ['Male', 'Female']
const MIN_TABLE_ROWS = 20

export function IncidentReportView({
  data,
  onFieldEdit,
  onAddPerson,
  onRemovePerson,
}: {
  data: IncidentReportViewData
  onFieldEdit?: (fieldKey: string, value: string) => void
  onAddPerson?: () => void
  onRemovePerson?: (index: number) => void
}) {
  const hasPhoto = Boolean(data.photoUrl)
  const isEditMode = Boolean(onFieldEdit)
  const persons = isEditMode
    ? data.persons
    : data.persons.filter(p => p.name || p.gender || p.contactNumber || p.address)
  const emptyRows = isEditMode ? 0 : Math.max(0, MIN_TABLE_ROWS - persons.length)

  const E = (fieldKey: string, value: string, opts?: {
    type?: 'text' | 'select' | 'date' | 'time'
    options?: string[]
    display?: string
  }) => (
    <EVal value={value} fieldKey={fieldKey} onEdit={onFieldEdit}
      type={opts?.type} options={opts?.options} display={opts?.display} />
  )

  return (
    <div>
      {/* ── Page 1 ─────────────────────────────────── */}
      <div style={page} className="incident-page">
        <OfficialHeader />

        {/* Title */}
        <div style={{
          textAlign: 'center', fontWeight: 'bold', fontSize: 16,
          margin: '10px 0 10px', letterSpacing: 0.5,
        }}>
          Incident Reports{data.isDraft ? ' — DRAFT' : ''}
        </div>

        {/* Meta grid */}
        <table style={{ ...tbl, marginBottom: 6 }}>
          <colgroup>
            <col style={{ width: '15%' }} /><col style={{ width: '35%' }} />
            <col style={{ width: '15%' }} /><col style={{ width: '35%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td style={{ ...cell, fontWeight: 'bold' }}>Barangay:</td>
              <td style={cell}>
                <BarangayInput value={data.barangay} fieldKey="barangay" onEdit={onFieldEdit} />
              </td>
              <td style={{ ...cell, fontWeight: 'bold' }}>Hazard:</td>
              <td style={cell}>{E('hazard', data.hazard, { type: 'select', options: HAZARD_OPTIONS })}</td>
            </tr>
            <tr>
              <td style={{ ...cell, fontWeight: 'bold' }}>Date:</td>
              <td style={cell}>
                {E('date', data.date, { type: 'date', display: fmtDate(data.date) })}
                {data.time ? <> · {E('time', data.time, { type: 'time', display: fmtTime(data.time) })}</> : null}
              </td>
              <td style={{ ...cell, fontWeight: 'bold' }}>Severity Level:</td>
              <td style={{
                ...cell,
                background:
                  data.severityLevel === 'High'     ? '#ffedd5' :
                  data.severityLevel === 'Moderate' ? '#fef9c3' :
                  data.severityLevel === 'Low'      ? '#dcfce7' : undefined,
                color:
                  data.severityLevel === 'High'     ? '#9a3412' :
                  data.severityLevel === 'Moderate' ? '#854d0e' :
                  data.severityLevel === 'Low'      ? '#166534' : undefined,
              }}>
                {E('severityLevel', data.severityLevel, { type: 'select', options: SEVERITY_OPTIONS })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Affected persons table */}
        <table style={tbl}>
          <colgroup>
            <col style={{ width: onFieldEdit ? '5%' : '6%' }} />
            <col style={{ width: onFieldEdit ? '22%' : '24%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: onFieldEdit ? '29%' : '36%' }} />
            {onFieldEdit && <col style={{ width: '10%' }} />}
          </colgroup>
          <thead>
            <tr>
              <td style={{ ...hCell, border: '1px solid #000', textAlign: 'center' }} colSpan={onFieldEdit ? 7 : 6}>
                Affected Person
              </td>
            </tr>
            <tr>
              <td style={hCell}>ID</td>
              <td style={hCell}>Name {onFieldEdit && <span style={{ color: '#dc2626', fontSize: 9 }}>*</span>}</td>
              <td style={hCell}>Age</td>
              <td style={hCell}>Gender {onFieldEdit && <span style={{ color: '#dc2626', fontSize: 9 }}>*</span>}</td>
              <td style={hCell}>Contact Number</td>
              <td style={hCell}>Address</td>
              {onFieldEdit && <td style={hCell}></td>}
            </tr>
          </thead>
          <tbody>
            {persons.map((p, i) => {
              const missingName = onFieldEdit && !p.name.trim()
              const missingGender = onFieldEdit && !p.gender.trim()
              return (
                <tr key={i}>
                  <td style={{ ...cell, textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ ...cell, background: missingName ? '#fff1f2' : undefined }}>
                    <NameEVal name={p.name} personIdx={i} onEdit={onFieldEdit} />
                    {missingName && <div style={{ fontSize: 8, color: '#dc2626' }}>Required</div>}
                  </td>
                  <td style={{ ...cell, textAlign: 'center' }}>
                    {E(`person_${i}_age`, p.age ?? '')}
                  </td>
                  <td style={{ ...cell, textAlign: 'center', background: missingGender ? '#fff1f2' : undefined }}>
                    {E(`person_${i}_gender`, p.gender, { type: 'select', options: GENDER_OPTIONS })}
                    {missingGender && <div style={{ fontSize: 8, color: '#dc2626' }}>Required</div>}
                  </td>
                  <td style={cell}>{E(`person_${i}_contact`, p.contactNumber)}</td>
                  <td style={cell}>{E(`person_${i}_address`, p.address)}</td>
                  {onFieldEdit && (
                    <td style={{ ...cell, textAlign: 'center', padding: '2px' }}>
                      {onRemovePerson && persons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemovePerson(i)}
                          title="Remove person"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#dc2626', fontSize: 12, lineHeight: 1, padding: '1px 3px',
                          }}
                        >✕</button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {!onFieldEdit && Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={{ ...cell, height: 18 }}></td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
                <td style={cell}></td>
              </tr>
            ))}
            <tr>
              <td style={{ ...cell, fontWeight: 'bold' }} colSpan={onFieldEdit ? 7 : 6}>
                Total Affected: {persons.length > 0 ? persons.length : ''}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Add person button — edit mode only */}
        {onFieldEdit && onAddPerson && (
          <button
            type="button"
            onClick={onAddPerson}
            style={{
              marginTop: 4, display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: '#2563eb',
              background: 'none', border: '1px dashed #93c5fd', borderRadius: 6,
              padding: '3px 10px', cursor: 'pointer',
            }}
          >
            + Add Person
          </button>
        )}

        {/* Team Information */}
        <table style={{ ...tbl, marginTop: 6 }}>
          <colgroup>
            <col style={{ width: '50%' }} /><col style={{ width: '50%' }} />
          </colgroup>
          <thead>
            <tr>
              <td style={{ ...hCell, border: '1px solid #000' }} colSpan={2}>Team Information</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cell}><strong>Ambulance Driver:</strong> {E('ambulanceDriver', data.ambulanceDriver ?? '')}</td>
              <td style={cell}><strong>Responders:</strong> {E('responders', data.responders ?? '')}</td>
            </tr>
            <tr>
              <td style={cell} colSpan={2}><strong>Dispatcher:</strong> <DispatcherEVal value={data.dispatcher ?? ''} fieldKey="dispatcher" onEdit={onFieldEdit} /></td>
            </tr>
          </tbody>
        </table>

      </div>

      {/* ── Page 2: Photo (optional) ────────────────── */}
      {hasPhoto && (
        <div style={{ ...page, marginTop: 16 }} className="incident-page">
          <OfficialHeader />
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, margin: '8px 0' }}>
            Photo Documentation
          </div>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <img
              src={data.photoUrl!}
              alt="Incident"
              style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain', border: '1px solid #ccc' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
