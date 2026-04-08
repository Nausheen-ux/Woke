/**
 * Player — the main stage
 *
 * Wires together:
 *   DiscoBall      ← renders the ball, reacts to audio data
 *   PlayerHUD      ← play/pause, progress, upload
 *   SpotifyLogin   ← login button + OAuth callback handler
 *   Library        ← Spotify playlist browser
 *   useAudioEngine ← bass/beat data from Web Audio API
 *   usePalette     ← active palette + genre switching
 *   useSpotify     ← Spotify auth + Web Playback SDK
 */

import { useRef, useState, useEffect } from 'react'
import { motion }            from 'framer-motion'

import DiscoBall    from '../components/ball/DiscoBall'
import PlayerHUD    from '../components/player/PlayerHUD'
import SpotifyLogin from '../components/SpotifyLogin'
import Library      from '../components/Library'

import { useAudioEngine }   from '../hooks/useAudioEngine'
import { usePalette }       from '../hooks/usePalette'
import { useAudioAnalysis } from '../hooks/useAudioAnalysis'
import { useSpotify }       from '../hooks/useSpotify'
import { isLoggedIn }       from '../services/spotify'

// Decorative elements
const DAISIES   = ['d1','d2','d3']
const SPARKLES  = ['sp1','sp2','sp3','sp4','sp5','sp6']

export default function Player() {
  const audioRef   = useRef(null)
  const ballRef    = useRef(null)
  const fileInputRef = useRef(null)

  const [trackName,    setTrackName]    = useState('')
  const [libraryOpen,  setLibraryOpen]  = useState(false)
  const [spotifyMode,  setSpotifyMode]  = useState(isLoggedIn())

  // ── Palette ───────────────────────────────────────────────
  const { palette, setPaletteByKey, setPaletteByGenre } = usePalette()

  // ── Spotify ───────────────────────────────────────────────
  const {
    loggedIn, login, logout,
    sdkReady, sdkError,
    currentTrack, isPlaying: spotifyPlaying,
    position, duration,
    playTrack, togglePlay, seekTo, setVolume: setSpotifyVolume,
    skipNext, skipPrev,
  } = useSpotify((paletteKey) => setPaletteByKey(paletteKey))

  // ── Audio analysis — reads actual sound, no API needed ────
  const {
    analysisResult,
    isAnalysing,
    startAnalysis,
    stopAnalysis,
    recordBeat,
    recordSample,
  } = useAudioAnalysis()

  // Feed beat + sample data from audio engine into analyser
  const { bassEnergy, midEnergy, isBeat, isPlaying } = useAudioEngine(audioRef, {
    onBeat:   (ts) => recordBeat(ts),
    onSample: (bins) => recordSample(bins),
  })

  // Every time analysis completes (even same palette) apply it
  // analysisResult has a unique id per song so this always fires
  useEffect(() => {
    if (analysisResult?.palette) setPaletteByKey(analysisResult.palette)
  }, [analysisResult])

  // ── Handle file upload ────────────────────────────────────
  const handleFileLoad = (file) => {
    const el = audioRef.current
    if (!el) return
    if (el.src) URL.revokeObjectURL(el.src)
    el.src = URL.createObjectURL(file)
    el.load()
    setTrackName(file.name.replace(/\.[^/.]+$/, ''))

    // Wait for audio to actually start playing before analysing
    // so the AudioContext is initialised and samples start flowing
    el.addEventListener('playing', () => {
      startAnalysis()
    }, { once: true })

    el.play().catch(() => {})
  }

  const dotLayerRef = useRef(null)

  // ── Handle Spotify OAuth callback — runs once on mount ───
  const callbackHandled = useRef(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const error  = params.get('error')

    if (error) {
      console.error('Spotify auth error:', error)
      window.history.replaceState({}, '', '/')
      return
    }

    if (code) {
      // Guard against React Strict Mode double-invoke
      if (callbackHandled.current) return
      callbackHandled.current = true

      // Remove code from URL immediately so refresh doesn't retry
      window.history.replaceState({}, '', '/')

      import('../services/spotify').then(({ handleCallback }) => {
        handleCallback(code)
          .then(() => {
            setSpotifyMode(true)
          })
          .catch(err => {
            console.error('Spotify auth failed:', err)
            callbackHandled.current = false // allow retry
          })
      })
    }
  }, [])
  useEffect(() => {
    const layer = dotLayerRef.current
    if (!layer || layer.children.length > 0) return
    const COLORS = ['#FF1E6E','#FF6B00','#00E5B8','#FFE000','#FF3CAC','#00C8FF','#A855F7','#ffffff']
    for (let i = 0; i < 20; i++) {
      const d = document.createElement('div')
      d.className = 'dot'
      const s = 4 + Math.random() * 10
      d.style.cssText = `
        width:${s}px;height:${s}px;
        background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
        top:${3 + Math.random() * 94}%;
        left:${3 + Math.random() * 94}%;
        animation-duration:${1.2 + Math.random() * 1.4}s;
        animation-delay:${Math.random() * 2}s;
        --dx:${(Math.random() - 0.5) * 90}px;
        --dy:${(Math.random() - 0.5) * 70}px;
        box-shadow:0 0 ${s * 2.5}px currentColor;
      `
      layer.appendChild(d)
    }
  }, [])
  // ── Simulated beat for Spotify mode ──────────────────────
  // Spotify audio goes through its own SDK, not our <audio> tag.
  // So we simulate a beat pulse from the player state tempo instead.
  const simulatedBassRef = useRef(0)
  const simulatedBeatRef = useRef(false)
  const spotifyBeatTimer = useRef(null)

  useEffect(() => {
    if (loggedIn && currentTrack && spotifyPlaying) {
      spotifyBeatTimer.current = setInterval(() => {
        simulatedBassRef.current = 0.6 + Math.random() * 0.3
        simulatedBeatRef.current = true
        setTimeout(() => {
          simulatedBeatRef.current = false
          simulatedBassRef.current = 0.2
        }, 80)
      }, 500)
    } else {
      clearInterval(spotifyBeatTimer.current)
      simulatedBassRef.current = 0
    }
    return () => clearInterval(spotifyBeatTimer.current)
  }, [loggedIn, currentTrack, spotifyPlaying])

  // ── Unified values — Spotify mode OR file upload mode ─────
  // If Spotify is logged in AND has a current track → Spotify mode
  // Otherwise → file upload mode (even if logged into Spotify)
  const inSpotifyMode  = loggedIn && !!currentTrack
  const activeIsPlaying  = inSpotifyMode ? spotifyPlaying : isPlaying
  const activeBassEnergy = inSpotifyMode ? simulatedBassRef.current : bassEnergy
  const activeMidEnergy  = inSpotifyMode ? 0.3 : midEnergy
  const activeIsBeat     = inSpotifyMode ? simulatedBeatRef.current : isBeat

  // ── Ball click handler — works for both modes ─────────────
  const handleBallClick = () => {
    if (inSpotifyMode) {
      togglePlay()
    } else {
      const el = audioRef.current
      if (!el) return
      if (!el.src) {
        fileInputRef.current?.click()
      } else {
        isPlaying ? el.pause() : el.play()
      }
    }
  }

  // Background gradient from palette
  const bgGradient = `linear-gradient(160deg, ${palette.bg.join(', ')})`

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{ background: bgGradient, transition: 'background 1.2s ease' }}
    >
      {/* Scattered disco dots — visible when playing */}
      <div ref={dotLayerRef} className={activeIsPlaying ? 'dots-on' : ''} />

      {/* ── Decorative daisies ── */}
      {['top-[6%] left-[4%] text-[clamp(3rem,6vw,5rem)]',
        'top-[8%] right-[6%] text-[clamp(2.4rem,4.5vw,3.8rem)] [animation-delay:1.4s]',
        'bottom-[10%] right-[4%] text-[clamp(2rem,3.5vw,3rem)] [animation-delay:2.7s]',
      ].map((cls, i) => (
        <span key={i} className={`fixed z-[1] pointer-events-none select-none text-white/70 animate-[floatD_5s_ease-in-out_infinite] ${cls}`}
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7))' }}>✿</span>
      ))}

      {/* ── Sparkles ── */}
      {[
        'top-[17%] left-[12%] text-3xl',
        'top-[27%] right-[10%] text-2xl [animation-delay:.7s]',
        'top-[60%] left-[7%] text-4xl [animation-delay:1.3s]',
        'bottom-[18%] right-[9%] text-3xl [animation-delay:1.9s]',
        'bottom-[32%] left-[16%] text-xl [animation-delay:.4s]',
      ].map((cls, i) => (
        <span key={i} className={`fixed z-[1] pointer-events-none select-none animate-[twink_2.4s_ease-in-out_infinite] ${cls}`}
          style={{ color: i === 4 ? palette.accentColor : '#F5E6C8' }}>✦</span>
      ))}

      {/* ── Main stage ── */}
      <main className="relative z-[2] flex flex-col items-center py-6 px-4 w-full">

        {/* Pink bow */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: 'drop-shadow(0 0 24px rgba(255,45,175,0.6))' }}
        >
          <svg viewBox="0 0 340 130" xmlns="http://www.w3.org/2000/svg"
            style={{ width: 'clamp(200px, 38vw, 340px)', height: 'auto', overflow: 'visible' }}>
            <defs>
              {/* Main gradient — hot pink → yellow → blue */}
              <linearGradient id="wokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#FF2DAF"/>
                <stop offset="45%"  stopColor="#FFD700"/>
                <stop offset="100%" stopColor="#87CEEB"/>
              </linearGradient>
              {/* Lighter inner gradient for dimension */}
              <linearGradient id="wokeGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#FF80CC"/>
                <stop offset="45%"  stopColor="#FFE866"/>
                <stop offset="100%" stopColor="#B0E8FF"/>
              </linearGradient>
              {/* Sparkle animations */}
              <style>{`
                @keyframes twinkSp { 0%,100%{opacity:.15;transform:scale(.5) rotate(0deg)} 50%{opacity:1;transform:scale(1.3) rotate(20deg)} }
                .wsp1{animation:twinkSp 1.8s ease-in-out infinite;animation-delay:0s}
                .wsp2{animation:twinkSp 2.2s ease-in-out infinite;animation-delay:.4s}
                .wsp3{animation:twinkSp 1.6s ease-in-out infinite;animation-delay:.9s}
                .wsp4{animation:twinkSp 2.4s ease-in-out infinite;animation-delay:.2s}
                .wsp5{animation:twinkSp 1.9s ease-in-out infinite;animation-delay:.7s}
                .wsp6{animation:twinkSp 2.1s ease-in-out infinite;animation-delay:1.1s}
              `}</style>
            </defs>

            {/* ── "Woke" in retro script style ── */}
            {/* White/cream shadow layer — offset for 3D depth */}
            <text
              x="170" y="95"
              textAnchor="middle"
              fontFamily="'Pacifico', 'Lobster', 'Dancing Script', cursive"
              fontSize="88"
              fontWeight="400"
              fill="white"
              opacity="0.9"
              transform="translate(3, 3)"
            >Woke</text>

            {/* Dark outline layer */}
            <text
              x="170" y="95"
              textAnchor="middle"
              fontFamily="'Pacifico', 'Lobster', 'Dancing Script', cursive"
              fontSize="88"
              fontWeight="400"
              fill="none"
              stroke="rgba(180,0,80,0.4)"
              strokeWidth="6"
              strokeLinejoin="round"
            >Woke</text>

            {/* Main gradient fill */}
            <text
              x="170" y="95"
              textAnchor="middle"
              fontFamily="'Pacifico', 'Lobster', 'Dancing Script', cursive"
              fontSize="120"
              fontWeight="400"
              fill="url(#wokeGrad)"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
              paintOrder="stroke"
            >Woke</text>

            {/* ── Sparkles around the text ── */}
            {/* 4-point star sparkle helper — big */}
            <g className="wsp1" style={{transformOrigin:'38px 22px'}}>
              <path d="M38,10 L40,20 L50,22 L40,24 L38,34 L36,24 L26,22 L36,20 Z" fill="white"/>
            </g>
            {/* small top right */}
            <g className="wsp2" style={{transformOrigin:'295px 15px'}}>
              <path d="M295,8 L296.5,13 L302,15 L296.5,17 L295,22 L293.5,17 L288,15 L293.5,13 Z" fill="white"/>
            </g>
            {/* medium right */}
            <g className="wsp3" style={{transformOrigin:'320px 55px'}}>
              <path d="M320,44 L322,52 L330,55 L322,58 L320,66 L318,58 L310,55 L318,52 Z" fill="#FFD700"/>
            </g>
            {/* tiny top mid */}
            <g className="wsp4" style={{transformOrigin:'200px 8px'}}>
              <path d="M200,3 L201,7 L205,8 L201,9 L200,13 L199,9 L195,8 L199,7 Z" fill="white"/>
            </g>
            {/* medium left bottom */}
            <g className="wsp5" style={{transformOrigin:'18px 85px'}}>
              <path d="M18,76 L20,83 L27,85 L20,87 L18,94 L16,87 L9,85 L16,83 Z" fill="#87CEEB"/>
            </g>
            {/* tiny bottom right */}
            <g className="wsp6" style={{transformOrigin:'308px 100px'}}>
              <path d="M308,95 L309,99 L313,100 L309,101 L308,105 L307,101 L303,100 L307,99 Z" fill="#FF80CC"/>
            </g>
          </svg>
        </motion.div>

        {/* String */}
        <div style={{ width: 2, height: 'clamp(28px,4vw,45px)', background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.1))', borderRadius: 2 }} />

        {/* Disco ball */}
        <div
          ref={ballRef}
          onClick={handleBallClick}
          style={{ cursor: 'pointer' }}
        >
          <DiscoBall
            palette={palette}
            bassEnergy={activeBassEnergy}
            midEnergy={activeMidEnergy}
            isBeat={activeIsBeat}
            isPlaying={activeIsPlaying}
          />
        </div>

        {/* Hidden file input triggered by ball click when no song loaded */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileLoad(f) }}
        />

        {/* Temp palette test — remove after confirming colors work */}
        <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem', flexWrap:'wrap', justifyContent:'center' }}>
          {['pop','chill','hiphop','electronic','classical'].map(key => (
            <button
              key={key}
              tabIndex={-1}
              onClick={() => setPaletteByGenre(key)}
              style={{
                fontFamily:'"Space Mono",monospace', fontSize:'0.6rem',
                padding:'0.3rem 0.7rem', borderRadius:'999px', cursor:'pointer',
                border:'1px solid rgba(255,255,255,0.4)', background:'rgba(0,0,0,0.3)',
                color:'#fff', textTransform:'uppercase', letterSpacing:'0.1em'
              }}
            >{key}</button>
          ))}
        </div>

        {/* Analysing indicator — shows for first 5 seconds of any song */}
        {isAnalysing && (
          <p style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: '0.rem',
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.2em',
            marginTop: '0.4rem',
            animation: 'pulse 1s ease-in-out infinite'
          }}>
            ✦ feeling the vibe...
          </p>
        )}

        {/* Spotify login OR library button */}
        {!loggedIn ? (
          <div style={{ marginTop: '0.8rem' }}>
            <SpotifyLogin
              onLogin={login}
              onLoggedIn={() => setSpotifyMode(true)}
              palette={palette}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem', alignItems: 'center' }}>
            <button
              tabIndex={-1}
              onClick={() => setLibraryOpen(true)}
              style={{
                fontFamily: '"Space Mono",monospace', fontSize: '0.7rem',
                padding: '0.45rem 1rem', borderRadius: '999px',
                border: '1.5px solid #1DB954', color: '#1DB954',
                background: 'transparent', cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1DB954'; e.currentTarget.style.color = '#000' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1DB954' }}
            >
              ♪ Your Library
            </button>
            <button
              tabIndex={-1}
              onClick={logout}
              style={{
                fontFamily: '"Space Mono",monospace', fontSize: '0.6rem',
                padding: '0.4rem 0.8rem', borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.4)',
                background: 'transparent', cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
            {sdkError && (
              <span style={{ color: '#ff6b6b', fontSize: '0.6rem', fontFamily: '"Space Mono",monospace' }}>
                {sdkError}
              </span>
            )}
          </div>
        )}

        {/* Player HUD */}
        <PlayerHUD
          audioRef={audioRef}
          isPlaying={activeIsPlaying}
          trackName={inSpotifyMode && currentTrack
            ? `${currentTrack.name} — ${currentTrack.artists?.[0]?.name}`
            : trackName}
          palette={palette}
          onFileLoad={handleFileLoad}
          albumArt={currentTrack?.album?.images?.[1]?.url}
          onTogglePlay={inSpotifyMode ? togglePlay : null}
          onSkipNext={inSpotifyMode ? skipNext : null}
          onSkipPrev={inSpotifyMode ? skipPrev : null}
          spotifyPosition={inSpotifyMode ? position : null}
          spotifyDuration={inSpotifyMode ? duration : null}
          onSpotifySeek={inSpotifyMode ? seekTo : null}
        />
      </main>

      {/* Spotify Library panel */}
      <Library
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPlayTrack={playTrack}
        palette={palette}
        currentTrack={currentTrack}
      />

      {/* Hidden audio element — for file upload mode */}
      <audio ref={audioRef} />

      {/* Keyframe animations injected globally */}
      <style>{`
        @keyframes pulse {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
        @keyframes floatD {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-18px) rotate(12deg); }
        }
        @keyframes twink {
          0%,100% { opacity: 0.1; transform: scale(0.7) rotate(0deg); }
          50%      { opacity: 1;   transform: scale(1.5) rotate(25deg); }
        }
        input[type=range] { -webkit-appearance: none; appearance: none; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 13px; height: 13px;
          border-radius: 50%;
          background: #FF2DAF;
          box-shadow: 0 0 8px rgba(255,45,175,0.9);
        }
        input[type=range]::-moz-range-thumb {
          width: 13px; height: 13px;
          border-radius: 50%;
          background: #FF2DAF; border: none;
        }
      `}</style>
    </div>
  )
}