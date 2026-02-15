import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrderCard from '@/components/customer/OrderCard'

export default async function OrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/orders')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="page-container pt-6">
      <h1 className="font-display text-3xl font-bold mb-6">My Orders</h1>

      {(!orders || orders.length === 0) ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-text-muted">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <div key={order.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <OrderCard order={order} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
