import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { searchTracks, getTrackInfo } from '../lib/lastfm'
import type { Track } from '../lib/lastfm'
import type { Entry } from '../types/entry'
import { MOODS } from '../types/entry'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

type Page = 'diary' | 'add' | 'stats'
interface Props { userEmail: string }

export default function Dashboard({ userEmail }: Props) {
  const [page, setPage] = useState<Page>('diary')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)

  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function fetchEntries() {
    const { data } = await supabase
      .from('entries')
      .select('*')
      .order('listened_at', { ascending: false })
    if (data) setEntries(data)
    setLoading(false)
  }

  useEffect(() => { fetchEntries() }, [])

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    const tracks = await searchTracks(query)
    setResults(tracks)
    setSearching(false)
  }

  async function handleSelectTrack(track: Track) {
    const info = await getTrackInfo(track.name, track.artist)
    setSelectedTrack({ ...track, ...info })
    setResults([])
    setQuery('')
  }

  async function handleSubmit() {
    if (!selectedTrack || !mood) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('entries').insert({
      user_id: user!.id,
      track_name: selectedTrack.name,
      artist_name: selectedTrack.artist,
      album_name: selectedTrack.album,
      cover_url: selectedTrack.cover,
      mood,
      note,
      listened_at: date,
    })
    setSelectedTrack(null)
    setMood('')
    setNote('')
    setDate(new Date().toISOString().split('T')[0])
    await fetchEntries()
    setSubmitting(false)
    setPage('diary')
  }

  async function handleDelete(id: string) {
    await supabase.from('entries').delete().eq('id', id)
    await fetchEntries()
  }

  const navItems: { id: Page; icon: string; label: string }[] = [
    { id: 'diary', icon: '📖', label: 'Diário' },
    { id: 'add', icon: '➕', label: 'Adicionar' },
    { id: 'stats', icon: '📊', label: 'Stats' },
  ]

  const firstName = userEmail.split('@')[0]

  const artistCount = Object.entries(
    entries.reduce((acc, e) => {
      acc[e.artist_name] = (acc[e.artist_name] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const moodCount = MOODS.map(m => ({
    ...m,
    count: entries.filter(e => e.mood === m.value).length
  })).filter(m => m.count > 0).sort((a, b) => b.count - a.count)

  const moodScore: Record<string, number> = {
    happy: 5, energetic: 4, calm: 3, nostalgic: 2, sad: 1
  }

  const last7 = [...entries]
    .sort((a, b) => new Date(a.listened_at).getTime() - new Date(b.listened_at).getTime())
    .slice(-7)
    .map(e => ({
      date: new Date(e.listened_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      humor: moodScore[e.mood] ?? 3,
    }))

  const cardClass = "bg-[#1e1f2e] rounded-2xl p-5 border border-white/5"
  const inputClass = "w-full bg-[#2a2b3d] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }} className="flex min-h-screen w-full bg-[#13141f]">

      {/* Sidebar — desktop */}
      {!isMobile && (
        <aside className="w-56 min-w-[14rem] bg-[#0f1018] flex flex-col py-8 px-4 border-r border-white/5 sticky top-0 h-screen">
          <div className="mb-8 px-2">
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              🎵 MoodTunes
            </h1>
            <p className="text-xs text-gray-600 mt-1">seu diário musical</p>
          </div>

          <div className="px-2 mb-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
              {firstName[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white truncate">{firstName}</p>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setPage(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  page === item.id
                    ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white border border-purple-500/30'
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                }`}>
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <button onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <span>🚪</span> Sair
          </button>
        </aside>
      )}

      {/* Main */}
      <main className={`flex-1 overflow-x-hidden ${isMobile ? 'p-4 pb-24' : 'p-8'}`}>
        <div className="max-w-2xl mx-auto flex flex-col gap-6">

          {/* Header */}
          <div className="mb-2">
            <h2 className="text-2xl font-extrabold text-white">
              {page === 'diary' && `Olá, ${firstName} 🎵`}
              {page === 'add' && 'Registrar música ✨'}
              {page === 'stats' && 'Suas estatísticas 📊'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* DIARY */}
          {page === 'diary' && (
            <div className="flex flex-col gap-3">
              {loading ? (
                <p className="text-sm text-gray-500">Carregando...</p>
              ) : entries.length === 0 ? (
                <div className={`${cardClass} text-center py-12`}>
                  <p className="text-4xl mb-3">🎵</p>
                  <p className="font-extrabold text-white">Nenhuma música ainda</p>
                  <p className="text-sm text-gray-500 mt-1">Clique em Adicionar pra começar seu diário!</p>
                </div>
              ) : (
                entries.map(e => {
                  const moodObj = MOODS.find(m => m.value === e.mood)
                  return (
                    <div key={e.id} className={`${cardClass} flex gap-4 items-center hover:border-purple-500/30 transition-all`}>
                      <img
                        src={e.cover_url || 'https://via.placeholder.com/60'}
                        alt={e.track_name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-white truncate">{e.track_name}</p>
                        <p className="text-sm text-gray-400 truncate">{e.artist_name}</p>
                        {e.album_name && <p className="text-xs text-gray-600 truncate">{e.album_name}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm">{moodObj?.emoji}</span>
                          <span className="text-xs text-gray-500">{new Date(e.listened_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {e.note && <p className="text-xs text-gray-500 mt-1 italic">"{e.note}"</p>}
                      </div>
                      <button onClick={() => handleDelete(e.id)}
                        className="w-8 h-8 rounded-xl bg-white/5 text-gray-600 hover:bg-red-500/20 hover:text-red-400 transition text-sm font-bold flex-shrink-0">
                        ×
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ADD */}
          {page === 'add' && (
            <div className="flex flex-col gap-4">
              {!selectedTrack && (
                <div className={cardClass}>
                  <h3 className="font-extrabold text-white mb-4">Buscar música</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome da música ou artista..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className={inputClass}
                    />
                    <button onClick={handleSearch} disabled={searching}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold px-5 rounded-xl transition disabled:opacity-50">
                      {searching ? '...' : '🔍'}
                    </button>
                  </div>
                  {results.length > 0 && (
                    <div className="flex flex-col gap-1 mt-4">
                      {results.map((t, i) => (
                        <button key={i} onClick={() => handleSelectTrack(t)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition text-left">
                          <img
                            src={t.cover || 'https://via.placeholder.com/40'}
                            alt={t.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-white truncate">{t.name}</p>
                            <p className="text-xs text-gray-500 truncate">{t.artist}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTrack && (
                <div className={cardClass}>
                  <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-purple-500/20">
                    <img
                      src={selectedTrack.cover || 'https://via.placeholder.com/60'}
                      alt={selectedTrack.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-extrabold text-white truncate">{selectedTrack.name}</p>
                      <p className="text-sm text-gray-400 truncate">{selectedTrack.artist}</p>
                      {selectedTrack.album && <p className="text-xs text-gray-600 truncate">{selectedTrack.album}</p>}
                    </div>
                    <button onClick={() => setSelectedTrack(null)}
                      className="ml-auto text-gray-600 hover:text-gray-300 font-bold text-lg flex-shrink-0">
                      ×
                    </button>
                  </div>

                  <h3 className="font-extrabold text-white mb-3">Como você tá se sentindo?</h3>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {MOODS.map(m => (
                      <button key={m.value} onClick={() => setMood(m.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition ${
                          mood === m.value
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}>
                        <span>{m.emoji}</span> {m.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    placeholder="Uma nota sobre esse momento... (opcional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none mb-4`}
                  />

                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className={`${inputClass} mb-4`} />

                  <button onClick={handleSubmit} disabled={submitting || !mood}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold py-4 rounded-xl transition disabled:opacity-50">
                    {submitting ? 'Salvando...' : '🎵 Salvar no diário'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATS */}
          {page === 'stats' && (
            <div className="flex flex-col gap-6">
              {entries.length === 0 ? (
                <div className={`${cardClass} text-center py-12`}>
                  <p className="text-4xl mb-3">📊</p>
                  <p className="font-extrabold text-white">Adicione músicas pra ver as estatísticas!</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl p-5 border border-white/5 bg-gradient-to-br from-blue-600/20 to-blue-900/20">
                      <p className="text-xs font-bold text-gray-500 mb-1">Total de músicas</p>
                      <p className="text-3xl font-extrabold text-blue-400">{entries.length}</p>
                    </div>
                    <div className="rounded-2xl p-5 border border-white/5 bg-gradient-to-br from-purple-600/20 to-purple-900/20">
                      <p className="text-xs font-bold text-gray-500 mb-1">Artistas únicos</p>
                      <p className="text-3xl font-extrabold text-purple-400">
                        {new Set(entries.map(e => e.artist_name)).size}
                      </p>
                    </div>
                  </div>

                  <div className={cardClass}>
                    <h3 className="font-extrabold text-white mb-4">Humor mais frequente</h3>
                    <div className="flex flex-col gap-3">
                      {moodCount.map(m => (
                        <div key={m.value} className="flex items-center gap-3">
                          <span className="text-xl w-8">{m.emoji}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-bold text-gray-300">{m.label}</span>
                              <span className="text-sm font-bold text-gray-500">{m.count}</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                style={{ width: `${(m.count / entries.length) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {artistCount.length > 0 && (
                    <div className={cardClass}>
                      <h3 className="font-extrabold text-white mb-4">Artistas mais ouvidos</h3>
                      <div className="flex flex-col gap-3">
                        {artistCount.map(([artist, count], i) => (
                          <div key={artist} className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-bold text-gray-300 truncate">{artist}</span>
                                <span className="text-sm font-bold text-gray-500 flex-shrink-0 ml-2">{count}</span>
                              </div>
                              <div className="w-full bg-white/5 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                  style={{ width: `${(count / artistCount[0][1]) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={cardClass}>
                    <h3 className="font-extrabold text-white mb-4">Humor nas últimas músicas</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={last7}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickFormatter={(v) => ['😢', '🌙', '😌', '⚡', '😊'][v - 1]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                          formatter={(v: unknown) => {
                            const labels = ['', 'Triste', 'Nostálgica', 'Calma', 'Animada', 'Feliz']
                            return labels[Number(v)] ?? v
                          }}
                        />
                        <Line type="monotone" dataKey="humor" stroke="url(#gradient)" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 5 }} />
                        <defs>
                          <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Bottom nav — mobile */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0f1018] border-t border-white/5 flex justify-around py-3 z-50">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`flex flex-col items-center gap-1 px-4 transition-all ${page === item.id ? 'text-purple-400' : 'text-gray-600'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-bold">{item.label}</span>
            </button>
          ))}
          <button onClick={() => supabase.auth.signOut()} className="flex flex-col items-center gap-1 px-4 text-gray-600">
            <span className="text-xl">🚪</span>
            <span className="text-xs font-bold">Sair</span>
          </button>
        </nav>
      )}

    </div>
  )
}
