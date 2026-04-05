import '../style/app-loading.css'
import logo from '../assets/Mdrrmo_logo.png'

export function AppLoadingScreen() {
  return (
    <div className="app-loading-wrap" role="status" aria-live="polite" aria-label="Loading application">
      <div className="app-loading-card">
        <div className="app-loading-emblem">
          <img src={logo} alt="MDRRMO" className="app-loading-logo" />
          <span className="app-loading-ring app-loading-ring-outer" aria-hidden="true"></span>
          <span className="app-loading-ring app-loading-ring-inner" aria-hidden="true"></span>
        </div>

        <h2 className="app-loading-title">MDRRMO Report System</h2>
        <p className="app-loading-subtitle">Preparing emergency dashboard and report modules...</p>

        <div className="app-loading-bar" aria-hidden="true">
          <span className="app-loading-bar-progress"></span>
        </div>
      </div>
    </div>
  )
}
