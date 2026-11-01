// Products, categories/brands, batches view, bulk add.

// ---- products ----
function distinctBrands(cat){
  const list = cat ? products.filter(p=>p.category===cat) : products;
  return [...new Set(list.map(p=>p.brand).filter(Boolean))].sort();
}
function distinctCategories(){ return [...new Set(products.map(p=>p.category).filter(Boolean))].sort(); }
function setBrandOptions(selId, brands, keepCurrent){
  const cur = keepCurrent ? document.getElementById(selId).value : '';
  document.getElementById(selId).innerHTML = '<option value="">All brands</option>'+brands.map(b=>`<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
  if(cur && brands.includes(cur)) document.getElementById(selId).value = cur;
}
function updateItemBrandOptions(){ setBrandOptions('itemBrand', distinctBrands(document.getElementById('itemCategory').value), true); }
function updateSiBrandOptions(){ setBrandOptions('siBrand', distinctBrands(document.getElementById('siCategory').value), true); }
function updateFilterBrandOptions(){ setBrandOptions('filterBrand', distinctBrands(document.getElementById('filterCategory').value), true); }
function renderBrandSelects(){
  const cats = distinctCategories();
  const catOpts = '<option value="">All categories</option>'+cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  ['itemCategory','siCategory','filterCategory'].forEach(id=>{
    const cur = document.getElementById(id).value;
    document.getElementById(id).innerHTML = catOpts;
    if(cur && cats.includes(cur)) document.getElementById(id).value = cur;
  });
  document.getElementById('categoryList').innerHTML = cats.map(c=>`<option value="${escapeHtml(c)}">`).join('');
  document.getElementById('brandList').innerHTML = [...new Set(products.map(p=>p.brand).filter(Boolean))].sort().map(b=>`<option value="${escapeHtml(b)}">`).join('');
  updateItemBrandOptions(); updateSiBrandOptions(); updateFilterBrandOptions();
}
function itemLabel(p){ return (p.brand ? escapeHtml(p.brand)+' ' : '') + escapeHtml(p.name); }
function itemLabelPlain(p){ return (p.brand ? p.brand+' ' : '') + p.name; }
function itemKey(p){ return (p.brand||'')+'|'+p.name; }
function pinSelection(list, cur){
  if(cur && !list.some(p=>p.id===cur)){
    const keep = products.find(p=>p.id===cur);
    if(keep) list = [keep, ...list];
  }
  return list;
}
function updateItemProductOptions(){
  const sel = document.getElementById('itemProduct');
  if(document.activeElement===sel) return; // don't yank the selection while it's being used
  const cur = sel.value;
  const brand = document.getElementById('itemBrand').value;
  const cat = document.getElementById('itemCategory').value;
  let list = products.filter(p=> (!brand||p.brand===brand) && (!cat||p.category===cat));
  list = pinSelection(list, cur); // keep the picked product even if a filter changed after picking it
  sel.innerHTML = '<option value="">Select product…</option>' +
    list.map(p=>`<option value="${p.id}">${itemLabel(p)} — ₹${Number(p.price).toFixed(2)} (Stock: ${p.stock??0})</option>`).join('');
  if(cur && list.some(p=>p.id===cur)) sel.value = cur;
}
function updateSiProductOptions(){
  const sel = document.getElementById('siProduct');
  if(document.activeElement===sel) return;
  const cur = sel.value;
  const brand = document.getElementById('siBrand').value;
  const cat = document.getElementById('siCategory').value;
  let list = products.filter(p=> (!brand||p.brand===brand) && (!cat||p.category===cat));
  list = pinSelection(list, cur);
  sel.innerHTML = '<option value="">Select product…</option>' +
    list.map(p=>`<option value="${p.id}">${itemLabel(p)} (Stock: ${p.stock??0})</option>`).join('');
  if(cur && list.some(p=>p.id===cur)) sel.value = cur;
}
function renderItemSearchResults(){
  const box = document.getElementById('itemSearchResults');
  const q = document.getElementById('itemSearch').value.trim().toLowerCase();
  if(!q){ box.innerHTML=''; box.classList.add('hidden'); return; }
  const brand = document.getElementById('itemBrand').value;
  const cat = document.getElementById('itemCategory').value;
  const list = products.filter(p=> (!brand||p.brand===brand) && (!cat||p.category===cat) &&
    (p.name.toLowerCase().includes(q) || (p.brand||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q))).slice(0,8);
  box.classList.remove('hidden');
  if(!list.length){ box.innerHTML = '<div class="muted" style="padding:8px 10px;">No matching products</div>'; return; }
  box.innerHTML = list.map(p=>`<div class="sr-item" data-pick="${p.id}">${itemLabel(p)} <span class="muted">— ₹${Number(p.price).toFixed(2)} (Stock: ${p.stock??0})</span></div>`).join('');
  box.querySelectorAll('[data-pick]').forEach(el=>el.addEventListener('click', ()=>{
    const id = el.dataset.pick;
    const p = products.find(x=>x.id===id);
    const sel = document.getElementById('itemProduct');
    if(p && !sel.querySelector(`option[value="${id}"]`)){
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = `${p.brand?p.brand+' ':''}${p.name} — ₹${Number(p.price).toFixed(2)} (Stock: ${p.stock??0})`;
      sel.appendChild(opt);
    }
    sel.value = id; // guaranteed to stick — the option above always exists now, and pinSelection keeps it through later refreshes
    document.getElementById('itemSearch').value = '';
    box.innerHTML=''; box.classList.add('hidden');
    document.getElementById('itemQty').focus();
  }));
}
document.getElementById('itemCategory').addEventListener('change', ()=>{ updateItemBrandOptions(); updateItemProductOptions(); renderItemSearchResults(); });
document.getElementById('itemBrand').addEventListener('change', ()=>{ updateItemProductOptions(); renderItemSearchResults(); });
document.getElementById('itemSearch').addEventListener('input', renderItemSearchResults);
document.getElementById('siCategory').addEventListener('change', ()=>{ updateSiBrandOptions(); updateSiProductOptions(); });
document.getElementById('siBrand').addEventListener('change', updateSiProductOptions);
document.getElementById('filterCategory').addEventListener('change', ()=>{ updateFilterBrandOptions(); renderProductsTable(); });
document.getElementById('filterBrand').addEventListener('change', renderProductsTable);

function renderProductSelect(){
  renderBrandSelects();
  updateItemProductOptions();
  updateSiProductOptions();
  document.getElementById('noProductsHint').style.display = products.length ? 'none':'block';
}
function renderLowStock(){
  const low = products.filter(p=>Number(p.reorderLevel||0)>0 && Number(p.stock??0)<=Number(p.reorderLevel));
  const card = document.getElementById('lowStockCard');
  if(low.length){
    card.classList.remove('hidden');
    document.getElementById('lowStockList').innerHTML = low.map(p=>
      `${escapeHtml(p.brand?p.brand+' — ':'')}${escapeHtml(p.name)}: <b style="color:var(--danger);">${p.stock??0}</b> left (reorder at ${p.reorderLevel})`
    ).join('<br>');
  }else{
    card.classList.add('hidden');
  }
}
function renderProductsTable(){
  renderLowStock();
  const fCat = document.getElementById('filterCategory').value;
  const fBrand = document.getElementById('filterBrand').value;
  const list = products.filter(p=> (!fCat||p.category===fCat) && (!fBrand||p.brand===fBrand));
  const tb = document.querySelector('#productsTable tbody');
  tb.innerHTML = list.map(p=>`
    <tr>
      <td>${escapeHtml(p.category||'—')}</td>
      <td>${escapeHtml(p.brand||'—')}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>₹${Number(p.price).toFixed(2)}</td>
      <td>${p.costPrice? '₹'+Number(p.costPrice).toFixed(2) : '<span style="color:var(--danger);">not set</span>'}</td>
      <td>${escapeHtml(p.unit||'')}</td>
      <td>${p.gstRate}%</td>
      <td>${p.stock??0}</td>
      <td><button class="iconbtn" data-batches="${p.id}">Batches</button> · <button class="iconbtn" data-edit="${p.id}">Edit</button> · <button class="iconbtn" data-del="${p.id}">Del</button></td>
    </tr>`).join('');
  document.getElementById('emptyProductsMsg').style.display = list.length? 'none':'block';
  tb.querySelectorAll('[data-batches]').forEach(b=>b.addEventListener('click', ()=>showBatches(b.dataset.batches)));
  tb.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click', ()=>editProduct(b.dataset.edit)));
  tb.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>delProduct(b.dataset.del)));
}
let stockBatches = [];
let batchShownId = null;
function showBatches(id){
  const p = products.find(x=>x.id===id); if(!p) return;
  batchShownId = id;
  const list = stockBatches.filter(b=>b.productId===id && Number(b.qtyLeft)>0).sort((a,b)=>String(a.receivedAt).localeCompare(String(b.receivedAt)));
  const have = list.reduce((t,b)=>t+Number(b.qtyLeft),0);
  const unb = Math.max(Number(p.stock||0) - have, 0);
  const rows = list.map(b=>`<tr><td>${new Date(b.receivedAt).getFullYear()<2001?'Opening':fmtDate(b.receivedAt)}</td><td>${escapeHtml(b.supplier||'—')}${b.ref?' <span class="muted">('+escapeHtml(b.ref)+')</span>':''}</td><td class="num">${Number(b.qtyIn)}</td><td class="num"><b>${Number(b.qtyLeft)}</b></td><td class="num">${inr(b.cost)}</td><td class="num">${inr(Number(b.qtyLeft)*Number(b.cost))}</td></tr>`);
  if(unb>0) rows.push(`<tr><td>Not batched yet</td><td class="muted">Stock edited by hand — counted at ₹${Number(p.costPrice||0).toFixed(2)} when next sold</td><td class="num">—</td><td class="num"><b>${unb}</b></td><td class="num">${inr(p.costPrice)}</td><td class="num">${inr(unb*Number(p.costPrice||0))}</td></tr>`);
  document.getElementById('batchTitle').textContent = 'Batches — '+itemLabelPlain(p)+' ('+(p.stock??0)+' in stock)';
  document.querySelector('#batchTable tbody').innerHTML = rows.join('') || '<tr><td colspan="6" class="muted">No stock in hand.</td></tr>';
  const val = list.reduce((t,b)=>t+Number(b.qtyLeft)*Number(b.cost),0) + unb*Number(p.costPrice||0);
  document.getElementById('batchTotal').innerHTML = `<span>Stock value (at cost)</span><span>${inr(val)}</span>`;
  const card = document.getElementById('batchCard'); card.classList.remove('hidden'); card.scrollIntoView({behavior:'smooth', block:'nearest'});
}
document.getElementById('batchClose').addEventListener('click', ()=>{ batchShownId=null; document.getElementById('batchCard').classList.add('hidden'); });
function editProduct(id){
  const p = products.find(x=>x.id===id); if(!p) return;
  document.getElementById('pEditId').value = id;
  document.getElementById('pBrand').value = p.brand||'';
  document.getElementById('pCategory').value = p.category||'';
  document.getElementById('pName').value = p.name;
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pUnit').value = p.unit||'pc';
  document.getElementById('pGst').value = p.gstRate;
  document.getElementById('pStock').value = p.stock??0;
  document.getElementById('pStock').dataset.orig = String(p.stock??0);
  document.getElementById('pCost').value = p.costPrice??'';
  document.getElementById('pCost').dataset.orig = String(p.costPrice??'');
  document.getElementById('pReorder').value = p.reorderLevel??'';
  document.getElementById('cancelEditBtn').classList.remove('hidden');
}
document.getElementById('cancelEditBtn').addEventListener('click', ()=>{
  document.getElementById('pEditId').value='';
  document.getElementById('pBrand').value='';
  document.getElementById('pCategory').value='';
  document.getElementById('pName').value='';
  document.getElementById('pPrice').value='';
  document.getElementById('pUnit').value='pc';
  document.getElementById('pGst').value='0';
  document.getElementById('pStock').value='0'; delete document.getElementById('pStock').dataset.orig;
  document.getElementById('pCost').value=''; delete document.getElementById('pCost').dataset.orig;
  document.getElementById('pReorder').value='';
  document.getElementById('cancelEditBtn').classList.add('hidden');
});
async function delProduct(id){
  if(!db) return;
  try{ await db.collection('products').doc(id).delete(); toast('Product removed'); }
  catch(e){ toast('Could not delete'); }
}
document.getElementById('exportProductsBtn').addEventListener('click', ()=>{
  const rows = [['Brand','Name','Price','Cost','Unit','GST%','Stock','Reorder level']];
  products.forEach(p=>rows.push([p.brand||'',p.name,Number(p.price).toFixed(2),Number(p.costPrice||0).toFixed(2),p.unit||'',p.gstRate,p.stock??0,p.reorderLevel||'']));
  exportCSV('products.csv', rows);
});
document.getElementById('bulkAddBtn').addEventListener('click', async ()=>{
  const raw = document.getElementById('bulkText').value.trim();
  if(!raw){ toast('Paste some rows first'); return; }
  if(!db){ toast('Storage unavailable'); return; }
  const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
  let ok=0, fail=0;
  const statusEl = document.getElementById('bulkStatus');
  for(let i=0;i<lines.length;i++){
    const delim = lines[i].includes('\t') ? '\t' : ',';
    const parts = lines[i].split(delim).map(s=>s.trim());
    const [category='', brand='', name='', price='', cost='', unit='pc', gst='0', stock='0', reorder='0'] = parts;
    if(!name || isNaN(parseFloat(price))){ fail++; continue; }
    statusEl.textContent = `Adding ${i+1}/${lines.length}…`;
    try{
      await db.collection('products').add({
        name, brand, category,
        price: parseFloat(price)||0,
        costPrice: parseFloat(cost)||0,
        unit: unit||'pc',
        gstRate: parseFloat(gst)||0,
        stock: parseFloat(stock)||0,
        reorderLevel: parseFloat(reorder)||0
      });
      ok++;
    }catch(e){ fail++; }
  }
  statusEl.textContent = '';
  toast(`Added ${ok} product(s)${fail?`, ${fail} skipped (missing name/price)`:''}`);
  if(ok) document.getElementById('bulkText').value='';
});
document.getElementById('saveProductBtn').addEventListener('click', async ()=>{
  const brand = document.getElementById('pBrand').value.trim();
  const category = document.getElementById('pCategory').value.trim();
  const name = document.getElementById('pName').value.trim();
  const price = parseFloat(document.getElementById('pPrice').value);
  const unit = document.getElementById('pUnit').value.trim()||'pc';
  const gstRate = parseFloat(document.getElementById('pGst').value);
  const stock = parseFloat(document.getElementById('pStock').value)||0;
  const costPrice = parseFloat(document.getElementById('pCost').value)||0;
  const reorderLevel = parseFloat(document.getElementById('pReorder').value)||0;
  if(!name || isNaN(price)){ toast('Enter name and price'); return; }
  if(!db){ toast('Storage unavailable'); return; }
  const id = document.getElementById('pEditId').value;
  try{
    if(id){
      // Only touch stock/cost if you actually typed a new value. Otherwise a stale number from when you
      // opened Edit would overwrite sales and stock-ins made in the meantime.
      const upd = {name, brand, category, price, unit, gstRate, reorderLevel};
      const so = document.getElementById('pStock').dataset.orig, co = document.getElementById('pCost').dataset.orig;
      if(String(document.getElementById('pStock').value) !== so) upd.stock = stock;
      if(String(document.getElementById('pCost').value) !== co) upd.costPrice = costPrice;
      await db.collection('products').doc(id).update(upd);
    }
    else await db.collection('products').add({name, brand, category, price, unit, gstRate, stock, costPrice, reorderLevel});
    toast('Product saved');
    document.getElementById('cancelEditBtn').click();
  }catch(e){ toast('Save failed'); }
});
