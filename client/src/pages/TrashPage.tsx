import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import '../style/documents.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type TrashTab = 'documents' | 'reports'

interface TrashedDoc {
  id: number
  title: string | null
  original_name: string
  mime_type: string
  file_size: number
  deleted_at: string
  days_until_permanent_delete: number
  uploader?: { id: number; full_name: string | null; username: string }
}

interface TrashedReport {
  id: number
  report_type: string
  date_reported: string
  deleted_at: string
  days_until_permanent_delete: number
  clients?: { full_name?: string }[]
  geographicType?: { name: string }
  geographic_type?: { name: string }
  incidentDetails?: { nature_of_call?: string }
  emergencyDetails?: { type_of_emergency?: string }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (v?: string | null) => {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const fileIcon = (mime: string, name: string) => {
  const m = mime.toLowerCase(), n = name.toLowerCase()
  if (m.includes('pdf') || n.endsWith('.pdf')) return { icon: 'bi-file-earmark-pdf-fill', color: '#dc2626' }
  if (m.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return { icon: 'bi-file-earmark-word-fill', color: '#1d4ed8' }
  if (m.includes('excel') || n.endsWith('.xls') || n.endsWith('.xlsx')) return { icon: 'bi-file-earmark-excel-fill', color: '#16a34a' }
  if (m.startsWith('image/')) return { icon: 'bi-file-earmark-image-fill', color: '#0891b2' }
  return { icon: 'bi-file-earmark-fill', color: '#64748b' }
}

// ── Days badge ─────────────────────────────────────────────────────────────────
function DaysBadge({ days }: { days: number }) {
  const urgent = days <= 7
  return (
    <span className={`doc-days-badge${urgent ? ' urgent' : ''}`}>
      <i className={`bi ${urgent ? 'bi-exclamation-triangle-fill' : 'bi-clock'} me-1`} />
      {days === 0 ? 'Deletes today' : `${days} day${days !== 1 ? 's' : ''} left`}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrashPage() {
  const { user: authUser } = useAuth()
  const isAdmin = authUser?.role === 'admin'

  const [tab, setTab] = useState<TrashTab>('documents')
  const [docs, setDocs] = useState<TrashedDoc[]>([])
  const [reports, setReports] = useState<TrashedReport[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<TrashedDoc[]>('/documents/trash')
      .then(r => setDocs(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError('Failed to load trashed documents.'))
      .finally(() => setDocsLoading(false))

    api.get<TrashedReport[]>('/reports/trash')
      .then(r => setReports(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError('Failed to load trashed reports.'))
      .finally(() => setReportsLoading(false))
  }, [])

  const handleRestoreDoc = async (doc: TrashedDoc) => {
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    try { await api.post(`/documents/${doc.id}/restore`) }
    catch { setDocs(prev => [doc, ...prev]); setError('Failed to restore document.') }
  }

  const handleForceDeleteDoc = async (doc: TrashedDoc) => {
    if (!window.confirm(`Permanently delete "${doc.title?.trim() || doc.original_name}"?\nThis cannot be undone.`)) return
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    try { await api.delete(`/documents/${doc.id}/force`) }
    catch { setDocs(prev => [doc, ...prev]); setError('Failed to permanently delete document.') }
  }

  const handleRestoreReport = async (report: TrashedReport) => {
    setReports(prev => prev.filter(r => r.id !== report.id))
    try { await api.post(`/reports/${report.id}/restore`) }
    catch { setReports(prev => [report, ...prev]); setError('Failed to restore report.') }
  }

  const handleForceDeleteReport = async (report: TrashedReport) => {
    if (!window.confirm('Permanently delete this report?\nThis cannot be undone.')) return
    setReports(prev => prev.filter(r => r.id !== report.id))
    try { await api.delete(`/reports/${report.id}/force`) }
    catch { setReports(prev => [report, ...prev]); setError('Failed to permanently delete report.') }
  }

  const loading = docsLoading || reportsLoading

  return (
    <div className="doc-page">

      {/* Header */}
      <div className="doc-header">
        <div>
          <h1 className="doc-title">
            <i className="bi bi-trash me-2" style={{ color: '#dc2626' }} />Trash
          </h1>
          <p className="doc-subtitle">
            Items are permanently deleted 30 days after being moved to Trash
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="doc-tab-bar">
        <button
          type="button"
          className={`doc-tab-btn${tab === 'documents' ? ' active trash-active' : ''}`}
          onClick={() => setTab('documents')}
        >
          <i className="bi bi-file-earmark me-1" />Documents
          {docs.length > 0 && <span className="doc-tab-count trash-count">{docs.length}</span>}
        </button>
        <button
          type="button"
          className={`doc-tab-btn${tab === 'reports' ? ' active trash-active' : ''}`}
          onClick={() => setTab('reports')}
        >
          <i className="bi bi-clipboard2-pulse me-1" />Reports
          {reports.length > 0 && <span className="doc-tab-count trash-count">{reports.length}</span>}
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

      {/* ── Documents tab ── */}
      {tab === 'documents' && (
        docsLoading ? (
          <div className="doc-empty">
            <div className="spinner-border text-secondary" />
            <p style={{ marginTop: 12, color: '#94a3b8' }}>Loading...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="doc-empty">
            <i className="bi bi-file-earmark-x" style={{ fontSize: 52, color: '#cbd5e1' }} />
            <p style={{ color: '#94a3b8', marginTop: 10 }}>No trashed documents.</p>
          </div>
        ) : (
          <div className="doc-grid">
            {docs.map(doc => {
              const fi = fileIcon(doc.mime_type, doc.original_name)
              const displayName = doc.title?.trim() || doc.original_name
              const uploaderName = doc.uploader?.full_name || doc.uploader?.username || '—'
              return (
                <div key={doc.id} className="doc-card doc-card-trashed">
                  <div className="doc-card-top" style={{ opacity: 0.55, cursor: 'default' }}>
                    <div className="doc-card-icon" style={{ width: 52, height: 52, background: '#f8fafc', color: fi.color }}>
                      <i className={`bi ${fi.icon}`} style={{ fontSize: 27 }} />
                    </div>
                  </div>
                  <div className="doc-card-body">
                    <div className="doc-card-name" title={displayName}>{displayName}</div>
                    <div className="doc-card-meta">
                      <span>{formatSize(doc.file_size)}</span>
                      <span>Deleted {formatDate(doc.deleted_at)}</span>
                    </div>
                    <div className="doc-card-sub">
                      <i className="bi bi-person-circle" /> {uploaderName}
                    </div>
                    <DaysBadge days={doc.days_until_permanent_delete} />
                  </div>
                  <div className="doc-card-actions">
                    <button type="button" className="doc-act-btn doc-act-restore"
                      onClick={() => void handleRestoreDoc(doc)} title="Restore">
                      <i className="bi bi-arrow-counterclockwise" />
                    </button>
                    {isAdmin && (
                      <button type="button" className="doc-act-btn doc-act-delete"
                        onClick={() => void handleForceDeleteDoc(doc)} title="Delete Permanently">
                        <i className="bi bi-trash3-fill" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Reports tab ── */}
      {tab === 'reports' && (
        reportsLoading ? (
          <div className="doc-empty">
            <div className="spinner-border text-secondary" />
            <p style={{ marginTop: 12, color: '#94a3b8' }}>Loading...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="doc-empty">
            <i className="bi bi-clipboard2-x" style={{ fontSize: 52, color: '#cbd5e1' }} />
            <p style={{ color: '#94a3b8', marginTop: 10 }}>No trashed reports.</p>
          </div>
        ) : (
          <div className="trash-report-list">
            {reports.map(report => {
              const primaryClient = report.clients?.[0]
              const zone = report.geographicType?.name ?? report.geographic_type?.name ?? '—'
              const typeClass = report.report_type === 'Emergency' ? 'zr-type-emergency' : 'zr-type-incident'
              return (
                <div key={report.id} className="trash-report-row">
                  <div className="trash-report-info">
                    <span className={`zr-type-badge ${typeClass}`} style={{ fontSize: '0.72rem' }}>
                      {report.report_type}
                    </span>
                    <div className="trash-report-name">
                      {primaryClient?.full_name || 'No client name'}
                    </div>
                    <div className="trash-report-meta">
                      <span><i className="bi bi-calendar3 me-1" />{formatDate(report.date_reported)}</span>
                      <span><i className="bi bi-geo-alt me-1" />{zone}</span>
                      <span><i className="bi bi-trash me-1" />Deleted {formatDate(report.deleted_at)}</span>
                    </div>
                    <DaysBadge days={report.days_until_permanent_delete} />
                  </div>
                  <div className="trash-report-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={() => void handleRestoreReport(report)}
                      title="Restore"
                    >
                      <i className="bi bi-arrow-counterclockwise me-1" />Restore
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => void handleForceDeleteReport(report)}
                        title="Delete Permanently"
                      >
                        <i className="bi bi-trash3-fill me-1" />Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {loading && !error && docs.length === 0 && reports.length === 0 && (
        <div className="doc-empty">
          <div className="spinner-border text-secondary" />
        </div>
      )}
    </div>
  )
}
