import { supabase } from './supabase'
import { loadSalesRange } from './analyticsService'
import { dayBounds } from '../utils/salesReporting'
import { summarizeFinance, validateFinanceEntry } from '../utils/financeReporting'

const source = type => {
  if (type === 'income') return { table: 'income_entries', date: 'income_date' }
  if (type === 'expense') return { table: 'expenses', date: 'expense_date' }
  throw new Error('Invalid finance entry type.')
}
const checkError = error => {
  if (!error) return
  if (['42P01', 'PGRST205'].includes(error.code)) {
    throw new Error('Finance setup is missing. Run src/database/FINANCE_SETUP.SQL in your Supabase SQL Editor, then refresh.')
  }
  throw error
}
const loadEntries = async (type, start, end) => {
  const { table, date } = source(type)
  const rows = []
  for (let offset = 0; ; ) {
    const { data, error } = await supabase.from(table).select('*')
      .gte(date, start).lte(date, end).order(date).order('id').range(offset, offset + 499)
    checkError(error)
    if (!data?.length) break
    rows.push(...data)
    offset += data.length
  }
  return rows
}

export const financeService = {
  getReport: async (start, end) => {
    dayBounds(start, end)
    const [sales, income, expenses] = await Promise.all([
      loadSalesRange(start, end), loadEntries('income', start, end), loadEntries('expense', start, end),
    ])
    return summarizeFinance(sales, income, expenses, start, end)
  },
  save: async (entry) => {
    if (!navigator.onLine) throw new Error('Connect to the internet before saving.')
    const valid = validateFinanceEntry(entry)
    const { table, date } = source(entry.type)
    const payload = { category: valid.category, description: valid.description, amount: valid.amount, [date]: valid.date }
    // Let income_entries default to the authenticated author. Do not send an Auth
    // UUID to expenses.created_by, which references the separate public.users table.
    let query = entry.id ? supabase.from(table).update(payload).eq('id', entry.id) : supabase.from(table).insert(payload)
    const { data, error } = await query.select().single()
    checkError(error)
    return data
  },
  delete: async (entry) => {
    if (!navigator.onLine) throw new Error('Connect to the internet before deleting.')
    const { table } = source(entry.type)
    const { data, error } = await supabase.from(table).delete().eq('id', entry.id).select('id').single()
    checkError(error)
    return data
  },
}
