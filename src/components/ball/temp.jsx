/**
 * DiscoBall
 *
 * Props:
 *   palette      → current PALETTES[key] object
 *   bassEnergy   → 0–1 from useAudioEngine (drives pulse)
 *   midEnergy    → 0–1 from useAudioEngine (drives tile flicker)
 *   isBeat       → bool, true on kick drum hit
 *   isPlaying    → bool
 */

import { useRef, useEffect, useCallback } from 'react'

const DPR = Math.min(window.devicePixelRatio || 1, 2)

// ── Helpers ───────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function tintColor(hex, bright) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * bright)},${Math.round(g * bright)},${Math.round(b * bright)})`
}

function buildTiles(sz, palette) {
  const tiles = []
  const ballR = sz / 2
  const ROWS  = 28
  const WHITE = '#FFFFFF'
  const colors = palette.tiles

  for (let row = 0; row < ROWS; row++) {
    const phi1   = Math.PI * row     / ROWS
    const phi2   = Math.PI * (row+1) / ROWS
    const phiMid = (phi1 + phi2) / 2
    const ringR  = Math.sin(phiMid)
    const COLS   = Math.max(1, Math.round(ROWS * 2 * ringR))

    for (let col = 0; col < COLS; col++) {
      const theta = 2 * Math.PI * col / COLS + (row % 2) * Math.PI / COLS
      const nx    = Math.sin(phiMid) * Math.cos(theta)
      const ny    = Math.cos(phiMid)
      const nz    = Math.sin(phiMid) * Math.sin(theta)

      const isWhite = Math.random() < 0.30
      const color   = isWhite
        ? WHITE
        : colors[Math.floor(Math.random() * colors.length)]

      const dPhi     = (phi2 - phi1) * 0.82
      const dTheta   = (2 * Math.PI / COLS) * 0.82
      const tileSize = Math.min(dPhi * ballR, dTheta * ringR * ballR)

      tiles.push({
        nx, ny, nz,
        color,
        tileSize:   Math.max(tileSize, 3),
        phase:      Math.random() * Math.PI * 2,
        flashSpeed: 2 + Math.random() * 5,
        isWhite,
      })
    }
  }
  return { tiles, ballR }
}

// ── Component ─────────────────────────────────────────────
export default function DiscoBall({ palette, bassEnergy, midEnergy, isBeat, isPlaying, features}) {
  const canvasRef   = useRef(null)
  const stateRef    = useRef({
    tiles:     [],
    ballR:     0,
    rotY:      0,
    idleT:     0,
    flashT:    0,
    scale:     1,       // for beat pulse
    targetScale: 1,
    rafId:     null,
  })
  const usingSpotify = !!features

// Fallback simulated values
const fakeBass = useRef(0)
const fakeMid  = useRef(0)
const fakeBeat = useRef(false)

  // ── Build tiles when palette changes ──────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sz = canvas.offsetWidth
    canvas.width  = sz * DPR
    canvas.height = sz * DPR
    const s = stateRef.current
    const { tiles, ballR } = buildTiles(sz, palette)
    s.tiles = tiles
    s.ballR = ballR
  }, [palette])

  // ── Pulse on beat ─────────────────────────────────────────
  // useEffect(() => {
  //   if (isBeat) {
  //     stateRef.current.targetScale = 1 + 0.06 * palette.pulseStrength
  //   }
  // }, [isBeat, palette.pulseStrength])


  useEffect(() => {
  const beat = usingSpotify ? fakeBeat.current : isBeat

  if (beat) {
    stateRef.current.targetScale = 1 + 0.06 * palette.pulseStrength
  }
}, [isBeat, palette.pulseStrength, usingSpotify])


useEffect(() => {
  if (!features || !isPlaying) return

  const { energy, tempo, danceability } = features

  const beatInterval = 60000 / tempo

  const interval = setInterval(() => {
    // Simulate bass pulse
    fakeBass.current = energy

    // Simulate mid flicker
    fakeMid.current = 0.5 + Math.random() * 0.5 * danceability

    // Simulate beat
    fakeBeat.current = true
    setTimeout(() => {
      fakeBeat.current = false
    }, 80)

  }, beatInterval)

  return () => clearInterval(interval)
}, [features, isPlaying])

const effectiveBass = usingSpotify ? fakeBass.current : bassEnergy
const effectiveMid  = usingSpotify ? fakeMid.current  : midEnergy
const effectiveBeat = usingSpotify ? fakeBeat.current : isBeat

  // ── Main draw loop ────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s   = stateRef.current
    const sz  = canvas.offsetWidth
    const cx  = sz / 2
    const cy  = sz / 2
    const R   = s.ballR

    ctx.save()
    ctx.scale(DPR, DPR)
    ctx.clearRect(0, 0, sz, sz)

    // ── Rotation ──
    if (isPlaying) {
      //s.rotY   += palette.spinSpeed
      const spinBoost = usingSpotify ? (features.energy * 0.05) : 0
s.rotY += palette.spinSpeed + spinBoost
      s.flashT += 0.04
    } else {
      s.idleT += 0.012
      s.rotY   = Math.sin(s.idleT) * 0.18
    }

    // ── Beat pulse: spring back to 1 ──
    s.scale += (s.targetScale - s.scale) * 0.25
    s.targetScale += (1 - s.targetScale) * 0.18
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(s.scale, s.scale)
    ctx.translate(-cx, -cy)

    // ── Tiles ──
    const cosY = Math.cos(s.rotY)
    const sinY = Math.sin(s.rotY)

    const visible = s.tiles
      .map(t => {
        const rx =  t.nx * cosY + t.nz * sinY
        const ry =  t.ny
        const rz = -t.nx * sinY + t.nz * cosY
        return { ...t, rx, ry, rz }
      })
      .filter(t => t.rz > -0.18)
      .sort((a, b) => a.rz - b.rz)

    for (const t of visible) {
      const px      = cx + t.rx * R
      const py      = cy - t.ry * R
      const depth   = (t.rz + 1) / 2
      const facing  = Math.max(0, t.rz)
      const apparent = t.tileSize * (0.4 + 0.6 * depth)
      const hs      = apparent / 2

      let drawColor
      if (t.isWhite) {
        // White mirror tiles flash on bass energy
        const flash  = isPlaying
          ? Math.pow(Math.abs(Math.sin(s.flashT * t.flashSpeed + t.phase)), 3)
          : 0.3
       // const bEnergy = isPlaying ? bassEnergy * 0.5 : 0
       const bEnergy = isPlaying ? effectiveBass * 0.5 : 0
        const bright  = Math.min(1, 0.4 + 0.6 * facing + 0.4 * flash + bEnergy)
        const v       = Math.floor(bright * 255)
        drawColor     = `rgb(${v},${v},${v})`
      } else {
        // Coloured tiles flicker on mid energy
        const flicker = isPlaying
          ? 0.7 + 0.3 * Math.abs(Math.sin(s.flashT * t.flashSpeed * 0.5 + t.phase))
          //  + midEnergy * 0.3
          + effectiveMid * 0.3
          : 0.7
        const bright  = Math.min(1, (0.3 + 0.7 * facing) * flicker)
        drawColor     = tintColor(t.color, bright)
      }

      ctx.save()
      ctx.translate(px, py)
      ctx.fillStyle = drawColor

      if (t.isWhite && isPlaying && facing > 0.5) {
        ctx.shadowColor = '#ffffff'
        ctx.shadowBlur  = apparent * 1.4
      } else if (isPlaying && facing > 0.6) {
        ctx.shadowColor = t.color
        ctx.shadowBlur  = apparent * 0.8
      }

      roundRect(ctx, -hs, -hs, apparent * 0.88, apparent * 0.88, apparent * 0.15)
      ctx.fill()
      ctx.restore()
    }

    ctx.restore() // scale pop

    // ── Depth overlay ──
    const grad = ctx.createRadialGradient(cx - R*0.28, cy - R*0.28, R*0.05, cx, cy, R)
    grad.addColorStop(0,    'rgba(255,255,255,0)')
    grad.addColorStop(0.5,  'rgba(0,0,0,0)')
    grad.addColorStop(0.82, 'rgba(0,0,0,0.25)')
    grad.addColorStop(1,    'rgba(0,0,0,0.65)')
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()

    // ── Specular highlight ──
    const spec = ctx.createRadialGradient(cx-R*0.3, cy-R*0.3, 0, cx-R*0.3, cy-R*0.3, R*0.55)
    spec.addColorStop(0,   'rgba(255,255,255,0.22)')
    spec.addColorStop(0.4, 'rgba(255,255,255,0.06)')
    spec.addColorStop(1,   'rgba(255,255,255,0)')
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fillStyle = spec
    ctx.fill()
    ctx.restore()

    ctx.restore() // DPR scale

    s.rafId = requestAnimationFrame(draw)
  }, [palette, isPlaying, bassEnergy, midEnergy])

  // ── Start / stop loop ─────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current
    if (s.rafId) cancelAnimationFrame(s.rafId)
    s.rafId = requestAnimationFrame(draw)
    return () => { if (s.rafId) cancelAnimationFrame(s.rafId) }
  }, [draw])

  // ── Resize ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const sz = canvas.offsetWidth
      canvas.width  = sz * DPR
      canvas.height = sz * DPR
      const { tiles, ballR } = buildTiles(sz, palette)
      stateRef.current.tiles = tiles
      stateRef.current.ballR = ballR
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [palette])

  return (
    <canvas
      ref={canvasRef}
      className="block rounded-full cursor-pointer"
      style={{
        width:  'clamp(240px, 42vw, 420px)',
        height: 'clamp(240px, 42vw, 420px)',
        filter: 'drop-shadow(0 0 40px rgba(255,100,200,0.35)) drop-shadow(0 20px 60px rgba(0,0,0,0.8))',
      }}
    />
  )
}