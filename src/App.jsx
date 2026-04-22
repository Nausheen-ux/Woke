import { Routes, Route, Navigate } from 'react-router-dom'
import Player from './pages/Player'

export default function App() {
  return (
    <Routes>
      {/* Main player — also handles /callback redirect from Spotify */}
      <Route path="/"         element={<Player />} />
      <Route path="/callback" element={<Player />} />
      <Route path="*"         element={<Navigate to="/" replace />} />
    </Routes>
  )
}