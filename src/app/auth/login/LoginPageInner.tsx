'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    toast.error(error.message)
  } else if (data.user) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single()

    if (!existing) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name || email,
        role: 'customer',
      })
    }

    toast.success('Welcome back!')
    router.push(redirectTo)
    router.refresh()
  }

  setLoading(false)
}


  async function handleGoogle() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}` },
    })
    if (error) toast.error(error.message)
    setGoogleLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center animate-fade-in">
        <h1 className="font-display text-5xl font-bold text-gold tracking-tight">Tech Cafe</h1>
        <p className="text-text-muted mt-2 text-sm">GEC Raipur</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm card p-8 animate-slide-up">
        <h2 className="text-xl font-semibold mb-6">Sign in</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-gold w-full mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="divider-gold" />

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="btn-outline w-full flex items-center justify-center gap-3"
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <p className="text-center text-sm text-text-muted mt-6">
          No account?{' '}
          <Link href="/auth/signup" className="text-gold hover:text-gold-light transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
