import { db } from './db'

const MAX_ATTEMPTS = 3

/** Read the active session token from storage (mirrors AuthContext logic). */
function getStoredToken(): string | null {
  return sessionStorage.getItem('token') ?? localStorage.getItem('remember_token')
}

/**
 * Attempt to flush all queued reports to the server.
 * Stops immediately if the server returns 401 (token expired / revoked).
 * Items that exceed MAX_ATTEMPTS are skipped and left for manual review.
 */
export async function flushPendingReports(): Promise<void> {
  const token = getStoredToken()
  if (!token) return

  const pending = await db.pendingReports.orderBy('createdAt').toArray()
  if (pending.length === 0) return

  for (const item of pending) {
    if (item.attempts >= MAX_ATTEMPTS) continue

    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: item.payload,
      })

      if (res.ok) {
        if (item.id !== undefined) await db.pendingReports.delete(item.id)
      } else if (res.status === 401) {
        // Token expired — stop syncing; user must re-authenticate
        break
      } else {
        await db.pendingReports.update(item.id!, { attempts: item.attempts + 1 })
      }
    } catch {
      await db.pendingReports.update(item.id!, { attempts: item.attempts + 1 })
    }
  }
}

/** Queue an API call to be sent once connectivity is restored. */
export async function queueReport(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH',
  payload: unknown,
): Promise<void> {
  await db.pendingReports.add({
    endpoint,
    method,
    payload: JSON.stringify(payload),
    createdAt: Date.now(),
    attempts: 0,
  })
}

/** Returns the number of locally queued reports waiting to sync. */
export async function getPendingCount(): Promise<number> {
  return db.pendingReports.count()
}
