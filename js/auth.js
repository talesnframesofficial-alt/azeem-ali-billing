// Staff sign-in / sign-out and starting the app.

// ---- auth gate ----
let appStarted = false;
function startApp(){
  if(appStarted) return;
  appStarted = true;
  db = makeDb(sbClient);
  loadProducts(); loadBatches(); loadBills(); loadCustomers(); loadPurchases(); loadPayments(); loadSettings();
}
document.getElementById('loginBtn').addEventListener('click', async ()=>{
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  const {error} = await sbClient.auth.signInWithPassword({email, password});
  if(error){ errEl.textContent = error.message; errEl.style.display = 'block'; }
});
document.getElementById('loginPassword').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('loginBtn').click(); });
document.getElementById('signOutBtn').addEventListener('click', async ()=>{ await sbClient.auth.signOut(); });
