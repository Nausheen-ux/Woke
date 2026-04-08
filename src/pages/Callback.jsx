import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { handleCallback } from "../services/spotify"

export default function Callback() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code")

    if (!code) {
      navigate("/")
      return
    }

    handleCallback(code)
      .then(() => {
        navigate("/")
      })
      .catch(err => {
        console.error("Spotify auth failed:", err)
        navigate("/")
      })
  }, [])

  return <div>Connecting to Spotify...</div>
}