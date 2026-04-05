import { Link } from 'react-router-dom'
import logo from '../assets/Mdrrmo_logo.png'
import '../style/not-found.css'

export default function NotFoundPage() {
  return (
    <main className="nf-wrap">
      <section className="nf-card" aria-labelledby="nf-title">
        <img src={logo} alt="MDRRMO" className="nf-logo" />
        <p className="nf-code">404</p>
        <h1 id="nf-title" className="nf-title">Page Not Found</h1>
        <p className="nf-text">
          The page you requested does not exist or may have been moved.
        </p>

        <div className="nf-actions">
          <Link to="/" className="nf-btn nf-btn-primary">Go to Home</Link>
          <Link to="/login" className="nf-btn nf-btn-secondary">Go to Login</Link>
        </div>
      </section>
    </main>
  )
}
