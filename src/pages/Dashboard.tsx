import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { searchTracks, getTrackInfo } from '../lib/lastfm'
import type { Track } from '../lib/lastfm'
import type { Entry } from '../types/entry'
import { MOODS } from '../types/entry'

type Page = 'diary' | 'add' | 'stats'

interface Props { userEmail: string }

export default function Dashboard({ userEmail }: Props) {
  const [page, setPage] = useState<Page>('diary')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // busca
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)

  // form
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

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }} className="flex min-h-screen w-full bg-gradient-to-br from-purple-50 to-pink-50">

      {/* Sidebar — desktop */}
      {!isMobile && (
        <aside className="w-56 min-w-[14rem] bg-white flex flex-col py-8 px-4 shadow-sm border-r border-purple-100 sticky top-0 h-screen">
          <div className="mb-8 px-2">
            <h1 className="text-xl font-extrabold text-purple-400">🎵 MoodTunes</h1>
            <p className="text-xs text-gray-400 mt-1">seu diário musical</p>
          </div>

          <div className="px-2 mb-6">
            <p className="text-sm font-extrabold text-gray-600">{firstName}</p>
            <p className="text-xs text-gray-400">{userEmail}</p>
          </div>

          <nav className="flex flex-col gap-2 flex-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setPage(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${page === item.id ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:bg-purple-50 hover:text-purple-400'}`}>
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <button onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-400 hover:bg-red-50 hover:text-red-400 transition-all">
            <span>🚪</span> Sair
          </button>
        </aside>
      )}

      {/* Main */}
      <main className={`flex-1 overflow-x-hidden ${isMobile ? 'p-4 pb-24' : 'p-8'}`}>
        <div className="max-w-2xl mx-auto flex flex-col gap-6">

          {/* Header */}
          <div className="mb-2">
            <h2 className="text-xl font-extrabold text-gray-700">
              {page === 'diary' && `Olá, ${firstName} 🎵`}
              {page === 'add' && 'Registrar música ✨'}
              {page === 'stats' && 'Suas estatísticas 📊'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* DIARY PAGE */}
          {page === 'diary' && (
            <div className="flex flex-col gap-4">
              {loading ? (
                <p className="text-sm text-gray-400">Carregando...</p>
              ) : entries.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-purple-100 shadow-sm">
                  <p className="text-4xl mb-3">🎵</p>
                  <p className="font-extrabold text-gray-600">Nenhuma música ainda</p>
                  <p className="text-sm text-gray-400 mt-1">Clique em Adicionar pra começar seu diário!</p>
                </div>
              ) : (
                entries.map(e => {
                  const moodObj = MOODS.find(m => m.value === e.mood)
                  return (
                    <div key={e.id} className="bg-white rounded-3xl p-4 shadow-sm border border-purple-100 flex gap-4 items-center">
                      <img
                        src={e.cover_url || 'https://via.placeholder.com/60'}
                        alt={e.track_name}
                        className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-gray-700 truncate">{e.track_name}</p>
                        <p className="text-sm text-gray-400 truncate">{e.artist_name}</p>
                        {e.album_name && <p className="text-xs text-gray-300 truncate">{e.album_name}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm">{moodObj?.emoji}</span>
                          <span className="text-xs text-gray-400">{new Date(e.listened_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {e.note && <p className="text-xs text-gray-500 mt-1 italic">"{e.note}"</p>}
                      </div>
                      <button onClick={() => handleDelete(e.id)}
                        className="w-8 h-8 rounded-xl bg-red-50 text-red-300 hover:bg-red-100 hover:text-red-500 transition text-sm font-bold flex-shrink-0">
                        ×
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ADD PAGE */}
          {page === 'add' && (
            <div className="flex flex-col gap-4">

              {/* Busca */}
              {!selectedTrack && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100">
                  <h3 className="font-extrabold text-gray-600 mb-4">Buscar música</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome da música ou artista..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1 border-2 border-purple-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-300 transition"
                    />
                    <button onClick={handleSearch} disabled={searching}
                      className="bg-purple-400 hover:bg-purple-500 text-white font-extrabold px-5 rounded-2xl transition disabled:opacity-50">
                      {searching ? '...' : '🔍'}
                    </button>
                  </div>

                  {results.length > 0 && (
                    <div className="flex flex-col gap-2 mt-4">
                      {results.map((t, i) => (
                        <button key={i} onClick={() => handleSelectTrack(t)}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-purple-50 transition text-left">
                          <img
                            src={t.cover || 'https://via.placeholder.com/40'}
                            alt={t.name}
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-gray-700 truncate">{t.name}</p>
                            <p className="text-xs text-gray-400 truncate">{t.artist}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Música selecionada */}
              {selectedTrack && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100">
                  <div className="flex items-center gap-4 mb-6 p-4 bg-purple-50 rounded-2xl">
                    <img
                      src={selectedTrack.cover || 'https://via.placeholder.com/60'}
                      alt={selectedTrack.name}
                      className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-extrabold text-gray-700 truncate">{selectedTrack.name}</p>
                      <p className="text-sm text-gray-400 truncate">{selectedTrack.artist}</p>
                      {selectedTrack.album && <p className="text-xs text-gray-300 truncate">{selectedTrack.album}</p>}
                    </div>
                    <button onClick={() => setSelectedTrack(null)}
                      className="ml-auto text-gray-300 hover:text-gray-500 font-bold text-lg flex-shrink-0">
                      ×
                    </button>
                  </div>

                  {/* Humor */}
                  <h3 className="font-extrabold text-gray-600 mb-3">Como você tá se sentindo?</h3>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {MOODS.map(m => (
                      <button key={m.value} onClick={() => setMood(m.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold transition ${mood === m.value ? 'bg-purple-200 text-purple-600' : 'bg-gray-100 text-gray-400 hover:bg-purple-50'}`}>
                        <span>{m.emoji}</span> {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Nota */}
                  <textarea
                    placeholder="Uma nota sobre esse momento... (opcional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full border-2 border-purple-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-300 transition resize-none mb-4"
                  />

                  {/* Data */}
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full border-2 border-purple-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-300 transition mb-4" />

                  <button onClick={handleSubmit} disabled={submitting || !mood}
                    className="w-full bg-purple-400 hover:bg-purple-500 text-white font-extrabold py-4 rounded-2xl transition disabled:opacity-50">
                    {submitting ? 'Salvando...' : '🎵 Salvar no diário'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATS PAGE */}
          {page === 'stats' && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="font-extrabold text-gray-600">Estatísticas chegando em breve!</p>
              <p className="text-sm text-gray-400 mt-1">Vamos implementar na Fase 3.</p>
            </div>
          )}

        </div>
      </main>

      {/* Bottom nav — mobile */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-purple-100 flex justify-around py-3 z-50">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`flex flex-col items-center gap-1 px-4 transition-all ${page === item.id ? 'text-purple-500' : 'text-gray-400'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-bold">{item.label}</span>
            </button>
          ))}
          <button onClick={() => supabase.auth.signOut()} className="flex flex-col items-center gap-1 px-4 text-gray-400">
            <span className="text-xl">🚪</span>
            <span className="text-xs font-bold">Sair</span>
          </button>
        </nav>
      )}

    </div>
  )
}