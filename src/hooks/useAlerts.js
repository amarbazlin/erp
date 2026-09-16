import { useState, useEffect } from 'react'
import { alertsService } from '../services/alertsService'

export const useAlerts = () => {
  const [alerts, setAlerts] = useState([])
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const [data, count] = await Promise.all([
        alertsService.getAll({ resolved: false }),
        alertsService.getUnresolvedCount(),
      ])
      setAlerts(data || [])
      setUnresolvedCount(count)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  const resolveAlert = async (id) => {
    await alertsService.resolve(id)
    await fetchAlerts()
  }

  const resolveAll = async () => {
    await alertsService.resolveAll()
    await fetchAlerts()
  }

  return { alerts, unresolvedCount, loading, resolveAlert, resolveAll, refetch: fetchAlerts }
}
