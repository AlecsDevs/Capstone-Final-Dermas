import { Link, Navigate, useParams } from 'react-router-dom'
import '../../style/zone_report.css'
import { Modal } from '../../components/Modal'
import '../../style/emergency-report.css'
import { useMemo, useState } from 'react'
import { ReportTypeSelectionStep } from './zone-report/ReportTypeSelectionStep'
import { ClientInformationStep } from './zone-report/ClientInformationStep'
import { IncidentDetailsStep } from './zone-report/IncidentDetailsStep'
import { AssessmentCareStep } from './zone-report/AssessmentCareStep'
import { ZoneReportStepper } from './zone-report/ZoneReportStepper'
import { createEmptyPerson, type PersonInfo, type ReportKind } from './zone-report/types'
const ZONES = ['Real Road', 'Poblacion', 'Mountain Area', 'River Side']

const toZoneSlug = (zoneName: string) =>
  zoneName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const getZoneNameFromSlug = (slug?: string) => {
  if (!slug) return null
  return ZONES.find(zone => toZoneSlug(zone) === slug) ?? null
}

const FILTER_TYPES = ['All Reports', 'Emergency', 'Conduction', 'Search and Rescue']
const FILTER_GENDERS = ['All Genders', 'Male', 'Female']
const FILTER_DISPATCHERS = ['All Dispatchers', 'Team Alpha', 'Team Bravo']
const FILTER_SORT = ['Most Recent', 'Oldest First']

const EMERGENCY_STEPS = [
  { id: 1, label: 'Report Type' },
  { id: 2, label: 'Client Info' },
  { id: 3, label: 'Incident Details' },
  { id: 4, label: 'Assessment & Care' },
  { id: 5, label: 'Upload Photo' },
  { id: 6, label: 'Review & Submit' },
]

const INCIDENT_STEPS = [
  { id: 1, label: 'Report Type' },
  { id: 2, label: 'Client Info' },
  { id: 3, label: 'Incident Details' },
  { id: 4, label: 'Upload Photo' },
  { id: 5, label: 'Review & Submit' },
]

type FormState = {
  fullName: string
  incidentDate: string
  incidentTime: string
  dispatchOfficer: string
  responders: string[]
  typeEmergency: string
  typeOfHazard: string
  natureOfCall: string
  mechanism: string
  natureIllness: string
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
}

const INITIAL_FORM: FormState = {
  fullName: '',
  incidentDate: '',
  incidentTime: '',
  dispatchOfficer: '',
  responders: [''],
  typeEmergency: '',
  typeOfHazard: '',
  natureOfCall: '',
  mechanism: '',
  natureIllness: '',
  assessment: '',
  airway: '',
  breathing: '',
  circulation: '',
  woundCare: '',
  miscellaneous: '',
  coronary: '',
  collapseWitness: '',
  timeCollapse: '',
  startCpr: '',
  defibrillation: '',
  durationCpr: '',
  rosc: '',
  hospitalTransfer: '',
}

export default function Zone_Report() {
  const { zoneSlug } = useParams<{ zoneSlug: string }>()
  const zoneName = getZoneNameFromSlug(zoneSlug)
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [reportKind, setReportKind] = useState<ReportKind>(null)
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null)
  const [people, setPeople] = useState<PersonInfo[]>([createEmptyPerson()])
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

  const steps = useMemo(
    () => (reportKind === 'emergency' ? EMERGENCY_STEPS : INCIDENT_STEPS),
    [reportKind]
  )

  const resetStepper = () => {
    setCurrentStep(1)
    setReportKind(null)
    setUploadedPhoto(null)
    setPeople([createEmptyPerson()])
    setForm(INITIAL_FORM)
  }

  const closeModal = () => {
    setOpen(false)
    resetStepper()
  }

  const openCreateModal = () => {
    resetStepper()
    setReportKind('emergency')
    setOpen(true)
  }

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const updateResponder = (index: number, value: string) => {
    setForm(prev => {
      const nextResponders = [...prev.responders]
      nextResponders[index] = value
      return { ...prev, responders: nextResponders }
    })
  }

  const addResponder = () => {
    setForm(prev => ({ ...prev, responders: [...prev.responders, ''] }))
  }

  const removeResponder = (index: number) => {
    setForm(prev => {
      if (prev.responders.length === 1) {
        return prev
      }
      return { ...prev, responders: prev.responders.filter((_, i) => i !== index) }
    })
  }

  const updatePerson = (index: number, key: keyof PersonInfo, value: string) => {
    setPeople(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  const addPerson = () => {
    setPeople(prev => [...prev, createEmptyPerson()])
  }

  const removePerson = (index: number) => {
    setPeople(prev => {
      if (prev.length === 1) {
        return prev
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setUploadedPhoto(null)
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      setUploadedPhoto((e.target?.result as string) ?? null)
    }
    reader.readAsDataURL(file)
  }

  const maxStep = steps.length

  const goNext = () => {
    if (currentStep === 1 && !reportKind) {
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, maxStep))
  }

  const goPrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const submitReport = () => {
    closeModal()
    window.alert('Report submitted successfully.')
  }

  const renderStepContent = () => {
    const isEmergency = reportKind === 'emergency'
    const primaryPerson = people[0] ?? createEmptyPerson()
    const responderList = form.responders.filter(name => name.trim() !== '')

    if (currentStep === 1) {
      return <ReportTypeSelectionStep reportKind={reportKind} onSelect={setReportKind} />
    }

    if (currentStep === 2) {
      const reportLabel = isEmergency ? 'emergency' : 'incident'

      return (
        <ClientInformationStep
          people={people}
          reportLabel={reportLabel}
          onChangePerson={updatePerson}
          onAddPerson={addPerson}
          onRemovePerson={removePerson}
        />
      )
    }

    if (currentStep === 3) {
      return (
        <IncidentDetailsStep
          reportKind={isEmergency ? 'emergency' : 'incident'}
          mechanism={form.mechanism}
          natureIllness={form.natureIllness}
          typeEmergency={form.typeEmergency}
          typeOfHazard={form.typeOfHazard}
          natureOfCall={form.natureOfCall}
          incidentDate={form.incidentDate}
          incidentTime={form.incidentTime}
          dispatchOfficer={form.dispatchOfficer}
          responders={form.responders}
          onChange={(key, value) => updateField(key as keyof FormState, value)}
          onChangeResponder={updateResponder}
          onAddResponder={addResponder}
          onRemoveResponder={removeResponder}
        />
      )
    }

    if (isEmergency && currentStep === 4) {
      return (
        <AssessmentCareStep
          assessment={form.assessment}
          airway={form.airway}
          breathing={form.breathing}
          circulation={form.circulation}
          woundCare={form.woundCare}
          miscellaneous={form.miscellaneous}
          coronary={form.coronary}
          collapseWitness={form.collapseWitness}
          timeCollapse={form.timeCollapse}
          startCpr={form.startCpr}
          defibrillation={form.defibrillation}
          durationCpr={form.durationCpr}
          rosc={form.rosc}
          hospitalTransfer={form.hospitalTransfer}
          onChange={(key, value) => updateField(key as keyof FormState, value)}
        />
      )
    }

    const uploadStep = isEmergency ? 5 : 4
    const reviewStep = isEmergency ? 6 : 5

    if (currentStep === uploadStep) {
      return (
        <div className="step-content">
          <div className="step-header mb-4">
            <h4 className="fw-bold mb-1">Upload Documentation</h4>
            <p className="text-muted mb-0">Attach one photo related to this incident.</p>
          </div>

          <label className="upload-zone d-block">
            <i className="bi bi-cloud-arrow-up fs-2 text-secondary"></i>
            <h6 className="mt-3">Click to upload photo</h6>
            <p className="text-muted mb-0">JPG, PNG up to 20MB</p>
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="d-none"
              onChange={handlePhotoChange}
            />
          </label>

          {uploadedPhoto && (
            <div className="mt-3 text-center">
              <img src={uploadedPhoto} alt="Incident" className="zr-photo-preview" />
            </div>
          )}
        </div>
      )
    }

    if (currentStep === reviewStep) {
      const fullName = `${primaryPerson.firstName} ${primaryPerson.middleName} ${primaryPerson.lastName}`
        .replace(/\s+/g, ' ')
        .trim()

      return (
        <div className="step-content">
          <div className="step-header mb-4">
            <h4 className="fw-bold mb-1">Review & Submit</h4>
            <p className="text-muted mb-0">Confirm all details before submitting.</p>
          </div>

          <div className="review-section">
            <div className="review-item">
              <h6>Report Type</h6>
              <p className="mb-0">{isEmergency ? 'Emergency Report' : 'Incident Report'}</p>
            </div>

            <div className="review-item">
              <h6>Client</h6>
              <p>Name: {fullName || form.fullName || 'N/A'}</p>
              <p>Age/Gender: {primaryPerson.age || 'N/A'} / {primaryPerson.gender || 'N/A'}</p>
              <p>Contact: {primaryPerson.contactNumber || 'N/A'}</p>
              <p className="mb-0">Total Persons: {people.length}</p>
            </div>

            <div className="review-item">
              <h6>Incident</h6>
              <p>Zone: {zoneName}</p>
              <p>Date/Time: {form.incidentDate || 'N/A'} {form.incidentTime || ''}</p>
              <p>Location: {primaryPerson.incidentLocation || 'N/A'}</p>
              <p>Dispatch: {form.dispatchOfficer || 'N/A'}</p>
              <p className="mb-0">Responders: {responderList.length > 0 ? responderList.join(', ') : 'N/A'}</p>
            </div>

            <div className="review-item">
              <h6>{isEmergency ? 'Emergency Details' : 'Incident Details'}</h6>
              {isEmergency ? (
                <>
                  <p>Type: {form.typeEmergency || 'N/A'}</p>
                  <p>Mechanism: {form.mechanism || 'N/A'}</p>
                  <p>Nature of Illness: {form.natureIllness || 'N/A'}</p>
                  <p className="mb-0">Assessment: {form.assessment || 'N/A'}</p>
                </>
              ) : (
                <>
                  <p>Type of Hazard: {form.typeOfHazard || 'N/A'}</p>
                  <p className="mb-0">Nature of Call: {form.natureOfCall || 'N/A'}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  if (!zoneName) {
    return <Navigate to="/admin/zonal-reports" replace />
  }

  return (
    <section className="zr-page">
     
      <div className="zr-top">
        <Modal open={open} close={closeModal}>
          <div className="zr-modal-backdrop" role="dialog" aria-modal="true">
            <div className="zr-modal-panel">
              <div className="zr-modal-header">
                <h5 className="mb-0">
                  <i className="bi bi-clipboard-plus me-2"></i>
                  Create Incident Report
                  <span className="zr-modal-badge">MDRRMO</span>
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>

              <div className="zr-modal-content-wrap">
                <div className="zr-modal-stepper-shell">
                  <div className="zr-modal-stepper">
                    <ZoneReportStepper steps={steps} currentStep={currentStep} />
                  </div>
                </div>

                <div className="zr-modal-step-shell">
                  <div className="zr-modal-body">{renderStepContent()}</div>
                </div>
              </div>

              <div className="zr-modal-footer">
                <button
                  type="button"
                  className="btn btn-stepper-prev"
                  onClick={goPrev}
                  style={{ visibility: currentStep === 1 ? 'hidden' : 'visible' }}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Previous
                </button>

                {currentStep < maxStep ? (
                  <button type="button" className="btn btn-stepper-next" onClick={goNext}>
                    Next
                    <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                ) : (
                  <button type="button" className="btn btn-stepper-submit" onClick={submitReport}>
                    <i className="bi bi-check-circle me-1"></i>
                    Submit Report
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
        <div className="zr-heading">
          <h1 className="zr-title mb-1">{zoneName} Zone Reports</h1>
          <p className="zr-breadcrumb mb-0">
            <Link to="/admin/zonal-reports" className="zr-crumb-link">
              Manage Reports
            </Link>
            <span className="zr-crumb-sep">/</span>
            <span className="zr-crumb-current">{zoneName}</span>
          </p>
        </div>

        <div className="zr-actions">
          <button 
          onClick={openCreateModal}
          type="button" 
          className="zr-btn zr-btn-create">
            <i className="bi bi-plus-circle me-2"></i>
            Create Incident Report
          </button>

          <Link to="/admin/zonal-reports" className="zr-btn zr-btn-back">
            <i className="bi bi-arrow-left me-2"></i>
            Back to Zones
          </Link>

          <button type="button" className="zr-btn zr-btn-pdf">
            <i className="bi bi-file-earmark-pdf me-2"></i>
            Download PDF
          </button>

          <button type="button" className="zr-btn zr-btn-excel">
            <i className="bi bi-file-earmark-excel me-2"></i>
            Export Excel
          </button>
        </div>
      </div>

      <div className="zr-card">
        <div className="row g-3">
          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Filter By Type</label>
            <select className="zr-select form-select" defaultValue="All Reports">
              {FILTER_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Filter By Gender</label>
            <select className="zr-select form-select" defaultValue="All Genders">
              {FILTER_GENDERS.map(gender => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Filter By Dispatcher</label>
            <select className="zr-select form-select" defaultValue="All Dispatchers">
              {FILTER_DISPATCHERS.map(dispatcher => (
                <option key={dispatcher} value={dispatcher}>
                  {dispatcher}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <label className="zr-label">Sort By Date</label>
            <select className="zr-select form-select" defaultValue="Most Recent">
              {FILTER_SORT.map(sort => (
                <option key={sort} value={sort}>
                  {sort}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-xl-4">
            <label className="zr-label">Search</label>
            <div className="zr-search-wrap">
              <i className="bi bi-search zr-search-icon"></i>
              <input
                type="text"
                className="zr-search-input"
                placeholder="Search by name, location, age, responders..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="zr-table-wrap">
        <div className="table-responsive">
          <table className="table zr-table mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Type</th>
                <th>Location</th>
                <th>Dispatcher</th>
                <th>Responders</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={10} className="zr-empty">
                  No reports found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
