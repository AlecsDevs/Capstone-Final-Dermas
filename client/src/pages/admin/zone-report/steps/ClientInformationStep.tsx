import { useState } from 'react'
import type { PersonInfo } from '../../../../types/zoneReport'
import { normalizeNabuaLocation } from '../data/nabuaBarangays'
import { BarangayAutocomplete } from '../components/BarangayAutocomplete'
import { IncidentLocationPicker } from '../components/IncidentLocationPicker'
import { ACCIDENT_TYPES, getAccidentMeta } from '../data/accidentTypes'

interface ClientInformationStepProps {
  people: PersonInfo[]
  reportLabel: string
  errors?: Record<string, string>
  onChangePerson: (index: number, key: keyof PersonInfo, value: string) => void
  onAddPerson: () => void
  onRemovePerson: (index: number) => void
  showAddButton?: boolean
  incidentMode?: boolean
}

function AccidentTypeField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const meta = getAccidentMeta(value)
  return (
    <div>
      <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
        Accident / Emergency Type
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Live icon preview */}
        <div style={{
          width: 36, height: 34, borderRadius: 8, flexShrink: 0,
          background: meta ? meta.bg : '#f3f4f6',
          border: `2px solid ${meta ? meta.border : '#e5e7eb'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {meta
            ? <i className={`bi ${meta.icon}`} style={{ fontSize: 17, color: meta.color }} />
            : <i className="bi bi-question" style={{ fontSize: 15, color: '#d1d5db' }} />
          }
        </div>
        <select
          className="form-select form-select-sm"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ borderColor: meta ? meta.border : undefined }}
        >
          <option value="">— Select type —</option>
          {ACCIDENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.value}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
      {children}
      {required && <span className="text-danger ms-1">*</span>}
    </label>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <div className="text-danger mt-1" style={{ fontSize: 11 }}>{msg}</div>
}

export function ClientInformationStep({
  people,
  reportLabel,
  errors = {},
  onChangePerson,
  onAddPerson,
  onRemovePerson,
  showAddButton = true,
  incidentMode = false,
}: ClientInformationStepProps) {
  const [showCustomNationality, setShowCustomNationality] = useState<Record<number, boolean>>({})

  const handleLocationChange = (index: number, value: string) => {
    onChangePerson(index, 'incidentLocation', value)
  }

  const handleLocationBlur = (index: number, value: string) => {
    const normalized = normalizeNabuaLocation(value)
    if (normalized !== value) onChangePerson(index, 'incidentLocation', normalized)
  }

  const handleNationalityChange = (index: number, value: string) => {
    if (value === 'Another') {
      setShowCustomNationality(prev => ({ ...prev, [index]: true }))
      onChangePerson(index, 'nationality', '')
    } else {
      setShowCustomNationality(prev => ({ ...prev, [index]: false }))
      onChangePerson(index, 'nationality', value)
    }
  }

  return (
    <div className="step-content">
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 mb-1">
          <i className="bi bi-people-fill text-danger" style={{ fontSize: 18 }} />
          <h5 className="mb-0 fw-bold" style={{ fontSize: 16 }}>
            {incidentMode ? 'Affected Persons' : 'Client Information'}
          </h5>
        </div>
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
          {incidentMode
            ? 'Add each person affected by the disaster.'
            : `Enter details for each person involved in the ${reportLabel}.`}
        </p>
      </div>

      {people.map((person, index) => {
        const accidentMeta = !incidentMode ? getAccidentMeta(person.accidentType) : null

        return (
          <div
            key={`person-${index}`}
            className="mb-3 rounded-3 overflow-hidden zr-person-card-wrap"
            style={{ border: `1px solid ${accidentMeta ? accidentMeta.border : '#dee2e6'}` }}
          >
            {/* Card header */}
            <div
              className="d-flex align-items-center justify-content-between px-3 py-2 zr-person-card-hd"
              style={{
                background: accidentMeta ? accidentMeta.bg : '#f8f9fa',
                borderBottom: `1px solid ${accidentMeta ? accidentMeta.border : '#dee2e6'}`,
              }}
            >
              <span className="d-flex align-items-center gap-2 fw-semibold" style={{ fontSize: 13 }}>
                <span
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: 24, height: 24,
                    background: accidentMeta ? accidentMeta.color : '#0d6efd',
                    color: '#fff', fontSize: 12, flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                {[person.firstName, person.lastName].filter(Boolean).join(' ') || `Person ${index + 1}`}
                {accidentMeta && (
                  <span className="zr-acc-chip" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 700, color: accidentMeta.color,
                    border: `1px solid ${accidentMeta.border}`,
                    borderRadius: 20, padding: '1px 8px',
                  }}>
                    <i className={`bi ${accidentMeta.icon}`} style={{ fontSize: 12 }} />
                    {accidentMeta.value}
                  </span>
                )}
              </span>
              {people.length > 1 && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0 d-flex align-items-center gap-1"
                  style={{ fontSize: 12, textDecoration: 'none' }}
                  onClick={() => onRemovePerson(index)}
                >
                  <i className="bi bi-trash3" /> Remove
                </button>
              )}
            </div>

            {/* Card body */}
            <div className="p-3 zr-form-body">

              {/* Name row */}
              <div className="row g-2 mb-2">
                <div className="col-12 col-sm-4">
                  <FieldLabel required>First Name</FieldLabel>
                  <input
                    type="text"
                    className={`form-control form-control-sm${errors[`person-${index}-firstName`] ? ' is-invalid' : ''}`}
                    value={person.firstName}
                    onChange={e => onChangePerson(index, 'firstName', e.target.value)}
                  />
                  <FieldError msg={errors[`person-${index}-firstName`]} />
                </div>
                <div className="col-12 col-sm-4">
                  <FieldLabel>Middle Name</FieldLabel>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={person.middleName}
                    onChange={e => onChangePerson(index, 'middleName', e.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-4">
                  <FieldLabel required>Last Name</FieldLabel>
                  <input
                    type="text"
                    className={`form-control form-control-sm${errors[`person-${index}-lastName`] ? ' is-invalid' : ''}`}
                    value={person.lastName}
                    onChange={e => onChangePerson(index, 'lastName', e.target.value)}
                  />
                  <FieldError msg={errors[`person-${index}-lastName`]} />
                </div>
              </div>

              {/* Demographics row */}
              <div className="row g-2 mb-2">
                <div className={incidentMode ? 'col-6' : 'col-6 col-sm-3'}>
                  <FieldLabel>Age</FieldLabel>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min={0}
                    value={person.age}
                    onChange={e => onChangePerson(index, 'age', e.target.value)}
                  />
                </div>
                <div className={incidentMode ? 'col-6' : 'col-6 col-sm-3'}>
                  <FieldLabel required>Gender</FieldLabel>
                  <select
                    className={`form-select form-select-sm${errors[`person-${index}-gender`] ? ' is-invalid' : ''}`}
                    value={person.gender}
                    onChange={e => onChangePerson(index, 'gender', e.target.value)}
                  >
                    <option value="">— Select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <FieldError msg={errors[`person-${index}-gender`]} />
                </div>
                {!incidentMode && (
                  <div className="col-12 col-sm-6">
                    <FieldLabel>Nationality</FieldLabel>
                    {!showCustomNationality[index] ? (
                      <select
                        className="form-select form-select-sm"
                        value={person.nationality || 'Filipino'}
                        onChange={e => handleNationalityChange(index, e.target.value)}
                      >
                        <option value="Filipino">Filipino</option>
                        <option value="Another">Another…</option>
                      </select>
                    ) : (
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control"
                          value={person.nationality}
                          onChange={e => onChangePerson(index, 'nationality', e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => handleNationalityChange(index, 'Filipino')}
                        >✕</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contact + Address row */}
              <div className="row g-2 mb-2">
                <div className="col-12 col-sm-6">
                  <FieldLabel>Contact Number</FieldLabel>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={person.contactNumber}
                    onChange={e => onChangePerson(index, 'contactNumber', e.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <FieldLabel>Permanent Address</FieldLabel>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={person.permanentAddress}
                    onChange={e => onChangePerson(index, 'permanentAddress', e.target.value)}
                  />
                </div>
              </div>

              {/* Location block — emergency only */}
              {!incidentMode && (
                <div className="row g-2">
                  {/* Location of Incident + Accident Type side by side */}
                  <div className="col-12 col-sm-6">
                    <FieldLabel>Location of Incident</FieldLabel>
                    <BarangayAutocomplete
                      value={person.incidentLocation}
                      onChange={v => handleLocationChange(index, v)}
                      onBlur={v => handleLocationBlur(index, v)}
                      className={`form-control form-control-sm${errors[`person-${index}-incidentLocation`] ? ' is-invalid' : ''}`}
                    />
                    <FieldError msg={errors[`person-${index}-incidentLocation`]} />
                  </div>
                  <div className="col-12 col-sm-6">
                    <AccidentTypeField
                      value={person.accidentType}
                      onChange={v => onChangePerson(index, 'accidentType', v)}
                    />
                  </div>
                  <div className="col-12">
                    {index > 0 && people[0]?.latitude && people[0]?.longitude && (
                      <button
                        type="button"
                        className="btn btn-sm d-flex align-items-center gap-2 mb-1"
                        style={{ fontSize: 12, borderRadius: 20, padding: '3px 14px', background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac' }}
                        onClick={() => {
                          onChangePerson(index, 'latitude', people[0].latitude)
                          onChangePerson(index, 'longitude', people[0].longitude)
                        }}
                      >
                        <i className="bi bi-geo-alt-fill" />
                        Use same location as Person 1
                      </button>
                    )}
                    <IncidentLocationPicker
                      lat={person.latitude}
                      lng={person.longitude}
                      onChange={(lat, lng) => {
                        onChangePerson(index, 'latitude', lat)
                        onChangePerson(index, 'longitude', lng)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {showAddButton && (
        <button
          type="button"
          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
          style={{ borderRadius: 20, fontSize: 13 }}
          onClick={onAddPerson}
        >
          <i className="bi bi-person-plus-fill" />
          Add Another Person
        </button>
      )}
    </div>
  )
}
