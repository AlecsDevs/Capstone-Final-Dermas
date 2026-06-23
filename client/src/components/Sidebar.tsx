import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import adminAvatar from "../assets/Mdrrmo_logo.png";
import { useAuth } from "../context/AuthContext";
import { useOnlineStatus } from "../offline/useOnlineStatus";

const REPORT_ZONES = [
  { name: 'Rail Road', color: '#2563eb' },
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
  const online                    = useOnlineStatus();
  const [showModal, setShowModal] = useState(false);
  const reportsBasePath           = role === 'admin' ? '/admin/zonal-reports' : '/staff/zonal-reports'
  const reportsRouteActive        =
    location.pathname === reportsBasePath || location.pathname.startsWith(`${reportsBasePath}/`)
  const [reportsOpen, setReportsOpen] = useState(reportsRouteActive)

  // Auto-open when navigating into the reports section
  useEffect(() => {
    if (reportsRouteActive) setReportsOpen(true)
  }, [reportsRouteActive])

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`) ? "active" : "";

  const withActiveClass = (baseClass: string, active: boolean) =>
    active ? `${baseClass} active` : baseClass

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
      <Link to="/admin/trash" className={isActive("/admin/trash")} onClick={handleLinkClick}>
        <i className="bi bi-trash"></i> Trash
      </Link>
      <Link to="/admin/about" className={isActive("/admin/about")} onClick={handleLinkClick}>
        <i className="bi bi-info-circle"></i> About
      </Link>
    </>
  );

  const staffLinks = (
    <>
      <Link to="/staff/dashboard" className={isActive("/staff/dashboard")} onClick={handleLinkClick}>
        <i className="bi bi-speedometer2"></i> Dashboard
      </Link>

      <div className="sidebar-dropdown">
        <div className={`sidebar-dropdown-head${reportsRouteActive ? ' active' : ''}`}>
          <Link
            to="/staff/zonal-reports"
            className={`sidebar-dropdown-link ${isActive('/staff/zonal-reports')}`.trim()}
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

      <Link to="/staff/documents" className={isActive("/staff/documents")} onClick={handleLinkClick}>
        <i className="bi bi-folder-fill"></i> Documents
      </Link>
      <Link to="/staff/trash" className={isActive("/staff/trash")} onClick={handleLinkClick}>
        <i className="bi bi-trash"></i> Trash
      </Link>
      <Link to="/staff/about" className={isActive("/staff/about")} onClick={handleLinkClick}>
        <i className="bi bi-info-circle"></i> About
      </Link>
    </>
  );

  return (
    <>
      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            type="button"
            className="sidebar-mobile-close d-lg-none"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
        <img src={adminAvatar} alt="Avatar" className="avatar mt-4" />
        <div className="admin-label text-center">MDRRMO</div>
        <p className="sidebar-role">{role === 'admin' ? 'Admin' : 'Staff'}</p>

        {!online && (
          <div className="sidebar-offline-indicator">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M10.706 3.294A12.545 12.545 0 0 0 8 3C5.259 3 2.723 3.994.757 5.659l1.415 1.415A10.526 10.526 0 0 1 8 5c.83 0 1.636.097 2.407.274l.299-1.98ZM5.797 7.801A7.544 7.544 0 0 1 8 7.5a7.54 7.54 0 0 1 4.484 1.464l-1.418 1.418A5.543 5.543 0 0 0 8 9.5a5.544 5.544 0 0 0-2.658.681L4.56 8.4a7.51 7.51 0 0 1 1.237-.599Zm3.484 4.032L8 13.118l-1.281-1.285A2.545 2.545 0 0 1 8 11.5c.463 0 .898.126 1.281.333ZM.146.146a.5.5 0 0 1 .708 0L16 15.293l-.708.707L.146.854a.5.5 0 0 1 0-.708Z"/>
            </svg>
            <span>Offline Mode</span>
          </div>
        )}

        <nav className="mt-3 w-100 flex-grow-1" id="tour-sidebar-nav">
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