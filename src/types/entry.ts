export interface Entry {
  id: string
  user_id: string
  track_name: string
  artist_name: string
  album_name: string
  cover_url: string
  mood: string
  note: string
  listened_at: string
  created_at: string
}

export const MOODS = [
  { value: 'happy', label: 'Feliz', emoji: '😊' },
  { value: 'sad', label: 'Triste', emoji: '😢' },
  { value: 'energetic', label: 'Animada', emoji: '⚡' },
  { value: 'calm', label: 'Calma', emoji: '😌' },
  { value: 'nostalgic', label: 'Nostálgica', emoji: '🌙' },
]