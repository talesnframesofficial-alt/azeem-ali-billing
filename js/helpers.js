// Shared helper functions.

// ---- helpers ----
function localDate(d){ d = d || new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dayBounds(ds){ const [y,m,d] = ds.split('-').map(Number); return [new Date(y,m-1,d).toISOString(), new Date(y,m-1,d+1).toISOString()]; }
function inr(n){ return '₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2, maximumFractionDigits:2}); }
function sumBy(arr, fn){ return arr.reduce((t,x)=>t+(Number(fn(x))||0), 0); }
function kpi(label, value, sub, cls){ return `<div class="kpi ${cls||''}"><div class="l">${label}</div><div class="v">${value}</div>${sub?`<div class="s">${sub}</div>`:''}</div>`; }
function fmtDate(iso){ return new Date(iso).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtTime(iso){ return new Date(iso).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); }


function escapeHtml(s){
  return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
