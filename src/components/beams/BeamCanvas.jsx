/**
 * BeamCanvas
 *
 * Renders fixed white light rays across the full page,
 * originating from the disco ball's center.
 * Redraws only when isPlaying or palette changes.
 *
 * Props:
 *   ballRef   → ref attached to the ball's <canvas> element
 *   isPlaying → bool
 *   palette   → current palette object (for beamColor)
 */

import { useRef, useEffect } from 'react'

const ANGLES_DEG = [0, 22, 45, 68, 90, 112, 135, 158, 180, 202, 225, 248, 270, 292, 315, 338]
const WIDTHS     = [3, 1, 2.5, 1, 3.5, 1, 2, 1, 3, 1, 2.5, 1, 3.5, 1, 2, 1]

export default function BeamCanvas({ ballRef, isPlaying, palette }) {
  const canvasRef = useRef(null)

  function draw() {
    const canvas = canvasRef.current
    const ball   = ballRef.current
    if (!canvas || !ball) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const W  = canvas.width
    const H  = canvas.height
    const bx = canvas.getContext('2d')

    if (!isPlaying) {
      bx.clearRect(0, 0, W, H)
      return
    }

    const rect = ball.getBoundingClientRect()
    const ox   = rect.left + rect.width  / 2
    const oy   = rect.top  + rect.height / 2
    const diag = Math.hypot(W, H)
    const beam = palette.beamColor || '#FFFFFF'

    bx.clearRect(0, 0, W, H)

    ANGLES_DEG.forEach((deg, i) => {
      const rad = deg * Math.PI / 180
      const ex  = ox + Math.cos(rad) * diag
      const ey  = oy + Math.sin(rad) * diag
      const w   = WIDTHS[i]

      const g = bx.createLinearGradient(ox, oy, ex, ey)
      g.addColorStop(0,    hexToRgba(beam, 0.95))
      g.addColorStop(0.05, hexToRgba(beam, 0.80))
      g.addColorStop(0.25, hexToRgba(beam, 0.35))
      g.addColorStop(0.6,  hexToRgba(beam, 0.10))
      g.addColorStop(1,    hexToRgba(beam, 0))

      // Glow pass
      bx.save()
      bx.beginPath()
      bx.moveTo(ox, oy)
      bx.lineTo(ex, ey)
      bx.strokeStyle = g
      bx.lineWidth   = w * 10
      bx.globalAlpha = 0.12
      bx.lineCap     = 'round'
      bx.shadowColor = beam
      bx.shadowBlur  = 30
      bx.stroke()
      bx.restore()

      // Core
      bx.save()
      bx.beginPath()
      bx.moveTo(ox, oy)
      bx.lineTo(ex, ey)
      bx.strokeStyle = g
      bx.lineWidth   = w
      bx.globalAlpha = 1
      bx.lineCap     = 'round'
      bx.shadowColor = beam
      bx.shadowBlur  = 12
      bx.stroke()
      bx.restore()
    })
  }

  useEffect(() => { draw() }, [isPlaying, palette])

  useEffect(() => {
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isPlaying, palette])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 3, width: '100%', height: '100%' }}
    />
  )
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}