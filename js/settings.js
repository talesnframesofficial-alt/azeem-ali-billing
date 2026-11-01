// Store settings.

// ---- settings ----
document.getElementById('saveSettingsBtn').addEventListener('click', async ()=>{
  const s = {
    name: document.getElementById('setStoreName').value.trim()||'Store',
    addr: document.getElementById('setStoreAddr').value.trim(),
    gst: document.getElementById('setStoreGst').value.trim()
  };
  if(!db){ toast('Storage unavailable'); return; }
  try{ await db.doc('meta/settings').set(s); toast('Settings saved'); }
  catch(e){ toast('Save failed'); }
});
