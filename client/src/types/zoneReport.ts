export type ReportKind = 'emergency' | 'incident' | null

export interface VitalSignRow {
  bp: string
  rr: string
  pr: string
  temp: string
  spo2: string
}

export interface GlasgowRow {
  eye: string
  verbal: string
  motor: string
}

export const createEmptyVitalSign = (): VitalSignRow => ({ bp: '', rr: '', pr: '', temp: '', spo2: '' })
export const createEmptyGlasgow = (): GlasgowRow => ({ eye: '', verbal: '', motor: '' })

export interface PersonInfo {
  firstName: string
  middleName: string
  lastName: string
  age: string
  gender: string
  nationality: string
  contactNumber: string
  permanentAddress: string
  incidentLocation: string
  accidentType: string
  latitude: string
  longitude: string
}

export interface FormState {
  fullName: string
  incidentDate: string
  incidentTime: string
  typeEmergency: string
  typeOfHazard: string
  severityLevel: string
  incidentBarangay: string
  natureOfCall: string
  mechanism: string
  natureIllness: string
  chiefComplaint: string
  loc: string
  airway: string
  breathing: string
  circulation: string
  capillaryRefill: string
  pupils: string
  obLmp: string
  obAog: string
  obEdd: string
  obGravida: string
  obPara: string
  obTerm: string
  obPreterm: string
  obAbortion: string
  obLiving: string
  ambulanceDriver: string
  dispatcher: string
  ambulanceResponders: string
  receivingFacility: string
  receivingPersonnel: string
}

export interface StepItem {
  id: number
  label: string
}

export const createEmptyPerson = (): PersonInfo => ({
  firstName: '',
  middleName: '',
  lastName: '',
  age: '',
  gender: '',
  nationality: 'Filipino',
  contactNumber: '',
  permanentAddress: '',
  incidentLocation: '',
  accidentType: '',
  latitude: '',
  longitude: '',
})

export interface PersonFormData {
  incidentDate: string
  incidentTime: string
  typeEmergency: string
  typeOfIncident: string
  typeOfHazard: string
  severityLevel: string
  incidentBarangay: string
  natureOfCall: string
  mechanism: string
  natureIllness: string
  chiefComplaint: string
  loc: string
  airway: string
  breathing: string
  circulation: string
  capillaryRefill: string
  pupils: string
  obLmp: string
  obAog: string
  obEdd: string
  obGravida: string
  obPara: string
  obTerm: string
  obPreterm: string
  obAbortion: string
  obLiving: string
  vitalSigns: VitalSignRow[]
  glasgowScores: GlasgowRow[]
  ambulanceDriver: string
  dispatcher: string
  ambulanceResponders: string
  receivingFacility: string
  receivingPersonnel: string
  uploadedPhoto: string | null
}

const nowDate = () => new Date().toISOString().slice(0, 10)
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const createEmptyPersonForm = (): PersonFormData => ({
  incidentDate: nowDate(),
  incidentTime: nowTime(),
  typeEmergency: '',
  typeOfIncident: '',
  typeOfHazard: '',
  severityLevel: '',
  incidentBarangay: '',
  natureOfCall: '',
  mechanism: '',
  natureIllness: '',
  chiefComplaint: '',
  loc: '',
  airway: '',
  breathing: '',
  circulation: '',
  capillaryRefill: '',
  pupils: '',
  obLmp: '',
  obAog: '',
  obEdd: '',
  obGravida: '',
  obPara: '',
  obTerm: '',
  obPreterm: '',
  obAbortion: '',
  obLiving: '',
  vitalSigns: [createEmptyVitalSign()],
  glasgowScores: [createEmptyGlasgow()],
  ambulanceDriver: '',
  dispatcher: '',
  ambulanceResponders: '',
  receivingFacility: '',
  receivingPersonnel: '',
  uploadedPhoto: null,
})

export const INITIAL_FORM: FormState = {
  fullName: '',
  incidentDate: nowDate(),
  incidentTime: nowTime(),
  typeEmergency: '',
  typeOfHazard: '',
  severityLevel: '',
  incidentBarangay: '',
  natureOfCall: '',
  mechanism: '',
  natureIllness: '',
  chiefComplaint: '',
  loc: '',
  airway: '',
  breathing: '',
  circulation: '',
  capillaryRefill: '',
  pupils: '',
  obLmp: '',
  obAog: '',
  obEdd: '',
  obGravida: '',
  obPara: '',
  obTerm: '',
  obPreterm: '',
  obAbortion: '',
  obLiving: '',
  ambulanceDriver: '',
  dispatcher: '',
  ambulanceResponders: '',
  receivingFacility: '',
  receivingPersonnel: '',
}