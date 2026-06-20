import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/axios'
import '../style/documents.css'
import { PageTour } from '../components/PageTour'
import type { Step } from 'react-joyride'

// ── Types ─────────────────────────────────────────────────────────────────────
type DocSort = 'recent' | 'oldest' | 'name-asc' | 'name-desc'
type FileKind = 'pdf' | 'word' | 'excel' | 'image' | 'other'

interface ApiUser { id: number; full_name: string | null; username: string; role: string }
interface ApiDocument {
  id: number
  title: string | null
  description: string | null
  original_name: string
  file_path: string
  mime_type: string
  file_size: number
  uploaded_by: number
  created_at: string
  deleted_at?: string | null
  days_until_permanent_delete?: number
  uploader?: ApiUser
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getFileKind = (mime: string, name: string): FileKind => {
  const m = mime.toLowerCase(), n = name.toLowerCase()
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf'
  if (m.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return 'word'
  if (m.includes('excel') || m.includes('spreadsheet') || n.endsWith('.xls') || n.endsWith('.xlsx')) return 'excel'
  if (m.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/.test(n)) return 'image'
  return 'other'
}

const KIND_META: Record<FileKind, { icon: string; color: string; bg: string; label: string }> = {
  pdf:   { icon: 'bi-file-earmark-pdf-fill',   color: '#dc2626', bg: '#fef2f2', label: 'PDF'   },
  word:  { icon: 'bi-file-earmark-word-fill',  color: '#1d4ed8', bg: '#eff6ff', label: 'Word'  },
  excel: { icon: 'bi-file-earmark-excel-fill', color: '#16a34a', bg: '#f0fdf4', label: 'Excel' },
  image: { icon: 'bi-file-earmark-image-fill', color: '#0891b2', bg: '#ecfeff', label: 'Image' },
  other: { icon: 'bi-file-earmark-fill',       color: '#64748b', bg: '#f8fafc', label: 'File'  },
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const formatDate = (v: string) => {
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const encodeSegments = (v: string) => v.split('/').map(encodeURIComponent).join('/')

const getFileUrl = (filePath: string) => {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath
  const apiBase = (api.defaults.baseURL ?? '').replace(/\/$/, '')
  const rel = filePath.replace(/^\/?storage\//, '')
  if (rel !== filePath && apiBase) return `${apiBase}/files/public/${encodeSegments(rel)}`
  const base = (api.defaults.baseURL ?? '').replace(/\/api\/?$/, '')
  return filePath.startsWith('/') ? `${base}${filePath}` : `${base}/${filePath}`
}

// ── File icon ─────────────────────────────────────────────────────────────────
function FileIcon({ kind, url, size = 52 }: { kind: FileKind; url: string; size?: number }) {
  const m = KIND_META[kind]
  if (kind === 'image') {
    return (
      <div className="doc-card-icon doc-card-img-wrap" style={{ width: size, height: size }}>
        <img src={url} alt="" loading="lazy" />
      </div>
    )
  }
  return (
    <div className="doc-card-icon" style={{ width: size, height: size, background: m.bg, color: m.color }}>
      <i className={`bi ${m.icon}`} style={{ fontSize: size * 0.52 }} />
    </div>
  )
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ doc, onClose }: { doc: ApiDocument; onClose: () => void }) {
  const url = getFileUrl(doc.file_path)
  const kind = getFileKind(doc.mime_type, doc.original_name)
  return (
    <div className="doc-preview-overlay" onClick={onClose}>
      <div className="doc-preview-box" onClick={e => e.stopPropagation()}>
        <div className="doc-preview-header">
          <span className="doc-preview-title">{doc.title?.trim() || doc.original_name}</span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a href={url} download className="btn btn-sm btn-outline-primary">
              <i className="bi bi-download me-1" />Download
            </a>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>
        <div className="doc-preview-body">
          {kind === 'image' && (
            <img src={url} alt={doc.original_name}
              style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }} />
          )}
          {kind === 'pdf' && (
            <iframe src={url} title={doc.original_name}
              style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 8 }} />
          )}
          {kind !== 'image' && kind !== 'pdf' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <i className={`bi ${KIND_META[kind].icon}`}
                style={{ fontSize: 64, color: KIND_META[kind].color }} />
              <p style={{ marginTop: 16, color: '#64748b' }}>Preview not available for this file type.</p>
              <a href={url} download className="btn btn-primary mt-2">
                <i className="bi bi-download me-1" />Download to open
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Upload modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }: {
  onClose: () => void
  onUploaded: (doc: ApiDocument) => void
}) {
  const [file, setFile]             = useState<File | null>(null)
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState('')
  const [dragging, setDragging]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pickFile = (f: File) => { setFile(f); setError('') }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    if (title.trim())       fd.append('title', title.trim())
    if (description.trim()) fd.append('description', description.trim())
    try {
      const res = await api.post('/documents', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onUploaded(res.data.document as ApiDocument)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Upload failed.'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal-card" onClick={e => e.stopPropagation()}>

        <div className="doc-modal-header">
          <h3><i className="bi bi-cloud-upload me-2" style={{ color: '#2563eb' }} />Upload Document</h3>
          <button type="button" className="um-close-btn" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="doc-modal-body">

            {/* Drop zone */}
            <div
              className={`doc-dropzone${dragging ? ' doc-dropzone-active' : ''}${file ? ' doc-dropzone-filled' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
              />
              {file ? (
                <div className="doc-dropzone-file">
                  <i className={`bi ${KIND_META[getFileKind(file.type, file.name)].icon}`}
                    style={{ fontSize: 32, color: KIND_META[getFileKind(file.type, file.name)].color }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{formatSize(file.size)}</div>
                  </div>
                  <button type="button" className="doc-dropzone-clear"
                    onClick={e => { e.stopPropagation(); setFile(null) }}>
                    <i className="bi bi-x" />
                  </button>
                </div>
              ) : (
                <>
                  <i className="bi bi-cloud-upload" style={{ fontSize: 36, color: '#93c5fd' }} />
                  <p style={{ margin: '6px 0 2px', fontWeight: 600, color: '#1e40af' }}>
                    Click or drag a file here
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                    PDF, Word, Excel, JPG, PNG — max 20 MB
                  </p>
                </>
              )}
            </div>

            {/* Title — optional */}
            <label className="um-field">
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                Title <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
              </span>
              <div className="um-input-wrap">
                <i className="bi bi-tag" />
                <input
                  type="text"
                  maxLength={150}
                  placeholder="e.g. Emergency Response SOP 2026"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
            </label>

            {/* Description — optional */}
            <label className="um-field">
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
              </span>
              <textarea
                className="doc-desc-input"
                maxLength={500}
                rows={3}
                placeholder="Brief description of this document..."
                value={description}
                onChange={e => setDesc(e.target.value)}
              />
            </label>

            {error && <p className="um-error">{error}</p>}
          </div>

          <div className="um-modal-footer" style={{ padding: '0 1rem 1rem' }}>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={uploading}>
              {uploading
                ? <><span className="spinner-border spinner-border-sm me-1" />Uploading...</>
                : <><i className="bi bi-cloud-upload me-1" />Upload</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [docs, setDocs]         = useState<ApiDocument[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState<DocSort>('recent')
  const [showUpload, setShowUpload] = useState(false)
  const [preview, setPreview]   = useState<ApiDocument | null>(null)
  const [error, setError]       = useState('')

  useEffect(() => {
    setLoading(true)
    api.get<ApiDocument[]>('/documents')
      .then(r => { setDocs(Array.isArray(r.data) ? r.data : []); setError('') })
      .catch(() => setError('Unable to load documents.'))
      .finally(() => setLoading(false))
  }, [])

  const handleUploaded = (doc: ApiDocument) => setDocs(prev => [doc, ...prev])

  const handleDelete = async (doc: ApiDocument) => {
    if (!window.confirm(`Move "${doc.title?.trim() || doc.original_name}" to Trash?\n\nIt will be permanently deleted after 30 days.`)) return
    const prevDocs = docs
    setDocs(d => d.filter(x => x.id !== doc.id))
    try { await api.delete(`/documents/${doc.id}`) }
    catch { setDocs(prevDocs); setError('Failed to move document to trash.') }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs
      .filter(d => !q ||
        (d.title ?? d.original_name).toLowerCase().includes(q) ||
        d.original_name.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (sort === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        const an = (a.title?.trim() || a.original_name).toLowerCase()
        const bn = (b.title?.trim() || b.original_name).toLowerCase()
        return sort === 'name-asc' ? an.localeCompare(bn) : bn.localeCompare(an)
      })
  }, [docs, search, sort])

  const TOUR_STEPS: Step[] = [
    { target: '.doc-header', placement: 'bottom', skipBeacon: true, title: 'Documents', content: 'Store and manage official files here — PDFs, Word documents, Excel sheets, and images are all supported.' },
    { target: '.doc-upload-btn-main', placement: 'bottom', skipBeacon: true, title: 'Upload File', content: 'Click here to upload a new file. You can give it a title and description so it is easy to find later.' },
    { target: '.doc-grid', placement: 'top', skipBeacon: true, title: 'File Library', content: 'All uploaded files appear here. Click a file to preview or download it. Admins can also delete files from this view.' },
  ]

  return (
    <div className="doc-page">
      <PageTour steps={TOUR_STEPS} storageKey="dermas_tour_done_docs" />

      <div className="doc-header">
        <div>
          <h1 className="doc-title">Documents</h1>
          <p className="doc-subtitle">
            {docs.length} file{docs.length !== 1 ? 's' : ''} stored · PDF, Word, Excel, Images supported
          </p>
        </div>
        <button type="button" className="doc-upload-btn-main" onClick={() => setShowUpload(true)}>
          <i className="bi bi-cloud-upload me-2" />Upload File
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

      <div className="doc-toolbar">
        <div className="doc-search-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <i className="bi bi-search" />
          <input
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="doc-sort-select" value={sort} onChange={e => setSort(e.target.value as DocSort)}>
          <option value="recent">Most Recent</option>
          <option value="oldest">Oldest First</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
        </select>
        <span className="doc-count-badge">
          {filtered.length} of {docs.length} file{docs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="doc-empty">
          <div className="spinner-border text-primary" />
          <p style={{ marginTop: 12, color: '#94a3b8' }}>Loading files...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="doc-empty">
          <i className="bi bi-folder2-open" style={{ fontSize: 52, color: '#cbd5e1' }} />
          <p style={{ color: '#94a3b8', marginTop: 10 }}>
            {search ? 'No files match your search.' : 'No documents yet. Upload your first file!'}
          </p>
        </div>
      ) : (
        <div className="doc-grid">
          {filtered.map(doc => {
            const kind = getFileKind(doc.mime_type, doc.original_name)
            const m = KIND_META[kind]
            const url = getFileUrl(doc.file_path)
            const displayName = doc.title?.trim() || doc.original_name
            const uploaderName = doc.uploader?.full_name || doc.uploader?.username || '—'
            return (
              <div key={doc.id} className="doc-card">
                <div className="doc-card-top" onClick={() => setPreview(doc)}>
                  <FileIcon kind={kind} url={url} size={52} />
                  <span className="doc-kind-badge" style={{ background: m.bg, color: m.color }}>
                    {m.label}
                  </span>
                </div>
                <div className="doc-card-body">
                  <div className="doc-card-name" title={displayName}>{displayName}</div>
                  {doc.description && <div className="doc-card-desc">{doc.description}</div>}
                  <div className="doc-card-meta">
                    <span>{formatSize(doc.file_size)}</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                  <div className="doc-card-sub">
                    <i className="bi bi-person-circle" /> {uploaderName}
                  </div>
                </div>
                <div className="doc-card-actions">
                  <button type="button" className="doc-act-btn doc-act-preview"
                    onClick={() => setPreview(doc)} title="Preview">
                    <i className="bi bi-eye" />
                  </button>
                  <a href={url} download className="doc-act-btn doc-act-download" title="Download">
                    <i className="bi bi-download" />
                  </a>
                  <button type="button" className="doc-act-btn doc-act-delete"
                    onClick={() => void handleDelete(doc)} title="Move to Trash">
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />
      )}
      {preview && (
        <PreviewModal doc={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  )
}
