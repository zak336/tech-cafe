import { useState } from 'react'
import toast from 'react-hot-toast'

export function useInitializeSlots() {
    const [loading, setLoading] = useState(false)

    const initializeSlots = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/slots/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Failed to initialize slots')
                return false
            }

            if (data.slots_created) {
                toast.success(`✅ Created ${data.slots_created} pickup slots (8 AM - 10 PM)`)
            } else {
                toast.success(data.message)
            }

            return true
        } catch (error: any) {
            toast.error(error.message || 'Error initializing slots')
            return false
        } finally {
            setLoading(false)
        }
    }

    return { initializeSlots, loading }
}
