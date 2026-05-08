import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Dashboard from './pages/Dashboard'

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }} className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-md w-full max-w-md border border-purple-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-purple-400">🎵 MoodTunes</h1>
          <p className="text-gray-400 text-sm mt-2">seu diário musical</p>
        </div>
        <h2 className="text-xl font-extrabold text-gray-700 mb-6">{isLogin ? 'Entrar' : 'Criar conta'}</h2>
        <div className="flex flex-col gap-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="border-2 border-purple-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-300 transition" />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
            className="border-2 border-purple-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-purple-300 transition" />
          {error && <p className="text-red-400 text-sm font-bold">{error}</p>}
          <button onClick={handleSubmit} disabled={loading}
            className="bg-purple-400 hover:bg-purple-500 text-white font-extrabold py-3 rounded-2xl transition disabled:opacity-50">
            {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </div>
        <p className="text-center text-sm text-gray-400 mt-6 font-bold">
          {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-purple-400 hover:underline">
            {isLogin ? 'Cadastre-se' : 'Entre aqui'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  if (!session) return <Auth />
  return <Dashboard userEmail={session.user.email!} />
}