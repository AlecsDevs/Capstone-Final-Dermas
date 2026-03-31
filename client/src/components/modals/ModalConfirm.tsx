interface ModalConfirmProps {
  isOpen: boolean
  title: string
  message: string
  icon?: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  isDanger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ModalConfirm({
  isOpen,
  title,
  message,
  icon = 'bi-question-circle',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  isDanger = false,
  onConfirm,
  onCancel,
}: ModalConfirmProps) {
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
          <button type="button" className="um-close-btn" onClick={onCancel} disabled={isLoading} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="um-modal-body">
          <div className="um-modal-footer" style={{ borderTop: 0, paddingTop: 0, marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
              {cancelText}
            </button>
            <button
              type="button"
              className={isDanger ? 'btn btn-danger' : 'btn btn-primary'}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
