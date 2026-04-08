/**
 * PlayerHUD
 *
 * The minimal player controls that sit below the disco ball.
 * Keeps the ball as the hero — everything here is secondary.
 *
 * Props:
 *   audioRef     → ref to <audio> element
 *   isPlaying    → bool
 *   trackName    → string
 *   palette      → current palette object (for accent colors)
 *   onFileLoad   → (file) => void
 */

import { useState, useEffect, useRef } from 'react'

function fmt(s) {
  if (isNaN(s) || !s) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function PlayerHUD({
  audioRef, isPlaying, trackName, palette, onFileLoad,
  albumArt, onTogglePlay, onSkipNext, onSkipPrev,
  spotifyPosition, spotifyDuration, onSpotifySeek
}) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [volume,      setVolume]      = useState(80)
  const fileRef = useRef(null)

  const accent      = palette?.accentColor || '#FF2DAF'
  const isSpotify   = !!onTogglePlay
  const displayTime = isSpotify ? spotifyPosition  : currentTime * 1000
  const displayDur  = isSpotify ? spotifyDuration  : duration * 1000
  const progress    = displayDur ? (displayTime / displayDur) * 100 : 0

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => setCurrentTime(el.currentTime)
    const onMeta = () => setDuration(el.duration)
    el.addEventListener('timeupdate',     onTime)
    el.addEventListener('loadedmetadata', onMeta)
    return () => {
      el.removeEventListener('timeupdate',     onTime)
      el.removeEventListener('loadedmetadata', onMeta)
    }
  }, [audioRef])

  const handlePlayPause = () => {
    if (isSpotify) {
      onTogglePlay()
      return
    }
    const el = audioRef.current
    if (!el?.src) { fileRef.current?.click(); return }
    isPlaying ? el.pause() : el.play()
  }

  const handleSeek = (e) => {
    if (isSpotify) {
      const ms = (e.target.value / 100) * displayDur
      onSpotifySeek?.(ms)
      return
    }
    const el = audioRef.current
    if (!el?.duration) return
    el.currentTime = (e.target.value / 100) * el.duration
  }

  const handlePrev = () => {
    if (isSpotify) { onSkipPrev?.(); return }
    const el = audioRef.current
    if (el) el.currentTime = Math.max(0, el.currentTime - 10)
  }

  const handleNext = () => {
    if (isSpotify) { onSkipNext?.(); return }
    const el = audioRef.current
    if (el) el.currentTime = Math.min(el.duration || 0, el.currentTime + 10)
  }

  const handleVolume = (e) => {
    const v = Number(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v / 100
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    onFileLoad(f)
  }

  return (
    <div
      className="w-full flex flex-col gap-4 rounded-3xl p-5"
      style={{
        width:          'clamp(290px, 82vw, 480px)',
        background:     'rgba(10, 4, 26, 0.88)',
        border:         '1.5px solid rgba(245,230,200,0.2)',
        backdropFilter: 'blur(20px)',
        boxShadow:      '0 8px 50px rgba(0,0,0,0.6)',
        marginTop:      '1rem',
      }}
    >
      {/* Track info */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs tracking-widest uppercase" style={{ color: accent, fontSize: '0.55rem', letterSpacing: '0.34em' }}>
          Now Playing
        </span>
        <span
          className="text-center overflow-hidden text-ellipsis whitespace-nowrap max-w-[90%]"
          style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', color: '#F5E6C8', fontSize: 'clamp(0.85rem, 2.2vw, 1.15rem)' }}
        >
          {trackName || 'Upload a song to start ↓'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          tabIndex={-1}
          onClick={handlePrev}
          className="flex items-center justify-center w-11 h-11 rounded-full text-base transition-transform hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(245,230,200,0.18)', color: 'rgba(245,230,200,0.7)' }}
        >⏮</button>

        <button
          tabIndex={-1}
          onClick={handlePlayPause}
          className="flex items-center justify-center w-16 h-16 rounded-full text-2xl text-white transition-transform hover:scale-105 active:scale-95"
          style={{
            background: `linear-gradient(145deg, ${accent}, #FF8C00)`,
            border:     'none',
            boxShadow:  `0 0 0 3px rgba(255,255,255,0.15), 0 6px 24px ${accent}80`,
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          tabIndex={-1}
          onClick={handleNext}
          className="flex items-center justify-center w-11 h-11 rounded-full text-base transition-transform hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(245,230,200,0.18)', color: 'rgba(245,230,200,0.7)' }}
        >⏭</button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: '0.65rem', color: 'rgba(245,230,200,0.45)', minWidth: '2.4rem', textAlign: 'center' }}>
          {fmt(displayTime / 1000)}
        </span>
        <input
          type="range" min={0} max={100} step={0.1}
          value={progress}
          onChange={handleSeek}
          className="flex-1 h-1 rounded cursor-pointer appearance-none"
          style={{
            background: `linear-gradient(to right, ${accent} ${progress}%, rgba(245,230,200,0.15) ${progress}%)`,
          }}
        />
        <span style={{ fontSize: '0.65rem', color: 'rgba(245,230,200,0.45)', minWidth: '2.4rem', textAlign: 'center' }}>
          {fmt(displayDur / 1000)}
        </span>
      </div>

      {/* Upload + Volume */}
      <div className="flex items-center justify-between gap-4">
        <label
          className="cursor-pointer rounded-full px-4 py-2 text-xs transition-all hover:scale-105"
          style={{ border: `1.5px solid ${accent}`, color: accent, fontFamily: '"Space Mono", monospace', fontSize: '0.7rem' }}
        >
          ♪ Upload Song
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={handleFile} />
        </label>

        <div className="flex items-center gap-2">
          <span style={{ color: 'rgba(245,230,200,0.5)', fontSize: '0.8rem' }}>♬</span>
          <input
            type="range" min={0} max={100} value={volume}
            onChange={handleVolume}
            className="w-20 h-1 rounded cursor-pointer appearance-none"
            style={{
              background: `linear-gradient(to right, ${accent} ${volume}%, rgba(245,230,200,0.15) ${volume}%)`,
            }}
          />
        </div>
      </div>
    </div>
  )
}