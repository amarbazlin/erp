// ── Receipt PDF generation (browser print) ───────────────────────────────────
// Sweets-shop receipt: header, items, totals. Opens a print window.

const money = (n) => `Rs. ${parseFloat(n || 0).toFixed(2)}`
export const generateReceiptHTML = (sale) => {
  const items = (sale.sale_items || [])
    .map(i => `
      <tr>
        <td style="text-align:left; word-break:break-word">${i.products?.name || 'Item'}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">${money(i.unit_price)}</td>
        <td style="text-align:right">${money(i.total_price)}</td>
      </tr>`).join('')

  const discountLine = parseFloat(sale.discount) > 0
    ? `<div class="tr-row"><span>Discount</span><span>−${money(sale.discount)}</span></div>`
    : ''
  const taxLine = parseFloat(sale.tax) > 0
    ? `<div class="tr-row"><span>Tax</span><span>${money(sale.tax)}</span></div>`
    : ''

  return `
    <html>
    <head>
      <title>Receipt ${sale.invoice_number}</title>
      <style>
        .thermal-receipt {
          box-sizing: border-box;
          width: 80mm;
          max-width: 100%;
          margin: 0 auto;
          --receipt-right-padding: calc(7mm + 3ch);
          padding: 4mm var(--receipt-right-padding) 4mm 3mm;
          background: #fff;
          color: #000;
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.4;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
        }
        .thermal-receipt .tr-shop {
          font-family: 'Arial Black', Arial, sans-serif;
          font-size: 22px;
          font-weight: 900;
          color: #000;
          line-height: 1.2;
          margin-bottom: 4px;
          text-transform: none;
        }
        .thermal-receipt .tr-muted { font-size: 11px; color: #000; }
        .thermal-receipt .tr-divider {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }
        .thermal-receipt .tr-row {
          display: flex;
          justify-content: space-between;
          gap: 6px;
        }
        .thermal-receipt .tr-row span:first-child { flex-shrink: 0; }
        .thermal-receipt .tr-row span:last-child {
          min-width: 0;
          text-align: right;
          overflow-wrap: anywhere;
        }
        .thermal-receipt .tr-total {
          font-size: 15px;
          font-weight: 700;
          margin: 2px 0;
        }
        .thermal-receipt table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 2px 0; }
        .thermal-receipt th, .thermal-receipt td { overflow-wrap: anywhere; }
        .thermal-receipt th:first-child { width: 36%; }
        .thermal-receipt th:nth-child(2) { width: 12%; }
        .thermal-receipt th:nth-child(3), .thermal-receipt th:nth-child(4) { width: 26%; }
        .thermal-receipt th { font-weight: 700; border-bottom: 1px solid #000; padding: 2px 0; }
        .thermal-receipt td { padding: 2px 0; vertical-align: top; }
      </style>
    </head>
    <body>
      <div class="thermal-receipt">
        <div class="tr-shop">${import.meta.env && import.meta.env.VITE_BUSINESS_NAME || 'Sweet Restaurant'}</div>
        <div class="tr-muted">— Sale Receipt —</div>
        <div class="tr-divider"></div>
        <div class="tr-row"><span>Order No.</span><span>${sale.invoice_number || '—'}</span></div>
        <div class="tr-row"><span>Date</span><span>${new Date(sale.created_at || '').toLocaleString()}</span></div>
        <div class="tr-row"><span>Cashier</span><span>${sale.users?.full_name || '—'}</span></div>
        <div class="tr-row"><span>Customer</span><span>${sale.customers ? sale.customers.full_name : 'Walk-in'}</span></div>
        <div class="tr-divider"></div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>
        <div class="tr-divider"></div>
        <div class="tr-row"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
        ${parseFloat(sale.discount) > 0 ? `<div class="tr-row"><span>Discount</span><span>−${money(sale.discount)}</span></div>` : ''}
        ${parseFloat(sale.tax) > 0 ? `<div class="tr-row"><span>Tax</span><span>${money(sale.tax)}</span></div>` : ''}
        <div class="tr-row tr-total"><span>TOTAL</span><span>${money(sale.total)}</span></div>
        <div class="tr-row"><span>Payment</span><span>${{
          cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', online: 'Online'
        }[sale.payment_method] || sale.payment_method}</span></div>
        <div class="tr-divider"></div>
        <div class="tr-muted" style="text-align:center">Thank you! Please come again.</div>
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
