import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import { demoFeatures } from './demoData'

type View = { x: number; y: number; zoom: number }
type Geometry = { type: string; coordinates: any }
type Feature = { type: 'Feature'; id?: string | number; properties?: Record<string, unknown>; geometry: Geometry | null }
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] }
type Props = { view: View; onViewChange: (view: View) => void; routeFeature?: Feature | null }

const PILOT_BBOX = { west: 74.55, south: 19.30, east: 74.78, north: 19.48 }
const API_BASE = (import.meta.env.VITE_MAP_API_URL || '').replace(/\/$/, '')

function mercator(lon: number, lat: number): [number, number] {
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const x = (lon + 180) / 360
  const sin = Math.sin(safeLat * Math.PI / 180)
  const y = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)
  return [x, y]
}

function pathsFor(geometry: Geometry): number[][][] {
  const c = geometry.coordinates
  if (geometry.type === 'Point') return [[c]]
  if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') return [c]
  if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') return c
  if (geometry.type === 'MultiPolygon') return c.flat()
  return []
}

function paintFeature(ctx: CanvasRenderingContext2D, feature: Feature, project: (point: number[]) => [number, number], scale: number) {
  if (!feature.geometry) return
  const kind = String(feature.properties?.class || feature.properties?.highway || feature.properties?.natural || '')
  const geometry = feature.geometry
  const isPolygon = geometry.type === 'Polygon' || geometry.type === 'MultiPolygon'
  const isPoint = geometry.type === 'Point' || geometry.type === 'MultiPoint'
  const color = kind === 'water' || kind === 'waterway' || kind === 'river' ? '#b8dce8'
    : kind === 'building' ? '#d8d8cf'
    : kind === 'park' || kind === 'grass' || kind === 'forest' ? '#dcebd8'
    : '#f0bd79'
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const path of pathsFor(geometry)) {
    if (!path.length) continue
    const points = path.map(project)
    ctx.beginPath()
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
    if (isPolygon) {
      ctx.closePath()
      ctx.fillStyle = color
      ctx.globalAlpha = kind === 'building' ? .8 : .72
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = kind === 'building' ? '#c9c9bf' : '#c7ddc2'
      ctx.lineWidth = Math.max(.5, .7 * scale)
      ctx.stroke()
    } else if (isPoint) {
      const [x, y] = points[0]
      ctx.beginPath()
      ctx.arc(x, y, 2.5 * Math.min(1.5, scale), 0, Math.PI * 2)
      ctx.fillStyle = '#55766a'
      ctx.fill()
    } else {
      const isMajor = ['motorway', 'trunk', 'primary', 'secondary'].includes(kind)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = (isMajor ? 5 : 2.6) * Math.min(1.6, scale)
      ctx.stroke()
      ctx.strokeStyle = isMajor ? color : '#ffffff'
      ctx.lineWidth = (isMajor ? 2.5 : 1.1) * Math.min(1.6, scale)
      ctx.stroke()
    }
  }
  ctx.restore()
}

export default function MapCanvas({ view, onViewChange, routeFeature = null }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null)
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null)
  const [dataStatus, setDataStatus] = useState<'loading' | 'ready' | 'offline'>('loading')

  useEffect(() => {
    if (!API_BASE) { setDataStatus('offline'); return }
    const controller = new AbortController()
    const bbox = [PILOT_BBOX.west, PILOT_BBOX.south, PILOT_BBOX.east, PILOT_BBOX.north].join(',')
    fetch(`${API_BASE}/api/v1/features?bbox=${bbox}&layers=roads,water,buildings,places,landuse`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`Map API returned ${response.status}`); return response.json() })
      .then((data: FeatureCollection) => {
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Invalid GeoJSON FeatureCollection')
        setGeoData(data)
        setDataStatus('ready')
      })
      .catch(error => { if (error.name !== 'AbortError') setDataStatus('offline') })
    return () => controller.abort()
  }, [])

  const geographicFeatures = useMemo(() => geoData?.features ?? [], [geoData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.fillStyle = '#f2f5ef'
      context.fillRect(0, 0, rect.width, rect.height)
      const centerX = rect.width / 2 + view.x
      const centerY = rect.height / 2 + view.y
      const worldA = mercator(PILOT_BBOX.west, PILOT_BBOX.north)
      const worldB = mercator(PILOT_BBOX.east, PILOT_BBOX.south)
      const fit = Math.min(rect.width / (worldB[0] - worldA[0]), rect.height / (worldB[1] - worldA[1])) * .88
      const baseScale = fit * view.zoom
      const project = (point: number[]): [number, number] => {
        const p = mercator(point[0], point[1])
        return [centerX + (p[0] - (worldA[0] + worldB[0]) / 2) * baseScale, centerY + (p[1] - (worldA[1] + worldB[1]) / 2) * baseScale]
      }

      context.save()
      context.strokeStyle = 'rgba(105, 130, 116, 0.10)'
      context.lineWidth = 1
      const grid = 64
      for (let x = ((centerX % grid) + grid) % grid; x < rect.width; x += grid) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, rect.height); context.stroke() }
      for (let y = ((centerY % grid) + grid) % grid; y < rect.height; y += grid) { context.beginPath(); context.moveTo(0, y); context.lineTo(rect.width, y); context.stroke() }

      if (geoData) {
        const order = ['water', 'landuse', 'park', 'building', 'road', 'highway', 'place', 'poi']
        const sorted = [...geographicFeatures].sort((a, b) => order.indexOf(String(a.properties?.class)) - order.indexOf(String(b.properties?.class)))
        sorted.forEach(feature => paintFeature(context, feature, project, view.zoom))
      } else {
        // Clearly labelled illustrative fallback while the private API is not connected.
        const cx = rect.width / 2, cy = rect.height / 2
        const s = Math.min(rect.width, rect.height) / 520 * view.zoom
        context.translate(cx + view.x, cy + view.y)
        context.scale(s, s)
        for (const feature of demoFeatures) {
          const points = feature.coordinates
          context.beginPath()
          points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y))
          if (feature.type === 'park') { context.closePath(); context.fillStyle = '#dcebd8'; context.fill() }
          else { context.strokeStyle = feature.type === 'water' ? '#b8dce8' : '#fff'; context.lineWidth = feature.type === 'water' ? 18 : 5; context.stroke() }
        }
      }
      if (routeFeature?.geometry?.type === 'LineString') {
        const routePoints = (routeFeature.geometry.coordinates as number[][]).map(project)
        context.beginPath()
        routePoints.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y))
        context.strokeStyle = '#ffffff'
        context.lineWidth = 9
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.stroke()
        context.strokeStyle = '#277f62'
        context.lineWidth = 5
        context.stroke()
      }
      context.restore()
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [view, geoData, geographicFeatures, routeFeature])

  const onWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const factor = event.deltaY < 0 ? 1.12 : 0.89
    onViewChange({ ...view, zoom: Math.min(12, Math.max(.45, view.zoom * factor)) })
  }
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y }
  }
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (drag) onViewChange({ ...view, x: drag.viewX + event.clientX - drag.x, y: drag.viewY + event.clientY - drag.y })
  }
  const stopDrag = () => { dragRef.current = null }

  return <canvas ref={canvasRef} className="map-canvas" aria-label="Interactive Open Maps geographic canvas" data-map-data={dataStatus} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} />
}
