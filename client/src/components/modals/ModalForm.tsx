import React from 'react'

interface ModalFormProps {
  isOpen: boolean
  title: string
  icon?: string
  subtitle?: string
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  isSubmitting?: boolean
  error?: string
  children: React.ReactNode
}

export default function ModalForm({
  isOpen,
  title,
  icon,
  subtitle,
  onClose,
  onSubmit,
  isSubmitting = false,
  error,
  children,
}: ModalFormProps) {
  if (!isOpen) return null

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal-card um-modal-card-add">
        <div className="um-modal-header">
          <div className="um-modal-headline">
            <h3>{icon ? <><i className={`bi ${icon} me-2` } />{title}</> : title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="um-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <form className="um-modal-body" onSubmit={onSubmit}>
          {children}

          {error && <p className="um-error">{error}</p>}

          <div className="um-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
