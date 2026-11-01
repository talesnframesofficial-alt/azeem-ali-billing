// Top navigation tabs.

// ---- tabs ----
document.querySelectorAll('nav button').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('main > section').forEach(s=>s.classList.add('hidden'));
    document.getElementById('tab-'+b.dataset.tab).classList.remove('hidden');
    if(b.dataset.tab==='reports') renderReports();
    if(b.dataset.tab==='daily'){ if(!document.getElementById('dayDate').value) document.getElementById('dayDate').value = localDate(); renderDaily(); }
    if(b.dataset.tab==='history') renderHistory();
    if(b.dataset.tab==='customers') renderCustomers();
  });
});

document.getElementById('billType').addEventListener('change', e=>{
  document.getElementById('custGstWrap').classList.toggle('hidden', e.target.value!=='gst');
});
