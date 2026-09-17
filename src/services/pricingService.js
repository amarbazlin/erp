import { supabase } from './supabase'

// ── Price tiers ───────────────────────────────────────────────────────────────
// The current (sweets) schema does not define a price_tiers table. This service
// keeps the customer pages working by returning an empty list when the table is
// not available, instead of crashing the page.
export const pricingService = {
  getTiers: async () => {
    const { data, error } = await supabase.from('price_tiers').select('*').order('name')
    // Table not part of the current schema — treat as "no tiers configured".
    if (error) return []
    return data || []
  },
}

export default pricingService
