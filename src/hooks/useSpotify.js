/**
 * useSpotify
 *
 * Handles:
 * - Spotify OAuth login / logout
 * - Web Playback SDK initialisation
 * - Playback state (current track, position, is playing)
 * - Play a track by URI
 *
 * Usage:
 *   const {
 *     isLoggedIn, login, logout,
 *     player, deviceId,
 *     currentTrack, isPlaying, position,
 *     playTrack, togglePlay, seekTo,
 *   } = useSpotify()
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  generateAuthUrl,
  getAccessToken,
  isLoggedIn as checkLoggedIn,
  logout as spotifyLogout,
  play,
} from '../services/spotify'

// ── Palette from track popularity + duration ──────────────
// Uses data already available in the track object — no extra API call.
//
// Signals:
//   popularity  0-100  (Spotify metric — how many streams recently)
//   duration_ms        (song length in milliseconds)
//   explicit           (explicit = more likely hiphop/electronic)
//
// Logic based on real genre patterns:
//   Classical / Ambient   → very long (>5min) + low popularity
//   Chill / Indie         → low-mid popularity + medium length
//   Hip-hop               → explicit + mid popularity + short-medium
//   Electronic / Dance    → very short OR very high popularity + short
//   Pop                   → high popularity + medium length

// ── Palette rotation for Spotify mode ────────────────────
// Since Spotify's audio-features API is unavailable for new apps
// and popularity data is unreliable in dev mode, we rotate through
// all 5 palettes ensuring every track looks visually distinct.
// The rotation is seeded by the track ID so the same song always
// gets the same palette — feels intentional, not random.

const PALETTE_ORDER = ['pop', 'chill', 'hiphop', 'electronic', 'classical']

function guesspaletteFromMetadata(track) {
  const trackId    = track.id || track.name || ''
  const explicit   = track.explicit ?? false
  const durationMs = track.duration_ms ?? 210000
  const durationMin = durationMs / 60000

  // Hard overrides for clear signals
  if (explicit && durationMin < 5)  return 'hiphop'
  if (durationMin > 6)              return 'classical'

  // Seed a deterministic index from the track ID
  // Same song → same palette every time
  let seed = 0
  for (let i = 0; i < trackId.length; i++) {
    seed = (seed * 31 + trackId.charCodeAt(i)) % PALETTE_ORDER.length
  }

  const palette = PALETTE_ORDER[Math.abs(seed) % PALETTE_ORDER.length]
  console.log(`Track: ${track.name} → seed: ${seed} → Palette: ${palette}`)
  return palette
}

export function useSpotify(onPaletteChange) {
  const [loggedIn,     setLoggedIn]     = useState(checkLoggedIn())
  const [deviceId,     setDeviceId]     = useState(null)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying,    setIsPlaying]    = useState(false)
  const [position,     setPosition]     = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [sdkReady,     setSdkReady]     = useState(false)
  const [sdkError,     setSdkError]     = useState(null)

  const playerRef   = useRef(null)
  const positionRef = useRef(null)

  // Re-check login state periodically in case token just arrived via callback
  useEffect(() => {
    const interval = setInterval(() => {
      const nowLoggedIn = checkLoggedIn()
      if (nowLoggedIn && !loggedIn) setLoggedIn(true)
    }, 500)
    return () => clearInterval(interval)
  }, [loggedIn])

  // ── Login ─────────────────────────────────────────────────
  const login = useCallback(async () => {
    const url = await generateAuthUrl()
    window.location.href = url
  }, [])

  const logout = useCallback(() => {
    spotifyLogout()
    playerRef.current?.disconnect()
    setLoggedIn(false)
    setCurrentTrack(null)
    setIsPlaying(false)
    setDeviceId(null)
  }, [])

  // ── Load Web Playback SDK ─────────────────────────────────
  useEffect(() => {
    if (!loggedIn) return

    // SDK script already loaded
    if (window.Spotify) { initPlayer(); return }

    const script = document.createElement('script')
    script.src   = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => initPlayer()

    return () => {
      document.body.removeChild(script)
    }
  }, [loggedIn])

  async function initPlayer() {
    const token = await getAccessToken()
    if (!token) return

    const player = new window.Spotify.Player({
      name:          'Woke 🪩',
      getOAuthToken: async cb => {
        const t = await getAccessToken()
        cb(t)
      },
      volume: 0.8,
    })

    // ── SDK Event listeners ───────────────────────────────
    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify SDK ready, device:', device_id)
      setDeviceId(device_id)
      setSdkReady(true)
    })

    player.addListener('not_ready', ({ device_id }) => {
      console.log('Device offline:', device_id)
      setSdkReady(false)
    })

    player.addListener('player_state_changed', async (state) => {
      if (!state) return

      const track = state.track_window.current_track
      setCurrentTrack(track)
      setIsPlaying(!state.paused)
      setPosition(state.position)
      setDuration(state.duration)

      // Palette from track metadata — audio-features API deprecated for new apps
      // Use track/artist name keywords to guess mood
      if (track && onPaletteChange) {
        const palette = guesspaletteFromMetadata(track)
        console.log(`Track: ${track.name} → Palette: ${palette}`)
        onPaletteChange(palette)
      }
    })

    player.addListener('initialization_error', ({ message }) => {
      setSdkError(`Init error: ${message}`)
    })
    player.addListener('authentication_error', ({ message }) => {
      setSdkError(`Auth error: ${message}`)
      logout()
    })
    player.addListener('account_error', ({ message }) => {
      setSdkError(`Account error: ${message} — Premium required`)
    })

    await player.connect()
    playerRef.current = player
  }

  // ── Position ticker ───────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      positionRef.current = setInterval(() => {
        setPosition(p => p + 500)
      }, 500)
    } else {
      clearInterval(positionRef.current)
    }
    return () => clearInterval(positionRef.current)
  }, [isPlaying])

  // ── Playback controls ─────────────────────────────────────
  const playTrack = useCallback(async (uri) => {
    if (!deviceId) return
    try {
      await play(deviceId, [uri])
    } catch (e) {
      console.error('Play error:', e)
    }
  }, [deviceId])

  const togglePlay = useCallback(async () => {
    if (!playerRef.current) return
    await playerRef.current.togglePlay()
  }, [])

  const seekTo = useCallback(async (ms) => {
    if (!playerRef.current) return
    await playerRef.current.seek(ms)
    setPosition(ms)
  }, [])

  const setVolume = useCallback(async (pct) => {
    if (!playerRef.current) return
    await playerRef.current.setVolume(pct / 100)
  }, [])

  const skipNext = useCallback(async () => {
    await playerRef.current?.nextTrack()
  }, [])

  const skipPrev = useCallback(async () => {
    await playerRef.current?.previousTrack()
  }, [])

  return {
    loggedIn,
    login,
    logout,
    sdkReady,
    sdkError,
    deviceId,
    currentTrack,
    isPlaying,
    position,
    duration,
    playTrack,
    togglePlay,
    seekTo,
    setVolume,
    skipNext,
    skipPrev,
  }
}