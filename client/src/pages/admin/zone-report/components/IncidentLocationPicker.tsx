import { useState, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Polygon, Marker, CircleMarker, useMapEvents } from 'react-leaflet'
import { NABUA_BOUNDARY } from '../data/nabuaBarangays'

const NABUA_CENTER: [number, number] = [13.4057, 123.3744]

const pinIcon = L.divIcon({
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.45);cursor:grab"></div>',
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const boundaryStyle = {
  color: '#2563eb',
  fillColor: '#3b82f6',
  fillOpacity: 0.07,
  weight: 2,
  dashArray: '6 3',
} as const

function MapClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPlace(e.latlng.lat, e.latlng.lng) })
  return null
}

/* ── Picker ──────────────────────────────────────── */
interface IncidentLocationPickerProps {
  lat: string
  lng: string
  onChange: (lat: string, lng: string) => void
}

const gpsIcon = L.divIcon({
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 0 0 3px #16a34a55,0 2px 8px rgba(0,0,0,0.4);cursor:grab"></div>',
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

export function IncidentLocationPicker({ lat, lng, onChange }: IncidentLocationPickerProps) {
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [isGps, setIsGps] = useState(false)
  const mapKeyRef = useRef(0)

  const parsedLat = parseFloat(lat)
  const parsedLng = parseFloat(lng)
  const hasPinned = !isNaN(parsedLat) && !isNaN(parsedLng)

  const mapCenter: [number, number] = hasPinned ? [parsedLat, parsedLng] : NABUA_CENTER
  const mapZoom = hasPinned ? 16 : 13

  const handlePlace = (newLat: number, newLng: number) => {
    setIsGps(false)
    onChange(newLat.toFixed(7), newLng.toFixed(7))
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        setIsGps(true)
        setLocating(false)
        setOpen(true)
        mapKeyRef.current += 1
        onChange(latitude.toFixed(7), longitude.toFixed(7))
      },
      err => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED)
          setLocError('Location access denied. Please allow location in your browser settings.')
        else
          setLocError('Unable to get your location. Try again.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="mt-2">
      {/* Button row */}
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <button
          type="button"
          className={`btn btn-sm d-flex align-items-center gap-2 ${hasPinned ? 'btn-primary' : 'btn-outline-secondary'}`}
          style={{ fontSize: 12, borderRadius: 20, padding: '3px 14px' }}
          onClick={() => setOpen(o => !o)}
        >
          <i className={`bi ${hasPinned ? 'bi-geo-alt-fill' : 'bi-geo-alt'}`} />
          {hasPinned
            ? `${isGps ? 'GPS:' : 'Pinned:'} ${parsedLat.toFixed(4)}°N, ${parsedLng.toFixed(4)}°E · ${open ? 'Close' : 'Edit'}`
            : 'Pin on Map (optional)'}
        </button>

        <button
          type="button"
          className="btn btn-sm d-flex align-items-center gap-2"
          style={{
            fontSize: 12, borderRadius: 20, padding: '3px 14px',
            background: locating ? '#f0fdf4' : '#16a34a',
            color: locating ? '#16a34a' : '#fff',
            border: `1.5px solid #16a34a`,
            opacity: locating ? 0.8 : 1,
          }}
          onClick={handleUseMyLocation}
          disabled={locating}
        >
          {locating
            ? <><span className="spinner-border spinner-border-sm" style={{ width: 11, height: 11, borderWidth: 2 }} />Locating…</>
            : <><i className="bi bi-crosshair2" />Use My Location</>
          }
        </button>
      </div>

      {/* GPS error */}
      {locError && (
        <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: 11, color: '#dc2626' }}>
          <i className="bi bi-exclamation-circle-fill" />
          {locError}
          <button type="button" className="btn btn-link p-0 ms-auto" style={{ fontSize: 11, color: '#9ca3af' }} onClick={() => setLocError(null)}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* GPS success badge */}
      {isGps && hasPinned && !locating && !locError && (
        <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
          <i className="bi bi-check-circle-fill" />
          Current location captured
        </div>
      )}

      {open && (
        <div className="mt-2" style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${isGps ? '#86efac' : '#dee2e6'}` }}>
          {isGps && (
            <div style={{ background: '#f0fdf4', borderBottom: '1px solid #86efac', padding: '4px 12px', fontSize: 11, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-crosshair2" />
              GPS location — drag the pin to adjust if needed
            </div>
          )}
          <div style={{ height: 290 }}>
            <MapContainer
              key={`${mapKeyRef.current}-${mapCenter[0]}-${mapCenter[1]}`}
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polygon positions={NABUA_BOUNDARY} pathOptions={boundaryStyle} />
              <MapClickHandler onPlace={handlePlace} />
              {hasPinned && (
                <Marker
                  position={[parsedLat, parsedLng]}
                  icon={isGps ? gpsIcon : pinIcon}
                  draggable
                  eventHandlers={{
                    dragend: e => {
                      const ll = (e.target as L.Marker).getLatLng()
                      setIsGps(false)
                      onChange(ll.lat.toFixed(7), ll.lng.toFixed(7))
                    },
                  }}
                />
              )}
            </MapContainer>
          </div>

          <div
            className="d-flex align-items-center justify-content-between px-2 py-1 zr-map-statusbar"
            style={{ fontSize: 12, borderTop: `1px solid ${isGps ? '#86efac' : '#dee2e6'}` }}
          >
            {hasPinned ? (
              <>
                <span className="text-muted">
                  <i className={`bi ${isGps ? 'bi-crosshair2' : 'bi-crosshair'} me-1`} style={{ color: isGps ? '#16a34a' : undefined }} />
                  {parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger py-0 px-2"
                  style={{ fontSize: 11 }}
                  onClick={() => { onChange('', ''); setIsGps(false) }}
                >
                  <i className="bi bi-x me-1" />Clear
                </button>
              </>
            ) : (
              <span className="text-muted">
                <i className="bi bi-info-circle me-1" />
                Click anywhere on the map to drop a pin
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Read-only preview (ReviewSubmitStep) ─────────── */
interface LocationPreviewMapProps {
  lat: string
  lng: string
}

export function LocationPreviewMap({ lat, lng }: LocationPreviewMapProps) {
  const parsedLat = parseFloat(lat)
  const parsedLng = parseFloat(lng)
  if (isNaN(parsedLat) || isNaN(parsedLng)) return null

  return (
    <div className="mb-3">
      <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: 13 }}>
        <i className="bi bi-geo-alt-fill text-primary" />
        <span className="fw-semibold">Pinned Incident Location</span>
        <span className="text-muted" style={{ fontSize: 11 }}>
          {parsedLat.toFixed(5)}°N, {parsedLng.toFixed(5)}°E
        </span>
      </div>
      <div style={{ height: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid #dee2e6' }}>
        <MapContainer
          center={[parsedLat, parsedLng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polygon positions={NABUA_BOUNDARY} pathOptions={boundaryStyle} />
          <CircleMarker
            center={[parsedLat, parsedLng]}
            radius={10}
            pathOptions={{ fillColor: '#2563eb', fillOpacity: 1, color: '#fff', weight: 3 }}
          />
        </MapContainer>
      </div>
    </div>
  )
}
