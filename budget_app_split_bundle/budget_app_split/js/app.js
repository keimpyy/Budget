async function init(){
  restoreLocal();

  if(typeof normalizeData === 'function'){
    normalizeData();
  }

  if(typeof renderAll === 'function'){
    renderAll();
  } else if(typeof rerenderAll === 'function'){
    rerenderAll();
  }

  try{
    const result = await sheetsGet();
    if(result?.ok){
      applySheets(result);
    }
  }catch(e){}

  const startupOverlay = document.getElementById('startup-overlay');
  if(startupOverlay){
    startupOverlay.style.display = 'none';
  }
}

loadTheme();

window.addEventListener('resize', syncSakuraPetals);

window.addEventListener('storage', (e) => {
  if(e.key === THEME_KEY || e.key === LEGACY_THEME_KEY){
    loadTheme();
  }
});

init();