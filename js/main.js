// Starts everything. Loaded last, after every other file is ready.

sbClient.auth.onAuthStateChange((event, session)=>{
  if(session){
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appRoot').style.display = '';
    startApp();
  }else{
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appRoot').style.display = 'none';
  }
});

renderBillItems();
renderSiItems();
