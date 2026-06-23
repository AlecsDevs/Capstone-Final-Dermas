import Dexie, { type Table } from 'dexie'

export interface PendingReport {
  id?: number
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH'
  payload: string
  createdAt: number
  attempts: number
}

export interface CachedResponse {
  key: string
  data: string
  fetchedAt: number
}

export interface PendingFullReport {
  id?: number
  geographicTypeId: number
  zoneName: string
  reportKind: string
  people: string
  personForms: string
  createdAt: number
  attempts: number
}

class OfflineDB extends Dexie {
  pendingReports!: Table<PendingReport>
  cachedData!: Table<CachedResponse>
  pendingFullReports!: Table<PendingFullReport>

  constructor() {
    super('mdrrmo_offline')
    this.version(1).stores({
      pendingReports: '++id, createdAt',
      cachedData: 'key, fetchedAt',
    })
    this.version(2).stores({
      pendingReports: '++id, createdAt',
      cachedData: 'key, fetchedAt',
      pendingFullReports: '++id, createdAt',
    })
  }
}

export const db = new OfflineDB()
