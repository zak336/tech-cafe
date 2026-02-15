import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, cafe_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-black flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
