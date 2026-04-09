async function init(){
  if(typeof restoreLocal === 'function'){
    restoreLocal();
  }

  if(typeof normalizeData === 'function'){
    normalizeData();
  }

  rerenderAll();

  try{
    if(typeof sheetsGet === 'function' && typeof applySheets === 'function'){
      const result = await sheetsGet();
      if(result?.ok){
        applySheets(result);
      }
    }
  }catch(e){
    console.error('Init sheets sync mislukt:', e);
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