// Bill history, void and edit.

// ---- history ----
function renderHistory(){
  const from = document.getElementById('histFrom').value;
  const to = document.getElementById('histTo').value;
  let list = bills;
  if(from) list = list.filter(b=>b.createdAt >= from);
  if(to) list = list.filter(b=>b.createdAt <= to+'T23:59:59');
  const tb = document.querySelector('#historyTable tbody');
  tb.innerHTML = list.map(b=>{
    const due = Number(b.total) - Number(b.amountPaid??b.total);
    return `
    <tr style="${b.voided?'opacity:.5;':''}">
      <td>${b.billNo}${b.voided?' <span class="badge simple">VOID</span>':''}</td>
      <td>${new Date(b.createdAt).toLocaleDateString()}</td>
      <td>${escapeHtml(b.customerName)}</td>
      <td><span class="badge ${b.type}">${b.type==='gst'?'GST':'Simple'}</span></td>
      <td>₹${Number(b.total).toFixed(2)}</td>
      <td>${due>0.005? `<b style="color:var(--danger);">₹${due.toFixed(2)}</b>`:'—'}</td>
      <td>
        <button class="iconbtn" style="color:var(--text);" data-reprint="${b.id}">Reprint</button>
        ${b.voided?'':` · <button class="iconbtn" style="color:var(--text);" data-editbill="${b.id}">Edit</button> · <button class="iconbtn" data-voidbill="${b.id}">Void</button>`}
      </td>
    </tr>`;
  }).join('');
  document.getElementById('emptyHistoryMsg').style.display = list.length? 'none':'block';
  tb.querySelectorAll('[data-reprint]').forEach(btn=>btn.addEventListener('click', ()=>{
    const b = bills.find(x=>x.id===btn.dataset.reprint); if(b) printBill(b);
  }));
  tb.querySelectorAll('[data-voidbill]').forEach(btn=>btn.addEventListener('click', ()=>voidBillBtn(btn.dataset.voidbill)));
  tb.querySelectorAll('[data-editbill]').forEach(btn=>btn.addEventListener('click', ()=>editBill(btn.dataset.editbill)));
}
function productForItem(it){
  const nm = (it.name||'').trim().toLowerCase(), br = (it.brand||'').trim().toLowerCase();
  const exact = products.filter(p=>(p.name||'').trim().toLowerCase()===nm && (p.brand||'').trim().toLowerCase()===br);
  if(exact.length===1) return exact[0];
  const sameName = products.filter(p=>(p.name||'').trim().toLowerCase()===nm);
  return sameName.length===1 ? sameName[0] : null; // never guess between two brands with the same name
}
const voidingNow = new Set();
async function doVoidBill(id){
  const b = bills.find(x=>x.id===id);
  if(!b || b.voided || voidingNow.has(id)) return false;
  voidingNow.add(id);
  try{
    // One database call: stock goes back into the same batches it came from, and the bill is marked void.
    const { data, error } = await sbClient.rpc('void_bill', { p_id: id });
    if(error) throw error;
    b.voided = true;
    db.refresh('bills'); db.refresh('products'); db.refresh('stock_batches');
    return (data && data.skipped) || [];   // [] means everything was restored
  }catch(e){
    console.error(e);
    if(e && e.code==='PGRST202') toast('Setup step missing: run the FIFO SQL in Supabase first');
    return false;
  }
  finally{ voidingNow.delete(id); }
}
async function voidBillBtn(id){
  if(!confirm('Void this bill? Its stock will be added back and it will no longer count in reports.')) return;
  const r = await doVoidBill(id);
  if(!r) toast('Could not void');
  else if(r.length) alert('Bill voided, but stock was NOT added back for: '+r.join(', ')+'.\nCorrect it in Products.');
  else toast('Bill voided — stock added back');
}
async function editBill(id){
  const b = bills.find(x=>x.id===id); if(!b || b.voided) return;
  if(!confirm('This voids the original bill and loads its items into New Bill so you can correct and re-save. Continue?')) return;
  const ok = await doVoidBill(id);
  if(!ok){ toast('Could not edit'); return; }
  if(ok.length) alert('Original voided, but stock was NOT added back for: '+ok.join(', ')+'.\nCorrect it in Products.');
  document.querySelector('nav button[data-tab="bill"]').click();
  document.getElementById('custName').value = b.customerName==='Walk-in customer' ? '' : b.customerName;
  document.getElementById('custPhone').value = b.customerPhone||'';
  document.getElementById('custGst').value = b.customerGst||'';
  document.getElementById('billType').value = b.type;
  document.getElementById('billType').dispatchEvent(new Event('change'));
  currentItems = (b.items||[]).map(it=>{
    const p = (it.pid && products.find(x=>x.id===it.pid)) || productForItem(it);
    return {pid:p?p.id:null, name:it.name, brand:it.brand||'', price:it.price, gstRate:it.gstRate, costPrice:it.costPrice||0, qty:it.qty, discPct:Number(it.discPct)||0};
  });
  const itemLevel = (b.items||[]).reduce((t,it)=>t+Number(it.qty)*Number(it.price)*(Number(it.discPct)||0)/100,0);
  const extra = round2(Number(b.discount||0) - itemLevel);
  document.getElementById('billDiscType').value = 'amt';
  document.getElementById('billDisc').value = extra>0.01 ? extra.toFixed(2) : '';
  renderBillItems();
  toast('Original voided — adjust items and save');
}
document.getElementById('exportBillsBtn').addEventListener('click', ()=>{
  const rows = [['Bill No','Date','Customer','Type','Subtotal','GST','Total','Paid','Due','Status']];
  bills.forEach(b=>{
    const paid = Number(b.amountPaid??b.total);
    rows.push([b.billNo, new Date(b.createdAt).toLocaleString(), b.customerName, b.type, Number(b.subtotal).toFixed(2), Number(b.gstAmt||0).toFixed(2), Number(b.total).toFixed(2), paid.toFixed(2), (Number(b.total)-paid).toFixed(2), b.voided?'Voided':'Active']);
  });
  exportCSV('bills.csv', rows);
});
document.getElementById('histFilterBtn').addEventListener('click', renderHistory);
document.getElementById('histClearBtn').addEventListener('click', ()=>{
  document.getElementById('histFrom').value=''; document.getElementById('histTo').value=''; renderHistory();
});
