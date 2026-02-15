import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tech Cafe',
  description: 'Order food from Tech Cafe — GEC Raipur',
  manifest: '/manifest.json',
  themeColor: '#0D0D0D',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-white font-sans antialiased min-h-screen">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1F1F1F',
              color: '#FFFFFF',
              border: '1px solid #2E2E2E',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#D4AF37', secondary: '#0D0D0D' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#0D0D0D' } },
          }}
        />
      </body>
    </html>
  )
}
