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

class OfflineDB extends Dexie {
  pendingReports!: Table<PendingReport>
  cachedData!: Table<CachedResponse>

  constructor() {
    super('mdrrmo_offline')
    this.version(1).stores({
      pendingReports: '++id, createdAt',
      cachedData: 'key, fetchedAt',
    })
  }
}

export const db = new OfflineDB()
