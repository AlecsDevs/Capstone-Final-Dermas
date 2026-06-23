import { Joyride, STATUS, type EventData, type Step } from 'react-joyride'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

interface OnboardingTourProps {
  onStart?: () => void
  onSwitchTab?: (tab: string) => void
}

// Steps 0-7 = Emergency tab | Steps 8-12 = Disaster tab
const DISASTER_STEP_INDEX = 8

const STEPS: Step[] = [
  // ── Emergency tab ───────────────────────────────────────────
  {
    target: 'body', placement: 'center', skipBeacon: true,
    title: 'Dashboard Overview',
    content: 'This is your main control center. Here you can see live statistics, reports, maps, and analytics for MDRRMO Nabua.',
  },
  {
    target: '#tour-tabs', placement: 'bottom', skipBeacon: true,
    title: 'Emergency / Disaster Tabs',
    content: 'Switch between the Emergency Response view and the Disaster Report overview using these tabs.',
  },
  {
    target: '#tour-daily-btn', placement: 'bottom', skipBeacon: true,
    title: 'Daily Reports',
    content: 'Click here to generate a PDF summary of emergency reports for any date range you choose.',
  },
  {
    target: '#tour-stat-cards', placement: 'bottom', skipBeacon: true,
    title: 'Key Statistics',
    content: 'These cards show your most important numbers at a glance: cases today, this month, total emergency cases, patients affected, and active staff.',
  },
  {
    target: '#tour-zone-cards', placement: 'top', skipBeacon: true,
    title: 'Zone Summary',
    content: 'Reports are grouped into 4 zones — Rail Road, Poblacion, Mountain Area, and River Side. Each card shows how many emergency cases have been recorded.',
  },
  {
    target: '#tour-map', placement: 'right', skipBeacon: true,
    title: 'Interactive Map',
    content: "This map plots all emergency incidents across Nabua's barangays. Click a pin to view report details, or click a barangay area to see its accident risk level.",
  },
  {
    target: '#tour-accident-panel', placement: 'left', skipBeacon: true,
    title: 'Accident Type Breakdown',
    content: "See which types of accidents are most frequent. The bars show each type's share of all recorded incidents.",
  },
  {
    target: '#tour-sidebar-nav', placement: 'right', skipBeacon: true,
    title: 'Sidebar Navigation',
    content: 'Use the sidebar to navigate between zones. Expand "Manage Reports" to select a zone and create or view emergency reports for that area.',
  },
  // ── Disaster tab ────────────────────────────────────────────
  {
    target: 'body', placement: 'center', skipBeacon: true,
    title: 'Disaster Report Overview',
    content: "Now let's explore the Disaster Report tab — it covers large-scale hazards like floods, earthquakes, typhoons, and more.",
  },
  {
    target: '#tour-disaster-weather', placement: 'bottom', skipBeacon: true,
    title: 'Live Weather & Earthquake Feed',
    content: 'This panel shows the current weather conditions in Nabua and the latest earthquake events from PHIVOLCS.',
  },
  {
    target: '#tour-hazard-map', placement: 'right', skipBeacon: true,
    title: 'Hazard Risk Map',
    content: "Barangays are colored by hazard risk level based on disaster reports. Click an area to see which hazard types have been recorded there.",
  },
  {
    target: '#tour-decision-notes', placement: 'left', skipBeacon: true,
    title: 'Decision Support Notes',
    content: 'When active hazard reports exist, this panel shows recommended actions — like pre-positioning rescue boats for floods, or issuing evacuation advisories for typhoons.',
  },
  {
    target: '#tour-hazard-types', placement: 'top', skipBeacon: true,
    title: 'Hazard Type Breakdown',
    content: 'These cards show how many disaster reports have been recorded for each hazard type: Flood, Earthquake, Typhoon, Landslide, Tsunami, and Volcanic Eruption.',
  },
  {
    target: '#tour-disaster-zones', placement: 'top', skipBeacon: true,
    title: 'Disaster Cases by Zone',
    content: 'This table breaks down how many disaster reports came from each zone — Rail Road, Poblacion, Mountain Area, and River Side — with a percentage share bar.',
  },
  {
    target: '#tour-disaster-barangays', placement: 'top', skipBeacon: true,
    title: 'Most Affected Barangays',
    content: 'Shows which specific barangays have the most disaster reports, their dominant hazard type, and the highest recorded severity level.',
  },
  {
    target: '#tour-disaster-charts', placement: 'top', skipBeacon: true,
    title: 'Hazard Distribution & Monthly Trends',
    content: 'The donut chart shows how reports are split across hazard types. The bar chart shows disaster report counts per zone for each month of the year.',
  },
]

export function OnboardingTour({ onStart, onSwitchTab }: OnboardingTourProps) {
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

  // First-time login — auto-start tour if never seen before
  useEffect(() => {
    if (!localStorage.getItem('dermas:onboarded')) {
      onStart?.()
      const t = setTimeout(() => setRun(true), 800)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ?guide=1 from About page — auto-start tour
  useEffect(() => {
    if (searchParams.get('guide') === '1') {
      setSearchParams(new URLSearchParams(), { replace: true })
      onStart?.()
      const t = setTimeout(() => setRun(true), 500)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Retrigger from right-click context menu
  useEffect(() => {
    const handler = () => {
      setRun(false)
      onStart?.()
      setTimeout(() => setRun(true), 120)
    }
    window.addEventListener('dermas:show-guide', handler)
    return () => window.removeEventListener('dermas:show-guide', handler)
  }, [onStart])

  const handleEvent = (data: EventData) => {
    const { status, type, index } = data as EventData & { index: number }
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false)
      localStorage.setItem('dermas:onboarded', '1')
    }
    if (type === 'step:before' && index === DISASTER_STEP_INDEX) {
      onSwitchTab?.('disaster')
    }
    if (type === 'step:before' && index === DISASTER_STEP_INDEX - 1) {
      onSwitchTab?.('emergency')
    }
  }

  const bg    = dark ? '#1f2937' : '#ffffff'
  const text  = dark ? '#f1f5f9' : '#1e293b'
  const arrow = dark ? '#1f2937' : '#ffffff'

  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        primaryColor: '#2563eb',
        backgroundColor: bg,
        textColor: text,
        arrowColor: arrow,
        overlayColor: 'rgba(0,0,0,0.52)',
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
          boxShadow: dark
            ? '0 8px 32px rgba(0,0,0,0.55)'
            : '0 8px 32px rgba(0,0,0,0.16)',
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
