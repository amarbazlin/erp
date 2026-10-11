import { useState, useEffect, useCallback } from 'react'
import { productService, categoryService } from '../services/productService'

// NOTE: the standalone `useProducts` hook that fed the removed Products list
// page was deleted — finished products are loaded by
// productService.getPerformance() on the Inventory page instead.

// POS products (with available stock + in_stock from the DB view)
export const usePosProducts = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await productService.getPosProducts()
      setProducts(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { products, loading, refetch: fetch }
}

export const useCategories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    categoryService.getAll()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading }
}

