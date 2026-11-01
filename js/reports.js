// Reports: sales, profit, outstanding due, stock value.

// ---- reports ----
function effectiveCost(it){
  if(it.costPrice) return Number(it.costPrice);
  const p = products.find(x=>x.name===it.name && (x.brand||'')===(it.brand||'')) || products.find(x=>x.name===it.name);
  return p ? Number(p.costPrice||0) : 0;
}
function billProfit(b){
  return (b.items||[]).reduce((s,it)=> s + (itNet(it)-effectiveCost(it))*Number(it.qty), 0);
}
// Outstanding = what customers still owe: bills - paid at billing - credit payments received later (same as Customers tab).
function totalDue(){
  let due = 0;
  customers.forEach(c=>{ const a = custAgg(c.id); if(a.due>0.005) due += a.due; });
  bills.filter(b=>!b.voided && !b.customerId).forEach(b=>{ const d = Number(b.total)-Number(b.amountPaid??b.total); if(d>0.005) due += d; });
  return due;
}
// Stock in hand: cost comes from the batches (what you really paid), price from each product's selling price.
function stockTotals(){
  const byProd = {};
  stockBatches.forEach(b=>{ (byProd[b.productId] = byProd[b.productId]||[]).push(b); });
  let cost=0, price=0, units=0, noCost=0;
  products.forEach(p=>{
    const st = Math.max(Number(p.stock)||0, 0); if(!st) return;
    const bs = byProd[p.id]||[];
    const have = bs.reduce((t,b)=>t+Number(b.qtyLeft),0);
    let c = bs.reduce((t,b)=>t+Number(b.qtyLeft)*Number(b.cost),0);
    if(st>have) c += (st-have)*Number(p.costPrice||0);       // stock added by hand, not in a batch yet
    else if(have>st) c = c*(st/have);
    if(c===0) noCost++;
    cost += c; price += st*Number(p.price||0); units += st;
  });
  return {cost, price, units, noCost};
}
function stockBoxes(){
  const t = stockTotals();
  return `<div class="card" style="margin-bottom:0;"><div class="muted">Stock in hand — at cost</div><div style="font-size:19px; font-weight:700;">${inr(t.cost)}</div><div class="muted">${t.units} units in stock</div></div>
     <div class="card" style="margin-bottom:0;"><div class="muted">Stock in hand — at selling price</div><div style="font-size:19px; font-weight:700;">${inr(t.price)}</div><div class="muted">Expected profit: <b style="color:var(--accent);">${inr(t.price-t.cost)}</b> (before GST and discounts)</div></div>
     ${t.noCost?`<p class="muted" style="grid-column:1/-1; margin:0;">${t.noCost} product(s) in stock have no cost price, so the cost total is understated.</p>`:''}`;
}
function renderReports(){
  const active = bills.filter(b=>!b.voided);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime()-6*86400000).toISOString();
  const startOfMonth = new Date(now.getFullYear(),now.getMonth(),1).toISOString();
  const salesSince = iso => active.filter(b=>b.createdAt>=iso).reduce((s,b)=>s+Number(b.total),0);
  const profitSince = iso => active.filter(b=>b.createdAt>=iso).reduce((s,b)=>s+billProfit(b),0);
  const periods = [
    ['Today', startOfToday],
    ['Last 7 days', startOfWeek],
    ['This month', startOfMonth],
    ['All time', '0000'],
  ];
  document.getElementById('reportBoxes').innerHTML = periods.map(([label,iso])=>`
    <div class="card" style="margin-bottom:0;">
      <div class="muted">${label}</div>
      <div style="font-size:19px; font-weight:700;">₹${salesSince(iso).toFixed(2)}</div>
      <div class="muted" style="margin-top:2px;">Profit: <b style="color:var(--accent);">₹${profitSince(iso).toFixed(2)}</b></div>
    </div>`).join('') +
    `<div class="card" style="margin-bottom:0;"><div class="muted">Total GST collected</div><div style="font-size:19px; font-weight:700;">₹${active.reduce((s,b)=>s+Number(b.gstAmt||0),0).toFixed(2)}</div></div>
     <div class="card" style="margin-bottom:0;"><div class="muted">Total bills</div><div style="font-size:19px; font-weight:700;">${active.length}</div></div>
     <div class="card" style="margin-bottom:0;"><div class="muted">Total outstanding due</div><div style="font-size:19px; font-weight:700; color:${totalDue()>0.005?'var(--danger)':'inherit'};">₹${totalDue().toFixed(2)}</div><div class="muted">After credit payments received</div></div>
     ${stockBoxes()}`;

  const noCost = active.some(b=>(b.items||[]).some(it=>effectiveCost(it)===0));
  document.getElementById('costHint').style.display = noCost ? 'block':'none';

  const map = {};
  active.forEach(b=> (b.items||[]).forEach(it=>{
    const key = itemKey(it);
    if(!map[key]) map[key] = {label: itemLabelPlain(it), qty:0, rev:0, profit:0};
    const cost = effectiveCost(it);
    map[key].qty += Number(it.qty);
    map[key].rev += Number(it.qty)*itNet(it);
    map[key].profit += Number(it.qty)*(itNet(it)-cost);
  }));
  const top = Object.values(map).sort((a,b)=>b.rev-a.rev).slice(0,10);
  document.querySelector('#topProductsTable tbody').innerHTML = top.map(v=>`
    <tr><td>${escapeHtml(v.label)}</td><td>${v.qty}</td><td>₹${v.rev.toFixed(2)}</td><td>₹${v.profit.toFixed(2)}</td></tr>`).join('');
  document.getElementById('emptyReportMsg').style.display = top.length? 'none':'block';
}
