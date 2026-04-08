async function init(){
  restoreLocal();
  normalizeData();
  rerenderAll();
  try{
    const result = await sheetsGet();
    if(result?.ok){
      applySheets(result);
    }
  }catch(e){}
  document.getElementById('startup-overlay').style.display = 'none';
}

loadTheme();

window.addEventListener('resize', syncSakuraPetals);

window.addEventListener('storage', (e)=>{
  if(e.key === THEME_KEY || e.key === LEGACY_THEME_KEY) loadTheme();
});

init();
