import { useState, useEffect, useCallback } from 'react'
import { customerService } from '../services/customerService'

export const useCustomers = (filters = {}) => {
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await customerService.getAll(filters)
      setCustomers(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])
  return { customers, loading, error, refetch: fetch }
}

export const useCustomerSummary = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    customerService.getSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { summary, loading }
}
