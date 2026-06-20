import { useState } from 'react'
import type { PersonInfo, PersonFormData, ReportKind } from '../../../../types/zoneReport'
import { PatientCareReportView } from '../views/PatientCareReportView'
import { IncidentReportView } from '../views/IncidentReportView'
import { LocationPreviewMap } from '../components/IncidentLocationPicker'

type ReviewSubmitStepProps = {
  reportKind: Exclude<ReportKind, null>
  zoneName: string
  people: PersonInfo[]
  personForms: PersonFormData[]
  onChangePerson?: (idx: number, key: keyof PersonInfo, value: string) => void
  onChangePersonForm?: (idx: number, key: string, value: string) => void
  onChangeVitalSign?: (personIdx: number, rowIdx: number, key: string, value: string) => void
  onChangeGlasgow?: (personIdx: number, rowIdx: number, key: string, value: string) => void
  onAddPerson?: () => void
  onRemovePerson?: (index: number) => void
}


export function ReviewSubmitStep({
  reportKind, zoneName, people, personForms,
  onChangePerson, onChangePersonForm,
  onChangeVitalSign, onChangeGlasgow,
  onAddPerson, onRemovePerson,
}: ReviewSubmitStepProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const isEmergency = reportKind === 'emergency'
  const idx = Math.min(activeIdx, people.length - 1)
  const person = people[idx]
  const pf = personForms[idx]
  const pf0 = personForms[0]

  if (!person || !pf) return null

  const fullName = [person.firstName, person.middleName, person.lastName]
    .map(s => s.trim()).filter(Boolean).join(' ')
  const hasMultiple = people.length > 1

  /* ── Emergency: PCR view (unchanged) ─────────────────────── */
  if (isEmergency) {
    const handleFieldEdit = (fieldKey: string, value: string) => {
      if (!onChangePerson || !onChangePersonForm) return
      switch (fieldKey) {
        case 'patientName': {
          const parts = value.trim().split(/\s+/)
          onChangePerson(idx, 'firstName', parts[0] ?? '')
          onChangePerson(idx, 'middleName', parts.length > 2 ? parts.slice(1, -1).join(' ') : '')
          onChangePerson(idx, 'lastName', parts.length > 1 ? parts[parts.length - 1] : '')
          break
        }
        case 'age':               onChangePerson(idx, 'age', value); break
        case 'gender':            onChangePerson(idx, 'gender', value); break
        case 'nationality':       onChangePerson(idx, 'nationality', value); break
        case 'contactNumber':     onChangePerson(idx, 'contactNumber', value); break
        case 'permanentAddress':  onChangePerson(idx, 'permanentAddress', value); break
        case 'locationOfIncident':onChangePerson(idx, 'incidentLocation', value); break
        case 'natureOfCall':      onChangePersonForm(idx, 'natureOfCall', value); break
        case 'date':              onChangePersonForm(idx, 'incidentDate', value); break
        case 'timeOfCall':        onChangePersonForm(idx, 'incidentTime', value); break
        case 'typeOfEmergency':   onChangePersonForm(idx, 'typeEmergency', value); break
        case 'natureOfIllness':   onChangePersonForm(idx, 'natureIllness', value); break
        case 'mechanismOfInjury': onChangePersonForm(idx, 'mechanism', value); break
        case 'chiefComplaint':    onChangePersonForm(idx, 'chiefComplaint', value); break
        case 'loc':               onChangePersonForm(idx, 'loc', value); break
        case 'airway':            onChangePersonForm(idx, 'airway', value); break
        case 'breathing':         onChangePersonForm(idx, 'breathing', value); break
        case 'circulation':       onChangePersonForm(idx, 'circulation', value); break
        case 'capillaryRefill':   onChangePersonForm(idx, 'capillaryRefill', value); break
        case 'pupils':            onChangePersonForm(idx, 'pupils', value); break
        case 'ambulanceDriver':   onChangePersonForm(idx, 'ambulanceDriver', value); break
        case 'dispatcher':        onChangePersonForm(idx, 'dispatcher', value); break
        case 'responders':        onChangePersonForm(idx, 'ambulanceResponders', value); break
        case 'receivingFacility': onChangePersonForm(idx, 'receivingFacility', value); break
        case 'receivingPersonnel':onChangePersonForm(idx, 'receivingPersonnel', value); break
        default: {
          const vsMatch = fieldKey.match(/^vs_(\d+)_(.+)$/)
          if (vsMatch && onChangeVitalSign) {
            onChangeVitalSign(idx, parseInt(vsMatch[1]), vsMatch[2], value); return
          }
          const gcsMatch = fieldKey.match(/^gcs_(\d+)_(.+)$/)
          if (gcsMatch && onChangeGlasgow) {
            onChangeGlasgow(idx, parseInt(gcsMatch[1]), gcsMatch[2], value)
          }
        }
      }
    }

    return (
      <div className="step-content">
        <div className="step-header mb-3">
          <h4 className="fw-bold mb-1"><i className="bi bi-eye me-2 text-danger" />Review &amp; Submit</h4>
          <p className="text-muted mb-0">
            Review the Patient Care Report before submitting.
            {hasMultiple && ` ${people.length} reports will be created.`}
          </p>
        </div>

        {onChangePerson && (
          <div className="d-flex justify-content-center mb-3">
            {!editMode ? (
              <button type="button"
                className="btn btn-outline-primary d-flex align-items-center gap-2"
                style={{ borderRadius: 20, paddingLeft: 20, paddingRight: 20, fontWeight: 600, fontSize: 13 }}
                onClick={() => setEditMode(true)}>
                <i className="bi bi-pencil-square" style={{ fontSize: 15 }} /> Edit Report
              </button>
            ) : (
              <div className="d-flex align-items-center justify-content-between w-100 px-3 py-2 rounded-2"
                style={{ background: '#fff8e1', border: '1px solid #ffc107' }}>
                <span className="d-flex align-items-center gap-2" style={{ fontSize: 13, color: '#856404', fontWeight: 600 }}>
                  <i className="bi bi-pencil-fill" /> Edit mode — click any ✏ on the report to modify a field
                </span>
                <button type="button" className="btn btn-sm btn-success d-flex align-items-center gap-1"
                  style={{ borderRadius: 20, fontWeight: 600, fontSize: 12 }} onClick={() => setEditMode(false)}>
                  <i className="bi bi-check-lg" /> Done
                </button>
              </div>
            )}
          </div>
        )}

        {hasMultiple && (
          <div className="d-flex align-items-center justify-content-between mb-3 px-3 py-2 rounded-3 zr-assess-box">
            <button type="button" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
              style={{ borderRadius: 20, minWidth: 105 }}
              onClick={() => setActiveIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
              <i className="bi bi-chevron-left" /> Previous
            </button>
            <div className="text-center">
              <div className="fw-semibold" style={{ fontSize: 14 }}>{fullName || `Person ${idx + 1}`}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>Patient {idx + 1} of {people.length}</div>
            </div>
            <button type="button" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
              style={{ borderRadius: 20, minWidth: 105, justifyContent: 'flex-end' }}
              onClick={() => setActiveIdx(i => Math.min(people.length - 1, i + 1))} disabled={idx === people.length - 1}>
              Next <i className="bi bi-chevron-right" />
            </button>
          </div>
        )}

        <LocationPreviewMap lat={person.latitude} lng={person.longitude} />

        <div style={{ overflowX: 'auto' }}>
          <PatientCareReportView isDraft onFieldEdit={editMode ? handleFieldEdit : undefined}
            data={{
              reportType: 'Emergency', zone: zoneName, patientName: fullName,
              age: person.age, gender: person.gender, nationality: person.nationality,
              contactNumber: person.contactNumber, permanentAddress: person.permanentAddress,
              locationOfIncident: person.incidentLocation,
              accidentType: person.accidentType,
              date: pf.incidentDate, timeOfCall: pf.incidentTime,
              natureOfCall: pf.natureOfCall, typeOfEmergency: pf.typeEmergency,
              natureOfIllness: pf.natureIllness, mechanismOfInjury: pf.mechanism,
              chiefComplaint: pf.chiefComplaint, loc: pf.loc, airway: pf.airway,
              breathing: pf.breathing, circulation: pf.circulation,
              capillaryRefill: pf.capillaryRefill, pupils: pf.pupils,
              obLmp: pf.obLmp, obAog: pf.obAog, obEdd: pf.obEdd,
              obGravida: pf.obGravida, obPara: pf.obPara, obTerm: pf.obTerm,
              obPreterm: pf.obPreterm, obAbortion: pf.obAbortion, obLiving: pf.obLiving,
              vitalSigns: pf.vitalSigns, glasgowScores: pf.glasgowScores,
              ambulanceDriver: pf.ambulanceDriver, dispatcher: pf.dispatcher,
              responders: pf.ambulanceResponders, receivingFacility: pf.receivingFacility,
              receivingPersonnel: pf.receivingPersonnel, photoUrl: pf.uploadedPhoto,
            }} />
        </div>
      </div>
    )
  }

  /* ── Incident: IncidentReportView document ───────────────── */
  const handleIncidentFieldEdit = (fieldKey: string, value: string) => {
    if (!onChangePerson || !onChangePersonForm) return
    switch (fieldKey) {
      case 'hazard':         onChangePersonForm(0, 'typeOfHazard', value); break
      case 'severityLevel':  onChangePersonForm(0, 'severityLevel', value); break
      case 'barangay':       onChangePersonForm(0, 'incidentBarangay', value); break
      case 'date':           onChangePersonForm(0, 'incidentDate', value); break
      case 'time':           onChangePersonForm(0, 'incidentTime', value); break
      case 'ambulanceDriver':onChangePersonForm(0, 'ambulanceDriver', value); break
      case 'dispatcher':     onChangePersonForm(0, 'dispatcher', value); break
      case 'responders':     onChangePersonForm(0, 'ambulanceResponders', value); break
      default: {
        const m = fieldKey.match(/^person_(\d+)_(.+)$/)
        if (!m) break
        const pi = parseInt(m[1]); const field = m[2]
        if (field === 'firstName')       onChangePerson(pi, 'firstName', value)
        else if (field === 'middleName') onChangePerson(pi, 'middleName', value)
        else if (field === 'lastName')   onChangePerson(pi, 'lastName', value)
        else if (field === 'age')        onChangePerson(pi, 'age', value)
        else if (field === 'gender')     onChangePerson(pi, 'gender', value)
        else if (field === 'contact')    onChangePerson(pi, 'contactNumber', value)
        else if (field === 'address')    onChangePerson(pi, 'permanentAddress', value)
      }
    }
  }

  return (
    <div className="step-content">
      <div className="step-header mb-3">
        <h4 className="fw-bold mb-1"><i className="bi bi-eye me-2 text-primary" />Review &amp; Submit</h4>
        <p className="text-muted mb-0">
          Review the incident report before submitting.
          {hasMultiple && ` ${people.length} records will be created.`}
        </p>
      </div>

      {/* Edit toggle */}
      {onChangePerson && (
        <div className="d-flex justify-content-center mb-3">
          {!editMode ? (
            <button type="button"
              className="btn btn-outline-primary d-flex align-items-center gap-2"
              style={{ borderRadius: 20, paddingLeft: 20, paddingRight: 20, fontWeight: 600, fontSize: 13 }}
              onClick={() => setEditMode(true)}>
              <i className="bi bi-pencil-square" style={{ fontSize: 15 }} /> Edit Report
            </button>
          ) : (
            <div className="d-flex align-items-center justify-content-between w-100 px-3 py-2 rounded-2"
              style={{ background: '#fff8e1', border: '1px solid #ffc107' }}>
              <span className="d-flex align-items-center gap-2" style={{ fontSize: 13, color: '#856404', fontWeight: 600 }}>
                <i className="bi bi-pencil-fill" /> Edit mode — click any ✏ on the document to modify a field
              </span>
              <button type="button" className="btn btn-sm btn-success d-flex align-items-center gap-1"
                style={{ borderRadius: 20, fontWeight: 600, fontSize: 12 }} onClick={() => setEditMode(false)}>
                <i className="bi bi-check-lg" /> Done
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          <IncidentReportView
            onFieldEdit={editMode ? handleIncidentFieldEdit : undefined}
            onAddPerson={editMode ? onAddPerson : undefined}
            onRemovePerson={editMode ? onRemovePerson : undefined}
            data={{
              zone: zoneName,
              typeOfIncident: pf0?.typeOfIncident ?? '',
              hazard: pf0?.typeOfHazard ?? '',
              severityLevel: pf0?.severityLevel ?? '',
              barangay: pf0?.incidentBarangay ?? '',
              date: pf0?.incidentDate ?? '',
              time: pf0?.incidentTime ?? '',
              persons: people.map(p => ({
                name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' '),
                age: p.age,
                gender: p.gender,
                contactNumber: p.contactNumber,
                address: p.permanentAddress,
              })),
              ambulanceDriver: pf0?.ambulanceDriver,
              dispatcher: pf0?.dispatcher,
              responders: pf0?.ambulanceResponders,
              photoUrl: pf0?.uploadedPhoto,
              isDraft: true,
            }} />
        </div>
      </div>
    </div>
  )
}
