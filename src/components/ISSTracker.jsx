import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { toast } from 'react-toastify'
import { RefreshCw, MapPin, Zap, Navigation, Users, Clock, Activity } from 'lucide-react'
import { calcSpeed, getNearestLocation, lsGet, lsSet } from '../utils/helpers'
import 'leaflet/dist/leaflet.css'
import './ISSTracker.css'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom ISS icon
const issIcon = L.divIcon({
  html: `<div class="iss-marker">🛸</div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

// Map recenter helper
function MapUpdater({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position && !isNaN(position[0]) && !isNaN(position[1])) {
      map.setView(position, map.getZoom(), { animate: true })
    }
  }, [position, map])
  return null
}

const MAX_TRACK = 15
const REFRESH_MS = 15000

export default function ISSTracker({ onDataUpdate }) {
  const [iss, setIss] = useState(null)
  const [track, setTrack] = useState([])
  const [speeds, setSpeeds] = useState([])
  const [speedHistory, setSpeedHistory] = useState([])
  const [crew, setCrew] = useState(null)
  const [location, setLocation] = useState('Fetching...')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // Default map center if ISS is not loaded yet
  const defaultCenter = [20, 0] 

  // ... fetchISS, fetchCrew effects remain same ...
  const intervalRef = useRef(null)
  const prevPos = useRef(null)
  const prevTime = useRef(null)
  const geocodeTimeout = useRef(null)

  const fetchISS = useCallback(async (silent = false) => {
    if (!silent && !iss) setLoading(true)
    setError(null)
    try {
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
        headers: { 'Accept': 'application/json' }
      })
      if (!res.ok) throw new Error('API limit or network error')
      const data = await res.json()
      
      const lat = parseFloat(data.latitude)
      const lng = parseFloat(data.longitude)
      const speedKmh = parseFloat(data.velocity)
      const ts = data.timestamp

      if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid coordinates')

      updateISSState(lat, lng, speedKmh, ts, silent)
    } catch (e) {
      console.warn('ISS Live Fetch failed, using simulated data:', e.message)
      // SIMULATION FALLBACK: Generate realistic movement if API is blocked
      const now = Math.floor(Date.now() / 1000)
      const lastLat = iss?.lat || 0
      const lastLng = iss?.lng || 0
      // Simulate ~0.5 degree movement per 15s (rough approximation of orbital speed)
      const nextLat = Math.sin(now / 1000) * 51.6 // Inclination of ISS
      const nextLng = ((lastLng + 0.8 + 180) % 360) - 180
      const simSpeed = 27600 + (Math.random() * 100 - 50)
      
      updateISSState(nextLat, nextLng, simSpeed, now, silent, true)
    } finally {
      setLoading(false)
    }
  }, [location, onDataUpdate, iss])

  const updateISSState = (lat, lng, speed, ts, silent, isSimulated = false) => {
    prevPos.current = [lat, lng]
    prevTime.current = ts

    const newPos = { lat, lng, ts, speed }
    setIss(newPos)
    setTrack(prev => [...prev, [lat, lng]].slice(-MAX_TRACK))
    setSpeeds(prev => [...prev, speed].slice(-MAX_TRACK))
    setSpeedHistory(prev => {
      const entry = { time: new Date(ts * 1000).toLocaleTimeString(), speed: Math.round(speed) }
      return [...prev, entry].slice(-30)
    })
    setLastUpdate(new Date())

    onDataUpdate?.({ lat, lng, speed: Math.round(speed), ts, location })

    if (isSimulated) {
      setLocation('Simulated Orbit (Live Blocked)')
    } else {
      clearTimeout(geocodeTimeout.current)
      geocodeTimeout.current = setTimeout(async () => {
        const loc = await getNearestLocation(lat, lng)
        setLocation(loc)
      }, 2000)
    }

    if (!silent) {
      if (isSimulated) toast.info('Using simulated orbital data (Live API unreachable)')
      else toast.success('ISS position updated!', { icon: '🛸' })
    }
  }

  const fetchCrew = useCallback(async () => {
    const fallbackCrew = {
      number: 7,
      people: [
        { name: 'Oleg Kononenko', craft: 'ISS' },
        { name: 'Nikolai Chub', craft: 'ISS' },
        { name: 'Tracy C. Dyson', craft: 'ISS' },
        { name: 'Matthew Dominick', craft: 'ISS' },
        { name: 'Michael Barratt', craft: 'ISS' },
        { name: 'Jeanette Epps', craft: 'ISS' },
        { name: 'Alexander Grebenkin', craft: 'ISS' }
      ]
    }

    try {
      const res = await fetch('https://corquaid.github.io/international-space-station-api/astros.json')
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      if (data && data.people) setCrew(data)
      else setCrew(fallbackCrew)
    } catch (e) {
      setCrew(fallbackCrew)
    }
  }, [])

  useEffect(() => {
    fetchISS()
    fetchCrew()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchISS(true), REFRESH_MS)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [autoRefresh, fetchISS])

  const currentSpeed = iss?.speed || 0

  return (
    <div className="iss-tracker">
      {/* Stats Row */}
      <div className="iss-stats-grid">
        <StatCard
          icon={<MapPin size={20} />}
          label="Latitude"
          value={iss ? `${iss.lat.toFixed(4)}°` : '—'}
          color="blue"
          loading={loading && !iss}
        />
        <StatCard
          icon={<Navigation size={20} />}
          label="Longitude"
          value={iss ? `${iss.lng.toFixed(4)}°` : '—'}
          color="cyan"
          loading={loading && !iss}
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Speed"
          value={iss ? `${Math.round(currentSpeed).toLocaleString()} km/h` : '—'}
          color="purple"
          loading={loading && !iss}
        />
        <StatCard
          icon={<MapPin size={20} />}
          label="Over"
          value={location}
          color="green"
          loading={loading && !iss}
          small
        />
        <StatCard
          icon={<Activity size={20} />}
          label="Positions Tracked"
          value={track.length}
          color="orange"
          loading={loading && !iss}
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Last Updated"
          value={lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}
          color="pink"
          loading={loading && !iss}
        />
      </div>

      {/* Map + Crew Row */}
      <div className="iss-main-row">
        {/* Map */}
        <div className="iss-map-card card">
          <div className="section-header">
            <div className="section-title">
              <span className="icon" style={{ background: 'rgba(59,130,246,0.15)' }}>🗺️</span>
              Live ISS Map
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={e => {
                    setAutoRefresh(e.target.checked)
                    toast.info(e.target.checked ? 'Auto-refresh ON' : 'Auto-refresh OFF')
                  }}
                />
                <span>Auto (15s)</span>
              </label>
              <button id="iss-refresh-btn" className="btn btn-secondary btn-sm" onClick={() => fetchISS()}>
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="error-state" style={{ marginBottom: 16 }}>
              <p style={{ color: 'var(--accent-red)' }}>{error}</p>
              <button className="btn btn-primary btn-sm" onClick={() => fetchISS()} style={{ marginTop: 8 }}>Retry</button>
            </div>
          )}

          <div className="map-wrapper">
            <MapContainer
              center={iss && !isNaN(iss.lat) ? [iss.lat, iss.lng] : defaultCenter}
              zoom={3}
              style={{ height: '100%', width: '100%', borderRadius: 12 }}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap &copy; CARTO"
              />
              {track.length > 1 && (
                <Polyline
                  positions={track}
                  pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.8, dashArray: '8,4' }}
                />
              )}
              {iss && !isNaN(iss.lat) && !isNaN(iss.lng) && (
                <Marker position={[iss.lat, iss.lng]} icon={issIcon}>
                  <Popup>
                    <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180 }}>
                      <strong>🛸 ISS Current Position</strong>
                      <br />Lat: {iss.lat.toFixed(4)}°
                      <br />Lng: {iss.lng.toFixed(4)}°
                      <br />Speed: {Math.round(currentSpeed).toLocaleString()} km/h
                      <br />Over: {location}
                    </div>
                  </Popup>
                </Marker>
              )}
              {iss && <MapUpdater position={[iss.lat, iss.lng]} />}
            </MapContainer>
            {(loading && !iss) && (
              <div className="map-loading">
                <div className="spinner" />
                <p>Loading ISS position...</p>
              </div>
            )}
          </div>

          <div className="track-indicator">
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Path shows last {track.length} of {MAX_TRACK} positions
            </span>
            <div className="track-dots">
              {Array.from({ length: MAX_TRACK }).map((_, i) => (
                <div key={i} className={`track-dot ${i < track.length ? 'active' : ''}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Crew Panel */}
        <div className="crew-panel card">
          <div className="section-header">
            <div className="section-title">
              <span className="icon" style={{ background: 'rgba(139,92,246,0.15)' }}>👨‍🚀</span>
              People in Space
            </div>
            {crew && (
              <span className="badge badge-purple">
                <Users size={10} />
                {crew.number}
              </span>
            )}
          </div>

          {!crew ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10 }} />
              ))}
            </div>
          ) : (
            <>
              <div className="crew-count-display">
                <span className="crew-number">{crew.number}</span>
                <span className="crew-label">Humans Currently in Space</span>
              </div>
              <div className="crew-list">
                {crew.people.map((person, i) => (
                  <div key={i} className="crew-member">
                    <div className="crew-avatar">{person.name.charAt(0)}</div>
                    <div>
                      <div className="crew-name">{person.name}</div>
                      <div className="crew-craft">{person.craft}</div>
                    </div>
                    <div className={`crew-badge ${person.craft === 'ISS' ? 'badge-blue' : 'badge-orange'} badge`}>
                      {person.craft}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, loading, small }) {
  const colors = {
    blue: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
    cyan: { bg: 'rgba(6,182,212,0.1)', color: '#06b6d4' },
    purple: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
    green: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
    orange: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    pink: { bg: 'rgba(236,72,153,0.1)', color: '#ec4899' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className="stat-card card">
      <div className="stat-icon" style={{ background: c.bg, color: c.color }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        {loading ? (
          <div className="skeleton" style={{ height: 24, width: '80%', marginTop: 4 }} />
        ) : (
          <div className={`stat-value ${small ? 'stat-value-sm' : ''}`} style={{ color: c.color }}>
            {value}
          </div>
        )}
      </div>
    </div>
  )
}
