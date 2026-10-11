// ── Delete-safety rules for the inventory screens ───────────────────────────
// Every inventory row can always be *deactivated* (soft-hide). A permanent
// delete is only safe when nothing references it, so the rule lives here as
// plain functions instead of being buried in the screens.

// A finished product may be hidden at any time, but deleting it is refused once
// it has been sold: `sale_items.product_id` is ON DELETE RESTRICT and dropping
// those rows would silently rewrite invoice totals and finance history.
export const productDeleteBlockReason = (saleCount) => {
  const n = parseInt(saleCount, 10) || 0
  if (n <= 0) return null
  return `This product appears in ${n} recorded sale${n === 1 ? '' : 's'} and cannot be deleted without altering your sales and finance history. Deactivate it instead to hide it from the POS.`
}

// Deleting a raw material detaches it from the recipes that use it, which
// recalculates those products' costs. That is safe, but never a surprise.
export const recipeDetachNote = (recipeCount) => {
  const n = parseInt(recipeCount, 10) || 0
  if (n <= 0) return null
  return `It is used in ${n} product recipe${n === 1 ? '' : 's'}. Deleting it removes it from ${n === 1 ? 'that recipe' : 'those recipes'} and recalculates ${n === 1 ? 'the product cost' : 'the product costs'}.`
}
