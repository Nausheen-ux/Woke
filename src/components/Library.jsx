/**
 * Library
 *
 * Slide-in panel showing Spotify playlists + tracks.
 * Click a track → plays it via Web Playback SDK.
 *
 * Props:
 *   isOpen     → bool
 *   onClose    → () => void
 *   onPlayTrack → (uri) => void
 *   palette    → current palette
 *   currentTrack → currently playing track object
 */

import { useState, useEffect } from 'react'
import { getPlaylists, getPlaylistTracks, getLikedSongs } from '../services/spotify'

export default function Library({ isOpen, onClose, onPlayTrack, palette, currentTrack }) {
  const [playlists,      setPlaylists]      = useState([])
const [selectedList, setSelectedList] = useState({
  id: 'liked',
  name: 'Liked Songs'
})
useEffect(() => {
  if (isOpen) {
    openPlaylist({ id: 'liked', name: 'Liked Songs' })
  }
}, [isOpen])// { id, name, type }
  const [tracks,         setTracks]         = useState([])
  const [loading,        setLoading]        = useState(false)
  const [view,           setView]           = useState('playlists') // 'playlists' | 'tracks'

  const accent = palette?.accentColor || '#FF2DAF'

  // ── Load playlists on open ────────────────────────────────
  useEffect(() => {
    if (!isOpen || playlists.length > 0) return
    setLoading(true)
    getPlaylists(50)
     .then(data => {
  const usable = (data?.items || []).filter(pl => pl.tracks?.total > 0)
  setPlaylists(usable)
})
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isOpen])

  // ── Load tracks for selected playlist ────────────────────
  const openPlaylist = async (playlist) => {
    setSelectedList(playlist)
    setView('tracks')
    setTracks([])
    setLoading(true)
    try {
      let data
      if (playlist.id === 'liked') {
        data = await getLikedSongs(50)
        console.log('Liked songs raw:', data)
        setTracks((data?.items || []).map(i => i.track).filter(Boolean))
      } else {
        try {
          data = await getPlaylistTracks(playlist.id, 50)
          console.log('Playlist tracks raw:', data)
          setTracks((data?.items || []).map(i => i.track).filter(Boolean))
        } catch (e) {
          if (e.message.includes('403')) {
  console.warn('403: No access to this playlist')

  setTracks([])
  alert("You don't have access to this playlist. Try your own playlist or make it public.")
} else {
            throw e
          }
        }
      }
    } catch (e) {
      console.error('Track load error:', e)
    } finally {
      setLoading(false)
    }
  }

  function fmt(ms) {
    if (!ms) return '0:00'
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Panel */}
      <div style={{
        position:   'fixed',
        top:        0,
        right:      0,
        height:     '100vh',
        width:      'clamp(300px, 85vw, 420px)',
        background: 'rgba(8, 3, 20, 0.97)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        zIndex:     11,
        display:    'flex',
        flexDirection: 'column',
        transform:  isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        overflowY:  'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.2rem 1.4rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {view === 'tracks' && (
              <button
                onClick={() => setView('playlists')}
                tabIndex={-1}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem' }}
              >←</button>
            )}
            <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', letterSpacing: '0.1em', color: '#fff' }}>
              {view === 'playlists' ? 'Your Library' : selectedList?.name}
            </span>
          </div>
          <button
            onClick={onClose}
            tabIndex={-1}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}
          >✕</button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>

          {loading && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem', fontFamily: '"Space Mono",monospace', fontSize: '0.7rem', letterSpacing: '0.15em' }}>
              ✦ loading...
            </div>
          )}

          {/* Playlists view */}
          {!loading && view === 'playlists' && (
            <>
              {/* Liked Songs shortcut */}
              <PlaylistRow
                name="Liked Songs"
                image={null}
                accent={accent}
                onClick={() => openPlaylist({ id: 'liked', name: 'Liked Songs' })}
                isLiked
              />
              {playlists.map(pl => (
                <PlaylistRow
                  key={pl.id}
                  name={pl.name}
                  image={pl.images?.[0]?.url}
                  count={pl.tracks?.total}
                  accent={accent}
                  onClick={() => openPlaylist(pl)}
                />
              ))}
            </>
          )}

          {/* Tracks view */}
          {!loading && view === 'tracks' && tracks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1.4rem', fontFamily: '"Space Mono",monospace', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.8 }}>
              No tracks loaded.<br/>
              If this keeps happening, go to your Spotify Developer Dashboard → Settings → User Management and add your Spotify email as a test user.
            </div>
          )}
          {!loading && view === 'tracks' && tracks.length > 0 && tracks.map((track, i) => (
            <TrackRow
              key={track.id || i}
              track={track}
              isPlaying={currentTrack?.id === track.id}
              accent={accent}
              onPlay={() => onPlayTrack(track.uri)}
              fmt={fmt}
            />
          ))}
        </div>
      </div>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────
function PlaylistRow({ name, image, count, accent, onClick, isLiked }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.8rem',
        padding: '0.7rem 1.4rem',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Thumbnail */}
      <div style={{
        width: 44, height: 44, borderRadius: 6, flexShrink: 0,
        background: isLiked ? `linear-gradient(135deg, ${accent}, #1DB954)` : 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {image
          ? <img src={image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <span style={{ fontSize: isLiked ? '1.2rem' : '1rem' }}>{isLiked ? '♥' : '♪'}</span>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: '0.85rem', fontFamily: '"DM Serif Display",serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        {count !== undefined && (
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem', fontFamily: '"Space Mono",monospace', marginTop: 2 }}>
            {count} songs
          </div>
        )}
      </div>

      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>›</span>
    </div>
  )
}

function TrackRow({ track, isPlaying, accent, onPlay, fmt }) {
  const albumArt = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url

  return (
    <div
      onClick={onPlay}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.8rem',
        padding: '0.6rem 1.4rem',
        cursor: 'pointer',
        background: isPlaying ? `rgba(255,255,255,0.06)` : 'transparent',
        borderLeft: isPlaying ? `3px solid ${accent}` : '3px solid transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Album art */}
      <div style={{ width: 38, height: 38, borderRadius: 4, flexShrink: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
        {albumArt
          ? <img src={albumArt} alt={track.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}>♪</span>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: isPlaying ? accent : '#fff',
          fontSize: '0.82rem',
          fontFamily: '"DM Serif Display",serif',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {track.name}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', fontFamily: '"Space Mono",monospace', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artists?.map(a => a.name).join(', ')}
        </div>
      </div>

      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', fontFamily: '"Space Mono",monospace', flexShrink: 0 }}>
        {fmt(track.duration_ms)}
      </span>
    </div>
  )
}