import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import '../style/documents.css'

type DocumentTypeFilter = 'all' | 'pdf' | 'jpg' | 'png'
type DocumentSort = 'recent' | 'oldest' | 'name-asc' | 'name-desc'

interface ApiUser {
  id: number
  username: string
  role: 'admin' | 'staff'
}

interface ApiDocument {
  id: number
  title: string | null
  original_name: string
  file_path: string
  mime_type: string
  file_size: number
  uploaded_by: number
  created_at: string
  uploader?: ApiUser
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const inferType = (mimeType: string, fileName: string): DocumentTypeFilter => {
  const lowerMime = mimeType.toLowerCase()
  const lowerName = fileName.toLowerCase()

  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) return 'pdf'
  if (lowerMime.includes('png') || lowerName.endsWith('.png')) return 'png'
  return 'jpg'
}

const formatTypeLabel = (type: DocumentTypeFilter): string => {
  if (type === 'pdf') return 'PDF'
  if (type === 'png') return 'PNG'
  if (type === 'jpg') return 'JPG'
  return 'Unknown'
}

const getFileUrl = (filePath: string): string => {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }

  const base = (api.defaults.baseURL ?? '').replace(/\/api\/?$/, '')
  if (!base) {
    return filePath
  }

  if (filePath.startsWith('/')) {
    return `${base}${filePath}`
  }

  return `${base}/${filePath}`
}

function DocumentsPage() {
  const [documents, setDocuments] = useState<ApiDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>('all')
  const [sortBy, setSortBy] = useState<DocumentSort>('recent')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      const response = await api.get<ApiDocument[]>('/documents')
      setDocuments(Array.isArray(response.data) ? response.data : [])
      setErrorMessage(null)
    } catch {
      setErrorMessage('Unable to load documents right now.')
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchDocuments()
  }, [])

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const byType = documents.filter((item) => {
      if (typeFilter === 'all') return true
      return inferType(item.mime_type, item.original_name) === typeFilter
    })

    const bySearch = byType.filter((item) => {
      if (!query) return true
      const fileName = item.original_name.toLowerCase()
      const itemTitle = (item.title ?? '').toLowerCase()
      return fileName.includes(query) || itemTitle.includes(query)
    })

    return [...bySearch].sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }

      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }

      const aName = (a.title?.trim() || a.original_name).toLowerCase()
      const bName = (b.title?.trim() || b.original_name).toLowerCase()
      return sortBy === 'name-asc' ? aName.localeCompare(bName) : bName.localeCompare(aName)
    })
  }, [documents, searchQuery, typeFilter, sortBy])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const resetUploadInput = () => {
    const input = document.getElementById('document-file-input') as HTMLInputElement | null
    if (input) {
      input.value = ''
    }
    setSelectedFile(null)
    setTitle('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please choose a file before upload.')
      setSuccessMessage(null)
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    if (title.trim()) {
      formData.append('title', title.trim())
    }

    try {
      setIsUploading(true)
      setErrorMessage(null)
      const response = await api.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const newItem = response.data?.document as ApiDocument | undefined
      if (newItem) {
        setDocuments((prev) => [newItem, ...prev])
      } else {
        await fetchDocuments()
      }

      setSuccessMessage('Document uploaded successfully.')
      resetUploadInput()
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Upload failed. Please try again.'

      setErrorMessage(message ?? 'Upload failed. Please try again.')
      setSuccessMessage(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (documentId: number) => {
    const confirmed = window.confirm('Delete this document?')
    if (!confirmed) return

    const previous = documents
    setDocuments((prev) => prev.filter((item) => item.id !== documentId))

    try {
      await api.delete(`/documents/${documentId}`)
      setSuccessMessage('Document deleted successfully.')
      setErrorMessage(null)
    } catch {
      setDocuments(previous)
      setErrorMessage('Unable to delete this document.')
      setSuccessMessage(null)
    }
  }

  return (
    <div className="doc-page">
      <h1 className="doc-title">Documents</h1>

      <div className="doc-upload-row">
        <div className="doc-upload-left">
          <p className="doc-upload-hint mb-1">Upload document, Allowed file types: JPG, PNG, PDF Docs.</p>
          <div className="doc-upload-controls">
            <input
              id="document-file-input"
              className="form-control"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <input
              className="form-control doc-title-input"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional title"
              maxLength={150}
            />
            <button
              type="button"
              className="btn doc-upload-btn"
              onClick={handleUpload}
              disabled={isUploading}
            >
              <i className="bi bi-upload me-1"></i>
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>

      {errorMessage && <div className="alert alert-danger py-2 mt-2 mb-3">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success py-2 mt-2 mb-3">{successMessage}</div>}

      <section className="doc-filter-card">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="doc-control-label" htmlFor="doc-filter-type">FILTER BY TYPE</label>
            <select
              id="doc-filter-type"
              className="form-select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as DocumentTypeFilter)}
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label className="doc-control-label" htmlFor="doc-sort">SORT BY DATE</label>
            <select
              id="doc-sort"
              className="form-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as DocumentSort)}
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label className="doc-control-label" htmlFor="doc-search">SEARCH</label>
            <div className="doc-search-wrap">
              <i className="bi bi-search"></i>
              <input
                id="doc-search"
                className="form-control"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by filename..."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="doc-table-wrap">
        <table className="table doc-table mb-0">
          <thead>
            <tr>
              <th>FILE NAME</th>
              <th>TYPE</th>
              <th>DATE ADDED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-muted">Loading documents...</td>
              </tr>
            ) : filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-muted">No documents found</td>
              </tr>
            ) : (
              filteredDocuments.map((item) => {
                const resolvedType = inferType(item.mime_type, item.original_name)
                const viewUrl = getFileUrl(item.file_path)
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="doc-file-name">{item.title?.trim() || item.original_name}</div>
                      {item.title?.trim() ? <small className="text-muted">{item.original_name}</small> : null}
                    </td>
                    <td>
                      <span className={`doc-type-chip doc-type-${resolvedType}`}>{formatTypeLabel(resolvedType)}</span>
                    </td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <div className="doc-actions">
                        <a
                          className="btn btn-sm btn-outline-secondary"
                          href={viewUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                        <a
                          className="btn btn-sm btn-outline-primary"
                          href={viewUrl}
                          download
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="doc-count text-muted mt-3">
        Showing {filteredDocuments.length} of {documents.length} documents
      </p>
    </div>
  )
}

export default DocumentsPage
