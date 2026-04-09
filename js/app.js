async function init(){
  if(typeof restoreLocal === 'function') restoreLocal();

  if(typeof normalizeData === 'function'){
    normalizeData();
  }

  try{
    let hasSession = false;
    if(typeof syncCloudSession === 'function'){
      hasSession = await syncCloudSession();
    }

    if(hasSession && typeof loadFromCloud === 'function'){
      await loadFromCloud();
    }
  }catch(e){
    console.error('Init cloud sync mislukt:', e);
  }

  if(typeof rerenderCurrentView === 'function'){
    rerenderCurrentView();
  }else{
    rerenderAll();
  }

  const startupOverlay = document.getElementById('startup-overlay');
  if(startupOverlay){
    startupOverlay.style.display = 'none';
  }
}

loadTheme();

if(typeof renderHeaderActions === 'function'){
  renderHeaderActions();
}

if(typeof syncSakuraPetals === 'function'){
  window.addEventListener('resize', syncSakuraPetals);
}

window.addEventListener('click', (e) => {
  const target = e.target;
  if(target instanceof Element && target.closest('.account-menu-wrap, #app-modal-root')) return;
  if(typeof closeAccountMenu === 'function') closeAccountMenu();
});

init();
