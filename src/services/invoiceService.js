// ── Receipt PDF generation (browser print) ───────────────────────────────────
// Sweets-shop receipt: header, items, totals. Opens a print window.

const money = (n) => `Rs. ${parseFloat(n || 0).toFixed(2)}`

export const generateReceiptHTML = (sale) => {
  const items = (sale.sale_items || [])
    .map(i => `
      <tr>
        <td>${i.products?.name || 'Item'}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">${money(i.unit_price)}</td>
        <td style="text-align:right">${money(i.total_price)}</td>
      </tr>`)
    .join('')

  return `
    <html>
    <head>
      <title>Receipt ${sale.invoice_number}</title>
      <style>
        body { font-family: 'DM Sans', Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .muted { color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th, td { padding: 6px 4px; border-bottom: 1px solid #eee; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; }
        .totals { margin-top: 14px; font-size: 13px; }
        .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
        .grand { font-weight: 700; font-size: 15px; border-top: 1px solid #333; padding-top: 6px; margin-top: 4px; }
      </style>
    </head>
    <body>
      <h1>Sweet Restaurant</h1>
      <div class="muted">Receipt ${sale.invoice_number} · ${new Date(sale.created_at).toLocaleString()}</div>
      <div class="muted">Cashier: ${sale.users?.full_name || '—'}${sale.customers ? ` · Customer: ${sale.customers.full_name}` : ''}</div>
      <table>
        <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
      <div class="totals">
        <div><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
        ${parseFloat(sale.discount) > 0 ? `<div><span>Discount</span><span>−${money(sale.discount)}</span></div>` : ''}
        ${parseFloat(sale.tax) > 0 ? `<div><span>Tax</span><span>${money(sale.tax)}</span></div>` : ''}
        <div class="grand"><span>Total (${sale.payment_method.replace('_', ' ')})</span><span>${money(sale.total)}</span></div>
      </div>
    </body>
    </html>`
}

export const generateReceiptPDF = (sale) => {
  const win = window.open('', '_blank', 'width=420,height=640')
  if (!win) { alert('Please allow popups to print receipts'); return }
  win.document.write(generateReceiptHTML(sale))
  win.document.close()
  win.focus()
  win.print()
}

// Keep legacy names used elsewhere
export const generateInvoicePDF = generateReceiptPDF
export const generateQuotationPDF = generateReceiptPDF
export const generateDeliveryNotePDF = generateReceiptPDF
export const generateCreditNotePDF = generateReceiptPDF
