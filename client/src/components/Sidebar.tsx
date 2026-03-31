import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import adminAvatar from "../assets/Mdrrmo_logo.png";
import { useAuth } from "../context/AuthContext";

const REPORT_ZONES = [
  { name: 'Real Road', color: '#2563eb' },
  { name: 'Poblacion', color: '#15803d' },
  { name: 'Mountain Area', color: '#f59e0b' },
  { name: 'River Side', color: '#06b6d4' },
]

const toZoneSlug = (zoneName: string) =>
  zoneName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  role?: 'admin' | 'staff'
}

export const Sidebar = ({ isOpen = false, onClose, role = 'admin' }: SidebarProps) => {
  const location                  = useLocation();
  const { logout }                = useAuth();
  const [showModal, setShowModal] = useState(false);
  const reportsBasePath           = '/admin/zonal-reports'
  const reportsRouteActive        =
    location.pathname === reportsBasePath || location.pathname.startsWith(`${reportsBasePath}/`)
  const [reportsOpen, setReportsOpen] = useState(reportsRouteActive)

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`) ? "active" : "";

  const withActiveClass = (baseClass: string, active: boolean) =>
    active ? `${baseClass} active` : baseClass

  useEffect(() => {
    if (reportsRouteActive) {
      setReportsOpen(true)
    }
  }, [reportsRouteActive])

  const handleLinkClick = () => onClose?.();

  const handleLogout = async () => {
    setShowModal(false);
    await logout();
  };

  const adminLinks = (
    <>
      <Link to="/admin/dashboard" className={isActive("/admin/dashboard")} onClick={handleLinkClick}>
        <i className="bi bi-speedometer2"></i> Dashboard
      </Link>

      <div className="sidebar-dropdown">
        <div className={`sidebar-dropdown-head${reportsRouteActive ? ' active' : ''}`}>
          <Link
            to="/admin/zonal-reports"
            className={`sidebar-dropdown-link ${isActive('/admin/zonal-reports')}`.trim()}
            onClick={handleLinkClick}
          >
            <i className="bi bi-geo-alt-fill"></i> Manage Reports
          </Link>

          <button
            type="button"
            className={`sidebar-dropdown-toggle${reportsOpen ? ' open' : ''}`}
            onClick={() => setReportsOpen(prev => !prev)}
            aria-label="Toggle report zones"
            aria-expanded={reportsOpen}
            aria-controls="reports-submenu"
          >
            <i className={`bi bi-chevron-down sidebar-dropdown-chevron${reportsOpen ? ' open' : ''}`}></i>
          </button>
        </div>

        {reportsOpen && (
          <div id="reports-submenu" className="sidebar-submenu">
            <div className="sidebar-zone-list">
              {REPORT_ZONES.map(zone => {
                const zonePath = `${reportsBasePath}/${toZoneSlug(zone.name)}`
                return (
                  <Link
                    key={zone.name}
                    to={zonePath}
                    className={withActiveClass('sidebar-zone-link', Boolean(isActive(zonePath)))}
                    style={{ '--zone-color': zone.color } as Record<string, string>}
                    onClick={handleLinkClick}
                  >
                    <span className="sidebar-zone-icon">
                      <i className="bi bi-folder-fill"></i>
                    </span>
                    <span className="sidebar-zone-name">{zone.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <Link to="/admin/user-management" className={isActive("/admin/user-management")} onClick={handleLinkClick}>
        <i className="bi bi-people-fill"></i> User Management
      </Link>
      <Link to="/admin/documents" className={isActive("/admin/documents")} onClick={handleLinkClick}>
        <i className="bi bi-folder-fill"></i> Documents
      </Link>
    </>
  );

  const staffLinks = (
    <>
      <Link to="/staff/dashboard" className={isActive("/staff/dashboard")} onClick={handleLinkClick}>
        <i className="bi bi-speedometer2"></i> Dashboard
      </Link>
      <Link to="/staff/reports" className={isActive("/staff/reports")} onClick={handleLinkClick}>
        <i className="bi bi-file-earmark-text-fill"></i> My Reports
      </Link>
      <Link to="/staff/documents" className={isActive("/staff/documents")} onClick={handleLinkClick}>
        <i className="bi bi-folder-fill"></i> Documents
      </Link>
    </>
  );

  return (
    <>
      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        <img src={adminAvatar} alt="Avatar" className="avatar mt-4" />
        <div className="admin-label text-center">MDRRMO</div>
        <p className="sidebar-role">{role === 'admin' ? 'Admin' : 'Staff'}</p>

        <nav className="mt-3 w-100 flex-grow-1">
          {role === 'admin' ? adminLinks : staffLinks}
        </nav>

        <div className="sidebar-footer w-100">
          <button onClick={() => setShowModal(true)}>
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </aside>

      {/* Logout confirmation modal */}
      {showModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">

                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-semibold">
                    <i className="bi bi-box-arrow-right text-danger me-2" />
                    Confirm Logout
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  />
                </div>

                <div className="modal-body text-muted">
                  Are you sure you want to log out of your session?
                </div>

                <div className="modal-footer border-0 pt-0">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right me-1" />
                    Yes, Logout
                  </button>
                </div>

              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)} />
        </>
      )}
    </>
  );
};