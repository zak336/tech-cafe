import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: NextRequest) {
  const { user_id, title, body, data } = await request.json()

  if (!user_id || !title || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = createServiceClient()

  // Get all active push subscriptions for user
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true)

  if (!subs?.length) {
    return NextResponse.json({ sent: 0 })
  }

  const payload = JSON.stringify({ title, body, data })
  let sent = 0
  const expired: string[] = []

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: any) {
        // 410 Gone = subscription expired
        if (err.statusCode === 410) expired.push(sub.id)
      }
    })
  )

  // Deactivate expired subscriptions
  if (expired.length) {
    await service
      .from('push_subscriptions')
      .update({ is_active: false })
      .in('id', expired)
  }

  return NextResponse.json({ sent })
}
