/**
 * useAudioAnalysis — v4
 * Fixed frequency band mapping based on actual FFT bin math.
 *
 * FFT size 256 → frequencyBinCount = 128 bins
 * Sample rate typically 44100hz
 * Bin width = sampleRate / fftSize = 44100 / 256 = ~172hz per bin
 *
 * So:
 * bin 0    = 0hz      (DC, skip)
 * bin 1    = 172hz
 * bin 2    = 344hz
 * bin 3    = 516hz
 * bin 4    = 688hz
 * bin 5    = 860hz
 * bin 10   = 1720hz
 * bin 20   = 3440hz
 * bin 40   = 6880hz
 * bin 60   = 10320hz
 * bin 80   = 13760hz
 * bin 127  = ~21800hz
 *
 * Musical bass (60-250hz) = bins 0-1 ONLY at this resolution!
 * That's why bassRatio is always huge — we were reading 0-688hz as "bass"
 * which includes vocals and instruments.
 *
 * Correct musical bands for 128 bins @ 44100hz:
 * Sub bass   60-120hz  → bin 0-1
 * Bass       120-250hz → bin 1
 * Low mid    250-500hz → bin 1-3
 * Mid        500-2000hz→ bin 3-12
 * High mid   2-6khz    → bin 12-35
 * Highs      6-20khz   → bin 35-116
 */

import { useState, useRef, useCallback, useEffect } from 'react'

const ANALYSIS_WINDOW = 8000

// Helper: average bins lo..hi in array
function bandAvg(arr, lo, hi) {
  const end = Math.min(hi, arr.length)
  if (lo >= end) return 0
  let sum = 0
  for (let i = lo; i < end; i++) sum += arr[i]
  return sum / (end - lo)
}

export function useAudioAnalysis() {
  const state = useRef({
    samples: [],
    beats:   [],
    timer:   null,
    running: false,
    songId:  0,
  })

  const [analysisResult, setAnalysisResult] = useState(null)
  const [isAnalysing,    setIsAnalysing]    = useState(false)

  const recordSample = useCallback((freqData) => {
    if (!state.current.running) return
    state.current.samples.push(Array.from(freqData))
    if (state.current.samples.length > 500) state.current.samples.shift()
  }, [])

  const recordBeat = useCallback((timestamp) => {
    if (!state.current.running) return
    state.current.beats.push(timestamp)
    if (state.current.beats.length > 20) state.current.beats.shift()
  }, [])

  const runAnalysis = useCallback(() => {
    const { samples, beats } = state.current
    state.current.running = false
    setIsAnalysing(false)

    console.log(`Analysing ${samples.length} samples, ${beats.length} beats`)

    if (samples.length < 5) {
      state.current.songId++
      setAnalysisResult({ palette: 'pop', id: state.current.songId })
      return
    }

    const binCount = samples[0].length // should be 128

    // Average spectrum across all samples — values 0-255
    const avg = new Array(binCount).fill(0)
    for (const s of samples) {
      for (let i = 0; i < binCount; i++) avg[i] += s[i]
    }
    for (let i = 0; i < binCount; i++) avg[i] /= (samples.length * 255) // normalise 0-1

    // Log the raw spectrum so we can see what we're working with
    console.log('Spectrum sample (bins 0-20):', avg.slice(0, 20).map(v => Math.round(v * 100) / 100))

    // ── Correct musical frequency bands ──
    // At 44100hz sample rate, FFT 256 → bin width ~172hz
    // Bass = 60-250hz = roughly bins 0-2
    // Low mids = 250-500hz = bins 2-3
    // Mids = 500-2000hz = bins 3-12
    // High mids = 2-6khz = bins 12-35
    // Highs = 6khz+ = bins 35-100

    const bassEnergy    = bandAvg(avg, 0,  3)   // 0-516hz (true bass)
    const lowMidEnergy  = bandAvg(avg, 3,  12)  // 516-2064hz
    const midEnergy     = bandAvg(avg, 12, 35)  // 2-6khz
    const highEnergy    = bandAvg(avg, 35, 100) // 6-17khz

    const totalEnergy   = bandAvg(avg, 0, 100)

    // Ratio of bass vs highs — key differentiator
    const bassVsHigh    = bassEnergy / Math.max(highEnergy, 0.001)

    // Dynamic range — variance in loudness over time
    const energyPerFrame = samples.map(s =>
      s.slice(0, 60).reduce((a, b) => a + b, 0) / (60 * 255)
    )
    const mean     = energyPerFrame.reduce((a,b) => a+b, 0) / energyPerFrame.length
    const variance = energyPerFrame.reduce((a,b) => a + Math.pow(b-mean, 2), 0) / energyPerFrame.length
    const dynamicRange = Math.sqrt(variance)

    // BPM from beat intervals — use median to ignore outliers
    let bpm = 120
    if (beats.length >= 4) {
      const intervals = []
      for (let i = 1; i < beats.length; i++) {
        const gap = beats[i] - beats[i-1]
        // Only count intervals between 300ms (200bpm) and 1500ms (40bpm)
        if (gap >= 300 && gap <= 1500) intervals.push(gap)
      }
      if (intervals.length >= 2) {
        // Use median interval — more robust than mean
        intervals.sort((a,b) => a - b)
        const median = intervals[Math.floor(intervals.length / 2)]
        bpm = Math.round(60000 / median)
        bpm = Math.max(50, Math.min(180, bpm))
      }
    }

    console.log(`BPM: ${bpm} from ${beats.length} beats`)

    console.log('Audio analysis:', {
      bassEnergy:   Math.round(bassEnergy   * 1000) / 1000,
      lowMidEnergy: Math.round(lowMidEnergy * 1000) / 1000,
      midEnergy:    Math.round(midEnergy    * 1000) / 1000,
      highEnergy:   Math.round(highEnergy   * 1000) / 1000,
      totalEnergy:  Math.round(totalEnergy  * 1000) / 1000,
      bassVsHigh:   Math.round(bassVsHigh   * 1000) / 1000,
      dynamicRange: Math.round(dynamicRange * 1000) / 1000,
      bpm,
    })

    // ── Palette decision ──
    // BPM detection is unreliable via bass spikes — using dynamicRange only
    // Real measured dynamicRange values:
    // No One Notices (The Marias, dream pop) → 0.108-0.121
    // Stateside (Zara Larsson, pop)          → ~0.116
    // Moonlight Sonata (classical)           → likely > 0.13
    //
    // midEnergy vs highEnergy ratio is more stable than bass
    // highEnergy is consistently low (0.03-0.16) and varies by genre

    let palette

    if (highEnergy < 0.06 && dynamicRange > 0.10) {
      // Very dark (no highs) + dynamic = Classical / ambient
      palette = 'classical'

    } else if (dynamicRange > 0.10 && highEnergy < 0.15) {
      // Dynamic + not much high freq = Chill / dream pop
      palette = 'chill'

    } else if (dynamicRange < 0.06) {
      // Very compressed = Electronic / EDM
      palette = 'electronic'

    } else if (dynamicRange < 0.08 && highEnergy < 0.10) {
      // Compressed + dark = Hip-hop
      palette = 'hiphop'

    } else {
      // Everything else = Pop
      palette = 'pop'
    }

    console.log('→ Palette decision:', palette)
    state.current.songId++
    setAnalysisResult({ palette, id: state.current.songId })
  }, [])

  const startAnalysis = useCallback(() => {
    if (state.current.timer) clearTimeout(state.current.timer)
    state.current.samples = []
    state.current.beats   = []
    state.current.running = true
    setIsAnalysing(true)
    console.log('Analysis started...')
    state.current.timer = setTimeout(runAnalysis, ANALYSIS_WINDOW)
  }, [runAnalysis])

  const stopAnalysis = useCallback(() => {
    if (state.current.timer) clearTimeout(state.current.timer)
    state.current.running = false
    setIsAnalysing(false)
  }, [])

  useEffect(() => () => stopAnalysis(), [])

  return { analysisResult, isAnalysing, startAnalysis, stopAnalysis, recordBeat, recordSample }
}