import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'

const POLL_INTERVAL = 5_000 // 5 seconds

export function useSessionWatch() {
  const [otherDeviceJoined, setOtherDeviceJoined] = useState(false)
  const baselineRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const res = await api.get<{ session_count: number }>('/session-check')
        const count = res.data.session_count

        if (baselineRef.current === null) {
          baselineRef.current = count
        } else {
          if (count > baselineRef.current) {
            if (!cancelled) setOtherDeviceJoined(true)
          }
          // Always sync baseline – so if a device logs out then back in, the alert fires again
          baselineRef.current = count
        }
      } catch {
        // ignore – axios interceptor handles 401
      }
    }

    check()
    const id = setInterval(check, POLL_INTERVAL)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const dismiss = () => setOtherDeviceJoined(false)

  return { otherDeviceJoined, dismiss }
}
