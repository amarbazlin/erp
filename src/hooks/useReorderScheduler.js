import { useState, useEffect, useCallback, useRef } from 'react'
import { productService } from '../services/productService'
import { groupReordersBySupplier } from '../services/whatsappService'

// Reads VITE_REORDER_TIME from .env — defaults to "17:30" (5:30 PM)
const [TRIGGER_HOUR, TRIGGER_MIN] = (import.meta.env.VITE_REORDER_TIME || '17:30')
  .split(':')
  .map(Number)

const TODAY_KEY = () => `reorder_notified_${new Date().toISOString().slice(0, 10)}`

const useReorderScheduler = () => {
  const [modalOpen,       setModalOpen]       = useState(false)
  const [supplierGroups,  setSupplierGroups]  = useState([])
  const [loading,         setLoading]         = useState(false)
  const intervalRef = useRef(null)

  // Load low-stock products and group by supplier
  const loadReorderData = useCallback(async () => {
    setLoading(true)
    try {
      const lowStock = await productService.getBelowReorder()
      const groups   = groupReordersBySupplier(lowStock || [])
      setSupplierGroups(groups)
      return groups
    } catch (err) {
      console.error('[ReorderScheduler] Failed to load data:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Open the modal (loads fresh data first)
  const triggerModal = useCallback(async () => {
    const groups = await loadReorderData()
    if (groups.length > 0) {
      setModalOpen(true)
    }
  }, [loadReorderData])

  // Manual trigger for testing — bypasses time check and "already notified today" guard
  const triggerNow = useCallback(() => {
    triggerModal()
  }, [triggerModal])

  // Dismiss and mark today as notified so it won't pop again today
  const dismissModal = useCallback(() => {
    setModalOpen(false)
    try { localStorage.setItem(TODAY_KEY(), '1') } catch { /* ignore */ }
  }, [])

  // Check if current time matches the trigger window (fires within 1-minute window)
  const isReorderTime = () => {
    const now = new Date()
    return now.getHours() === TRIGGER_HOUR && now.getMinutes() === TRIGGER_MIN
  }

  // Was the notification already shown today?
  const alreadyNotifiedToday = () => {
    try { return localStorage.getItem(TODAY_KEY()) === '1' } catch { return false }
  }

  // Scheduler — checks every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      if (isReorderTime() && !alreadyNotifiedToday()) {
        localStorage.setItem(TODAY_KEY(), '1')
        await triggerModal()
      }
    }, 30_000) // check every 30 seconds

    return () => clearInterval(intervalRef.current)
  }, [triggerModal])

  // How many minutes until the next trigger (used for countdown display)
  const minutesUntilTrigger = () => {
    const now   = new Date()
    const target = new Date()
    target.setHours(TRIGGER_HOUR, TRIGGER_MIN, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    return Math.ceil((target - now) / 60_000)
  }

  return {
    modalOpen,
    supplierGroups,
    loading,
    dismissModal,
    triggerNow,       // call this from a "Test" button in Settings or Alerts
    minutesUntilTrigger,
    TRIGGER_HOUR,
    TRIGGER_MIN,
  }
}

export default useReorderScheduler
