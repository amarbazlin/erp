/** Convert YYYY-MM-DD to ISO start-of-day (UTC) for Supabase queries */
export const toStartISO = (dateStr) => {
  if (!dateStr) return null
  return `${dateStr}T00:00:00.000Z`
}

/** Convert YYYY-MM-DD to ISO end-of-day (UTC) for Supabase queries */
export const toEndISO = (dateStr) => {
  if (!dateStr) return null
  return `${dateStr}T23:59:59.999Z`
}

export const todayStr = () => new Date().toISOString().slice(0, 10)

export const daysAgoStr = (days) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Check if a timestamp falls within an inclusive YYYY-MM-DD range */
export const isDateInRange = (timestamp, startDate, endDate) => {
  if (!timestamp || !startDate || !endDate) return false
  const day = timestamp.slice(0, 10)
  return day >= startDate && day <= endDate
}

/** Build { from, to } ISO strings for API calls from applied range */
export const toApiRange = ({ startDate, endDate }) => {
  if (!startDate || !endDate) return {}
  return { from: toStartISO(startDate), to: toEndISO(endDate) }
}

export const formatRangeLabel = (startDate, endDate) => {
  if (!startDate || !endDate) return ''
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(startDate)} – ${fmt(endDate)}`
}
