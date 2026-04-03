export type ReportKind = 'emergency' | 'incident' | null

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
}

export interface FormState {
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
  nationality: '',
  contactNumber: '',
  permanentAddress: '',
  incidentLocation: '',
})

export const INITIAL_FORM: FormState = {
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