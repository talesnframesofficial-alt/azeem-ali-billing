// Supabase connection, the database adapter, and CSV export.

// ---- supabase connection ----
const SUPABASE_URL = 'https://bwmxypnxkcuilmgyxcfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bXh5cG54a2N1aWxtZ3l4Y2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NjQ1MjgsImV4cCI6MjEwNjI0MDUyOH0.2mUTjUDuqBqM-XBXAFhqZcnDnTk95rA_RO_srGUHnpY';
if(!window.supabase){
  document.write('<div style="font-family:sans-serif;padding:24px;color:#b3402c;">Could not load the Supabase library (check your internet connection and reload). The app cannot start without it.</div>');
  throw new Error('window.supabase failed to load — check the <script src> for supabase-js and your network connection.');
}
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function camelToSnake(k){ return k.replace(/[A-Z]/g, c => '_'+c.toLowerCase()); }
function snakeToCamel(k){ return k.replace(/_([a-z0-9])/g, (_,c) => c.toUpperCase()); }
function rowToCamel(row){ const o={}; for(const k in row) o[snakeToCamel(k)] = row[k]; return o; }
function objToSnake(obj){ const o={}; for(const k in obj) o[camelToSnake(k)] = obj[k]; return o; }
const OPMAP = {'==':'eq','!=':'neq','<':'lt','<=':'lte','>':'gt','>=':'gte'};

function makeDb(client){
  const pollTimers = {};
  const listeners = {};
  async function runCollectionSub(sub){
    let q = client.from(sub.table).select('*');
    sub.wheres.forEach(w=>{ q = q[w.op](w.col, w.val); });
    if(sub.orderCol) q = q.order(sub.orderCol, {ascending: sub.orderDir!=='desc'});
    if(sub.limitN!=null) q = q.limit(sub.limitN);
    const {data, error} = await q;
    if(error){ console.error(error); return; }
    sub.cb({ docs: (data||[]).map(row => ({ id: row.id, data: () => rowToCamel(row) })) });
  }
  async function runDocSub(sub){
    const {data, error} = await client.from(sub.table).select('*').eq('id', sub.id).maybeSingle();
    if(error){ console.error(error); return; }
    sub.cb({ exists: !!data, id: sub.id, data: () => data ? rowToCamel(data) : null });
  }
  function runKey(key){ (listeners[key]||[]).forEach(sub => sub.kind==='collection' ? runCollectionSub(sub) : runDocSub(sub)); }
  function addSub(key, sub){
    if(!listeners[key]) listeners[key] = [];
    listeners[key].push(sub);
    if(!pollTimers[key]) pollTimers[key] = setInterval(()=>runKey(key), 6000);
    sub.kind==='collection' ? runCollectionSub(sub) : runDocSub(sub);
  }
  function notify(table){ runKey(table); runKey('doc:'+table); }
  function collRef(table){
    const wheres = []; let orderCol=null, orderDir=null, limitN=null;
    const api = {
      where(col, op, val){ wheres.push({op: OPMAP[op]||op, col: camelToSnake(col), val}); return api; },
      orderBy(col, dir){ orderCol = camelToSnake(col); orderDir = dir; return api; },
      limit(n){ limitN = n; return api; },
      onSnapshot(cb){ addSub(table, {kind:'collection', table, wheres, orderCol, orderDir, limitN, cb}); },
      async get(){
        let q = client.from(table).select('*');
        wheres.forEach(w=>{ q = q[w.op](w.col, w.val); });
        if(orderCol) q = q.order(orderCol, {ascending: orderDir!=='desc'});
        if(limitN!=null) q = q.limit(limitN);
        const {data, error} = await q; if(error) throw error;
        return { docs: (data||[]).map(row=>({id:row.id, data:()=>rowToCamel(row)})) };
      },
      async add(obj){
        const {data, error} = await client.from(table).insert(objToSnake(obj)).select().single();
        if(error) throw error;
        notify(table);
        return { id: data.id };
      },
      doc(id){
        return {
          async get(){
            const {data, error} = await client.from(table).select('*').eq('id', id).maybeSingle();
            if(error) throw error;
            return { exists: !!data, id, data: () => data ? rowToCamel(data) : null };
          },
          async set(obj){
            const {error} = await client.from(table).upsert({ id, ...objToSnake(obj) });
            if(error) throw error;
            notify(table);
          },
          async update(partial){
            const {error} = await client.from(table).update(objToSnake(partial)).eq('id', id);
            if(error) throw error;
            notify(table);
          },
          async delete(){
            const {error} = await client.from(table).delete().eq('id', id);
            if(error) throw error;
            notify(table);
          }
        };
      }
    };
    return api;
  }
  return {
    refresh(table){ notify(table); },
    collection(table){ return collRef(table); },
    doc(path){
      if(path==='meta/settings'){
        const table='settings', id=1;
        return {
          onSnapshot(cb){ addSub('doc:'+table, {kind:'doc', table, id, cb}); },
          async get(){ const {data,error}=await client.from(table).select('*').eq('id',id).maybeSingle(); if(error) throw error; return {exists:!!data, data:()=>data?rowToCamel(data):null}; },
          async set(obj){ const {error}=await client.from(table).upsert({id, ...objToSnake(obj)}); if(error) throw error; notify(table); }
        };
      }
      throw new Error('Unsupported doc path: '+path);
    }
  };
}

function toCSV(rows){
  return rows.map(r=>r.map(v=>{
    const s = String(v??'');
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  }).join(',')).join('\r\n');
}
function exportCSV(filename, rows){
  try{
    const blob = new Blob([toCSV(rows)], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }catch(e){ toast('Could not export'); }
}
