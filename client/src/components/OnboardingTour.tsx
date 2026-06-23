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
    title: 'Welcome to the MDRRMO Nabua Dashboard',
    content: 'This is your real-time command center for all emergency incidents and disaster events across Nabua, Camarines Sur. Monitor reports, analyze trends, and coordinate response actions from here.',
  },
  {
    target: '#tour-tabs', placement: 'bottom', skipBeacon: true,
    title: 'Emergency & Disaster Tabs',
    content: 'These tabs switch the entire dashboard view. Emergency Response covers day-to-day incidents — vehicular accidents, medical emergencies, fire, and drowning cases. Disaster Report covers large-scale hazard events like floods, typhoons, and earthquakes.',
  },
  {
    target: '#tour-daily-btn', placement: 'bottom', skipBeacon: true,
    title: 'Generate Daily Situation Report',
    content: 'Export an official Daily Situation Report (DSR) as a PDF. Choose any date range to produce the formatted summary of emergency incidents — used for submission to higher MDRRMO authorities.',
  },
  {
    target: '#tour-stat-cards', placement: 'bottom', skipBeacon: true,
    title: 'Key Operations Statistics',
    content: "Five real-time figures: today's emergency cases, this month's total, all-time recorded cases, total persons or patients affected, and the number of active MDRRMO staff accounts currently registered in the system.",
  },
  {
    target: '#tour-zone-cards', placement: 'top', skipBeacon: true,
    title: 'Zone Case Summary',
    content: 'MDRRMO Nabua covers four geographic zones: Rail Road, Poblacion, Mountain Area, and River Side. Each card shows that zone\'s total emergency case count and a visual bar indicating its share of all incidents.',
  },
  {
    target: '#tour-map', placement: 'right', skipBeacon: true,
    title: 'Incident Map — Nabua Barangays',
    content: "Every emergency report is plotted on its barangay location. Click a map pin to see a quick summary of that report, or click a barangay polygon to view its accident risk classification and total incident count.",
  },
  {
    target: '#tour-accident-panel', placement: 'left', skipBeacon: true,
    title: 'Accident Type Frequency',
    content: 'A ranked breakdown of the most common accident categories recorded by MDRRMO Nabua — vehicular collisions, medical emergencies, fire incidents, drowning cases, and others. The bars show each type\'s share of all recorded incidents.',
  },
  {
    target: '#tour-sidebar-nav', placement: 'right', skipBeacon: true,
    title: 'Main Navigation',
    content: 'The sidebar gives you access to all system modules: Dashboard, Manage Reports (all zones in one list), Manage Zones (create and view zone-specific reports), User Management (staff accounts), Documents, and Trash.',
  },
  // ── Disaster tab ────────────────────────────────────────────
  {
    target: 'body', placement: 'center', skipBeacon: true,
    title: 'Disaster Report Tab',
    content: 'You are now on the Disaster Report tab. This section tracks large-scale hazard events reported by MDRRMO Nabua — Flood, Earthquake, Typhoon, Landslide, Tsunami, and Volcanic Eruption.',
  },
  {
    target: '#tour-disaster-weather', placement: 'bottom', skipBeacon: true,
    title: 'Live Weather & Earthquake Data',
    content: 'Real-time weather conditions for Nabua from PAGASA, and the latest earthquake events from PHIVOLCS. Keeps your team aware of current natural hazard status without leaving the dashboard.',
  },
  {
    target: '#tour-hazard-map', placement: 'right', skipBeacon: true,
    title: 'Hazard Risk Map',
    content: 'Barangays are color-coded by risk level based on the number and severity of disaster reports. Click any barangay to see a breakdown of which hazard types have been recorded in that specific area.',
  },
  {
    target: '#tour-decision-notes', placement: 'left', skipBeacon: true,
    title: 'Decision Support Recommendations',
    content: 'When active disaster reports are present, this panel generates specific recommended response actions — for example, pre-positioning rescue boats for flood events, or issuing evacuation advisories when a typhoon is approaching.',
  },
  {
    target: '#tour-hazard-types', placement: 'top', skipBeacon: true,
    title: 'Disaster Reports by Hazard Type',
    content: 'Total disaster report counts for each of the six MDRRMO-tracked hazard types: Flood, Earthquake, Typhoon, Landslide, Tsunami, and Volcanic Eruption. Quickly identify which hazards are most prevalent in Nabua.',
  },
  {
    target: '#tour-disaster-zones', placement: 'top', skipBeacon: true,
    title: 'Disaster Cases by Zone',
    content: 'A zone-level breakdown of disaster report counts across Rail Road, Poblacion, Mountain Area, and River Side, with a percentage bar showing each zone\'s share of the total disaster reports recorded.',
  },
  {
    target: '#tour-disaster-barangays', placement: 'top', skipBeacon: true,
    title: 'Most Affected Barangays',
    content: 'A ranked list of barangays with the highest number of disaster reports, including each barangay\'s most frequently recorded hazard type and the highest severity level that has been logged.',
  },
  {
    target: '#tour-disaster-charts', placement: 'top', skipBeacon: true,
    title: 'Hazard Distribution & Monthly Trends',
    content: 'Two summary charts: a donut showing how total disaster reports are distributed across hazard types, and a monthly bar chart showing the volume of disaster reports per zone for each month of the year.',
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
