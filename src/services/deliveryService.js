import { supabase } from './supabase'
import { format } from 'date-fns'

const genDeliveryNumber = () => `DEL-${Date.now().toString().slice(-8)}`
const genTripNumber     = () => `TRIP-${Date.now().toString().slice(-8)}`

const DELIVERY_SELECT = `
  *,
  customers(id, name, phone, address),
  sales(id, invoice_number, total_amount),
  locations(id, name),
  dispatch_trips(id, trip_number, trip_date, driver_name, vehicle_number, status)
`

export const ORDER_STATUS_FLOW = {
  pending:    'packed',
  packed:     'dispatched',
  dispatched: 'delivered',
}

export const ORDER_STATUS_LABELS = {
  pending:    'Mark Packed',
  packed:     'Mark Dispatched',
  dispatched: 'Mark Delivered',
}

export const ORDER_STATUSES = ['pending', 'packed', 'dispatched', 'delivered', 'returned']

export const deliveryService = {
  getAll: async ({ status = null, locationId = null, date = null, tripId = null, from = null, to = null } = {}) => {
    let q = supabase
      .from('deliveries')
      .select(DELIVERY_SELECT)
      .order('created_at', { ascending: false })

    if (status)     q = q.eq('status', status)
    if (locationId) q = q.eq('location_id', locationId)
    if (date)       q = q.eq('scheduled_date', date)
    if (tripId)     q = q.eq('dispatch_trip_id', tripId)
    if (from)       q = q.gte('created_at', from)
    if (to)         q = q.lte('created_at', to)

    const { data, error } = await q
    if (error) throw error
    return data
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        customers(id, name, phone, address),
        sales(id, invoice_number, total_amount, sale_items(*, products(product_name, unit))),
        locations(id, name),
        dispatch_trips(id, trip_number, trip_date, driver_name, vehicle_number)
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // Dispatch list views: today, delayed, completed
  getDispatchList: async ({ view = 'today', date = null } = {}) => {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd')
    const { data, error } = await supabase
      .from('deliveries')
      .select(DELIVERY_SELECT)
      .order('scheduled_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    const all = data || []

    if (view === 'today') {
      return all.filter(d =>
        d.scheduled_date === targetDate &&
        !['delivered', 'returned', 'cancelled'].includes(d.status)
      )
    }
    if (view === 'delayed') {
      return all.filter(d =>
        d.scheduled_date && d.scheduled_date < targetDate &&
        !['delivered', 'returned', 'cancelled'].includes(d.status)
      )
    }
    if (view === 'completed') {
      return all.filter(d =>
        d.status === 'delivered' &&
        d.delivered_at &&
        d.delivered_at.startsWith(targetDate)
      )
    }
    return all
  },

  groupByCustomer: (deliveries) => {
    const groups = {}
    for (const d of deliveries) {
      const key = d.customer_id || 'unknown'
      if (!groups[key]) {
        groups[key] = {
          customerId: d.customer_id,
          customerName: d.customers?.name || 'Unknown',
          customerPhone: d.customers?.phone,
          orders: [],
        }
      }
      groups[key].orders.push(d)
    }
    return Object.values(groups).sort((a, b) => a.customerName.localeCompare(b.customerName))
  },

  create: async ({ saleId, customerId, locationId, driverName, vehicleNumber, deliveryAddress, scheduledDate, notes, createdBy }) => {
    const { data, error } = await supabase
      .from('deliveries')
      .insert([{
        delivery_number: genDeliveryNumber(),
        sale_id: saleId,
        customer_id: customerId,
        location_id: locationId,
        driver_name: driverName,
        vehicle_number: vehicleNumber,
        delivery_address: deliveryAddress,
        scheduled_date: scheduledDate || format(new Date(), 'yyyy-MM-dd'),
        notes,
        status: 'pending',
        created_by: createdBy,
      }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('deliveries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  updateStatus: async (id, status, { userId } = {}) => {
    const update = {
      status,
      status_updated_at: new Date().toISOString(),
      updated_by: userId || null,
    }
    if (status === 'packed')     update.packed_at = new Date().toISOString()
    if (status === 'delivered')  update.delivered_at = new Date().toISOString()
    return deliveryService.update(id, update)
  },

  markReturned: async (id, { userId, notes } = {}) => {
    return deliveryService.update(id, {
      status: 'returned',
      status_updated_at: new Date().toISOString(),
      updated_by: userId || null,
      notes: notes || undefined,
    })
  },

  // Proof of delivery
  uploadProof: async (deliveryId, file) => {
    const path = `deliveries/${deliveryId}/${Date.now()}.jpg`
    const { error: upErr } = await supabase.storage
      .from('delivery-proofs')
      .upload(path, file, { contentType: file.type || 'image/jpeg' })
    if (upErr) throw upErr

    const { data: { publicUrl } } = supabase.storage.from('delivery-proofs').getPublicUrl(path)
    await supabase.from('deliveries').update({ proof_photo_url: publicUrl }).eq('id', deliveryId)
    return publicUrl
  },

  uploadSignature: async (deliveryId, dataUrl) => {
    const blob = await (await fetch(dataUrl)).blob()
    const path = `deliveries/${deliveryId}/sig-${Date.now()}.png`
    const { error: upErr } = await supabase.storage
      .from('delivery-proofs')
      .upload(path, blob, { contentType: 'image/png' })
    if (upErr) throw upErr

    const { data: { publicUrl } } = supabase.storage.from('delivery-proofs').getPublicUrl(path)
    await supabase.from('deliveries').update({ proof_signature_url: publicUrl }).eq('id', deliveryId)
    return publicUrl
  },

  confirmDelivery: async (deliveryId, { proofType, file, signatureDataUrl, userId } = {}) => {
    if (proofType === 'photo' && file) {
      await deliveryService.uploadProof(deliveryId, file)
    }
    if (proofType === 'signature' && signatureDataUrl) {
      await deliveryService.uploadSignature(deliveryId, signatureDataUrl)
    }
    if (proofType === 'checkbox') {
      await deliveryService.update(deliveryId, { proof_confirmed: true })
    }
    return deliveryService.updateStatus(deliveryId, 'delivered', { userId })
  },

  // Dispatch trips
  getTrips: async ({ date = null } = {}) => {
    let q = supabase
      .from('dispatch_trips')
      .select(`
        *,
        deliveries(id, delivery_number, status, customers(name))
      `)
      .order('trip_date', { ascending: false })

    if (date) q = q.eq('trip_date', date)

    const { data, error } = await q
    if (error) throw error
    return data
  },

  createTrip: async ({ deliveryIds, tripDate, driverName, vehicleNumber, notes, createdBy }) => {
    const { data: trip, error: tripErr } = await supabase
      .from('dispatch_trips')
      .insert([{
        trip_number: genTripNumber(),
        trip_date: tripDate || format(new Date(), 'yyyy-MM-dd'),
        driver_name: driverName,
        vehicle_number: vehicleNumber,
        notes,
        status: 'planned',
        created_by: createdBy,
      }])
      .select()
      .single()
    if (tripErr) throw tripErr

    if (deliveryIds?.length) {
      const { error: assignErr } = await supabase
        .from('deliveries')
        .update({ dispatch_trip_id: trip.id })
        .in('id', deliveryIds)
      if (assignErr) throw assignErr
    }

    return trip
  },

  assignToTrip: async (deliveryId, tripId) => {
    return deliveryService.update(deliveryId, { dispatch_trip_id: tripId })
  },

  getSummary: async () => {
    const { data, error } = await supabase.from('deliveries').select('status, scheduled_date')
    if (error) throw error
    const today = format(new Date(), 'yyyy-MM-dd')
    const counts = { pending: 0, packed: 0, dispatched: 0, delivered: 0, returned: 0, failed: 0, cancelled: 0, today: 0, delayed: 0 }
    for (const d of data || []) {
      counts[d.status] = (counts[d.status] || 0) + 1
      if (d.scheduled_date === today && !['delivered', 'returned', 'cancelled'].includes(d.status)) {
        counts.today++
      }
      if (d.scheduled_date && d.scheduled_date < today && !['delivered', 'returned', 'cancelled'].includes(d.status)) {
        counts.delayed++
      }
    }
    return counts
  },
}

export default deliveryService
