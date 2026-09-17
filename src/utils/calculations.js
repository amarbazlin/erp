// Profit margin
export const calcMargin = (buyingPrice, sellingPrice) => {
  if (!buyingPrice || buyingPrice === 0) return 0
  return ((sellingPrice - buyingPrice) / buyingPrice) * 100
}

// Recipe cost — mirrors the database view `product_cost_view` / function
// `calculate_product_cost()`:
//     cost = Σ (quantity_required × cost_per_unit / 1000)
// The DB stores raw-material cost per KG/L/UNIT and always divides by 1000.
// Used only for the live preview while editing a product; the saved value
// always comes back from the database.
export const calcRecipeCost = (recipeItems = [], materialsById = {}) =>
  recipeItems.reduce((sum, r) => {
    const material = materialsById[r.inventory_item_id]
    const qty = parseFloat(r.quantity_required) || 0
    const costPerUnit = parseFloat(material?.cost_per_unit) || 0
    return sum + qty * (costPerUnit / 1000)
  }, 0)

// Stock value
export const calcStockValue = (quantity, price) => {
  return (quantity || 0) * (price || 0)
}

// Total portfolio value
export const calcTotalStockValue = (products) => {
  return products.reduce((total, p) => total + calcStockValue(p.quantity, p.buying_price), 0)
}

// Reorder quantity suggestion (EOQ simplified)
export const calcReorderQuantity = (avgDailySales, leadTimeDays, safetyFactor = 1.5) => {
  return Math.ceil(avgDailySales * leadTimeDays * safetyFactor)
}

// Days of stock remaining
export const calcDaysOfStock = (currentStock, avgDailySales) => {
  if (!avgDailySales || avgDailySales === 0) return Infinity
  return Math.floor(currentStock / avgDailySales)
}

// Percentage change
export const calcPercentChange = (current, previous) => {
  if (!previous || previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// Total from items array
export const calcTotal = (items, key = 'subtotal') => {
  return items.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0)
}

// Subtotal for a line item
export const calcSubtotal = (quantity, price) => {
  return (quantity || 0) * (price || 0)
}

// Average
export const calcAverage = (arr) => {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// Stock turnover ratio
export const calcTurnoverRatio = (cogs, avgInventoryValue) => {
  if (!avgInventoryValue || avgInventoryValue === 0) return 0
  return cogs / avgInventoryValue
}

// Revenue summary
export const calcRevenueSummary = (sales) => {
  const total = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0)
  return total
}

// Products below reorder level
export const getReorderProducts = (products) => {
  return products.filter(p => p.quantity <= p.reorder_level && p.status === 'active')
}

// Out of stock products
export const getOutOfStockProducts = (products) => {
  return products.filter(p => p.quantity === 0)
}
