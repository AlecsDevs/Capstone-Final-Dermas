import { useState } from 'react'

const AMBULANCE_OPTIONS = ['Fox', 'Kabochi', 'Pastor']

interface AmbulanceTransferStepProps {
  ambulanceDriver: string
  dispatcher: string
  ambulanceResponders: string
  receivingFacility: string
  receivingPersonnel: string
  uploadedPhoto: string | null
  onChange: (key: string, value: string) => void
  onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  patientName?: string
  /** Incident mode: show only Dispatcher and Photo */
  incidentMode?: boolean
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#495057' }}>
      {children}
    </label>
  )
}

function Section({
  title, icon, defaultOpen = true, children,
}: {
  title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-3 rounded-2 overflow-hidden zr-section-card">
      <button
        type="button"
        className="w-100 d-flex align-items-center justify-content-between text-start px-3 py-2 border-0 zr-section-toggle"
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="fw-semibold d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
          <i className={`bi ${icon} text-primary`} />
          {title}
        </span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'} text-muted`} style={{ fontSize: 13 }} />
      </button>
      {open && <div className="px-3 pb-3 pt-2 zr-section-body">{children}</div>}
    </div>
  )
}

export function AmbulanceTransferStep({
  ambulanceDriver, dispatcher, ambulanceResponders,
  receivingFacility, receivingPersonnel,
  uploadedPhoto, onChange, onPhotoChange, patientName,
  incidentMode = false,
}: AmbulanceTransferStepProps) {
  const isPreset = dispatcher === '' || AMBULANCE_OPTIONS.includes(dispatcher)
  const [showManualDispatcher, setShowManualDispatcher] = useState(!isPreset)

  const parseList = (val: string): string[] => {
    const parts = val.split(',').map(r => r.trim()).filter(Boolean)
    return parts.length > 0 ? parts : ['']
  }
  const [respondersList, setRespondersList] = useState<string[]>(() => parseList(ambulanceResponders))

  const syncResponders = (list: string[]) =>
    onChange('ambulanceResponders', list.filter(r => r.trim()).join(', '))

  const updateResponder = (i: number, value: string) => {
    const next = [...respondersList]; next[i] = value
    setRespondersList(next); syncResponders(next)
  }
  const addResponder = () => setRespondersList(prev => [...prev, ''])
  const removeResponder = (i: number) => {
    const next = respondersList.filter((_, idx) => idx !== i)
    const final = next.length > 0 ? next : ['']
    setRespondersList(final); syncResponders(final)
  }

  const handleDispatcherSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'Another') {
      setShowManualDispatcher(true); onChange('dispatcher', '')
    } else {
      setShowManualDispatcher(false); onChange('dispatcher', e.target.value)
    }
  }

  return (
    <div className="step-content">
      {/* Header */}
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 mb-1">
          <i className="bi bi-truck text-danger" style={{ fontSize: 18 }} />
          <h5 className="mb-0 fw-bold" style={{ fontSize: 16 }}>
            {incidentMode ? 'Response & Documentation' : `Ambulance Transfer${patientName ? ` — ${patientName}` : ''}`}
          </h5>
        </div>
        <p className="text-muted mb-0" style={{ fontSize: 13 }}>
          {incidentMode ? 'Record the dispatcher and any photo documentation.' : 'Record transfer details, responders, and documentation.'}
        </p>
      </div>

      {/* Dispatcher — always shown */}
      <Section title="Dispatcher" icon="bi-person-badge">
        <div className="row g-2">
          <div className="col-12 col-sm-6">
            <FieldLabel>Dispatcher (Ambulance) <span className="text-muted fw-normal">(optional)</span></FieldLabel>
            {!showManualDispatcher ? (
              <select className="form-select form-select-sm" value={dispatcher || ''} onChange={handleDispatcherSelect}>
                <option value="">— Select ambulance —</option>
                {AMBULANCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                <option value="Another">Another…</option>
              </select>
            ) : (
              <div className="input-group input-group-sm">
                <input
                  type="text" className="form-control"
                  placeholder="Ambulance name" value={dispatcher}
                  onChange={e => onChange('dispatcher', e.target.value)} autoFocus
                />
                <button
                  type="button" className="btn btn-outline-secondary"
                  onClick={() => { setShowManualDispatcher(false); onChange('dispatcher', '') }}
                >✕</button>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Driver + Responders — shown for both modes */}
      <Section title="Response Team" icon="bi-people-fill">
        <div className="row g-2">
          <div className="col-12 col-sm-6">
            <FieldLabel>Ambulance Driver <span className="text-muted fw-normal">(optional)</span></FieldLabel>
            <input
              type="text" className="form-control form-control-sm"
              placeholder="Driver's name" value={ambulanceDriver}
              onChange={e => onChange('ambulanceDriver', e.target.value)}
            />
          </div>

          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <FieldLabel>Responders <span className="text-muted fw-normal">(optional)</span></FieldLabel>
              <button type="button" className="btn btn-sm btn-outline-primary py-0 px-2" style={{ fontSize: 12 }} onClick={addResponder}>
                <i className="bi bi-plus me-1" />Add
              </button>
            </div>
            <div className="row g-2">
              {respondersList.map((responder, i) => (
                <div className="col-12 col-sm-6" key={i}>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text text-muted" style={{ minWidth: 30, fontSize: 11 }}>{i + 1}</span>
                    <input
                      type="text" className="form-control"
                      placeholder={`Responder ${i + 1}`} value={responder}
                      onChange={e => updateResponder(i, e.target.value)}
                    />
                    {respondersList.length > 1 && (
                      <button type="button" className="btn btn-outline-danger" onClick={() => removeResponder(i)}>
                        <i className="bi bi-x" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Receiving Information — emergency only */}
      {!incidentMode && (
        <Section title="Receiving Information" icon="bi-hospital">
          <div className="row g-2">
            <div className="col-12 col-sm-6">
              <FieldLabel>Receiving Facility <span className="text-muted fw-normal">(optional)</span></FieldLabel>
              <input
                type="text" className="form-control form-control-sm"
                placeholder="e.g. Camarines Sur Provincial Hospital"
                value={receivingFacility} onChange={e => onChange('receivingFacility', e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-6">
              <FieldLabel>Receiving Personnel <span className="text-muted fw-normal">(optional)</span></FieldLabel>
              <input
                type="text" className="form-control form-control-sm"
                placeholder="Personnel name"
                value={receivingPersonnel} onChange={e => onChange('receivingPersonnel', e.target.value)}
              />
            </div>
          </div>
        </Section>
      )}

      {/* Photo */}
      <Section title="Photo Documentation" icon="bi-camera" defaultOpen={false}>
        <label
          className="d-flex flex-column align-items-center justify-content-center gap-2 rounded-2 w-100 zr-upload-label"
          style={{ cursor: 'pointer', minHeight: 100, border: '2px dashed #dee2e6', padding: 16 }}
        >
          <i className="bi bi-cloud-arrow-up text-secondary" style={{ fontSize: 28 }} />
          <span className="fw-semibold" style={{ fontSize: 13 }}>Click to upload photo</span>
          <span className="text-muted" style={{ fontSize: 11 }}>JPG, PNG — up to 20 MB</span>
          <input type="file" accept="image/jpeg,image/png" className="d-none" onChange={onPhotoChange} />
        </label>
        {uploadedPhoto && (
          <div className="mt-2 text-center">
            <img
              src={uploadedPhoto} alt="Incident"
              className="img-fluid rounded-2"
              style={{ maxHeight: 220, objectFit: 'contain', border: '1px solid #dee2e6' }}
            />
          </div>
        )}
      </Section>
    </div>
  )
}
