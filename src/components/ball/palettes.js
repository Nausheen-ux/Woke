/**
 * SISTER — Palette definitions
 * Each palette is triggered by genre detection (Phase 2)
 * or manual override (Phase 3).
 *
 * spinSpeed    → how fast the ball rotates per frame
 * pulseStrength → how hard the ball reacts to a beat (scale multiplier)
 * tiles        → colors used for the mirror tile faces
 * bg           → gradient stops for the page background
 * beamColor    → color of the light rays
 * accentColor  → UI accent (progress bar, upload button border etc.)
 */

export const PALETTES = {
  // ── Detected genres → palette key ──────────────────────
  // 'pop'        → pop
  // 'dance'      → pop
  // 'lo-fi'      → chill
  // 'chill'      → chill
  // 'hip-hop'    → hiphop
  // 'rap'        → hiphop
  // 'electronic' → electronic
  // 'edm'        → electronic
  // 'classical'  → classical
  // 'jazz'       → classical

  pop: {
    name:         'Pop',
    emoji:        '🌸',
    spinSpeed:    0.028,
    pulseStrength:1.2,
    tiles: [
      '#FF1E6E','#FF6B00','#00E5B8',
      '#FFE000','#FF3CAC','#00C8FF',
      '#FFFFFF','#FFFFFF','#FF80CC',
    ],
    bg:           ['#FF2DAF','#FF6EC7','#FFD700','#FF8C00','#87CEEB'],
    beamColor:    '#FFFFFF',
    accentColor:  '#FF2DAF',
  },

  chill: {
    name:         'Chill',
    emoji:        '🌙',
    spinSpeed:    0.010,
    pulseStrength:0.5,
    tiles: [
      '#2D3561','#C05C7E','#F3826F',
      '#FFB178','#8490A8','#6B7FA3',
      '#FFFFFF','#FFFFFF','#D4A5A5',
    ],
    bg:           ['#0F0C29','#302B63','#24243E','#1a1a2e','#16213e'],
    beamColor:    '#FFB178',
    accentColor:  '#C05C7E',
  },

  hiphop: {
    name:         'Hip-Hop',
    emoji:        '🔥',
    spinSpeed:    0.022,
    pulseStrength:1.6,
    tiles: [
      '#FFD700','#C0392B','#E74C3C',
      '#F39C12','#8B0000','#FF6B35',
      '#FFFFFF','#FFFFFF','#FFD700',
    ],
    bg:           ['#1A1A1A','#2C1810','#3D0000','#1A1A1A','#0D0D0D'],
    beamColor:    '#FFD700',
    accentColor:  '#FFD700',
  },

  electronic: {
    name:         'Electronic',
    emoji:        '⚡',
    spinSpeed:    0.038,
    pulseStrength:2.0,
    tiles: [
      '#00FFFF','#7B2FFF','#FF00FF',
      '#00FF88','#0099FF','#FF3366',
      '#FFFFFF','#FFFFFF','#00FFFF',
    ],
    bg:           ['#050510','#0D0D2B','#1A0040','#000D1A','#050510'],
    beamColor:    '#00FFFF',
    accentColor:  '#7B2FFF',
  },

  classical: {
    name:         'Classical',
    emoji:        '🎻',
    spinSpeed:    0.007,
    pulseStrength:0.3,
    tiles: [
      '#F5E6C8','#C9A84C','#8B7355',
      '#D4AF7A','#A0845C','#E8D5A3',
      '#FFFFFF','#FFFFFF','#F5E6C8',
    ],
    bg:           ['#1A1208','#2D1F0A','#0D0B08','#1A1208','#0A0806'],
    beamColor:    '#F5E6C8',
    accentColor:  '#C9A84C',
  },
}

// Default palette on load (before any song is detected)
export const DEFAULT_PALETTE = 'pop'

/**
 * Map a genre string (from AudD API) → palette key
 * Add more mappings as you discover what AudD returns
 */
export function genreToPalette(genre = '') {
  const g = genre.toLowerCase()
  if (g.includes('pop') || g.includes('dance') || g.includes('disco'))  return 'pop'
  if (g.includes('chill') || g.includes('lo-fi') || g.includes('lofi') || g.includes('ambient')) return 'chill'
  if (g.includes('hip') || g.includes('rap') || g.includes('trap') || g.includes('r&b'))  return 'hiphop'
  if (g.includes('electro') || g.includes('edm') || g.includes('techno') || g.includes('house')) return 'electronic'
  if (g.includes('classical') || g.includes('jazz') || g.includes('orchestra') || g.includes('acoustic')) return 'classical'
  return DEFAULT_PALETTE
}