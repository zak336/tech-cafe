import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await request.json()

  await supabase.from('push_subscriptions').upsert({
    user_id:    user.id,
    endpoint:   sub.endpoint,
    p256dh:     sub.keys.p256dh,
    auth:       sub.keys.auth,
    user_agent: request.headers.get('user-agent') ?? '',
    is_active:  true,
  }, { onConflict: 'endpoint' })

  return NextResponse.json({ success: true })
}
