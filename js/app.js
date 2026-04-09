function setStartupProgress(progress, status){
  state.startupProgress = Math.max(0, Math.min(100, Number(progress || 0)));
  if(status) state.startupStatus = status;

  const bar = document.getElementById('startup-progress-fill');
  const text = document.getElementById('startup-status-text');
  const value = document.getElementById('startup-progress-value');

  if(bar) bar.style.width = `${state.startupProgress}%`;
  if(text) text.textContent = state.startupStatus || '';
  if(value) value.textContent = `${Math.round(state.startupProgress)}%`;
}

async function init(){
  if(typeof restoreLocal === 'function') restoreLocal();
  setStartupProgress(12, 'App voorbereiden...');

  if(typeof normalizeData === 'function'){
    normalizeData();
  }

  try{
    let hasSession = false;
    if(typeof syncCloudSession === 'function'){
      setStartupProgress(32, 'Sessie controleren...');
      hasSession = await syncCloudSession();
    }

    if(hasSession && typeof loadFromCloud === 'function'){
      setStartupProgress(58, 'Huishoudgegevens ophalen...');
      await loadFromCloud();
      setStartupProgress(100, 'Gegevens bijgewerkt');
    }else{
      setStartupProgress(100, 'Klaar om te beginnen');
    }
  }catch(e){
    console.error('Init cloud sync mislukt:', e);
    setStartupProgress(100, 'Laden mislukt');
  }

  if(typeof rerenderCurrentView === 'function'){
    rerenderCurrentView();
  }else{
    rerenderAll();
  }

  const startupOverlay = document.getElementById('startup-overlay');
  if(startupOverlay){
    setTimeout(() => {
      startupOverlay.style.display = 'none';
    }, 220);
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
