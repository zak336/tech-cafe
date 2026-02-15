import BottomNav from '@/components/customer/BottomNav'
import TopBar from '@/components/customer/TopBar'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      <TopBar />
      <main className="pt-16 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
