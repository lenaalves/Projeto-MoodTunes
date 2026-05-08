const API_KEY = import.meta.env.VITE_LASTFM_KEY
const BASE_URL = 'https://ws.audioscrobbler.com/2.0'

export interface Track {
  name: string
  artist: string
  album: string
  cover: string
  url: string
}

export async function searchTracks(query: string): Promise<Track[]> {
  const res = await fetch(
    `${BASE_URL}/?method=track.search&track=${encodeURIComponent(query)}&api_key=${API_KEY}&format=json&limit=6`
  )
  const data = await res.json()
  const tracks = data?.results?.trackmatches?.track ?? []

  return tracks.map((t: any) => ({
    name: t.name,
    artist: t.artist,
    album: '',
    cover: t.image?.[2]?.['#text'] || '',
    url: t.url,
  }))
}

export async function getTrackInfo(track: string, artist: string): Promise<Partial<Track>> {
  const res = await fetch(
    `${BASE_URL}/?method=track.getInfo&track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json`
  )
  const data = await res.json()
  const info = data?.track

  return {
    album: info?.album?.title ?? '',
    cover: info?.album?.image?.[3]?.['#text'] || '',
  }
}