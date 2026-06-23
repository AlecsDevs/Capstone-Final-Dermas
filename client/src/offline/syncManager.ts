import { db } from './db'
import api from '../api/axios'
import type { PersonInfo, PersonFormData } from '../types/zoneReport'

const MAX_ATTEMPTS = 3

function getStoredToken(): string | null {
  return sessionStorage.getItem('token') ?? localStorage.getItem('remember_token')
}

const toHHMM = (value?: string | null) => {
  if (!value) return ''
  const match = value.match(/^(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : value
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

/** Queue a full multi-step emergency report submission for later sync. */
export async function queueFullReport(params: {
  geographicTypeId: number
  zoneName: string
  reportKind: string
  people: PersonInfo[]
  personForms: PersonFormData[]
}): Promise<void> {
  await db.pendingFullReports.add({
    geographicTypeId: params.geographicTypeId,
    zoneName: params.zoneName,
    reportKind: params.reportKind,
    people: JSON.stringify(params.people),
    personForms: JSON.stringify(params.personForms),
    createdAt: Date.now(),
    attempts: 0,
  })
}

/** Replay all queued full report submissions against the live API. */
export async function flushPendingFullReports(): Promise<void> {
  const token = getStoredToken()
  if (!token) return

  const pending = await db.pendingFullReports.orderBy('createdAt').toArray()
  if (pending.length === 0) return

  for (const item of pending) {
    if (item.attempts >= MAX_ATTEMPTS) continue

    try {
      const people = JSON.parse(item.people) as PersonInfo[]
      const personForms = JSON.parse(item.personForms) as PersonFormData[]
      const now = new Date()
      const fallbackDate = now.toISOString().slice(0, 10)
      const fallbackTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      for (let i = 0; i < people.length; i++) {
        const person = people[i]
        const pf = personForms[i]
        const fullName = [person.firstName, person.middleName, person.lastName]
          .map(s => s.trim()).filter(Boolean).join(' ')
        if (!fullName || !person.gender) continue

        const reportRes = await api.post('/reports', {
          report_type: 'Emergency',
          geographic_type_id: item.geographicTypeId,
          date_reported: pf.incidentDate || fallbackDate,
          time_reported: toHHMM(pf.incidentTime) || fallbackTime,
          latitude: person.latitude ? parseFloat(person.latitude) : null,
          longitude: person.longitude ? parseFloat(person.longitude) : null,
        })
        const id = reportRes.data?.report?.id as number | undefined
        if (!id) continue

        await api.put(`/reports/${id}/clients`, {
          clients: [{
            full_name: fullName,
            age: person.age ? Number(person.age) : null,
            gender: person.gender,
            nationality: person.nationality.trim() || null,
            contact_number: person.contactNumber.trim() || null,
            permanent_address: person.permanentAddress.trim() || null,
            incident_address: person.incidentLocation.trim() || null,
            accident_type: person.accidentType.trim() || null,
          }],
        })

        await api.put(`/reports/${id}/emergency-details`, {
          mechanism_of_injury: pf.mechanism || null,
          nature_of_illness: pf.natureIllness || null,
          type_of_emergency: pf.typeEmergency || null,
          nature_of_call: pf.natureOfCall || null,
          incident_date: pf.incidentDate,
          incident_time: toHHMM(pf.incidentTime),
        })

        await api.put(`/reports/${id}/assessment`, {
          chief_complaint: pf.chiefComplaint || null,
          loc: pf.loc || null,
          airway: pf.airway || null,
          breathing: pf.breathing || null,
          circulation: pf.circulation || null,
          capillary_refill: pf.capillaryRefill || null,
          pupils: pf.pupils || null,
          vital_signs: pf.vitalSigns.filter(vs => vs.bp || vs.rr || vs.pr || vs.temp || vs.spo2),
          glasgow_scores: pf.glasgowScores
            .filter(g => g.eye || g.verbal || g.motor)
            .map(g => ({
              eye: g.eye ? Number(g.eye) : null,
              verbal: g.verbal ? Number(g.verbal) : null,
              motor: g.motor ? Number(g.motor) : null,
            })),
          ob_lmp: pf.obLmp || null, ob_aog: pf.obAog || null, ob_edd: pf.obEdd || null,
          ob_gravida: pf.obGravida ? Number(pf.obGravida) : null,
          ob_para: pf.obPara ? Number(pf.obPara) : null,
          ob_term: pf.obTerm ? Number(pf.obTerm) : null,
          ob_preterm: pf.obPreterm ? Number(pf.obPreterm) : null,
          ob_abortion: pf.obAbortion ? Number(pf.obAbortion) : null,
          ob_living: pf.obLiving ? Number(pf.obLiving) : null,
        })

        await api.put(`/reports/${id}/ambulance-transfer`, {
          ambulance_driver: pf.ambulanceDriver || null,
          dispatcher: pf.dispatcher || null,
          responders: pf.ambulanceResponders || null,
          receiving_facility: pf.receivingFacility || null,
          receiving_personnel: pf.receivingPersonnel || null,
        })

        if (pf.uploadedPhoto) {
          try {
            const match = pf.uploadedPhoto.match(/^data:(.*?);base64,(.*)$/)
            if (match) {
              const mime = match[1]
              const binary = atob(match[2])
              const bytes = new Uint8Array(binary.length)
              for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
              const ext = mime.includes('/') ? mime.split('/')[1] : 'jpg'
              const file = new File([bytes], `photo.${ext}`, { type: mime })
              const fd = new FormData()
              fd.append('photo', file)
              await api.post(`/reports/${id}/photos/upload`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
              })
            }
          } catch {
            // photo upload failure should not block report submission
          }
        }

        await api.post(`/reports/${id}/submit`)
      }

      if (item.id !== undefined) await db.pendingFullReports.delete(item.id)
    } catch {
      await db.pendingFullReports.update(item.id!, { attempts: item.attempts + 1 })
    }
  }
}

/** Returns the total number of locally queued items waiting to sync. */
export async function getPendingCount(): Promise<number> {
  const [simple, full] = await Promise.all([
    db.pendingReports.count(),
    db.pendingFullReports.count(),
  ])
  return simple + full
}
