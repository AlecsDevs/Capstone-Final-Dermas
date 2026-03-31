interface ModalWarningProps {
  isOpen: boolean
  title: string
  message: string
  icon?: string
  actionText?: string
  onClose: () => void
}

export default function ModalWarning({
  isOpen,
  title,
  message,
  icon = 'bi-info-circle',
  actionText = 'OK',
  onClose,
}: ModalWarningProps) {
  if (!isOpen) return null

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal-card um-modal-card-sm">
        <div className="um-modal-header">
          <div className="um-modal-headline">
            <h3>
              <i className={`bi ${icon} me-2`} />
              {title}
            </h3>
            <p>{message}</p>
          </div>
          <button type="button" className="um-close-btn" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="um-modal-body">
          <div className="um-modal-footer" style={{ borderTop: 0, paddingTop: 0, marginTop: 0 }}>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {actionText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
