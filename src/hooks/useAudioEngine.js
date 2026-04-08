/**
 * useAudioEngine
 *
 * Wires an <audio> element into the Web Audio API analyser.
 * Returns real-time data every animation frame:
 *
 *   bassEnergy   → 0–1  average energy in the bass band (20–200hz)
 *   midEnergy    → 0–1  mids (200–2000hz) — for tile flicker
 *   isBeat       → bool true on the frame a kick drum is detected
 *   isPlaying    → bool
 *
 * Also accepts optional callbacks:
 *   onBeat(timestamp)   → called on every beat (for BPM tracking)
 *   onSample(freqData)  → called every frame with raw frequency array
 *
 * Usage:
 *   const audioRef = useRef(null)
 *   const { bassEnergy, isBeat } = useAudioEngine(audioRef, { onBeat, onSample })
 */

import { useRef, useState, useEffect, useCallback } from 'react'

const FFT_SIZE       = 256
const BASS_MAX_BIN   = 10
const BEAT_THRESHOLD = 0.50  // sensitive enough to catch beats
const BEAT_COOLDOWN  = 333   // ms — minimum gap = 333ms = max 180 BPM physically possible

export function useAudioEngine(audioRef, callbacks = {}) {
  const { onBeat, onSample } = callbacks

  // Store callbacks in refs so tick never needs to re-create
  const onBeatRef   = useRef(onBeat)
  const onSampleRef = useRef(onSample)
  useEffect(() => { onBeatRef.current   = onBeat   }, [onBeat])
  useEffect(() => { onSampleRef.current = onSample }, [onSample])

  const contextRef  = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef   = useRef(null)
  const rafRef      = useRef(null)
  const lastBeatRef = useRef(0)

  const [bassEnergy, setBassEnergy] = useState(0)
  const [midEnergy,  setMidEnergy]  = useState(0)
  const [isBeat,     setIsBeat]     = useState(false)
  const [isPlaying,  setIsPlaying]  = useState(false)

  const init = useCallback(() => {
    if (contextRef.current) return
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext || !audioRef.current) return

    const ctx      = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize               = FFT_SIZE
    analyser.smoothingTimeConstant = 0.75

    const source = ctx.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(ctx.destination)

    contextRef.current  = ctx
    analyserRef.current = analyser
    sourceRef.current   = source
  }, [audioRef])

  const tick = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const bins = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(bins)

    // Feed raw data to analysis hook every frame via ref
    if (onSampleRef.current) onSampleRef.current(bins)

    // Bass energy
    let bassSum = 0
    for (let i = 0; i < BASS_MAX_BIN; i++) bassSum += bins[i]
    const bass = bassSum / (BASS_MAX_BIN * 255)

    // Mid energy
    let midSum = 0
    for (let i = BASS_MAX_BIN; i < 60; i++) midSum += bins[i]
    const mid = midSum / ((60 - BASS_MAX_BIN) * 255)

    setBassEnergy(bass)
    setMidEnergy(mid)

    // Beat detection
    const now = performance.now()
    if (bass > BEAT_THRESHOLD && now - lastBeatRef.current > BEAT_COOLDOWN) {
      lastBeatRef.current = now
      setIsBeat(true)
      if (onBeatRef.current) onBeatRef.current(now)
      setTimeout(() => setIsBeat(false), 60)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, []) // no dependencies — uses refs only

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onPlay = () => {
      init()
      contextRef.current?.resume()
      setIsPlaying(true)
      rafRef.current = requestAnimationFrame(tick)
    }
    const onPause = () => {
      setIsPlaying(false)
      setBassEnergy(0)
      setMidEnergy(0)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    const onEnded = () => onPause()

    el.addEventListener('play',  onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)

    return () => {
      el.removeEventListener('play',  onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [audioRef, init, tick])

  return { bassEnergy, midEnergy, isBeat, isPlaying }
}