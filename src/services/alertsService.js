import { supabase } from './supabase'

// ── Alerts ────────────────────────────────────────────────────────────────────
// The previous schema had an `alerts` table; the current sweets schema does not.
// Low-stock raw materials are the source of truth for alerts now, so this
// service derives them from `inventory_items` via the shared low-stock rule
// (current_quantity <= low_stock_threshold).
export const alertsService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, sku, current_quantity, low_stock_threshold, unit, updated_at')
      .eq('is_active', true)
      .order('current_quantity', { ascending: true })

    if (error) return []

    return (data || [])
      .filter(i => parseFloat(i.current_quantity) <= parseFloat(i.low_stock_threshold))
      .map(i => {
        const qty = parseFloat(i.current_quantity) || 0
        const threshold = parseFloat(i.low_stock_threshold) || 0
        const severity = qty <= 0 ? 'critical' : qty <= threshold / 2 ? 'high' : 'medium'
        return {
          id: i.id,
          inventory_item_id: i.id,
          severity,
          resolved: false,
          message: qty <= 0
            ? `${i.name} is out of stock`
            : `${i.name} is low on stock (${qty}${i.unit} left, threshold ${threshold}${i.unit})`,
          created_at: i.updated_at,
        }
      })
  },
}

export default alertsService
