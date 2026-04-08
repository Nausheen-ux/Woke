/**
 * useGenreDetect
 *
 * Sends the uploaded audio file to the AudD API and returns
 * the detected genre string.
 *
 * Usage:
 *   const { detectGenre, genre, isDetecting, error } = useGenreDetect()
 *
 *   // Call this right after a file is uploaded:
 *   const result = await detectGenre(file)  // returns genre string e.g. "Pop"
 */

import { useState, useCallback } from 'react'

const API_TOKEN = import.meta.env.VITE_AUDD_API_TOKEN

export function useGenreDetect() {
  const [genre,       setGenre]       = useState(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [error,       setError]       = useState(null)

  const detectGenre = useCallback(async (file) => {
    if (!file)       return null
    if (!API_TOKEN)  { console.warn('AudD API token missing in .env'); return null }

    setIsDetecting(true)
    setError(null)

    try {
      // AudD expects multipart/form-data with the audio file + token
      const formData = new FormData()
      formData.append('file',       file)
      formData.append('api_token',  API_TOKEN)
      formData.append('return',     'apple_music,spotify') // enriched metadata

      const res  = await fetch('https://api.audd.io/', {
        method: 'POST',
        body:   formData,
      })

      const data = await res.json()
      console.log('AudD response:', data) // helpful during dev

      // AudD returns result.result.apple_music.genreNames or spotify data
      let detectedGenre = null

      if (data?.result) {
        // Try Apple Music genre first (most reliable)
        const appleGenres = data.result?.apple_music?.genreNames
        if (appleGenres?.length) {
          detectedGenre = appleGenres[0]
        }

        // Fallback: Spotify genre from artist
        if (!detectedGenre) {
          const spotifyGenres = data.result?.spotify?.album?.genres
          if (spotifyGenres?.length) {
            detectedGenre = spotifyGenres[0]
          }
        }

        // Last fallback: use the track title/artist to guess from filename
        if (!detectedGenre && data.result?.title) {
          detectedGenre = 'pop' // safe default if song found but no genre
        }
      }

      // If AudD couldn't identify the song at all
      if (!detectedGenre) {
        console.log('AudD: song not recognised, using default palette')
        detectedGenre = 'pop'
      }

      console.log('Detected genre:', detectedGenre)
      setGenre(detectedGenre)
      return detectedGenre

    } catch (err) {
      console.error('AudD error:', err)
      setError(err.message)
      return null
    } finally {
      setIsDetecting(false)
    }
  }, [])

  return { detectGenre, genre, isDetecting, error }
}