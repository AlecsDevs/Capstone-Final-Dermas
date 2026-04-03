import type { ReportKind } from '../../../../types/zoneReport'

interface ReportTypeSelectionStepProps {
  reportKind: ReportKind
  onSelect: (kind: Exclude<ReportKind, null>) => void
}

export function ReportTypeSelectionStep({ reportKind, onSelect }: ReportTypeSelectionStepProps) {
  return (
    <div className="step-content">
      <div className="step-header mb-4">
        <h4 className="fw-bold mb-1">Select Report Type</h4>
        <p className="text-muted mb-0">Choose the type of incident report to create.</p>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <button
            type="button"
            className={`report-type-card w-100 ${reportKind === 'emergency' ? 'selected' : ''}`}
            onClick={() => onSelect('emergency')}
          >
            {reportKind === 'emergency' && (
              <div className="card-checkmark">
                <i className="bi bi-check-circle-fill"></i>
              </div>
            )}
            <div className="card-icon emergency">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h5 className="card-title">Emergency Report</h5>
            <p className="card-description">Medical emergencies, trauma, and life-threatening incidents.</p>
          </button>
        </div>

        <div className="col-12 col-lg-6">
          <button
            type="button"
            className={`report-type-card w-100 ${reportKind === 'incident' ? 'selected' : ''}`}
            onClick={() => onSelect('incident')}
          >
            {reportKind === 'incident' && (
              <div className="card-checkmark">
                <i className="bi bi-check-circle-fill"></i>
              </div>
            )}
            <div className="card-icon incident">
              <i className="bi bi-shield-exclamation"></i>
            </div>
            <h5 className="card-title">Incident Report</h5>
            <p className="card-description">Floods, earthquakes, typhoons, landslides, and hazard-related calls.</p>
          </button>
        </div>
      </div>
    </div>
  )
}
