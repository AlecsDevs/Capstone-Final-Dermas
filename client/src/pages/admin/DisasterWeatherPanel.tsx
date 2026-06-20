import { useState, useEffect, useCallback } from 'react'
import { fetchNabuaWeather, fetchPhilippineEarthquakes } from '../../api/weather'
import type { WeatherData, Earthquake } from '../../api/weather'

// ── Helpers ───────────────────────────────────────────────────

function dayIcon(code: number): string {
  if (code === 0)  return 'bi-sun-fill'
  if (code <= 3)   return 'bi-cloud-sun-fill'
  if (code <= 48)  return 'bi-cloud-fog2-fill'
  if (code <= 55)  return 'bi-cloud-drizzle-fill'
  if (code <= 65)  return 'bi-cloud-rain-fill'
  if (code <= 82)  return 'bi-cloud-rain-heavy-fill'
  return               'bi-cloud-lightning-rain-fill'
}

function dayColor(code: number): string {
  if (code === 0)  return '#f59e0b'
  if (code <= 3)   return '#3b82f6'
  if (code <= 48)  return '#94a3b8'
  if (code <= 65)  return '#2563eb'
  if (code <= 82)  return '#1d4ed8'
  return               '#7c3aed'
}

function timeAgo(ms: number): string {
  const h = Math.floor((Date.now() - ms) / 3600000)
  if (h < 1)  return 'Just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const WINDY_SRC =
  'https://embed.windy.com/embed2.html?lat=13.41&lon=123.38' +
  '&detailLat=13.41&detailLon=123.38&zoom=12' +
  '&level=surface&overlay=rain&product=ecmwf&menu=&message=true' +
  '&marker=true&calendar=now&type=map&location=coordinates' +
  '&detail=true&metricWind=default&metricTemp=%C2%B0C&radarRange=-1'

// ── Panel header helper ────────────────────────────────────────
function PanelHeader({
  icon, iconBg, iconColor, title, sub, sourceLabel, sourceHref, dark,
}: {
  icon: string; iconBg: string; iconColor: string
  title: string; sub: string
  sourceLabel?: string; sourceHref?: string
  dark?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${dark ? '#374151' : '#f1f5f9'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`bi ${icon}`} style={{ color: iconColor, fontSize: 13 }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f1f5f9' : '#111827', lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sub}</div>
        </div>
      </div>
      {sourceLabel && sourceHref && (
        <a href={sourceHref} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
          {sourceLabel} <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10 }} />
        </a>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────

export function DisasterWeatherPanel() {
  const [weather,     setWeather]     = useState<WeatherData | null>(null)
  const [quakes,      setQuakes]      = useState<Earthquake[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [dark,        setDark]        = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [w, q] = await Promise.all([fetchNabuaWeather(), fetchPhilippineEarthquakes()])
      setWeather(w)
      setQuakes(q)
    } catch {
      setError('Unable to load live data. Check your internet connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const panelBg     = dark ? '#1f2937' : '#fff'
  const panelBorder = dark ? '#374151' : '#e5e7eb'
  const divider     = dark ? '#263347' : '#f1f5f9'
  const textPrimary = dark ? '#f1f5f9' : '#111827'

  if (loading) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280' }}>
      <i className="bi bi-cloud-arrow-down-fill" style={{ fontSize: 36, display: 'block', marginBottom: 10, color: '#3b82f6' }} />
      <span style={{ fontSize: 14 }}>Loading live data…</span>
    </div>
  )

  if (error) return (
    <div style={{ padding: '14px 18px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{error}</span>
      <button onClick={load} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
    </div>
  )

  // 5-day forecast: skip today (index 0)
  const forecast = weather?.daily.slice(1, 6) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>

      {/* ── Row 1: 2-column grid ─────────────────────────────── */}
      <div className="db-disaster-row">

        {/* Left — Live Rain Map */}
        <div style={{ borderRadius: 14, border: `1px solid ${panelBorder}`, background: panelBg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <PanelHeader dark={dark}
            icon="bi-cloud-rain-fill" iconBg="#eff6ff" iconColor="#2563eb"
            title="Live Rain Map"
            sub="Nabua area · Windy"
            sourceLabel="Open full map"
            sourceHref="https://www.windy.com/?rain,13.41,123.38,12"
          />
          <iframe
            src={WINDY_SRC}
            title="Live Rain Map — Nabua"
            style={{ width: '100%', flex: 1, minHeight: 360, border: 'none', display: 'block' }}
            allowFullScreen
          />
        </div>

        {/* Right — Recent Earthquakes */}
        <div style={{ borderRadius: 14, border: `1px solid ${panelBorder}`, background: panelBg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <PanelHeader dark={dark}
            icon="bi-activity" iconBg="#fef2f2" iconColor="#dc2626"
            title="Recent Earthquakes"
            sub="Philippines · M4.5+ · USGS"
            sourceLabel="USGS"
            sourceHref="https://earthquake.usgs.gov/earthquakes/map/"
          />

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {quakes.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                <i className="bi bi-check-circle-fill" style={{ color: '#16a34a', display: 'block', fontSize: 24, marginBottom: 8 }} />
                No significant earthquakes recorded recently.
              </div>
            ) : quakes.map((q, idx) => {
              const mag      = q.magnitude
              const magColor = mag >= 6.5 ? '#7c3aed' : mag >= 6.0 ? '#dc2626' : mag >= 5.5 ? '#d97706' : (dark ? '#9ca3af' : '#374151')
              const magBg    = mag >= 6.0 ? '#fef2f2' : mag >= 5.5 ? '#fffbeb' : (dark ? '#263347' : '#f9fafb')
              return (
                <div key={q.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderBottom: idx < quakes.length - 1 ? `1px solid ${divider}` : 'none',
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                    background: magBg, border: `1.5px solid ${magColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: magColor }}>M{mag.toFixed(1)}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.place}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      Depth {q.depth.toFixed(0)} km · {timeAgo(q.time)}
                    </div>
                    {mag >= 7.0 && q.depth < 70 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 20, padding: '1px 7px', marginTop: 3, display: 'inline-block' }}>
                        TSUNAMI WATCH
                      </span>
                    )}
                  </div>
                  <a href={q.sourceUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
                    Source <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10 }} />
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Row 2: 5-Day Forecast (full width) ───────────────── */}
      <div style={{ borderRadius: 14, border: `1px solid ${panelBorder}`, background: panelBg, overflow: 'hidden' }}>
        <PanelHeader dark={dark}
          icon="bi-calendar3" iconBg="#eff6ff" iconColor="#2563eb"
          title="5-Day Weather Forecast"
          sub="ECMWF model · Nabua, Camarines Sur"
          sourceLabel="Open-Meteo"
          sourceHref="https://open-meteo.com/"
        />

        {forecast.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No forecast data available.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {forecast.map((d, idx) => {
              const dayName  = DAY[new Date(d.date + 'T00:00:00').getDay()]
              const dateStr  = new Date(d.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })
              const icon     = dayIcon(d.weathercode)
              const color    = dayColor(d.weathercode)
              const rainHigh = d.precipProbability >= 60
              const cellBg   = rainHigh ? (dark ? '#1e3a5f' : '#f0f9ff') : panelBg
              return (
                <div key={d.date} style={{
                  padding: '16px 10px', textAlign: 'center',
                  borderRight: idx < forecast.length - 1 ? `1px solid ${divider}` : 'none',
                  background: cellBg,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: dark ? '#d1d5db' : '#374151' }}>{dayName}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 8 }}>{dateStr}</div>
                  <i className={`bi ${icon}`} style={{ fontSize: 26, color, display: 'block', marginBottom: 8 }} />
                  <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary }}>{Math.round(d.tempMax)}°C</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{Math.round(d.tempMin)}°C</div>
                  {/* Rain probability bar */}
                  <div style={{ height: 4, background: dark ? '#374151' : '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${d.precipProbability}%`, background: d.precipProbability >= 60 ? '#2563eb' : '#93c5fd', borderRadius: 4, transition: 'width .4s' }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: d.precipProbability >= 60 ? '#2563eb' : '#9ca3af' }}>
                    {d.precipProbability}%
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>rain chance</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer attribution */}
        <div style={{ padding: '8px 14px', borderTop: `1px solid ${divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>
            Forecast data: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>Open-Meteo</a>
            {' · '}Model: <a href="https://www.ecmwf.int/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>ECMWF IFS</a>
            {' · '}Coordinates: 13.41°N, 123.38°E
          </span>
          <button onClick={load} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <i className="bi bi-arrow-clockwise" /> Refresh
          </button>
        </div>
      </div>

    </div>
  )
}
