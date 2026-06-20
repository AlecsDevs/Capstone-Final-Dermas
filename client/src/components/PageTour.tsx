import { Joyride, STATUS, type EventData, type Step } from 'react-joyride'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

interface PageTourProps {
  steps: Step[]
  storageKey?: string
}

export function PageTour({ steps }: PageTourProps) {
  const [run, setRun]   = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // ?guide=1 from About page — auto-start tour
  useEffect(() => {
    if (searchParams.get('guide') === '1') {
      setSearchParams(new URLSearchParams(), { replace: true })
      const t = setTimeout(() => setRun(true), 500)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Retrigger from right-click context menu
  useEffect(() => {
    const handler = () => {
      setRun(false)
      setTimeout(() => setRun(true), 120)
    }
    window.addEventListener('dermas:show-guide', handler)
    return () => window.removeEventListener('dermas:show-guide', handler)
  }, [])

  const handleEvent = (data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false)
    }
  }

  const bg    = dark ? '#1f2937' : '#ffffff'
  const text  = dark ? '#f1f5f9' : '#1e293b'
  const arrow = dark ? '#1f2937' : '#ffffff'

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        primaryColor: '#2563eb',
        backgroundColor: bg,
        textColor: text,
        arrowColor: arrow,
        overlayColor: 'rgba(0,0,0,0.50)',
        zIndex: 9000,
        showProgress: true,
        skipBeacon: true,
        buttons: ['back', 'primary', 'skip'],
        spotlightRadius: 10,
        width: 320,
        offset: 14,
      }}
      styles={{
        tooltip: {
          borderRadius: 12,
          fontSize: 13,
          padding: '16px 18px',
          boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.55)' : '0 8px 32px rgba(0,0,0,0.16)',
        },
        tooltipTitle:   { fontSize: 14, fontWeight: 800, marginBottom: 6 },
        tooltipContent: { lineHeight: 1.65, padding: '4px 0 8px' },
        buttonPrimary:  { backgroundColor: '#2563eb', borderRadius: 8, fontSize: 13, fontWeight: 700, padding: '8px 18px' },
        buttonBack:     { color: '#2563eb', fontSize: 13, fontWeight: 600, marginRight: 6 },
        buttonSkip:     { color: '#9ca3af', fontSize: 12 },
        buttonClose:    { color: '#9ca3af' },
      }}
      locale={{
        back: '← Back',
        close: 'Close',
        last: 'Finish ✓',
        next: 'Next →',
        nextWithProgress: 'Next → ({current} of {total})',
        skip: 'Skip Tour',
      }}
    />
  )
}
