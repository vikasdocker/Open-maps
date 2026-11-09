import { useEffect, useState } from 'react'
import { Compass, Crosshair, Layers, LocateFixed, MapPin, Minus, Plus, Search, Settings2, X } from 'lucide-react'
import MapCanvas from './map/MapCanvas'

type View = { x: number; y: number; zoom: number }
type SearchResult = { id: string; name: string; type: string; lat: number; lon: number }
const API_BASE = (import.meta.env.VITE_MAP_API_URL || '').replace(/\/$/, '')

export default function App() {
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [status, setStatus] = useState('Rahuri pilot · waiting for map API')
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    if (!gpsEnabled) return
    if (!navigator.geolocation) { setStatus('This browser does not support GPS'); setGpsEnabled(false); return }
    setStatus('Starting live GPS tracking…')
    const watchId = navigator.geolocation.watchPosition(
      (next) => {
        setPosition(next)
        setStatus(`Live GPS · ${next.coords.latitude.toFixed(5)}, ${next.coords.longitude.toFixed(5)} · ±${Math.round(next.coords.accuracy)}m`)
      },
      (error) => setStatus(`GPS: ${error.message}`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [gpsEnabled])

  useEffect(() => {
    const query = searchText.trim()
    if (query.length < 2 || !API_BASE) { setSearchResults([]); setSearchError(''); return }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      fetch(`${API_BASE}/api/v1/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(response => { if (!response.ok) throw new Error('Search API unavailable'); return response.json() })
        .then(data => { setSearchResults(data.results || []); setSearchError('') })
        .catch(error => { if (error.name !== 'AbortError') setSearchError('Could not search places. Check API connection.') })
        .finally(() => setSearching(false))
    }, 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [searchText])

  const selectResult = (result: SearchResult) => {
    setSearchText(result.name)
    setSearchResults([])
    setStatus(`Selected ${result.name} · ${result.lat.toFixed(5)}, ${result.lon.toFixed(5)}`)
    setView(v => ({ ...v, zoom: Math.max(v.zoom, 2) }))
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/Open-maps/" aria-label="Open Maps home">
          <span className="brand-mark"><Compass size={21} strokeWidth={2.2} /></span>
          <span>open<span className="brand-light">maps</span></span>
          <span className="version">EARLY ACCESS</span>
        </a>
        <div className="search-wrap">
          <Search size={18} />
          <input aria-label="Search map" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search Rahuri places…" />
          {searchText && <button className="search-clear" aria-label="Clear search" onClick={() => { setSearchText(''); setSearchResults([]) }}><X size={14}/></button>}
          {searching && <span className="search-hint">…</span>}
          {searchResults.length > 0 && <div className="search-results">{searchResults.map(result => <button key={result.id} onClick={() => selectResult(result)}><MapPin size={14}/><span><strong>{result.name}</strong><small>{result.type}</small></span></button>)}</div>}
          {searchError && <div className="search-results search-error">{searchError}</div>}
        </div>
        <button className="icon-button desktop-only" aria-label="Map settings" title="Map settings"><Settings2 size={19} /></button>
        <button className="profile-button" title="Map layers"><Layers size={18} /><span>Layers</span></button>
      </header>

      <section className="map-stage">
        <MapCanvas view={view} onViewChange={setView} />
        <div className="map-title">
          <span className="eyebrow">YOUR MAP PLATFORM</span>
          <h1>A new view of the world.</h1>
          <p>Independent mapping infrastructure, built from the ground up.</p>
        </div>
        <div className="map-controls">
          <button aria-label="Zoom in" title="Zoom in" onClick={() => setView(v => ({ ...v, zoom: Math.min(12, v.zoom * 1.2) }))}><Plus size={19} /></button>
          <button aria-label="Zoom out" title="Zoom out" onClick={() => setView(v => ({ ...v, zoom: Math.max(.45, v.zoom / 1.2) }))}><Minus size={19} /></button>
          <span className="control-divider" />
          <button aria-label={gpsEnabled ? 'Stop live location' : 'Start live location'} title={gpsEnabled ? 'Stop live location' : 'Start live location'} onClick={() => setGpsEnabled(v => !v)}><LocateFixed size={19} color={gpsEnabled ? '#23865b' : undefined}/></button>
          <button aria-label="Reset map" title="Reset map" onClick={() => { setView({ x: 0, y: 0, zoom: 1 }); setStatus('Rahuri pilot · map reset') }}><Crosshair size={18} /></button>
        </div>
        <div className="map-attribution"><MapPin size={12} /> {status}</div>
        <div className="map-badge">CUSTOM RENDERER <span>•</span> RAHURI PILOT</div>
        {position && <div className="gps-pill"><span/>GPS accuracy ±{Math.round(position.coords.accuracy)} m</div>}
      </section>
      <footer className="footer">
        <span>OPEN MAPS <span className="footer-dot">/</span> FOUNDATION 0.2</span>
        <span>Custom Canvas 2D · © OpenStreetMap contributors</span>
      </footer>
    </main>
  )
}
