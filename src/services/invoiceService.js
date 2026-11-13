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
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; padding: 0; }
          box-sizing: border-box;
          width: 80mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 3mm 4mm 2mm 4mm;
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
          font-size: 24px;
          font-weight: 900;
          color: #000;
          text-transform: none;
          text-align: center;
          margin: 0 0 2px 0;
        }
        .thermal-receipt .tr-muted {
          font-size: 11px;
          color: #000;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          text-align: center;
          margin: 0 0 4px 0;
        }
        .thermal-receipt .tr-divider {
          height: 0;
          border-top: 1px solid #000;
          margin: 3px 0;
        }
        .thermal-receipt .tr-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0 18px;
          margin: 0 0 3px 0;
        }
        .thermal-receipt .tr-meta-item {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 64px;
        }
        .thermal-receipt .tr-meta-label {
          font-size: 10px;
          color: #000;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .thermal-receipt .tr-meta-value {
          font-weight: 700;
          font-size: 12px;
        }
        .thermal-receipt .tr-items {
          width: 100%;
          border-collapse: collapse;
          margin: 2px 0 3px 0;
        }
        .thermal-receipt .tr-items th {
          background: #000;
          color: #fff;
          font-size: 10px;
          text-align: left;
          padding: 3px 4px;
          font-weight: 700;
        }
        .thermal-receipt .tr-items th.num { text-align: center; }
        .thermal-receipt .tr-items td {
          padding: 3px 4px;
          border-bottom: 1px dotted #000;
          font-size: 12px;
        }
        .thermal-receipt .tr-items tbody tr:last-child td { border-bottom: none; }
        .thermal-receipt .tr-items .num { text-align: right; }
        .thermal-receipt .tr-totals {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 2px 0;
        }
        .thermal-receipt .tr-totals .num { text-align: right; }
        .thermal-receipt .tr-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 2px 0;
        }
        .thermal-receipt .tr-row span:first-child { flex-shrink: 0; }
        .thermal-receipt .tr-row .num { text-align: right; }
        .thermal-receipt .tr-grand {
          font-size: 15px;
          font-weight: 900;
          border-top: 1px solid #000;
          padding-top: 3px;
          margin-top: 3px;
        }
        .thermal-receipt .tr-grand .num { text-align: right; }
      </style>
    </head>
    <body>
      <div class="thermal-receipt">
        <div class="tr-shop">KAH Laban</div>
        <div class="tr-muted">INVOICE</div>

        <div class="tr-meta">
          <div class="tr-meta-item"><span class="tr-meta-label">Invoice No.</span><span class="tr-meta-value">${sale.invoice_number || '—'}</span></div>
          <div class="tr-meta-item"><span class="tr-meta-label">Date</span><span class="tr-meta-value">${new Date(sale.created_at || '').toLocaleString()}</span></div>
          <div class="tr-meta-item"><span class="tr-meta-label">Cashier</span><span class="tr-meta-value">${sale.users?.full_name || '—'}</span></div>
          <div class="tr-meta-item"><span class="tr-meta-label">Customer</span><span class="tr-meta-value">${sale.customers ? sale.customers.full_name : 'Walk-in'}</span></div>
        </div>

        <div class="tr-divider"></div>
        <div class="tr-divider"></div>
        <table class="tr-items">
          <thead>
            <tr>
              <th>Item</th>
              <th class="num">Qty</th>
              <th class="num">Price</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>
        <div class="tr-divider"></div>

        <div class="tr-totals"><span>Subtotal</span><span class="num">${money(sale.subtotal)}</span></div>
        ${parseFloat(sale.discount) > 0 ? `<div class="tr-totals"><span>Discount</span><span class="num">−${money(sale.discount)}</span></div>` : ''}
        ${parseFloat(sale.tax) > 0 ? `<div class="tr-totals"><span>Tax</span><span class="num">${money(sale.tax)}</span></div>` : ''}
        <div class="tr-grand"><span>Total</span><span class="num">${money(sale.total)}</span></div>
        <div class="tr-row"><span>Payment</span><span>${{
          cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', online: 'Online'
        }[sale.payment_method] || sale.payment_method}</span></div>
        <div class="tr-divider"></div>
        <div class="tr-muted" style="text-align:center">Thank you! Please come again.</div>
      </div>
    </body>
    </html>`
}


let printWin = null;

export const generateReceiptPDF = (sale) => {
  // Open/reuse a single print window, and delay printing until the new
  // document is ready so the browser never opens a second window.
  if (printWin && !printWin.closed) {
    printWin.focus();
    printWin.document.open();
    printWin.document.write(generateReceiptHTML(sale));
    printWin.document.close();
    setTimeout(() => { if (!printWin.closed) printWin.print(); }, 250);
    return;
  }

  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) {
    alert('Please allow popups to print receipts');
    return;
  }
  printWin = win;
  win.document.write(generateReceiptHTML(sale));
  win.document.close();
  win.focus();
  setTimeout(() => {
    if (!win.closed) win.print();
  }, 250);
};

// Keep legacy names used elsewhere
export const generateInvoicePDF = generateReceiptPDF
export const generateQuotationPDF = generateReceiptPDF
export const generateDeliveryNotePDF = generateReceiptPDF
export const generateCreditNotePDF = generateReceiptPDF
