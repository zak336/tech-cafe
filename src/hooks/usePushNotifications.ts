'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'

export function usePushNotifications() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    registerSW()
  }, [])
}

async function registerSW() {
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')

    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription()
    if (existing) return

    // Ask for permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    // Subscribe
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })

    // Send to server
    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(sub.toJSON()),
    })
  } catch (err) {
    // Silent fail — push is a nice-to-have
    console.warn('Push registration failed:', err)
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}
