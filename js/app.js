async function init(){
  if(typeof restoreLocal === 'function') restoreLocal();

  if(typeof normalizeData === 'function'){
    normalizeData();
  }

  rerenderAll();

  try{
    if(typeof syncCloudSession === 'function'){
      await syncCloudSession();
    }

    if(typeof fetchCloudState === 'function' && typeof applyCloudData === 'function' && typeof isCloudSignedIn === 'function' && isCloudSignedIn()){
      const result = await fetchCloudState();
      if(result?.ok){
        applyCloudData(result);
        setCloudStatus('Vers geladen uit Supabase');
      }
    }
  }catch(e){
    console.error('Init cloud sync mislukt:', e);
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
