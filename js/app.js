async function init(){
  if(typeof restoreLocal === 'function'){
    restoreLocal();
  }

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

if(typeof syncSakuraPetals === 'function'){
  window.addEventListener('resize', syncSakuraPetals);
}

window.addEventListener('storage', (e) => {
  if(e.key === THEME_KEY || e.key === LEGACY_THEME_KEY){
    loadTheme();
  }
});

init();
