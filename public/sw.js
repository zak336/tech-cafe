// Tech Cafe - Service Worker for Web Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) return

  const data = event.data.json()
  const { title, body, data: notifData } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icon-192.png',
      badge: '/icon-72.png',
      data:  notifData,
      vibrate: [200, 100, 200],
      tag: 'tech-cafe-order',
      renotify: true,
      actions: [
        { action: 'view',    title: 'View Order' },
        { action: 'dismiss', title: 'Dismiss'    },
      ],
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
