import express from "express"

import dotenv from "dotenv"

dotenv.config()

const app = express()
app.use(express.json())

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

// Exchange code → token
app.post("/api/token", async (req, res) => {
  const { code, redirect_uri } = req.body

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri
    })
  })

  const data = await response.json()
  res.json(data)
})

// Refresh token
app.post("/api/refresh", async (req, res) => {
  const { refresh_token } = req.body

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token
    })
  })

  const data = await response.json()
  res.json(data)
})

app.listen(3000, () => console.log("Server running on port 3000"))