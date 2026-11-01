// Loads each table from the database and keeps it refreshed.

function loadPayments(){
  db.collection('payments').onSnapshot(snap=>{
    payments = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(!document.getElementById('tab-customers').classList.contains('hidden')) renderCustomers();
    if(currentCustDetailId) showCustomerDetail(currentCustDetailId);
    if(!document.getElementById('tab-daily').classList.contains('hidden')) renderDaily();
  }, err=>console.error(err));
}

function loadProducts(){
  db.collection('products').orderBy('name').onSnapshot(snap=>{
    products = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderProductSelect();
    renderProductsTable();
    renderSiItems();
  }, err=>console.error(err));
}
function loadBatches(){
  db.collection('stock_batches').where('qtyLeft','>',0).onSnapshot(snap=>{
    stockBatches = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(batchShownId && !document.getElementById('batchCard').classList.contains('hidden')) showBatches(batchShownId);
  }, err=>console.error(err));
}
function loadBills(){
  db.collection('bills').orderBy('createdAt','desc').limit(500).onSnapshot(snap=>{
    bills = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderHistory();
    if(!document.getElementById('tab-daily').classList.contains('hidden')) renderDaily();
  }, err=>console.error(err));
}
function loadCustomers(){
  db.collection('customers').orderBy('name').onSnapshot(snap=>{
    customers = snap.docs.map(d=>({id:d.id, ...d.data()}));
    document.getElementById('custList').innerHTML = customers.map(c=>`<option value="${escapeHtml(c.name)}">`).join('');
    if(!document.getElementById('tab-customers').classList.contains('hidden')) renderCustomers();
  }, err=>console.error(err));
}
function loadPurchases(){
  db.collection('purchases').orderBy('createdAt','desc').limit(200).onSnapshot(snap=>{
    purchases = snap.docs.map(d=>({id:d.id, ...d.data()}));
    const tb = document.querySelector('#purchasesTable tbody');
    tb.innerHTML = purchases.map(p=>`<tr><td>${new Date(p.createdAt).toLocaleDateString()}</td><td>${escapeHtml(p.supplier||'—')}${p.ref?' <span class="muted">('+escapeHtml(p.ref)+')</span>':''}</td><td class="num">₹${Number(p.total).toFixed(2)}</td><td><button class="iconbtn" style="color:var(--accent);" data-viewpurchase="${p.id}">View</button></td></tr>`).join('');
    document.getElementById('emptyPurchasesMsg').style.display = purchases.length? 'none':'block';
    tb.querySelectorAll('[data-viewpurchase]').forEach(b=>b.addEventListener('click', ()=>{
      const p = purchases.find(x=>x.id===b.dataset.viewpurchase);
      if(p) printPurchase(p);
    }));
  }, err=>console.error(err));
}
function printPurchase(p){
  const rows = (p.items||[]).map(it=>{
    const amt = Number(it.qty)*Number(it.cost);
    return `<tr><td>${(it.brand?escapeHtml(it.brand)+' ':'')+escapeHtml(it.name)}</td><td>${it.qty}</td><td>₹${Number(it.cost).toFixed(2)}</td><td>₹${amt.toFixed(2)}</td></tr>`;
  }).join('');
  document.getElementById('printArea').innerHTML = `
    <div style="font-family:Arial,sans-serif; color:#000; padding:20px; max-width:480px; margin:0 auto;">
      <h2 style="margin-bottom:2px;">${escapeHtml(settings.name||'Store')}</h2>
      <p style="margin:0; font-size:13px;">Stock Received — Purchase Record</p>
      <hr>
      <p style="font-size:13px;"><b>Biller / Supplier:</b> ${escapeHtml(p.supplier||'—')}${p.ref?(' · Ref: '+escapeHtml(p.ref)):''}<br><b>Date:</b> ${new Date(p.createdAt).toLocaleString()}</p>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead><tr style="border-bottom:1px solid #000;"><th align="left">Item</th><th align="left">Qty</th><th align="left">Cost/pc</th><th align="left">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <hr>
      <p style="text-align:right; font-size:16px; font-weight:bold;">Total: ₹${Number(p.total).toFixed(2)}</p>
    </div>`;
  setTimeout(()=>window.print(), 200);
}
function loadSettings(){
  db.doc('meta/settings').onSnapshot(snap=>{
    if(snap.exists){
      settings = {...settings, ...snap.data()};
      document.getElementById('storeNameHeader').textContent = settings.name + ' — Billing';
      const fields = [['setStoreName','name'],['setStoreAddr','addr'],['setStoreGst','gst']];
      fields.forEach(([id,key])=>{
        const el = document.getElementById(id);
        if(document.activeElement!==el) el.value = settings[key] || ''; // don't clobber an in-progress edit
      });
    }
  }, err=>console.error(err));
}
