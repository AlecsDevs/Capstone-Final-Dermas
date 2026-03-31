interface TopBarProps {
  onToggleSidebar: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
}

export const TopBar = ({ onToggleSidebar, darkMode, onToggleDarkMode }: TopBarProps) => {
  return (
    <div className="topbar">
      {/* Hamburger – mobile only */}
      <button className="topbar-hamburger d-lg-none" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <i className="bi bi-list" />
      </button>

      {/* Spacer */}
      <div className="topbar-spacer" />

      {/* Right actions */}
      <div className="topbar-actions">
        {/* Notification bell */}
        <button className="topbar-icon-btn" aria-label="Notifications">
          <i className="bi bi-bell" />
          <span className="notif-badge">3</span>
        </button>

        {/* Dark mode toggle */}
        <button className="topbar-icon-btn" onClick={onToggleDarkMode} aria-label="Toggle dark mode">
          <i className={`bi ${darkMode ? 'bi-sun' : 'bi-moon'}`} />
        </button>
      </div>
    </div>
  )
}
