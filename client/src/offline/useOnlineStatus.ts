import { useEffect, useState } from 'react'

const LS_KEY = 'mdrrmo_online_status'

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => {
    const stored = localStorage.getItem(LS_KEY)
    return stored !== null ? stored === 'true' : navigator.onLine
  })

  useEffect(() => {
    const goOnline = () => { setOnline(true); localStorage.setItem(LS_KEY, 'true') }
    const goOffline = () => { setOnline(false); localStorage.setItem(LS_KEY, 'false') }

    const current = navigator.onLine
    setOnline(current)
    localStorage.setItem(LS_KEY, String(current))

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
