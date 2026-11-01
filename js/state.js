// App state and the small toast popup.

let db = null;
let downloadsCap = null;
let products = [];
let bills = [];
let customers = [];
let purchases = [];
let payments = [];
let settings = {name:"Azeem Ali Traders", addr:"", gst:"", lowStock:5};
let currentItems = [];
let siItems = [];

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1800);
}
