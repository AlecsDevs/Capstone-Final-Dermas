import type { UserRow } from '../../types/userManagement'

interface ModalLogoutAllSessionsProps {
  isOpen: boolean
  user: UserRow | null
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ModalLogoutAllSessions({
  isOpen,
  user,
  isLoading,
  onConfirm,
  onCancel,
}: ModalLogoutAllSessionsProps) {
  if (!isOpen || !user) return null

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal-card um-modal-card-sm">
        <div className="um-modal-header">
          <div className="um-modal-headline">
            <h3>
              <i className="bi bi-shield-lock me-2" />Logout All Sessions
            </h3>
            <p>Logout all active devices for {user.username}?</p>
          </div>
          <button
            type="button"
            className="um-close-btn"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="um-modal-body">
          <div className="um-modal-footer" style={{ borderTop: 0, paddingTop: 0, marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Processing...
                </>
              ) : (
                'Yes, Logout All'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
