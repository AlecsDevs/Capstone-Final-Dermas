import { useEffect, useMemo, useState } from 'react'
import api from '../../api/axios'

interface ApiGeographicType {
  name: string
}

interface ApiReport {
  id: number
  report_type: 'Emergency' | 'Incident'
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected'
  date_reported: string
  time_reported: string
  geographicType?: ApiGeographicType | null
  geographic_type?: ApiGeographicType | null
}

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export default function StaffDashboard() {
  const [reports, setReports] = useState<ApiReport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadMyData = async () => {
      try {
        setIsLoading(true)
        const response = await api.get<ApiReport[]>('/reports/my-data', {
          params: { limit: 500 },
        })
        setReports(Array.isArray(response.data) ? response.data : [])
      } catch {
        setReports([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadMyData()
  }, [])

  const total = reports.length
  const submitted = useMemo(() => reports.filter((item) => item.status === 'Submitted').length, [reports])
  const approved = useMemo(() => reports.filter((item) => item.status === 'Approved').length, [reports])
  const rejected = useMemo(() => reports.filter((item) => item.status === 'Rejected').length, [reports])

  return (
    <div className="px-1">
      <h2 className="fw-bold mb-1">My Data Dashboard</h2>
      <p className="text-muted mb-3">This shows your assigned reports from the API.</p>

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Total My Reports</p>
              <h3 className="mb-0">{isLoading ? '...' : total}</h3>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Submitted</p>
              <h3 className="mb-0">{isLoading ? '...' : submitted}</h3>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Approved</p>
              <h3 className="mb-0">{isLoading ? '...' : approved}</h3>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <p className="text-muted mb-1">Rejected</p>
              <h3 className="mb-0">{isLoading ? '...' : rejected}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-semibold">Recent My Reports</div>
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Zone</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-3 text-muted">Loading your data...</td>
                </tr>
              ) : reports.length > 0 ? (
                reports.slice(0, 12).map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td>{item.report_type}</td>
                    <td>{item.geographicType?.name ?? item.geographic_type?.name ?? 'Unknown'}</td>
                    <td>{formatDate(item.date_reported)} {item.time_reported}</td>
                    <td>
                      <span className="badge text-bg-secondary">{item.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-3 text-muted">No assigned reports found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
