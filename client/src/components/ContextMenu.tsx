import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../style/context-menu.css'

export function ContextMenu() {
  const [pos, setPos]       = useState<{ x: number; y: number } | null>(null)
  const navigate             = useNavigate()
  const { pathname }         = useLocation()
  const role                 = pathname.startsWith('/staff') ? 'staff' : 'admin'

  const close = useCallback(() => setPos(null), [])

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      // Clamp so menu doesn't overflow the viewport
      const x = Math.min(e.clientX, window.innerWidth  - 210)
      const y = Math.min(e.clientY, window.innerHeight - 110)
      setPos({ x, y })
    }
    const onClose = () => close()
    const onKey   = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }

    document.addEventListener('contextmenu', onContext)
    document.addEventListener('click',       onClose)
    document.addEventListener('scroll',      onClose, true)
    document.addEventListener('keydown',     onKey)
    return () => {
      document.removeEventListener('contextmenu', onContext)
      document.removeEventListener('click',       onClose)
      document.removeEventListener('scroll',      onClose, true)
      document.removeEventListener('keydown',     onKey)
    }
  }, [close])

  if (!pos) return null

  const handleGuide = () => {
    window.dispatchEvent(new CustomEvent('dermas:show-guide'))
    close()
  }

  const handleAbout = () => {
    navigate(`/${role}/about`)
    close()
  }

  return (
    <div
      className="ctx-menu"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="ctx-menu-header">DERMAS</div>
      <button className="ctx-menu-item" onClick={handleGuide}>
        <i className="bi bi-mortarboard-fill ctx-menu-icon ctx-menu-icon--blue" />
        <span>
          <span className="ctx-menu-label">Show Page Guide</span>
          <span className="ctx-menu-sub">Step-by-step tour</span>
        </span>
      </button>
      <div className="ctx-menu-divider" />
      <button className="ctx-menu-item" onClick={handleAbout}>
        <i className="bi bi-info-circle-fill ctx-menu-icon ctx-menu-icon--teal" />
        <span>
          <span className="ctx-menu-label">About DERMAS</span>
          <span className="ctx-menu-sub">System info &amp; team</span>
        </span>
      </button>
    </div>
  )
}
