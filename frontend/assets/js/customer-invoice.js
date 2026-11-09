/**
 * MARJAAH QATAR — Customer Invoice Controller & PDF Exporter
 * Provides official commercial tax invoice preview and PDF download for customers.
 */

(function (global) {
  'use strict';

  function numberToWords(num) {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const val = Number(num);
    if (isNaN(val) || val <= 0) return 'Zero QAR Only';

    const n = Math.floor(val);
    const decimal = Math.round((val - n) * 100);

    function convertGroup(n) {
      if (n === 0) return '';
      if (n < 20) return a[n] + ' ';
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : '') + ' ';
      return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? convertGroup(n % 100) : '');
    }

    let words = '';
    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const remainder = n % 1000;

    if (millions > 0) words += convertGroup(millions) + 'Million ';
    if (thousands > 0) words += convertGroup(thousands) + 'Thousand ';
    if (remainder > 0) words += convertGroup(remainder);

    words = (words.trim() || 'Zero') + ' QAR';
    if (decimal > 0) {
      words += ` and ${decimal}/100 Dirhams`;
    }
    return words + ' Only';
  }

  const CustomerInvoice = {
    currentOrder: null,

    renderInvoiceHTML(o) {
      if (!o) return '<p class="text-center py-10 text-slate-400">Order not found.</p>';

      const orderNum = o.order_number || o.id || 'MTQ-00000';
      const createdDate = o.created_at || o.createdAt ? new Date(o.created_at || o.createdAt) : new Date();
      const dateFormatted = createdDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeFormatted = createdDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const custName = o.customer_name || o.full_name || o.delivery_address?.full_name || 'Valued Customer';
      const custPhone = o.customer_phone || o.phone || o.delivery_address?.phone || '—';
      const custEmail = o.customer_email || o.email || o.delivery_address?.email || '—';

      const isPickup = o.fulfillment_type === 'store_pickup';
      const pickupLoc = o.store_pickup_location || o.pickup_location || {};
      const addr = o.delivery_address || {};

      const subtotal = Number(o.subtotal || o.total || 0);
      const shipping = isPickup ? 0 : Number(o.shipping || 0);
      const discount = Number(o.discount || o.discount_amount || 0);
      const total = Number(o.total || (subtotal + shipping - discount) || 0);

      const paymentMethod = o.payment_method || (isPickup ? 'pay_at_store' : 'cash');
      const paymentMethodLabel = {
        cash: 'Cash on Delivery (COD)',
        cod: 'Cash on Delivery (COD)',
        pay_at_store: 'Pay at Store Hub (Cash/Card)',
        card: 'Credit / Debit Card (Online)',
        credit_card: 'Credit / Debit Card (Online)',
        apple_pay: 'Apple Pay',
      }[paymentMethod.toLowerCase()] || paymentMethod.toUpperCase();

      const paymentStatus = (o.payment_status || (paymentMethod === 'cash' || paymentMethod === 'pay_at_store' ? 'COD' : 'PAID')).toUpperCase();
      const orderStatus = (o.status || 'placed').toUpperCase();

      const items = Array.isArray(o.items) && o.items.length > 0 ? o.items : [
        {
          name: 'M.SHOP Smart Electronics Package',
          price: subtotal,
          quantity: 1,
          sku: 'MTQ-GEN',
          brand: 'MARJAAH',
        }
      ];

      const itemsRowsHtml = items.map((it, idx) => {
        const name = it.name || it.title || 'Product Item';
        const brand = it.brand || it.sku || 'M.SHOP Qatar';
        const price = Number(it.price || it.unit_price || 0);
        const qty = Number(it.quantity || it.qty || 1);
        const lineTotal = price * qty;

        return `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 12px; text-align: center; color: #64748B; font-family: monospace; font-size: 11px;">${idx + 1}</td>
            <td style="padding: 10px 12px;">
              <p style="font-weight: 700; color: #0F172A; font-size: 12px; margin: 0 0 2px 0;">${name}</p>
              <p style="font-size: 10px; color: #64748B; font-family: monospace; margin: 0;">Brand / SKU: ${brand}</p>
            </td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #334155;">${price.toFixed(2)} QAR</td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 700; font-size: 11px; color: #0F172A;">${qty}</td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700; font-size: 12px; color: #0F172A;">${lineTotal.toFixed(2)} QAR</td>
          </tr>
        `;
      }).join('');

      const fulfillmentHtml = isPickup
        ? `
          <div style="font-size: 11px; line-height: 1.5; color: #334155;">
            <p style="margin: 0 0 3px 0; font-weight: 700; color: #059669; font-size: 12px;">🏪 Store Pickup (Click &amp; Collect)</p>
            <p style="margin: 0 0 2px 0; font-weight: 600; color: #0F172A;">${pickupLoc.name || 'MARJAAH Tech &amp; Home Hub — Al Sadd'}</p>
            <p style="margin: 0 0 2px 0; color: #475569;">${pickupLoc.address || 'Building 42, Al Mirqab Al Jadeed St, Al Sadd'}, ${pickupLoc.city || 'Doha'}</p>
            ${pickupLoc.phone ? `<p style="margin: 0 0 2px 0; color: #475569;">Store Contact: <strong>${pickupLoc.phone}</strong></p>` : ''}
            <p style="margin: 0; color: #64748B;">Hours: ${pickupLoc.working_hours || pickupLoc.opening_hours || 'Daily 9:00 AM – 11:00 PM'}</p>
          </div>
        `
        : `
          <div style="font-size: 11px; line-height: 1.5; color: #334155;">
            <p style="margin: 0 0 3px 0; font-weight: 700; color: #4338CA; font-size: 12px;">🚚 Express Doorstep Delivery</p>
            <p style="margin: 0 0 2px 0; font-weight: 600; color: #0F172A;">${custName}</p>
            <p style="margin: 0 0 2px 0; color: #475569;">${[addr.building ? 'Building ' + addr.building : '', addr.street ? 'Street ' + addr.street : '', addr.zone ? 'Zone ' + addr.zone : '', addr.city || 'Doha', 'State of Qatar'].filter(Boolean).join(', ')}</p>
            <p style="margin: 0; color: #475569;">Phone: <strong>${custPhone}</strong></p>
            ${o.notes ? `<p style="margin: 3px 0 0 0; color: #6366F1; font-style: italic;">Note: ${o.notes}</p>` : ''}
          </div>
        `;

      const shippingLabel = isPickup
        ? '0.00 QAR (Free Store Pickup)'
        : (shipping === 0 ? '0.00 QAR (Free Express)' : `${shipping.toFixed(2)} QAR`);

      return `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FFFFFF; color: #0F172A; line-height: 1.4;">
          
          <!-- BRAND & INVOICE HEADER -->
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #0F172A; gap: 16px;">
            
            <!-- Left: Brand Identity -->
            <div style="flex: 1; min-width: 260px;">
              <div style="margin-bottom: 8px;">
                <svg width="180" height="45" viewBox="0 0 230 58" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="cust-inv-m-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#7E96FC" />
                      <stop offset="100%" stop-color="#5B73EA" />
                    </linearGradient>
                    <linearGradient id="cust-inv-m-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#C4A5FA" />
                      <stop offset="100%" stop-color="#9F78EB" />
                    </linearGradient>
                    <linearGradient id="cust-inv-m-darkblue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#3C56BE" />
                      <stop offset="100%" stop-color="#2F47A9" />
                    </linearGradient>
                  </defs>
                  <path d="M 6 26 C 6 26, 6 42, 6 46 C 6 51.5 10.5 56 16 56 C 21.5 56 26 51.5 26 46 C 26 38 18 30 6 26 Z" fill="url(#cust-inv-m-darkblue)"/>
                  <path d="M 38 32 C 38 32, 38 42, 38 46 C 38 51.5 42.5 56 48 56 C 53.5 56 58 51.5 58 46 C 58 36 50 28 38 32 Z" fill="url(#cust-inv-m-darkblue)"/>
                  <rect x="3" y="7" width="17" height="44" rx="8.5" transform="rotate(-40 11.5 29)" fill="url(#cust-inv-m-blue)"/>
                  <g opacity="0.4" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round">
                    <line x1="16" y1="20" x2="28" y2="34" />
                    <circle cx="16" cy="20" r="1.5" fill="#FFFFFF" />
                    <circle cx="28" cy="34" r="1.5" fill="#FFFFFF" />
                  </g>
                  <rect x="38" y="7" width="17" height="34" rx="8.5" transform="rotate(40 46.5 24)" fill="url(#cust-inv-m-purple)"/>
                  <circle cx="63" cy="46" r="4.5" fill="#B592F2"/>
                  <g fill="#1E293B">
                    <path d="M 91 19.5 C 89 17.5 86 16 81.5 16 C 75.5 16 71.5 19.5 71.5 24.5 C 71.5 29 74.5 31.8 81 33.5 C 87.5 35.2 89.5 37 89.5 40.5 C 89.5 44.5 85.5 47.5 79.5 47.5 C 74.5 47.5 70.5 45.2 68 42.5 C 66.8 41.2 66.8 39.2 68.2 38 C 69.5 36.8 71.5 36.9 72.8 38.2 C 74.5 40 77 41.5 79.5 41.5 C 82 41.5 83.5 40 83.5 38 C 83.5 35.5 81 34 75.5 32.5 C 69 30.7 65.5 28 65.5 23 C 65.5 16.5 71 10.5 81 10.5 C 86.5 10.5 91.5 12.8 94.5 15.8 C 95.8 17.1 95.7 19.2 94.2 20.5 C 93 21.6 91.9 20.5 91 19.5 Z"/>
                    <path d="M 104 14 C 104 12.3 105.3 11 107 11 C 108.7 11 110 12.3 110 14 V 25 H 125 V 14 C 125 12.3 126.3 11 128 11 C 129.7 11 131 12.3 131 14 V 44 C 131 45.7 129.7 47 128 47 C 126.3 47 125 45.7 125 44 V 31 H 110 V 44 C 110 45.7 108.7 47 107 47 C 105.3 47 104 45.7 104 44 Z"/>
                    <path d="M 154 10.5 C 165.5 10.5 174 19 174 29 C 174 39 165.5 47.5 154 47.5 C 142.5 47.5 134 39 134 29 C 134 19 142.5 10.5 154 10.5 Z M 154 16.5 C 146 16.5 140 22 140 29 C 140 36 146 41.5 154 41.5 C 162 41.5 168 36 168 29 C 168 22 162 16.5 154 16.5 Z"/>
                    <path d="M 183 14 C 183 12.3 184.3 11 186 11 H 198 C 205.5 11 211.5 16 211.5 23.5 C 211.5 31 205.5 36 198 36 H 192 V 44 C 192 45.7 190.7 47 189 47 C 187.3 47 186 45.7 186 44 V 14 H 183 Z M 192 17 V 30 H 198 C 202 30 205.5 27 205.5 23.5 C 205.5 20 202 17 198 17 H 192 Z"/>
                  </g>
                </svg>
              </div>
              <p style="margin: 0; font-size: 13px; font-weight: 800; color: #0F172A; letter-spacing: 0.5px;">MARJAAH QATAR — Marjaah Trading W.L.L.</p>
              <p style="margin: 2px 0; font-size: 11px; color: #475569; font-weight: 600;">شركة مرجاح للتجارة ذ.م.م &bull; Commercial Registration (CR) No: <strong style="color: #0F172A;">228717</strong></p>
              <p style="margin: 2px 0; font-size: 11px; color: #475569; line-height: 1.4;">
                Shop No. 8, Building No. 12, Street No. 295, Zone No. 91<br/>
                SOUQ UMM BESHER, Doha, State of Qatar
              </p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">
                Tel: <strong style="color: #0F172A;">+974 7799 1013</strong> &bull; Email: <strong style="color: #0F172A;">info@marjaah.com</strong> &bull; Web: <strong style="color: #0F172A;">www.marjaah.com</strong>
              </p>
            </div>

            <!-- Right: Invoice Metadata -->
            <div style="text-align: right; min-width: 220px;">
              <div style="display: inline-block; padding: 4px 12px; background: #0F172A; color: #FFFFFF; font-size: 12px; font-weight: 800; border-radius: 6px; letter-spacing: 1px; text-transform: uppercase;">
                TAX INVOICE / فاتورة ضريبية
              </div>
              <p style="margin: 8px 0 2px 0; font-family: monospace; font-size: 20px; font-weight: 900; color: #4338CA; letter-spacing: -0.5px;">#${orderNum}</p>
              <p style="margin: 2px 0; font-size: 11px; color: #475569;">Invoice Date: <strong style="color: #0F172A;">${dateFormatted}</strong> <span style="font-size: 10px; color: #64748B;">(${timeFormatted})</span></p>
              <p style="margin: 4px 0 2px 0; font-size: 11px; color: #475569;">
                Payment: <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; background: ${paymentStatus === 'PAID' ? '#DCFCE7' : '#FEF3C7'}; color: ${paymentStatus === 'PAID' ? '#15803D' : '#B45309'}; border: 1px solid ${paymentStatus === 'PAID' ? '#86EFAC' : '#FCD34D'};">${paymentStatus}</span>
              </p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">
                Status: <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1;">${orderStatus}</span>
              </p>
            </div>

          </div>

          <!-- CUSTOMER & FULFILLMENT TWO-COLUMN BOX -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding: 16px 0; border-bottom: 1px solid #E2E8F0;">
            
            <!-- Billed To -->
            <div style="background: #F8FAFC; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B;">Billed To / العميل</p>
              <p style="margin: 0 0 3px 0; font-size: 13px; font-weight: 800; color: #0F172A;">${custName}</p>
              <p style="margin: 0 0 2px 0; font-size: 11px; color: #475569;">Phone: <strong style="color: #0F172A;">${custPhone}</strong></p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #475569;">Email: ${custEmail}</p>
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #CBD5E1; font-size: 11px; color: #475569;">
                Payment Method: <strong style="color: #0F172A;">${paymentMethodLabel}</strong>
              </div>
            </div>

            <!-- Fulfillment Destination -->
            <div style="background: #F8FAFC; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B;">Fulfillment &amp; Delivery Destination / وجهة الاستلام</p>
              ${fulfillmentHtml}
            </div>

          </div>

          <!-- LINE ITEMS TABLE -->
          <div style="padding: 16px 0;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
              <thead>
                <tr style="background: #F1F5F9; border-bottom: 2px solid #0F172A; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px;">
                  <th style="padding: 10px 12px; width: 36px; text-align: center;">#</th>
                  <th style="padding: 10px 12px;">Item Description</th>
                  <th style="padding: 10px 12px; text-align: right; width: 110px;">Unit Price</th>
                  <th style="padding: 10px 12px; text-align: center; width: 60px;">Qty</th>
                  <th style="padding: 10px 12px; text-align: right; width: 110px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- TOTALS & FINANCIAL SUMMARY -->
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 14px 0; border-top: 2px solid #E2E8F0;">
            
            <!-- Left: Amount in words & tax notice -->
            <div style="flex: 1; min-width: 250px;">
              <div style="background: #EEF2FF; border: 1px solid #C7D2FE; padding: 10px 14px; border-radius: 10px; margin-bottom: 10px;">
                <p style="margin: 0 0 3px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #3730A3;">Amount in Words / المبلغ بالحروف</p>
                <p style="margin: 0; font-size: 12px; font-weight: 700; color: #1E1B4B; font-style: italic;">${numberToWords(total)}</p>
              </div>
              <p style="margin: 0; font-size: 10px; color: #64748B; line-height: 1.4;">
                * All prices are designated in Qatari Riyals (QAR / ر.ق).<br/>
                * Zero-rated or standard tax compliant under Qatar State Commercial Regulations.
              </p>
            </div>

            <!-- Right: Calculations breakdown -->
            <div style="width: 280px;">
              <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #475569; border-bottom: 1px solid #F1F5F9;">
                <span>Subtotal</span>
                <span style="font-family: monospace; font-weight: 600; color: #0F172A;">${subtotal.toFixed(2)} QAR</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #475569; border-bottom: 1px solid #F1F5F9;">
                <span>Delivery / Shipping Fee</span>
                <span style="font-family: monospace; font-weight: 600; color: #059669;">${shippingLabel}</span>
              </div>
              ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #E11D48; border-bottom: 1px solid #F1F5F9;">
                <span>Promotional Discount</span>
                <span style="font-family: monospace; font-weight: 600;">-${discount.toFixed(2)} QAR</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; margin-top: 6px; background: #F8FAFC; border: 2px solid #0F172A; border-radius: 8px;">
                <span style="font-size: 13px; font-weight: 800; color: #0F172A;">Total Amount Due / المدفوع</span>
                <span style="font-family: monospace; font-size: 17px; font-weight: 900; color: #4338CA;">${total.toFixed(2)} QAR</span>
              </div>
            </div>

          </div>

          <!-- FOOTER: WARRANTY, TERMS & COMPANY SEAL -->
          <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #E2E8F0; display: grid; grid-template-columns: 2fr 1fr; gap: 16px; font-size: 10px; color: #64748B; line-height: 1.4;">
            
            <div>
              <p style="margin: 0 0 4px 0; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 9px; letter-spacing: 0.6px;">Warranty &amp; Return Terms (الشروط والضمان)</p>
              <p style="margin: 0 0 3px 0;">1. <strong>Qatar Warranty:</strong> Genuine products covered under local authorized distributor warranty.</p>
              <p style="margin: 0 0 3px 0;">2. <strong>Returns &amp; Exchanges:</strong> Permitted within 14 days in original sealed packaging with this tax invoice as per Qatar Law No. (8) of 2008 on Consumer Protection.</p>
              <p style="margin: 0;">3. <strong>Service &amp; Inquiries:</strong> Contact support desk at +974 7799 1013 or email info@marjaah.com.</p>
            </div>

            <div style="border: 1px dashed #CBD5E1; border-radius: 10px; padding: 10px; text-align: center; background: #F8FAFC;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; border: 2px solid #6366F1; color: #6366F1; font-weight: 900; margin-bottom: 4px; font-size: 16px;">
                ✓
              </div>
              <p style="margin: 0; font-size: 10px; font-weight: 800; color: #0F172A;">MARJAAH TRADING W.L.L.</p>
              <p style="margin: 1px 0 0 0; font-size: 9px; color: #64748B;">Authorized Official Seal</p>
              <p style="margin: 3px 0 0 0; font-size: 8px; font-family: monospace; color: #94A3B8;">Commercial Reg. 228717</p>
            </div>

          </div>

          <!-- BOTTOM COPYRIGHT & BARCODE SIMULATION -->
          <div style="margin-top: 14px; padding-top: 8px; border-top: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94A3B8;">
            <span>MARJAAH Qatar &bull; State of Qatar &bull; Computer Generated Tax Invoice</span>
            <span style="font-family: monospace; letter-spacing: 2px; font-weight: 700; color: #64748B;">*${orderNum}*</span>
          </div>

        </div>
      `;
    },

    ensureModal() {
      let modal = document.getElementById('customer-invoice-modal');
      if (modal) return modal;

      modal = document.createElement('div');
      modal.id = 'customer-invoice-modal';
      modal.className = 'fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 hidden';
      modal.onclick = (e) => {
        if (e.target === modal) CustomerInvoice.close();
      };

      modal.innerHTML = `
        <div id="customer-invoice-modal-card" class="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden" onclick="event.stopPropagation()">
          
          <!-- Toolbar Header -->
          <div class="p-4 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <h3 class="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Official Tax Invoice</span>
                  <span id="cust-invoice-order-badge" class="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">MTQ-00000</span>
                </h3>
                <p class="text-[11px] text-slate-400">Marjaah Trading W.L.L. &bull; State of Qatar Tax Invoice</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- Download PDF Button -->
              <button type="button" id="btn-cust-download-pdf" onclick="CustomerInvoice.downloadPDF()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span id="btn-cust-download-pdf-text">Download PDF</span>
              </button>

              <!-- Print Invoice Button -->
              <button type="button" onclick="CustomerInvoice.print()" class="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition flex items-center gap-1.5 cursor-pointer" title="Print or Save via Browser Dialog">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                <span class="hidden sm:inline">Print</span>
              </button>

              <!-- Close Button -->
              <button type="button" onclick="CustomerInvoice.close()" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer" title="Close Invoice">
                ✕
              </button>
            </div>
          </div>

          <!-- Scrollable Body -->
          <div id="customer-invoice-modal-body" class="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60">
            <div id="customer-invoice-printable" class="bg-white text-slate-900 mx-auto max-w-3xl p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200">
              <!-- Dynamically populated -->
            </div>
          </div>

        </div>
      `;

      document.body.appendChild(modal);
      return modal;
    },

    async open(orderOrId) {
      let order = null;
      if (typeof orderOrId === 'object' && orderOrId !== null) {
        order = orderOrId;
      } else if (orderOrId) {
        try {
          if (window.api && typeof window.api.getOrder === 'function') {
            order = await window.api.getOrder(orderOrId);
          } else {
            const res = await fetch(`/api/orders/${orderOrId}`);
            order = await res.json();
          }
        } catch (e) {
          console.warn('Could not fetch order for invoice:', e);
        }
      }

      if (!order) {
        if (window.Toast) window.Toast.error('Could not load order for invoice.');
        else alert('Could not load order for invoice.');
        return;
      }

      this.currentOrder = order;
      const modal = this.ensureModal();

      const orderNum = order.order_number || order.id || 'MTQ-00000';
      const badge = document.getElementById('cust-invoice-order-badge');
      if (badge) badge.textContent = `#${orderNum}`;

      const container = document.getElementById('customer-invoice-printable');
      if (container) {
        container.innerHTML = this.renderInvoiceHTML(order);
      }

      modal.classList.remove('hidden');
    },

    close() {
      const modal = document.getElementById('customer-invoice-modal');
      if (modal) modal.classList.add('hidden');
    },

    async downloadPDF() {
      if (!this.currentOrder) return;
      const orderNum = (this.currentOrder.order_number || this.currentOrder.id || 'MTQ-00000').replace(/[^a-zA-Z0-9_-]/g, '');
      const element = document.getElementById('customer-invoice-printable');
      if (!element) return;

      const btn = document.getElementById('btn-cust-download-pdf');
      const btnText = document.getElementById('btn-cust-download-pdf-text');
      const origText = btnText ? btnText.textContent : 'Download PDF';

      if (btn) btn.disabled = true;
      if (btnText) btnText.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> Generating...';

      if (typeof window.html2pdf !== 'function') {
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = origText;
        this.print();
        return;
      }

      const opt = {
        margin: [6, 8, 6, 8],
        filename: `Invoice-${orderNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      };

      try {
        await window.html2pdf().set(opt).from(element).save();
        if (window.Toast) window.Toast.success(`Invoice #${orderNum} downloaded successfully.`);
      } catch (e) {
        console.error('Customer PDF export error:', e);
        this.print();
      } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = origText;
      }
    },

    print() {
      window.print();
    },
  };

  global.CustomerInvoice = CustomerInvoice;
})(typeof window !== 'undefined' ? window : this);

