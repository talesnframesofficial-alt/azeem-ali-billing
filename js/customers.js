// Customer accounts, credit payments, statements.

// ---- customers ----
function custAgg(id){
  const activeBills = bills.filter(b=>!b.voided && b.customerId===id);
  const total = sumBy(activeBills, b=>b.total);
  const paidOnBills = sumBy(activeBills, b=>b.amountPaid ?? b.total);
  const extraPayments = sumBy(payments.filter(p=>p.customerId===id), p=>p.amount);
  return {count:activeBills.length, total, received: paidOnBills+extraPayments, due: total - paidOnBills - extraPayments};
}
function renderCustomers(){
  const q = document.getElementById('custSearch').value.trim().toLowerCase();
  const mode = document.getElementById('custSort').value;
  let rows = customers.map(c=>({c, a:custAgg(c.id)}))
    .filter(r=>!q || r.c.name.toLowerCase().includes(q) || (r.c.phone||'').toLowerCase().includes(q));
  rows.sort((x,y)=> mode==='name' ? x.c.name.localeCompare(y.c.name) : mode==='billed' ? y.a.total-x.a.total : (y.a.due-x.a.due) || x.c.name.localeCompare(y.c.name));
  const tb = document.querySelector('#customersTable tbody');
  tb.innerHTML = rows.map(({c,a})=>`<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.phone||'')}</td><td class="num">${a.count}</td><td class="num">${inr(a.total)}</td><td class="num" style="color:${a.due>0.005?'var(--danger)':'var(--accent)'};">${inr(a.due)}</td><td><button class="iconbtn" data-viewcust="${c.id}" style="color:var(--accent);">View</button></td></tr>`).join('');
  document.getElementById('emptyCustomersMsg').style.display = rows.length ? 'none':'block';
  tb.querySelectorAll('[data-viewcust]').forEach(b=>b.addEventListener('click', ()=>showCustomerDetail(b.dataset.viewcust)));
}
document.getElementById('custSearch').addEventListener('input', renderCustomers);
document.getElementById('custSort').addEventListener('change', renderCustomers);
let currentCustDetailId = null;
function showCustomerDetail(id){
  const c = customers.find(x=>x.id===id); if(!c) return;
  const fresh = currentCustDetailId !== id;
  currentCustDetailId = id;
  const a = custAgg(id);
  document.getElementById('custDetailName').textContent = c.name;
  document.getElementById('custDetailMeta').textContent = [c.phone, c.gstin ? 'GSTIN '+c.gstin : ''].filter(Boolean).join(' · ');
  document.getElementById('custKpis').innerHTML =
    kpi('Total billed', inr(a.total), a.count+' bill(s)') + kpi('Total received', inr(a.received), '') +
    kpi('Outstanding due', inr(a.due), '', a.due>0.005?'warn':'good');
  if(fresh || !document.getElementById('custPayDate').value) document.getElementById('custPayDate').value = localDate();
  const entries = [];
  bills.filter(b=>b.customerId===id && !b.voided).forEach(b=>entries.push({t:new Date(b.createdAt).getTime(), date:fmtDate(b.createdAt), kind:'bill', b, billed:Number(b.total), recv:Number(b.amountPaid ?? b.total)}));
  payments.filter(p=>p.customerId===id).forEach(p=>entries.push({t: p.paidDate ? new Date(p.paidDate+'T23:59:00').getTime() : new Date(p.createdAt).getTime(), date: p.paidDate ? fmtDate(p.paidDate+'T12:00:00') : fmtDate(p.createdAt), kind:'pay', p, billed:0, recv:Number(p.amount)}));
  entries.sort((x,y)=>x.t-y.t);
  let bal = 0; entries.forEach(e=>{ bal += e.billed - e.recv; e.bal = bal; });
  entries.reverse();
  const tb = document.querySelector('#custLedgerTable tbody');
  tb.innerHTML = entries.map(e=> e.kind==='bill'
    ? `<tr><td>${e.date}</td><td>Bill ${escapeHtml(e.b.billNo)}</td><td class="num">${inr(e.billed)}</td><td class="num">${inr(e.recv)}</td><td class="num">${inr(e.bal)}</td><td><button class="iconbtn" style="color:var(--accent);" data-reprint="${e.b.id}">Reprint</button></td></tr>`
    : `<tr><td>${e.date}</td><td>Payment received</td><td class="num">—</td><td class="num">${inr(e.recv)}</td><td class="num">${inr(e.bal)}</td><td><button class="iconbtn" data-delpay="${e.p.id}" aria-label="Remove payment">✕</button></td></tr>`).join('');
  document.getElementById('emptyLedgerMsg').style.display = entries.length ? 'none':'block';
  tb.querySelectorAll('[data-reprint]').forEach(btn=>btn.addEventListener('click', ()=>{ const b = bills.find(x=>x.id===btn.dataset.reprint); if(b) printBill(b); }));
  tb.querySelectorAll('[data-delpay]').forEach(btn=>btn.addEventListener('click', async ()=>{
    if(!confirm('Remove this payment record?')) return;
    try{ await db.collection('payments').doc(btn.dataset.delpay).delete(); }catch(e){ toast('Could not remove'); }
  }));
  document.getElementById('custDetailCard').classList.remove('hidden');
  document.getElementById('custLayout').classList.add('has-detail');
  if(fresh) window.scrollTo({top:0});
}
document.getElementById('custDetailBack').addEventListener('click', ()=>{
  document.getElementById('custDetailCard').classList.add('hidden');
  document.getElementById('custLayout').classList.remove('has-detail');
  currentCustDetailId = null;
});
document.getElementById('custPaySaveBtn').addEventListener('click', async ()=>{
  const amt = parseFloat(document.getElementById('custPayAmt').value);
  const paidDate = document.getElementById('custPayDate').value || localDate();
  if(!amt || amt<=0 || !currentCustDetailId){ toast('Enter an amount'); return; }
  if(!db){ toast('Storage unavailable'); return; }
  try{
    await db.collection('payments').add({customerId: currentCustDetailId, amount: amt, paidDate, createdAt: new Date().toISOString()});
    toast('Payment recorded');
    document.getElementById('custPayAmt').value='';
  }catch(e){ toast('Could not save'); }
});
document.getElementById('exportCustomersBtn').addEventListener('click', ()=>{
  const rows = [['Name','Phone','GSTIN','Bills','Total billed','Received','Due']];
  customers.forEach(c=>{ const a=custAgg(c.id); rows.push([c.name,c.phone||'',c.gstin||'',a.count,a.total.toFixed(2),a.received.toFixed(2),a.due.toFixed(2)]); });
  exportCSV('customers.csv', rows);
});
