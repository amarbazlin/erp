import { useState, useEffect, useCallback } from 'react'
import { deliveryService } from '../services/deliveryService'
import { locationService } from '../services/locationService'

// ── Deliveries ────────────────────────────────────────────────────────────────
export const useDeliveries = (filters = {}) => {
  const [deliveries, setDeliveries] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [summary,    setSummary]    = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const [data, sum] = await Promise.all([
        deliveryService.getAll(filters),
        deliveryService.getSummary(),
      ])
      setDeliveries(data || [])
      setSummary(sum)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])
  return { deliveries, loading, summary, refetch: fetch }
}

// ── Locations ─────────────────────────────────────────────────────────────────
export const useLocations = () => {
  const [locations,        setLocations]        = useState([])
  const [defaultLocation,  setDefaultLocation]  = useState(null)
  const [loading,          setLoading]          = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await locationService.getAll()
      setLocations(data || [])
      setDefaultLocation((data || []).find(l => l.is_default) || data?.[0] || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { locations, defaultLocation, loading, refetch: fetch }
}
