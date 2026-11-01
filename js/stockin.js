// Stock In (each entry becomes a FIFO batch).

// ---- stock in ----
document.getElementById('siAddBtn').addEventListener('click', ()=>{
  const pid = document.getElementById('siProduct').value;
  const qty = parseFloat(document.getElementById('siQty').value)||0;
  const cost = parseFloat(document.getElementById('siCost').value)||0;
  if(!pid||qty<=0) return;
  const p = products.find(x=>x.id===pid); if(!p) return;
  // Same product at the SAME cost joins one line; a different cost stays its own batch.
  const existing = siItems.find(i=>i.pid===pid && Number(i.cost)===cost);
  if(existing) existing.qty += qty;
  else siItems.push({pid, name:p.name, brand:p.brand||'', qty, cost});
  document.getElementById('siQty').value=1; document.getElementById('siCost').value='';
  renderSiItems();
});
function renderSiItems(){
  const tb = document.querySelector('#siItemsTable tbody');
  tb.innerHTML = siItems.map((it,idx)=>{
    const p = products.find(x=>x.id===it.pid);
    const oldStock = Math.max(Number(p?.stock||0),0);
    return `<tr><td>${itemLabel(it)}</td><td>${it.qty}</td><td>₹${it.cost.toFixed(2)}</td><td>₹${(it.qty*it.cost).toFixed(2)}</td><td class="muted">New batch of ${it.qty} @ ₹${it.cost.toFixed(2)}${oldStock>0?'<br>sold after the '+oldStock+' already in stock':''}</td><td><button class="iconbtn" data-simrm="${idx}">✕</button></td></tr>`;
  }).join('');
  document.getElementById('siEmptyMsg').style.display = siItems.length?'none':'block';
  tb.querySelectorAll('[data-simrm]').forEach(b=>b.addEventListener('click', ()=>{siItems.splice(parseInt(b.dataset.simrm),1); renderSiItems();}));
  const total = siItems.reduce((s,i)=>s+i.qty*i.cost,0);
  document.getElementById('siTotal').innerHTML = `<span>Total</span><span>₹${total.toFixed(2)}</span>`;
}
document.getElementById('siClearBtn').addEventListener('click', ()=>{
  siItems=[]; document.getElementById('supName').value=''; document.getElementById('supRef').value=''; renderSiItems();
});
let siSaving = false;
document.getElementById('siSaveBtn').addEventListener('click', async ()=>{
  if(siSaving) return;
  if(siItems.length===0){ toast('Add at least one item'); return; }
  if(!db){ toast('Storage unavailable'); return; }
  const btn = document.getElementById('siSaveBtn');
  const label = btn.textContent;
  siSaving = true; btn.disabled = true; btn.textContent = 'Saving…';
  try{
    const items = siItems.map(i=>({pid:i.pid, name:i.name, brand:i.brand||'', qty:i.qty, cost:i.cost}));
    // One database call: the purchase record and every stock/cost update succeed together or not at all.
    const { data, error } = await sbClient.rpc('receive_stock', {
      p_supplier: document.getElementById('supName').value.trim(),
      p_ref: document.getElementById('supRef').value.trim(),
      p_items: items
    });
    if(error) throw error;
    toast('Stock saved — '+(data && data.count != null ? data.count : items.length)+' item(s) added');
    siItems = []; renderSiItems();
    document.getElementById('supName').value=''; document.getElementById('supRef').value='';
    db.refresh('products'); db.refresh('purchases'); db.refresh('stock_batches');
  }catch(e){
    console.error(e);
    if(e && e.code==='PGRST202') toast('Setup step missing: run the receive_stock SQL in Supabase first');
    else toast('Not saved, nothing was changed. Your list is still here — try again.');
  }finally{
    siSaving = false; btn.disabled = false; btn.textContent = label;
  }
});
