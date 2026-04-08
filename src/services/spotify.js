/**
 * spotify.js — Spotify Web API + Web Playback SDK service
 *
 * Uses PKCE (Proof Key for Code Exchange) auth flow — most secure,
 * no client secret needed, works entirely in the browser.
 *
 * Flow:
 * 1. generateAuthUrl()     → redirect user to Spotify login
 * 2. handleCallback()      → exchange code for access token
 * 3. getAccessToken()      → get stored token for API calls
 * 4. refreshToken()        → refresh when expired
 */

const CLIENT_ID    = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI
const SCOPES = [
  'streaming',                    // Web Playback SDK
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ')

const STORAGE_KEYS = {
  accessToken:  'woke_access_token',
  refreshToken: 'woke_refresh_token',
  expiresAt:    'woke_expires_at',
  codeVerifier: 'woke_code_verifier',
}

// Use sessionStorage for verifier — survives redirect within same tab
const setVerifier  = (v) => sessionStorage.setItem(STORAGE_KEYS.codeVerifier, v)
const getVerifier  = ()  => sessionStorage.getItem(STORAGE_KEYS.codeVerifier)
const clearVerifier = () => sessionStorage.removeItem(STORAGE_KEYS.codeVerifier)

// ── PKCE helpers ─────────────────────────────────────────
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr   = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => chars[b % chars.length]).join('')
}

async function sha256(plain) {
  const encoded = new TextEncoder().encode(plain)
  const digest  = await crypto.subtle.digest('SHA-256', encoded)
  return digest
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ── Auth ─────────────────────────────────────────────────
export async function generateAuthUrl() {
  const verifier  = generateRandomString(64)
  const challenge = base64UrlEncode(await sha256(verifier))

  setVerifier(verifier)

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    response_type:         'code',
    redirect_uri:          REDIRECT_URI,
    scope:                 SCOPES,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  })

  return `https://accounts.spotify.com/authorize?${params}`
}

export async function handleCallback(code) {
  const verifier = getVerifier()
  if (!verifier) throw new Error('No code verifier found')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      code_verifier: verifier,
    }),
  })

  if (!res.ok) throw new Error('Failed to exchange token')

  const data = await res.json()
  storeTokens(data)
  clearVerifier()
  return data
}

export async function refreshAccessToken() {
  const token = localStorage.getItem(STORAGE_KEYS.refreshToken)
  if (!token) return null

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      grant_type:    'refresh_token',
      refresh_token: token,
    }),
  })

  if (!res.ok) { logout(); return null }

  const data = await res.json()
  storeTokens(data)
  return data.access_token
}

function storeTokens(data) {
  localStorage.setItem(STORAGE_KEYS.accessToken,  data.access_token)
  localStorage.setItem(STORAGE_KEYS.expiresAt,     Date.now() + data.expires_in * 1000)
  if (data.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token)
  }
}

export async function getAccessToken() {
  const token     = localStorage.getItem(STORAGE_KEYS.accessToken)
  const expiresAt = localStorage.getItem(STORAGE_KEYS.expiresAt)

  if (!token) return null

  // Refresh if expiring within 5 minutes
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    return await refreshAccessToken()
  }

  return token
}

export function isLoggedIn() {
  return !!localStorage.getItem(STORAGE_KEYS.accessToken)
}

export function logout() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k))
}

// ── API calls ─────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = await getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (!newToken) throw new Error('Session expired')
    return apiFetch(endpoint, options) // retry once
  }

  if (res.status === 204) return null
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
  return res.json()
}

// ── User ──────────────────────────────────────────────────
export const getMe = () => apiFetch('/me')

// ── Playlists ─────────────────────────────────────────────
export const getPlaylists = (limit = 20) =>
  apiFetch(`/me/playlists?limit=${limit}`)

export const getPlaylistTracks = (playlistId, limit = 50) =>
  apiFetch(`/playlists/${playlistId}/tracks?limit=${limit}`)

export const getLikedSongs = (limit = 50) =>
  apiFetch(`/me/tracks?limit=${limit}`)

// ── Audio features (for palette detection) ───────────────
export const getAudioFeatures = (trackId) =>
  apiFetch(`/audio-features/${trackId}`)

/**
 * Map Spotify audio features to palette key
 * energy:    0-1 (high = loud/fast)
 * valence:   0-1 (high = happy/positive)
 * danceability: 0-1
 * acousticness: 0-1 (high = acoustic/classical)
 * tempo:     BPM
 */
export function featuresToPalette(features) {
  if (!features) return 'pop'

  const { energy, valence, acousticness, danceability, tempo } = features

  console.log('Spotify audio features:', {
    energy:        Math.round(energy        * 100) / 100,
    valence:       Math.round(valence       * 100) / 100,
    acousticness:  Math.round(acousticness  * 100) / 100,
    danceability:  Math.round(danceability  * 100) / 100,
    tempo:         Math.round(tempo),
  })

  if (acousticness > 0.7 && energy < 0.4)      return 'classical'
  if (energy < 0.4 && valence < 0.4)           return 'chill'
  if (energy > 0.7 && danceability > 0.7)      return 'electronic'
  if (energy > 0.6 && valence < 0.5)           return 'hiphop'
  if (valence > 0.6 && energy > 0.5)           return 'pop'
  return 'chill'
}

// ── Playback ──────────────────────────────────────────────
export const play = (deviceId, uris) =>
  apiFetch(`/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ uris }),
  })

export const pause = () =>
  apiFetch('/me/player/pause', { method: 'PUT' })

export const seek = (ms) =>
  apiFetch(`/me/player/seek?position_ms=${ms}`, { method: 'PUT' })

export const setVolume = (pct) =>
  apiFetch(`/me/player/volume?volume_percent=${pct}`, { method: 'PUT' })