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
