// Invoice, Quotation & Delivery Note PDF generation using jsPDF
// Install: npm install jspdf jspdf-autotable

import jsPDF from 'jspdf'
import 'jspdf-autotable'

const BUSINESS = {
  name:    import.meta.env.VITE_BUSINESS_NAME    || 'Rathna Traders',
  address: import.meta.env.VITE_BUSINESS_ADDRESS || 'Matara, Southern Province, Sri Lanka',
  phone:   import.meta.env.VITE_BUSINESS_PHONE   || '+94 XX XXX XXXX',
  email:   import.meta.env.VITE_BUSINESS_EMAIL   || 'info@rathntraders.lk',
  regNo:   import.meta.env.VITE_BUSINESS_REG     || '',
}

const ACCENT = [249, 115, 22]   // orange
const DARK   = [13, 17, 23]     // near black

// ── Shared header ─────────────────────────────────────────────────────────────
const drawHeader = (doc, title, number, date, status) => {
  // Dark header bar
  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 38, 'F')

  // Business name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(BUSINESS.name, 14, 16)

  // Document type badge
  doc.setFillColor(...ACCENT)
  doc.roundedRect(140, 6, 56, 10, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 168, 12.5, { align: 'center' })

  // Business details
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  doc.text(`${BUSINESS.address}  |  ${BUSINESS.phone}  |  ${BUSINESS.email}`, 14, 24)
  if (BUSINESS.regNo) doc.text(`Reg: ${BUSINESS.regNo}`, 14, 30)

  // Document number & date
  doc.setTextColor(...ACCENT)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(number, 196, 24, { align: 'right' })
  doc.setTextColor(180, 180, 180)
  doc.setFont('helvetica', 'normal')
  doc.text(date, 196, 30, { align: 'right' })
  if (status) {
    doc.setTextColor(255, 255, 255)
    doc.text(status, 196, 36, { align: 'right' })
  }

  // Orange underline
  doc.setFillColor(...ACCENT)
  doc.rect(0, 38, 210, 1.5, 'F')
}

// ── Customer box ──────────────────────────────────────────────────────────────
const drawCustomerBox = (doc, customer, yStart) => {
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(14, yStart, 90, 28, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('BILL TO', 18, yStart + 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(customer.name || '—', 18, yStart + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  if (customer.phone)   doc.text(`Tel: ${customer.phone}`,   18, yStart + 20)
  if (customer.address) doc.text(customer.address,           18, yStart + 26)
}

// ── Items table ───────────────────────────────────────────────────────────────
const drawItemsTable = (doc, items, yStart) => {
  doc.autoTable({
    startY: yStart,
    margin: { left: 14, right: 14 },
    head: [['#', 'Product', 'Qty', 'Unit', 'Unit Price (Rs.)', 'Total (Rs.)']],
    body: items.map((item, i) => [
      i + 1,
      item.product_name || item.products?.product_name || '—',
      item.quantity,
      item.unit || item.products?.unit || 'pcs',
      parseFloat(item.unit_price).toFixed(2),
      parseFloat(item.subtotal).toFixed(2),
    ]),
    headStyles: {
      fillColor: DARK,
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    styles: { lineColor: [220, 220, 220], lineWidth: 0.1 },
  })
  return doc.lastAutoTable.finalY
}

// ── Totals block ──────────────────────────────────────────────────────────────
const drawTotals = (doc, { subtotal, discount = 0, tax = 0, total }, y) => {
  const rows = [
    ['Subtotal', `Rs. ${parseFloat(subtotal).toFixed(2)}`],
  ]
  if (discount > 0) rows.push(['Discount', `- Rs. ${parseFloat(discount).toFixed(2)}`])
  if (tax > 0)      rows.push(['Tax', `Rs. ${parseFloat(tax).toFixed(2)}`])
  rows.push(['TOTAL', `Rs. ${parseFloat(total).toFixed(2)}`])

  doc.autoTable({
    startY: y + 4,
    margin: { left: 120, right: 14 },
    body: rows,
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { textColor: [100, 100, 100] }, 1: { halign: 'right', fontStyle: 'bold', textColor: DARK } },
    didDrawCell: (data) => {
      if (data.row.index === rows.length - 1) {
        doc.setFillColor(...ACCENT)
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(data.cell.text[0], data.cell.x + (data.column.index === 1 ? data.cell.width - 4 : 4), data.cell.y + 6,
          { align: data.column.index === 1 ? 'right' : 'left' })
      }
    },
    styles: { lineColor: [220, 220, 220], lineWidth: 0.1 },
  })
  return doc.lastAutoTable.finalY
}

// ── Footer ────────────────────────────────────────────────────────────────────
const drawFooter = (doc, notes = '') => {
  const y = doc.internal.pageSize.height - 22
  doc.setFillColor(245, 245, 245)
  doc.rect(0, y, 210, 22, 'F')
  doc.setFillColor(...ACCENT)
  doc.rect(0, y, 210, 0.8, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  if (notes) doc.text(`Notes: ${notes}`, 14, y + 8)
  doc.text('Thank you for your business!', 105, y + 14, { align: 'center' })
  doc.text(`${BUSINESS.name} | ${BUSINESS.phone}`, 105, y + 19, { align: 'center' })
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

export const generateInvoicePDF = (sale) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const date = new Date(sale.created_at).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })

  drawHeader(doc, 'INVOICE', sale.invoice_number, date, sale.payment_method?.toUpperCase())
  drawCustomerBox(doc, sale.customers || { name: 'Walk-in Customer' }, 46)

  // Payment method badge
  doc.setFillColor(240, 240, 240)
  doc.roundedRect(120, 46, 76, 28, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('PAYMENT METHOD', 158, 53, { align: 'center' })
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text((sale.payment_method || 'cash').toUpperCase(), 158, 62, { align: 'center' })
  if (sale.is_credit) {
    doc.setTextColor(249, 115, 22)
    doc.setFontSize(8)
    doc.text('CREDIT SALE', 158, 70, { align: 'center' })
  }

  const itemsEndY = drawItemsTable(doc, sale.sale_items || [], 82)
  const totalsEndY = drawTotals(doc, {
    subtotal: sale.total_amount,
    discount: sale.discount_amount || 0,
    total: sale.total_amount,
  }, itemsEndY)
  drawFooter(doc, sale.notes)

  doc.save(`${sale.invoice_number}.pdf`)
  return doc
}

export const generateQuotationPDF = (quotation) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const date = new Date(quotation.created_at || Date.now()).toLocaleDateString('en-LK')
  const validUntil = quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-LK') : '—'

  drawHeader(doc, 'QUOTATION', quotation.quote_number, date)
  drawCustomerBox(doc, quotation.customers || { name: quotation.customer_name || 'Customer' }, 46)

  doc.setFillColor(240, 240, 240)
  doc.roundedRect(120, 46, 76, 28, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('VALID UNTIL', 158, 53, { align: 'center' })
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text(validUntil, 158, 62, { align: 'center' })

  const itemsEndY = drawItemsTable(doc, quotation.quotation_items || [], 82)
  drawTotals(doc, { subtotal: quotation.total_amount, total: quotation.total_amount }, itemsEndY)
  drawFooter(doc, quotation.notes || 'Prices valid for the period shown. Subject to availability.')

  doc.save(`${quotation.quote_number}.pdf`)
  return doc
}

export const generateDeliveryNotePDF = (delivery) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const date = new Date(delivery.scheduled_date || delivery.created_at).toLocaleDateString('en-LK')

  drawHeader(doc, 'DELIVERY NOTE', delivery.delivery_number, date, delivery.status?.toUpperCase())
  drawCustomerBox(doc, delivery.customers || { name: 'Customer', address: delivery.delivery_address }, 46)

  doc.setFillColor(240, 240, 240)
  doc.roundedRect(120, 46, 76, 28, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('DRIVER / VEHICLE', 158, 53, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text(delivery.driver_name || '—', 158, 62, { align: 'center' })
  doc.setFontSize(8)
  doc.text(delivery.vehicle_number || '—', 158, 69, { align: 'center' })

  // Items from sale
  const items = delivery.sales?.sale_items || []
  const itemsEndY = drawItemsTable(doc, items, 82)

  // Signature box
  const sigY = itemsEndY + 12
  doc.setFillColor(248, 248, 248)
  doc.roundedRect(14, sigY, 85, 24, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('Received by (Signature)', 56, sigY + 8, { align: 'center' })
  doc.setDrawColor(180, 180, 180)
  doc.line(22, sigY + 18, 91, sigY + 18)
  doc.text('Name & Date', 56, sigY + 22, { align: 'center' })

  drawFooter(doc)
  doc.save(`${delivery.delivery_number}.pdf`)
  return doc
}

export const generateCreditNotePDF = (ret) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const date = new Date(ret.created_at).toLocaleDateString('en-LK')

  drawHeader(doc, 'CREDIT NOTE', ret.return_number, date)
  drawCustomerBox(doc, ret.customers || { name: 'Customer' }, 46)

  const itemsEndY = drawItemsTable(doc, ret.return_items || [], 82)
  drawTotals(doc, { subtotal: ret.total_amount, total: ret.total_amount }, itemsEndY)
  drawFooter(doc, ret.reason || '')

  doc.save(`${ret.return_number}-credit-note.pdf`)
  return doc
}

export default { generateInvoicePDF, generateQuotationPDF, generateDeliveryNotePDF, generateCreditNotePDF }
