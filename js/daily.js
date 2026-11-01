// Daily report.

// ---- daily report ----
let dayToken = 0, dayData = null;
async function getDayBills(ds){
  const [s,e] = dayBounds(ds);
  const covers = !db || bills.length < 500 || (bills.length && bills[bills.length-1].createdAt <= s);
  if(covers) return bills.filter(b=>b.createdAt>=s && b.createdAt<e);
  try{
    const snap = await db.collection('bills').where('createdAt','>=',s).where('createdAt','<',e).get();
    return snap.docs.map(d=>({id:d.id, ...d.data()}));
  }catch(err){ return bills.filter(b=>b.createdAt>=s && b.createdAt<e); }
}
async function renderDaily(){
  const ds = document.getElementById('dayDate').value || localDate();
  const tok = ++dayToken;
  const list = (await getDayBills(ds)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  if(tok !== dayToken) return;
  const active = list.filter(b=>!b.voided), nVoid = list.length - active.length;
  const sales = sumBy(active, b=>b.total);
  const recvBill = sumBy(active, b=>b.amountPaid ?? b.total);
  const credit = sales - recvBill;
  const gst = sumBy(active, b=>b.gstAmt);
  const profit = sumBy(active, billProfit);
  const pays = payments.filter(p=>(p.paidDate || localDate(new Date(p.createdAt))) === ds);
  const payTotal = sumBy(pays, p=>p.amount);
  const net = sales - gst;
  dayData = {ds, list, active, sales, recvBill, credit, gst, profit, pays, payTotal};
  document.getElementById('dayTitle').textContent = new Date(ds+'T12:00:00').toLocaleDateString('en-IN',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
  document.getElementById('dayKpis').innerHTML =
    kpi('Total sales (incl. GST)', inr(sales), active.length+' bill(s)'+(nVoid?` · ${nVoid} voided`:'')) +
    kpi('Money received', inr(recvBill+payTotal), `Billing ${inr(recvBill)} + old credit ${inr(payTotal)}`, 'good') +
    kpi('Credit given', inr(credit), 'Unpaid on this day\'s bills', credit>0.005?'warn':'') +
    kpi('GST collected', inr(gst), '') +
    kpi('Profit', inr(profit), net>0 ? 'Margin '+(profit/net*100).toFixed(1)+'% (ex-GST)' : '', profit>=0?'good':'warn');
  // products
  const map = {};
  let noCost = false;
  active.forEach(b=>(b.items||[]).forEach(it=>{
    const key = itemKey(it);
    const m = map[key] || (map[key] = {label: itemLabelPlain(it), qty:0, rev:0, profit:0});
    const cost = effectiveCost(it); if(cost===0) noCost = true;
    m.qty += Number(it.qty); m.rev += Number(it.qty)*itNet(it); m.profit += Number(it.qty)*(itNet(it)-cost);
  }));
  document.getElementById('dayCostHint').style.display = noCost ? 'block':'none';
  const prods = Object.values(map).sort((a,b)=>b.rev-a.rev);
  document.querySelector('#dayProducts tbody').innerHTML = prods.map(v=>`<tr><td>${escapeHtml(v.label)}</td><td class="num">${v.qty}</td><td class="num">${inr(v.rev)}</td><td class="num">${inr(v.profit)}</td></tr>`).join('');
  document.querySelector('#dayProducts tfoot').innerHTML = prods.length ? `<tr><td><b>Total</b></td><td class="num"><b>${sumBy(prods,x=>x.qty)}</b></td><td class="num"><b>${inr(sumBy(prods,x=>x.rev))}</b></td><td class="num"><b>${inr(sumBy(prods,x=>x.profit))}</b></td></tr>` : '';
  document.getElementById('dayProductsEmpty').style.display = prods.length ? 'none':'block';
  // payments
  document.querySelector('#dayPayments tbody').innerHTML = pays.map(p=>{ const c = customers.find(x=>x.id===p.customerId); return `<tr><td>${escapeHtml(c?c.name:'Unknown')}</td><td class="num">${inr(p.amount)}</td></tr>`; }).join('');
  document.getElementById('dayPaymentsEmpty').style.display = pays.length ? 'none':'block';
  // bills
  document.querySelector('#dayBills tbody').innerHTML = list.map(b=>{
    const recv = Number(b.amountPaid ?? b.total), due = Number(b.total)-recv;
    return `<tr class="${b.voided?'void':''}"><td>${escapeHtml(b.billNo)}${b.voided?' <span class="tag">VOID</span>':''}</td><td>${fmtTime(b.createdAt)}</td><td>${escapeHtml(b.customerName||'')}</td><td>${b.type==='gst'?'GST':'Simple'}</td><td class="num">${inr(b.total)}</td><td class="num">${inr(recv)}</td><td class="num" style="${due>0.005&&!b.voided?'color:var(--danger)':''}">${inr(due)}</td><td><button class="iconbtn" style="color:var(--accent);" data-dreprint="${b.id}">Reprint</button></td></tr>`;
  }).join('');
  document.getElementById('dayBillsEmpty').style.display = list.length ? 'none':'block';
  document.querySelectorAll('[data-dreprint]').forEach(btn=>btn.addEventListener('click', ()=>{ const b = list.find(x=>x.id===btn.dataset.dreprint); if(b) printBill(b); }));
}
function shiftDay(n){
  const [y,m,d] = (document.getElementById('dayDate').value || localDate()).split('-').map(Number);
  document.getElementById('dayDate').value = localDate(new Date(y,m-1,d+n)); renderDaily();
}
document.getElementById('dayPrev').addEventListener('click', ()=>shiftDay(-1));
document.getElementById('dayNext').addEventListener('click', ()=>shiftDay(1));
document.getElementById('dayToday').addEventListener('click', ()=>{ document.getElementById('dayDate').value = localDate(); renderDaily(); });
document.getElementById('dayDate').addEventListener('change', renderDaily);
document.getElementById('dayExportBtn').addEventListener('click', ()=>{
  if(!dayData){ return; }
  const D = dayData;
  const rows = [['Daily report', D.ds],['Total sales (incl. GST)', D.sales.toFixed(2)],['Received at billing', D.recvBill.toFixed(2)],['Credit payments received', D.payTotal.toFixed(2)],['Credit given', D.credit.toFixed(2)],['GST collected', D.gst.toFixed(2)],['Profit', D.profit.toFixed(2)],[],
    ['Bill#','Time','Customer','Type','Status','Subtotal','GST','Total','Received','Due','Profit']];
  D.list.forEach(b=>rows.push([b.billNo, fmtTime(b.createdAt), b.customerName||'', b.type, b.voided?'Voided':'Active', Number(b.subtotal).toFixed(2), Number(b.gstAmt||0).toFixed(2), Number(b.total).toFixed(2), Number(b.amountPaid ?? b.total).toFixed(2), (Number(b.total)-Number(b.amountPaid ?? b.total)).toFixed(2), b.voided?'':billProfit(b).toFixed(2)]));
  exportCSV('daily-report-'+D.ds+'.csv', rows);
});
document.getElementById('dayPrintBtn').addEventListener('click', ()=>{
  if(!dayData){ return; }
  const D = dayData;
  const row = (a,b)=>`<tr><td style="padding:3px 0;">${a}</td><td style="text-align:right;">${b}</td></tr>`;
  const billsRows = D.list.map(b=>{ const r = Number(b.amountPaid ?? b.total); return `<tr${b.voided?' style="text-decoration:line-through;color:#888"':''}><td>${escapeHtml(b.billNo)}</td><td>${escapeHtml(b.customerName||'')}</td><td style="text-align:right;">${inr(b.total)}</td><td style="text-align:right;">${inr(r)}</td><td style="text-align:right;">${inr(Number(b.total)-r)}</td></tr>`; }).join('');
  document.getElementById('printArea').innerHTML = `<div style="font-family:Arial,sans-serif;color:#000;padding:20px;max-width:720px;margin:0 auto;font-size:13px;">
    <h2 style="margin:0;">${escapeHtml(settings.name||'Store')} — Daily Report</h2>
    <p style="margin:2px 0 12px;">${document.getElementById('dayTitle').textContent}</p>
    <table style="width:100%;border-collapse:collapse;max-width:360px;">${row('Total sales (incl. GST)',inr(D.sales))}${row('Received at billing',inr(D.recvBill))}${row('Credit payments received',inr(D.payTotal))}${row('Credit given',inr(D.credit))}${row('GST collected',inr(D.gst))}${row('Profit',inr(D.profit))}</table>
    <h3 style="margin:16px 0 4px;">Bills</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="border-bottom:1px solid #000;text-align:left;"><th>Bill#</th><th>Customer</th><th style="text-align:right;">Total</th><th style="text-align:right;">Received</th><th style="text-align:right;">Due</th></tr></thead><tbody>${billsRows}</tbody></table></div>`;
  setTimeout(()=>window.print(), 200);
});
