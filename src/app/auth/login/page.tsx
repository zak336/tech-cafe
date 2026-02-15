'use client'

import { Suspense } from 'react'
import LoginPageInner from './LoginPageInner'

export default function Page() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
