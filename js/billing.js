// New Bill: items, discounts, totals, saving, printing.

// ---- bill items ----
const round2 = x => Math.round((Number(x)+Number.EPSILON)*100)/100;
function itNet(it){ return Number(it.net!=null ? it.net : it.price); }   // unit price after all discounts
document.getElementById('addItemBtn').addEventListener('click', ()=>{
  const pid = document.getElementById('itemProduct').value;
  const qty = parseFloat(document.getElementById('itemQty').value)||0;
  const discPct = Math.min(Math.max(parseFloat(document.getElementById('itemDisc').value)||0,0),100);
  if(!pid || qty<=0) return;
  const p = products.find(x=>x.id===pid); if(!p) return;
  const existing = currentItems.find(i=>i.pid===pid && (Number(i.discPct)||0)===discPct);
  if(existing) existing.qty += qty;
  else currentItems.push({pid, name:p.name, brand:p.brand||'', price:p.price, gstRate:p.gstRate, costPrice:p.costPrice||0, qty, discPct});
  document.getElementById('itemQty').value = 1;
  document.getElementById('itemDisc').value = '';
  renderBillItems();
});
function renderBillItems(){
  const tb = document.querySelector('#billItemsTable tbody');
  tb.innerHTML = currentItems.map((it,idx)=>`
    <tr>
      <td>${itemLabel(it)}</td>
      <td>${it.qty}</td>
      <td>₹${it.price.toFixed(2)}</td>
      <td><input type="number" class="discin" data-disc="${idx}" min="0" max="100" step="0.01" value="${Number(it.discPct)||''}" placeholder="0" style="width:64px; padding:4px 6px;"></td>
      <td data-amt="${idx}">₹${(it.qty*it.price*(1-(Number(it.discPct)||0)/100)).toFixed(2)}</td>
      <td><button class="iconbtn" data-rm="${idx}">✕</button></td>
    </tr>`).join('');
  document.getElementById('emptyItemsMsg').style.display = currentItems.length? 'none':'block';
  tb.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click', ()=>{
    currentItems.splice(parseInt(b.dataset.rm),1); renderBillItems();
  }));
  tb.querySelectorAll('[data-disc]').forEach(inp=>inp.addEventListener('input', ()=>{
    const i = parseInt(inp.dataset.disc), it = currentItems[i]; if(!it) return;
    it.discPct = Math.min(Math.max(parseFloat(inp.value)||0,0),100);
    tb.querySelector('[data-amt="'+i+'"]').textContent = '₹'+(it.qty*it.price*(1-it.discPct/100)).toFixed(2);
    renderTotals();
  }));
  renderTotals();
}
// Discounts come off BEFORE GST, so GST is charged only on what the customer actually pays for.
function calcTotals(){
  const isGst = document.getElementById('billType').value==='gst';
  const lines = currentItems.map(it=>{
    const gross = it.qty*it.price;
    return {it, gross, afterItem: gross*(1-(Number(it.discPct)||0)/100)};
  });
  const sumAfter = lines.reduce((t,l)=>t+l.afterItem,0);
  const dIn = Math.max(parseFloat(document.getElementById('billDisc').value)||0, 0);
  const extra = document.getElementById('billDiscType').value==='pct' ? sumAfter*Math.min(dIn,100)/100 : Math.min(dIn, sumAfter);
  const ratio = sumAfter>0 ? extra/sumAfter : 0;     // spread over items in proportion to their value
  let subtotal=0, gstAmt=0, gross=0;
  lines.forEach(l=>{
    l.net = round2(l.afterItem*(1-ratio));
    l.gst = isGst ? round2(l.net*(Number(l.it.gstRate)||0)/100) : 0;
    subtotal += l.net; gstAmt += l.gst; gross += l.gross;
  });
  subtotal = round2(subtotal); gstAmt = round2(gstAmt); gross = round2(gross);
  return {isGst, lines, grossTotal:gross, discount:round2(gross-subtotal), subtotal, gstAmt, total: round2(subtotal+gstAmt)};
}
function renderTotals(){
  const {isGst, subtotal, gstAmt, total, discount, grossTotal} = calcTotals();
  const cgst = gstAmt/2, sgst = gstAmt/2;
  document.getElementById('billTotals').innerHTML = `
    ${discount>0.004? `<div class="tot"><span>Items total</span><span>₹${grossTotal.toFixed(2)}</span></div>
    <div class="tot" style="color:var(--accent);"><span>Discount</span><span>− ₹${discount.toFixed(2)}</span></div>`:''}
    <div class="tot"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
    ${isGst? `<div class="tot"><span>CGST</span><span>₹${cgst.toFixed(2)}</span></div>
    <div class="tot"><span>SGST</span><span>₹${sgst.toFixed(2)}</span></div>`:''}
    <div class="tot grand"><span>Total</span><span>₹${total.toFixed(2)}</span></div>`;
}
['billDisc','billDiscType','billType'].forEach(id=>{ const el=document.getElementById(id); el.addEventListener('input', renderTotals); el.addEventListener('change', renderTotals); });
document.getElementById('clearBillBtn').addEventListener('click', ()=>{
  currentItems = []; document.getElementById('custName').value=''; document.getElementById('custPhone').value='';
  document.getElementById('custGst').value=''; document.getElementById('amountPaid').value=''; document.getElementById('billDisc').value=''; renderBillItems();
});

async function nextInvoiceNumber(isGst, now){
  const { data, error } = await sbClient.rpc('next_invoice_number', { p_is_gst: isGst });
  if(error) throw error;
  return data;
}
async function findOrCreateCustomer(name, phone, gstin){
  const key = name.trim().toLowerCase();
  const existing = customers.find(c=>c.name.trim().toLowerCase()===key);
  if(existing) return existing.id;
  const ref = await db.collection('customers').add({name, phone:phone||'', gstin:gstin||''});
  return ref.id;
}
async function saveBillInner(){
  if(currentItems.length===0){ toast('Add at least one item'); return; }
  if(!db){ toast('Storage unavailable'); return; }
  const T = calcTotals();
  const custNameInput = document.getElementById('custName').value.trim();
  const custPhone = document.getElementById('custPhone').value.trim();
  const custGst = document.getElementById('custGst').value.trim();
  let customerId = null;
  if(custNameInput){
    try{ customerId = await findOrCreateCustomer(custNameInput, custPhone, custGst); }catch(e){}
  }
  const paidInput = document.getElementById('amountPaid').value.trim();
  const amountPaid = paidInput===''? T.total : Math.max(0, parseFloat(paidInput)||0);
  const payload = {
    type: T.isGst?'gst':'simple',
    customerId, customerName: custNameInput||'Walk-in customer', customerPhone: custPhone, customerGst: custGst,
    items: T.lines.map(l=>({
      pid: l.it.pid||null, name: l.it.name, brand: l.it.brand||'', price: l.it.price, discPct: Number(l.it.discPct)||0,
      net: l.it.qty>0 ? l.net/l.it.qty : l.it.price, qty: l.it.qty, gstRate: l.it.gstRate, costPrice: l.it.costPrice||0
    })),
    subtotal: T.subtotal, gstAmt: T.gstAmt, total: T.total, amountPaid, discount: T.discount
  };
  try{
    // One database call: invoice number, FIFO cost, stock and the bill itself all succeed together or not at all.
    const { data, error } = await sbClient.rpc('create_bill', { p_bill: payload });
    if(error) throw error;
    const bill = rowToCamel(data);
    toast('Bill saved');
    printBill(bill);
    currentItems = []; renderBillItems();
    document.getElementById('custName').value=''; document.getElementById('custPhone').value=''; document.getElementById('custGst').value=''; document.getElementById('amountPaid').value=''; document.getElementById('billDisc').value='';
    db.refresh('bills'); db.refresh('products'); db.refresh('stock_batches');
  }catch(e){
    console.error(e);
    if(e && e.code==='PGRST202') toast('Setup step missing: run the FIFO SQL in Supabase first');
    else toast('Could not save bill. Nothing was changed. Your items are still here — try again.');
  }
}
let billSaving = false;
async function saveBill(){
  if(billSaving) return;
  billSaving = true;
  const btn = document.getElementById('saveBillBtn');
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Saving…';
  try{ await saveBillInner(); }
  finally{ billSaving = false; btn.disabled = false; btn.textContent = label; }
}
document.getElementById('saveBillBtn').addEventListener('click', saveBill);

function printBill(bill){
  const isGst = bill.type==='gst';
  const anyDisc = bill.items.some(it=>Number(it.discPct)>0);
  const rows = bill.items.map(it=>{
    const amt = it.qty*itNet(it);
    return `<tr><td>${(it.brand?escapeHtml(it.brand)+' ':'')+escapeHtml(it.name)}</td><td>${it.qty}</td><td>₹${it.price.toFixed(2)}</td>${anyDisc?`<td>${Number(it.discPct)>0?Number(it.discPct)+'%':''}</td>`:''}${isGst?`<td>${it.gstRate}%</td>`:''}<td>₹${amt.toFixed(2)}</td></tr>`;
  }).join('');
  document.getElementById('printArea').innerHTML = `
    <div style="font-family:Arial,sans-serif; color:#000; padding:20px; max-width:480px; margin:0 auto;">
      <h2 style="margin-bottom:2px;">${escapeHtml(settings.name||'Store')}</h2>
      <p style="margin:0; font-size:13px;">${escapeHtml(settings.addr||'')}</p>
      ${isGst && settings.gst? `<p style="margin:0; font-size:13px;">GSTIN: ${escapeHtml(settings.gst)}</p>`:''}
      <hr>
      <p style="font-size:13px;"><b>${isGst?'Tax Invoice':'Bill'}</b> — ${bill.billNo}<br>Date: ${new Date(bill.createdAt).toLocaleString()}</p>
      <p style="font-size:13px;">Customer: ${escapeHtml(bill.customerName)} ${bill.customerPhone?('· '+escapeHtml(bill.customerPhone)):''}${bill.customerGst?('<br>GSTIN: '+escapeHtml(bill.customerGst)):''}</p>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead><tr style="border-bottom:1px solid #000;"><th align="left">Item</th><th align="left">Qty</th><th align="left">Rate</th>${anyDisc?'<th align="left">Disc</th>':''}${isGst?'<th align="left">GST</th>':''}<th align="left">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <hr>
      ${Number(bill.discount)>0.004?`<p style="text-align:right; font-size:13px; margin:2px 0;">Items total: ₹${(Number(bill.subtotal)+Number(bill.discount)).toFixed(2)}</p><p style="text-align:right; font-size:13px; margin:2px 0;">Discount: − ₹${Number(bill.discount).toFixed(2)}</p>`:''}
      <p style="text-align:right; font-size:13px; margin:2px 0;">Subtotal: ₹${bill.subtotal.toFixed(2)}</p>
      ${isGst?`<p style="text-align:right; font-size:13px; margin:2px 0;">CGST: ₹${(bill.gstAmt/2).toFixed(2)}</p>
      <p style="text-align:right; font-size:13px; margin:2px 0;">SGST: ₹${(bill.gstAmt/2).toFixed(2)}</p>`:''}
      <p style="text-align:right; font-size:16px; font-weight:bold;">Total: ₹${bill.total.toFixed(2)}</p>
      ${(()=>{ const paid=Number(bill.amountPaid??bill.total), due=Number(bill.total)-paid; return due>0.005? `<p style="text-align:right; font-size:13px; margin:2px 0;">Paid: ₹${paid.toFixed(2)}</p><p style="text-align:right; font-size:14px; font-weight:bold; color:#b3402c;">Balance due: ₹${due.toFixed(2)}</p>` : ''; })()}
      <p style="text-align:center; font-size:12px; margin-top:20px;">Thank you for your business!</p>
    </div>`;
  setTimeout(()=>window.print(), 200);
}
