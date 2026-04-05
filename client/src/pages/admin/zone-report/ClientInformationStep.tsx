import type { PersonInfo } from '../../../types/zoneReport'
import { NABUA_LOCATION_OPTIONS, normalizeNabuaLocation } from './nabuaBarangays'

interface ClientInformationStepProps {
  people: PersonInfo[]
  reportLabel: string
  errors?: Record<string, string>
  onChangePerson: (index: number, key: keyof PersonInfo, value: string) => void
  onAddPerson: () => void
  onRemovePerson: (index: number) => void
}

export function ClientInformationStep({
  people,
  reportLabel,
  errors = {},
  onChangePerson,
  onAddPerson,
  onRemovePerson,
}: ClientInformationStepProps) {
  const handleLocationBlur = (index: number, value: string) => {
    const normalized = normalizeNabuaLocation(value)
    if (normalized !== value) {
      onChangePerson(index, 'incidentLocation', normalized)
    }
  }

  return (
    <div className="step-content">
      <div className="step-header mb-4">
        <h4 className="fw-bold mb-1">
          <i className="bi bi-people-fill text-danger me-2"></i>
          Client Information
        </h4>
        <p className="text-muted mb-0">Enter details for each person involved in the {reportLabel}.</p>
      </div>

      {people.map((person, index) => (
        <div className="zr-person-card mb-3" key={`person-${index}`}>
          <div className="zr-person-card-head">
            <span className="zr-person-chip">
              <i className="bi bi-person-fill me-1"></i>
              Person #{index + 1}
            </span>
            {people.length > 1 && (
              <button
                type="button"
                className="zr-remove-person-btn"
                onClick={() => onRemovePerson(index)}
                aria-label={`Remove person ${index + 1}`}
              >
                <i className="bi bi-trash3"></i>
              </button>
            )}
          </div>

          <div className="zr-person-card-body">
            <div className="row g-3">
              <div className="col-12 col-lg-4">
                <input
                  type="text"
                  className={`form-control zr-step-input${errors[`person-${index}-firstName`] ? ' is-invalid' : ''}`}
                  placeholder="First Name"
                  value={person.firstName}
                  onChange={e => onChangePerson(index, 'firstName', e.target.value)}
                />
                {errors[`person-${index}-firstName`] && <div className="zr-field-error">{errors[`person-${index}-firstName`]}</div>}
              </div>
              <div className="col-12 col-lg-4">
                <input
                  type="text"
                  className="form-control zr-step-input"
                  placeholder="Middle Name"
                  value={person.middleName}
                  onChange={e => onChangePerson(index, 'middleName', e.target.value)}
                />
              </div>
              <div className="col-12 col-lg-4">
                <input
                  type="text"
                  className={`form-control zr-step-input${errors[`person-${index}-lastName`] ? ' is-invalid' : ''}`}
                  placeholder="Last Name"
                  value={person.lastName}
                  onChange={e => onChangePerson(index, 'lastName', e.target.value)}
                />
                {errors[`person-${index}-lastName`] && <div className="zr-field-error">{errors[`person-${index}-lastName`]}</div>}
              </div>

              <div className="col-12 col-md-3">
                <input
                  type="number"
                  className="form-control zr-step-input"
                  placeholder="Age"
                  value={person.age}
                  onChange={e => onChangePerson(index, 'age', e.target.value)}
                />
              </div>
              <div className="col-12 col-md-3">
                <select
                  className={`form-select zr-step-input${errors[`person-${index}-gender`] ? ' is-invalid' : ''}`}
                  value={person.gender}
                  onChange={e => onChangePerson(index, 'gender', e.target.value)}
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors[`person-${index}-gender`] && <div className="zr-field-error">{errors[`person-${index}-gender`]}</div>}
              </div>
              <div className="col-12 col-md-3">
                <input
                  type="text"
                  className={`form-control zr-step-input${errors[`person-${index}-nationality`] ? ' is-invalid' : ''}`}
                  placeholder="Nationality"
                  value={person.nationality}
                  onChange={e => onChangePerson(index, 'nationality', e.target.value)}
                />
                {errors[`person-${index}-nationality`] && <div className="zr-field-error">{errors[`person-${index}-nationality`]}</div>}
              </div>
              <div className="col-12 col-md-3">
                <input
                  type="text"
                  className={`form-control zr-step-input${errors[`person-${index}-contactNumber`] ? ' is-invalid' : ''}`}
                  placeholder="Contact Number"
                  value={person.contactNumber}
                  onChange={e => onChangePerson(index, 'contactNumber', e.target.value)}
                />
                {errors[`person-${index}-contactNumber`] && <div className="zr-field-error">{errors[`person-${index}-contactNumber`]}</div>}
              </div>

              <div className="col-12 col-lg-6">
                <input
                  type="text"
                  className={`form-control zr-step-input${errors[`person-${index}-permanentAddress`] ? ' is-invalid' : ''}`}
                  placeholder="Permanent Address"
                  value={person.permanentAddress}
                  onChange={e => onChangePerson(index, 'permanentAddress', e.target.value)}
                />
                {errors[`person-${index}-permanentAddress`] && <div className="zr-field-error">{errors[`person-${index}-permanentAddress`]}</div>}
              </div>
              <div className="col-12 col-lg-6">
                <input
                  type="text"
                  className={`form-control zr-step-input${errors[`person-${index}-incidentLocation`] ? ' is-invalid' : ''}`}
                  placeholder="Location of Incident"
                  list="nabua-barangay-options"
                  value={person.incidentLocation}
                  onChange={e => onChangePerson(index, 'incidentLocation', e.target.value)}
                  onBlur={e => handleLocationBlur(index, e.target.value)}
                />
                {errors[`person-${index}-incidentLocation`] && <div className="zr-field-error">{errors[`person-${index}-incidentLocation`]}</div>}
              </div>
            </div>
          </div>
        </div>
      ))}

      <datalist id="nabua-barangay-options">
        {NABUA_LOCATION_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <div className="d-flex justify-content-end mt-3">
        <button
          type="button"
          className="zr-add-person-btn"
          aria-label="Add another person"
          onClick={onAddPerson}
        >
          <i className="bi bi-person-plus-fill me-2"></i>
          Add Another Person
        </button>
      </div>
    </div>
  )
}
