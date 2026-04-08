/**
 * usePalette
 *
 * Manages the active color palette.
 * When the palette changes it writes CSS custom properties to :root
 * so the entire UI transitions smoothly via CSS transitions.
 *
 * Usage:
 *   const { palette, setPaletteByGenre, setPaletteByKey } = usePalette()
 */

import { useState, useEffect } from 'react'
import { PALETTES, DEFAULT_PALETTE, genreToPalette } from '../components/ball/palettes'

function applyPaletteToDOM(palette) {
  const root = document.documentElement
  palette.bg.forEach((color, i) => {
    root.style.setProperty(`--pal-bg${i + 1}`, color)
  })
  root.style.setProperty('--pal-beam',   palette.beamColor)
  root.style.setProperty('--pal-accent', palette.accentColor)
}

export function usePalette() {
  const [paletteKey, setPaletteKey] = useState(DEFAULT_PALETTE)
  const palette = PALETTES[paletteKey] ?? PALETTES[DEFAULT_PALETTE]

  // Apply to DOM whenever palette changes
  useEffect(() => {
    applyPaletteToDOM(palette)
  }, [palette])

  // Called by useGenreDetect once genre comes back from AudD
  const setPaletteByGenre = (genre) => {
    const key = genreToPalette(genre)
    setPaletteKey(key)
  }

  // Called by manual mood picker (Phase 3)
  const setPaletteByKey = (key) => {
    if (PALETTES[key]) setPaletteKey(key)
  }

  return { palette, paletteKey, setPaletteByGenre, setPaletteByKey }
}