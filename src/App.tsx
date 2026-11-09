import { useState } from 'react'
import { Compass, Crosshair, Layers, LocateFixed, MapPin, Minus, Plus, Search, Settings2 } from 'lucide-react'
import MapCanvas from './map/MapCanvas'

type View = { x: number; y: number; zoom: number }

export default function App() {
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [status, setStatus] = useState('Demo canvas · no geographic data loaded')

  const locate = () => {
    if (!navigator.geolocation) { setStatus('Geolocation is not supported by this browser'); return }
    setStatus('Requesting your location…')
    navigator.geolocation.getCurrentPosition(
      () => { setUserLocation([0, 0]); setStatus('Location permission received · waiting for geographic projection') },
      (error) => setStatus(error.message),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Open Maps home">
          <span className="brand-mark"><Compass size={21} strokeWidth={2.2} /></span>
          <span>open<span className="brand-light">maps</span></span>
          <span className="version">EARLY ACCESS</span>
        </a>
        <div className="search-wrap">
          <Search size={18} />
          <input aria-label="Search map" placeholder="Search places (coming soon)" disabled />
          <kbd>⌘ K</kbd>
        </div>
        <button className="icon-button desktop-only" aria-label="Map settings" title="Map settings"><Settings2 size={19} /></button>
        <button className="profile-button" title="Map layers"><Layers size={18} /><span>Layers</span></button>
      </header>

      <section className="map-stage">
        <MapCanvas view={view} onViewChange={setView} userLocation={userLocation} />
        <div className="map-title">
          <span className="eyebrow">YOUR MAP PLATFORM</span>
          <h1>A new view of the world.</h1>
          <p>Independent mapping infrastructure, built from the ground up.</p>
        </div>
        <div className="map-controls">
          <button aria-label="Zoom in" title="Zoom in" onClick={() => setView(v => ({ ...v, zoom: Math.min(4, v.zoom * 1.2) }))}><Plus size={19} /></button>
          <button aria-label="Zoom out" title="Zoom out" onClick={() => setView(v => ({ ...v, zoom: Math.max(.45, v.zoom / 1.2) }))}><Minus size={19} /></button>
          <span className="control-divider" />
          <button aria-label="My location" title="My location" onClick={locate}><LocateFixed size={19} /></button>
          <button aria-label="Reset map" title="Reset map" onClick={() => { setView({ x: 0, y: 0, zoom: 1 }); setUserLocation(null) }}><Crosshair size={18} /></button>
        </div>
        <div className="map-attribution"><MapPin size={12} /> {status}</div>
        <div className="map-badge">CUSTOM RENDERER <span>•</span> DEMO DATA</div>
      </section>
      <footer className="footer">
        <span>OPEN MAPS <span className="footer-dot">/</span> FOUNDATION 0.1</span>
        <span>Map engine: Canvas 2D · Geographic data pipeline: not connected yet</span>
      </footer>
    </main>
  )
}
