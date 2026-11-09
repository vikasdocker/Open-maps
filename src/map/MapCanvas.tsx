import { useEffect, useRef } from 'react'
import { demoFeatures } from './demoData'

type View = { x: number; y: number; zoom: number }
type Props = { view: View; onViewChange: (view: View) => void; userLocation: [number, number] | null }

export default function MapCanvas({ view, onViewChange, userLocation }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, rect.width, rect.height)
    context.fillStyle = '#f2f5ef'
    context.fillRect(0, 0, rect.width, rect.height)

    const centerX = rect.width / 2 + view.x
    const centerY = rect.height / 2 + view.y
    const scale = view.zoom
    const project = ([x, y]: [number, number]): [number, number] => [centerX + x * scale, centerY + y * scale]

    context.save()
    context.strokeStyle = 'rgba(105, 130, 116, 0.10)'
    context.lineWidth = 1
    const grid = 64 * scale
    if (grid > 18) {
      const startX = ((centerX % grid) + grid) % grid
      const startY = ((centerY % grid) + grid) % grid
      for (let x = startX; x < rect.width; x += grid) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, rect.height); context.stroke() }
      for (let y = startY; y < rect.height; y += grid) { context.beginPath(); context.moveTo(0, y); context.lineTo(rect.width, y); context.stroke() }
    }

    for (const feature of demoFeatures) {
      const points = feature.coordinates.map(project)
      if (feature.type === 'park') {
        context.beginPath()
        points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y))
        context.closePath()
        context.fillStyle = '#dcebd8'
        context.fill()
        context.strokeStyle = '#c7ddc2'
        context.lineWidth = 1
        context.stroke()
      } else if (feature.type === 'water') {
        context.beginPath()
        points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y))
        context.strokeStyle = '#b7dce8'
        context.lineWidth = 24 * scale
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.stroke()
        context.strokeStyle = '#cce9f0'
        context.lineWidth = 15 * scale
        context.stroke()
      } else {
        context.beginPath()
        points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y))
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.strokeStyle = '#ffffff'
        context.lineWidth = (feature.className === 'primary' ? 10 : feature.className === 'secondary' ? 7 : 4) * scale
        context.stroke()
        context.strokeStyle = feature.className === 'primary' ? '#f2bd76' : '#ffffff'
        context.lineWidth = (feature.className === 'primary' ? 5 : feature.className === 'secondary' ? 3 : 1.8) * scale
        context.stroke()
      }
    }

    if (userLocation) {
      const [x, y] = project(userLocation)
      context.beginPath()
      context.arc(x, y, 14, 0, Math.PI * 2)
      context.fillStyle = 'rgba(46, 125, 245, .16)'
      context.fill()
      context.beginPath()
      context.arc(x, y, 6, 0, Math.PI * 2)
      context.fillStyle = '#2878e8'
      context.strokeStyle = '#fff'
      context.lineWidth = 3
      context.fill()
      context.stroke()
    }
    context.restore()
  }, [view, userLocation])

  const onWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const factor = event.deltaY < 0 ? 1.12 : 0.89
    onViewChange({ ...view, zoom: Math.min(4, Math.max(0.45, view.zoom * factor)) })
  }
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y }
  }
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (drag) onViewChange({ ...view, x: drag.viewX + event.clientX - drag.x, y: drag.viewY + event.clientY - drag.y })
  }
  const stopDrag = () => { dragRef.current = null }

  return <canvas ref={canvasRef} className="map-canvas" aria-label="Interactive custom map canvas" onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} />
}
