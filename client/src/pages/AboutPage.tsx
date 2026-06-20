import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import adminAvatar from '../assets/Mdrrmo_logo.png'
import '../style/about.css'

const TEAM = [
  { name: 'Mark Arvie N. Ampongan',    icon: 'bi-person-circle' },
  { name: 'Caille Louis F. Aquino',    icon: 'bi-person-circle' },
  { name: 'Dorothy Mae Beraña',        icon: 'bi-person-circle' },
  { name: 'Alecs Louis F. Murillon',   icon: 'bi-person-circle' },
  { name: 'Francois Gabriel P. Osea',  icon: 'bi-person-circle' },
]

const FEATURES = [
  { icon: 'bi-speedometer2',      label: 'Interactive Dashboard',      desc: 'Real-time overview of emergency reports with map visualization and statistics.' },
  { icon: 'bi-geo-alt-fill',      label: 'Zone-Based Reporting',       desc: 'Reports organized by zone: Rail Road, Poblacion, Mountain Area, and River Side.' },
  { icon: 'bi-file-earmark-plus', label: 'Emergency Report Creation',  desc: 'Step-by-step form to create detailed emergency reports with patient information.' },
  { icon: 'bi-calendar3',         label: 'Daily PDF Reports',          desc: 'Generate printable PDF summaries for any selected date range.' },
  { icon: 'bi-folder-fill',       label: 'Document Management',        desc: 'Upload, view, and manage official MDRRMO documents.' },
  { icon: 'bi-wifi-off',          label: 'Offline Capability',         desc: 'Create reports without internet. Data syncs automatically when back online.' },
  { icon: 'bi-people-fill',       label: 'User Management',            desc: 'Admin can add, edit, and manage staff accounts and access levels.' },
  { icon: 'bi-shield-check',      label: 'Right-Click Guide',          desc: 'Right-click anywhere to launch a spotlight tour of that page.' },
]

interface ModuleGuide {
  id: string
  icon: string
  color: string
  label: string
  route: string
  adminOnly?: boolean
  steps: { icon: string; title: string; desc: string }[]
  faqs: { q: string; a: string }[]
}

const MODULE_GUIDES: ModuleGuide[] = [
  {
    id: 'dashboard',
    icon: 'bi-speedometer2',
    color: '#dc2626',
    label: 'Dashboard',
    route: 'dashboard',
    steps: [
      { icon: 'bi-toggles',                   title: 'Switch between tabs',     desc: 'Use the Emergency / Disaster tabs at the top to switch what data is shown on the page.' },
      { icon: 'bi-bar-chart-line-fill',        title: 'Read the stat cards',     desc: 'The cards below the tabs show key numbers: cases today, this month, total emergencies, patients, and active staff.' },
      { icon: 'bi-geo-alt-fill',               title: 'Check the zone cards',    desc: 'Four zone cards summarize reports by area — Rail Road, Poblacion, Mountain Area, and River Side.' },
      { icon: 'bi-map-fill',                   title: 'Use the map',             desc: 'Click a pin to see report details. Click a barangay area to see its accident risk level.' },
      { icon: 'bi-file-earmark-pdf-fill',      title: 'Download daily report',   desc: 'Click "Daily Reports" to generate a PDF summary for a custom date range.' },
      { icon: 'bi-cloud-lightning-rain-fill',  title: 'Disaster tab',            desc: 'Switch to Disaster Reports to see the weather panel, hazard risk map, and decision support notes.' },
    ],
    faqs: [
      { q: 'Why are there no pins on the map?',    a: 'Reports only show as pins when GPS coordinates were saved. Reports without location data won\'t appear on the map.' },
      { q: 'What do the barangay colors mean?',    a: 'Red = High Risk (5+ incidents), Orange = Moderate (3–4), Yellow = Low (1–2), white = no recorded incidents.' },
      { q: 'How often does the data update?',      a: 'Data loads when you open the dashboard. Refresh the page to see the latest reports.' },
      { q: 'What is the Disaster tab for?',        a: 'It shows large-scale hazard reports — floods, earthquakes, typhoons — plus a live weather feed and decision support notes.' },
    ],
  },
  {
    id: 'manage-reports',
    icon: 'bi-folder2-open',
    color: '#1d4ed8',
    label: 'Manage Reports',
    route: 'zonal-reports',
    steps: [
      { icon: 'bi-geo-alt-fill',   title: 'Select a zone',        desc: 'Click one of the four zone cards to filter reports from that area only.' },
      { icon: 'bi-funnel-fill',    title: 'Filter reports',       desc: 'Use the Filter panel to narrow down by type (Emergency/Incident), date range, and keyword.' },
      { icon: 'bi-table',          title: 'Browse the table',     desc: 'Matching reports appear in the table. Each row shows date, client name, zone, type, and nature of call.' },
      { icon: 'bi-eye-fill',       title: 'View a full report',   desc: 'Click the eye icon on any row to open the full report document including patient details and assessment.' },
      { icon: 'bi-download',       title: 'Export reports',       desc: 'Use the download buttons to export the filtered list as PDF or Excel, or download individual report PDFs.' },
    ],
    faqs: [
      { q: 'How do I see only emergency reports?', a: 'Open the Filter panel and set "Report Type" to Emergency. The table will update automatically.' },
      { q: 'Can I search by patient name?',        a: 'Yes — type the patient\'s name in the keyword search field inside the Filter panel.' },
      { q: 'Why are some reports missing?',        a: 'Reports must be submitted from a Zone Report page first. If a report is not here, it has not been submitted yet.' },
      { q: 'How do I export all reports for a month?', a: 'Set the date range to the full month, leave other filters on "All", then use the Download PDF or Excel button.' },
    ],
  },
  {
    id: 'zone-reports',
    icon: 'bi-clipboard2-plus',
    color: '#0891b2',
    label: 'Zone Reports',
    route: 'zonal-reports/rail-road',
    steps: [
      { icon: 'bi-clipboard2-plus',   title: 'Create a report',            desc: 'Click "Create Emergency Report" to open the multi-step form and submit a new report for this zone.' },
      { icon: 'bi-person-lines-fill', title: 'Step 1 – Client Info',       desc: 'Enter the patient\'s name, age, gender, address, and accident type.' },
      { icon: 'bi-heart-pulse-fill',  title: 'Step 2 – Emergency Details', desc: 'Record the type of emergency, mechanism of injury or nature of illness, and the incident date and time.' },
      { icon: 'bi-clipboard2-pulse',  title: 'Step 3 – Assessment',        desc: 'Document vital signs, Glasgow scores, and the care provided at the scene.' },
      { icon: 'bi-truck',             title: 'Step 4 – Transfer',          desc: 'Enter the hospital the patient was brought to and the ambulance crew details.' },
      { icon: 'bi-eye-fill',          title: 'View & edit reports',        desc: 'Click the eye icon to view a report, or the pencil icon to edit it (admins only).' },
    ],
    faqs: [
      { q: 'Can I save a report as a draft?',       a: 'Yes — the form auto-saves a draft in your browser. Your progress will still be there when you reopen the form.' },
      { q: 'Why can\'t I see the edit button?',     a: 'Only admins can edit submitted reports. Staff can create and view but not modify them after submission.' },
      { q: 'How do I switch to a different zone?',  a: 'Click "Back to Zones" or use the breadcrumb at the top to return to the zone list, then select another zone.' },
      { q: 'What does "Downloads" do?',             a: 'It lets you export the current report list as PDF, Excel, or a ZIP of all report PDFs.' },
    ],
  },
  {
    id: 'documents',
    icon: 'bi-folder-fill',
    color: '#16a34a',
    label: 'Documents',
    route: 'documents',
    steps: [
      { icon: 'bi-cloud-upload-fill', title: 'Upload a file',   desc: 'Click "Upload File" and select a file from your device. Give it a title and optional description.' },
      { icon: 'bi-search',            title: 'Search files',    desc: 'Use the search bar to filter files by name or title. Results update as you type.' },
      { icon: 'bi-eye-fill',          title: 'Preview a file',  desc: 'Click any file card to open a preview. PDFs open in-browser; images are displayed directly.' },
      { icon: 'bi-download',          title: 'Download a file', desc: 'Click the download button inside the preview to save the file to your device.' },
      { icon: 'bi-trash-fill',        title: 'Delete a file',   desc: 'Admins can delete files. Deleted files enter a queue before permanent removal.' },
    ],
    faqs: [
      { q: 'What file types are supported?', a: 'PDF, Word (.doc/.docx), Excel (.xls/.xlsx), and common image formats (JPG, PNG, GIF, WebP).' },
      { q: 'Can staff upload files?',        a: 'Yes — both admins and staff can upload. Only admins can permanently delete files.' },
      { q: 'Is there a file size limit?',    a: 'The limit is set by the server. If an upload fails, try compressing the file first.' },
    ],
  },
  {
    id: 'user-management',
    icon: 'bi-people-fill',
    color: '#7c3aed',
    label: 'User Management',
    route: 'user-management',
    adminOnly: true,
    steps: [
      { icon: 'bi-person-plus-fill', title: 'Add a staff member',    desc: 'Click "Add Staff", fill in their name, username, and password, then save. They can log in immediately.' },
      { icon: 'bi-search',           title: 'Search users',          desc: 'Use the search bar to filter the staff list by name or username.' },
      { icon: 'bi-pencil-fill',      title: 'Edit an account',       desc: 'Click the action button on any row to update profile, change password, or toggle active status.' },
      { icon: 'bi-toggle-on',        title: 'Activate / Deactivate', desc: 'Toggle a staff member\'s status. Inactive accounts cannot log in until reactivated.' },
      { icon: 'bi-clock-history',    title: 'Activity logs',         desc: 'Scroll down to the Activity Logs section to see a full audit trail of all user actions.' },
    ],
    faqs: [
      { q: 'Can staff see this page?',                    a: 'No — User Management is only accessible to admin accounts.' },
      { q: 'What happens when I deactivate an account?',  a: 'The account is immediately blocked from logging in. Past reports are not affected.' },
      { q: 'How do I reset a staff member\'s password?',  a: 'Open the action panel for that user, go to the Password tab, enter the new password, and save.' },
      { q: 'What is tracked in the activity log?',        a: 'Logins, report creation, report submission, profile updates, password changes, and status changes — all with timestamps.' },
    ],
  },
]

export default function AboutPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isAdmin = pathname.startsWith('/admin')
  const role = isAdmin ? 'admin' : 'staff'

  const [openModule, setOpenModule] = useState<string | null>(null)
  const [openFaq,    setOpenFaq]    = useState<string | null>(null)

  const visibleModules = MODULE_GUIDES.filter(m => !m.adminOnly || isAdmin)

  const startTour = (route: string) => navigate(`/${role}/${route}?guide=1`)

  return (
    <div className="about-page">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="about-hero">
        <img src={adminAvatar} alt="MDRRMO Logo" className="about-hero-logo" />
        <div className="about-hero-text">
          <h1 className="about-hero-title">DERMAS</h1>
          <p className="about-hero-sub">
            Disaster and Emergency Report Management and Analytics System
            <br />MDRRMO Nabua, Camarines Sur
          </p>
          <div className="about-hero-badges">
            <span className="about-hero-badge">
              <i className="bi bi-mortarboard-fill me-1" />Capstone Project · 2024–2025
            </span>
            <span className="about-hero-badge">
              <i className="bi bi-people-fill me-1" />{TEAM.length} Developers
            </span>
            <span className="about-hero-badge">
              <i className="bi bi-grid-fill me-1" />{visibleModules.length} Modules
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-column main layout ────────────────────────────── */}
      <div className="about-layout">

        {/* ── LEFT: system info + module guides ─────────────── */}
        <div className="about-layout-main">

          {/* What is this system */}
          <section className="about-section">
            <h2 className="about-section-title">
              <i className="bi bi-info-circle-fill me-2" />What is DERMAS?
            </h2>
            <p className="about-section-text">
              <strong>DERMAS</strong> is a web-based platform developed for the Municipal Disaster Risk
              Reduction and Management Office (MDRRMO) of Nabua, Camarines Sur. It enables the office
              to manage, monitor, and record disaster and emergency incidents across the municipality's
              zones — replacing manual paper-based reporting with a fast, organized, and accessible
              digital solution.
            </p>
          </section>

          {/* Module Guides */}
          <section className="about-section">
            <h2 className="about-section-title">
              <i className="bi bi-book-fill me-2" />How to Use — Page Guides
            </h2>
            <p className="about-section-text" style={{ marginBottom: 18 }}>
              Click any module to see step-by-step instructions and FAQs. Use{' '}
              <strong>Start Tour</strong> to navigate to that page and launch an interactive
              spotlight guide. You can also right-click anywhere in the system to relaunch
              the guide for the current page.
            </p>

            <div className="about-module-list">
              {visibleModules.map(mod => {
                const isOpen = openModule === mod.id
                return (
                  <div key={mod.id} className={`about-module-card${isOpen ? ' about-module-card--open' : ''}`}>
                    <button
                      className="about-module-header"
                      onClick={() => setOpenModule(isOpen ? null : mod.id)}
                      aria-expanded={isOpen}
                    >
                      <div className="about-module-left">
                        <div className="about-module-icon" style={{ background: `${mod.color}18`, color: mod.color }}>
                          <i className={`bi ${mod.icon}`} />
                        </div>
                        <div>
                          <div className="about-module-name">{mod.label}</div>
                          <div className="about-module-count">
                            {mod.steps.length} steps · {mod.faqs.length} FAQ{mod.faqs.length !== 1 ? 's' : ''}
                            {mod.adminOnly && <span className="about-module-badge">Admin only</span>}
                          </div>
                        </div>
                      </div>
                      <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} about-module-chevron`} />
                    </button>

                    {isOpen && (
                      <div className="about-module-body">
                        <button type="button" className="about-tour-btn" onClick={() => startTour(mod.route)}>
                          <i className="bi bi-play-circle-fill me-2" />Start Interactive Tour
                        </button>

                        <div className="about-module-section-label">
                          <i className="bi bi-list-ol me-1" />How to Use
                        </div>
                        <ol className="about-mod-steps">
                          {mod.steps.map((s, i) => (
                            <li key={i} className="about-mod-step">
                              <div className="about-mod-step-num">{i + 1}</div>
                              <div className="about-mod-step-body">
                                <i className={`bi ${s.icon} about-mod-step-icon`} style={{ color: mod.color }} />
                                <div>
                                  <div className="about-mod-step-title">{s.title}</div>
                                  <div className="about-mod-step-desc">{s.desc}</div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ol>

                        <div className="about-module-section-label mt-3">
                          <i className="bi bi-chat-left-dots me-1" />Frequently Asked Questions
                        </div>
                        <div className="about-mod-faqs">
                          {mod.faqs.map((faq, i) => {
                            const key = `${mod.id}-${i}`
                            const faqOpen = openFaq === key
                            return (
                              <div key={key} className={`about-mod-faq${faqOpen ? ' about-mod-faq--open' : ''}`}>
                                <button
                                  className="about-mod-faq-q"
                                  onClick={() => setOpenFaq(faqOpen ? null : key)}
                                  aria-expanded={faqOpen}
                                >
                                  <span>{faq.q}</span>
                                  <i className={`bi bi-chevron-${faqOpen ? 'up' : 'down'}`} />
                                </button>
                                {faqOpen && <div className="about-mod-faq-a">{faq.a}</div>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* ── RIGHT sidebar: features + team + contact ──────── */}
        <div className="about-layout-side">

          {/* Key Features */}
          <section className="about-section">
            <h2 className="about-section-title">
              <i className="bi bi-stars me-2" />Key Features
            </h2>
            <div className="about-features-list">
              {FEATURES.map(f => (
                <div key={f.label} className="about-feature-card">
                  <i className={`bi ${f.icon} about-feature-icon`} />
                  <div>
                    <div className="about-feature-label">{f.label}</div>
                    <div className="about-feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Developed By */}
          <section className="about-section">
            <h2 className="about-section-title">
              <i className="bi bi-people-fill me-2" />Developed By
            </h2>
            <p className="about-section-text" style={{ marginBottom: 12 }}>
              <i className="bi bi-building me-1" />
              <strong>Camarines Sur Polytechnic Colleges</strong>
            </p>
            <div className="about-team-grid">
              {TEAM.map(m => (
                <div key={m.name} className="about-team-card">
                  <i className={`bi ${m.icon} about-team-avatar`} />
                  <span className="about-team-name">{m.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section className="about-section">
            <h2 className="about-section-title">
              <i className="bi bi-envelope-fill me-2" />Contact / Report an Issue
            </h2>
            <p className="about-section-text">
              Encountered a bug or have a concern? Send us an email and we'll get back to you as soon as possible.
            </p>
            <a
              href="mailto:alecslouis@gmail.com?subject=MDRRMO%20Nabua%20System%20-%20Issue%20Report&body=Please%20describe%20the%20issue%20you%20encountered%3A%0A%0A"
              className="about-contact-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bi bi-envelope-fill me-2" />
              Contact Developer via Gmail
            </a>
          </section>

        </div>
      </div>
    </div>
  )
}
