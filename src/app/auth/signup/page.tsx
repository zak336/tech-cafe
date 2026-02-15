'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
  e.preventDefault()
  if (password.length < 6) {
    toast.error('Password must be at least 6 characters')
    return
  }
  setLoading(true)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })
  if (error) {
    toast.error(error.message)
  } else if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: name,
      role: 'customer',
    })
    toast.success('Account created!')
    router.push('/')
    router.refresh()
  }
  setLoading(false)
}

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center animate-fade-in">
        <h1 className="font-display text-5xl font-bold text-gold tracking-tight">Tech Cafe</h1>
        <p className="text-text-muted mt-2 text-sm">GEC Raipur</p>
      </div>

      <div className="w-full max-w-sm card p-8 animate-slide-up">
        <h2 className="text-xl font-semibold mb-6">Create account</h2>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Full name</label>
            <input
              type="text"
              className="input"
              placeholder="Ravi Kumar"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Password</label>
            <input
              type="password"
              className="input"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-gold w-full mt-2">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-gold hover:text-gold-light transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
