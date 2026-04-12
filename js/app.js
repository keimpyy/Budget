function refreshOnceForNewAppVersion(){
  const version = typeof APP_VERSION === 'string' ? APP_VERSION : '';
  if(!version) return false;

  const storageKey = 'budget-app-version';
  const reloadMarkerKey = 'budget-app-version-reload';
  let previousVersion = '';
  let reloadMarker = '';

  try{
    previousVersion = window.localStorage.getItem(storageKey) || '';
    reloadMarker = window.sessionStorage.getItem(reloadMarkerKey) || '';
  }catch(e){}

  if(previousVersion && previousVersion !== version && reloadMarker !== version){
    try{
      window.sessionStorage.setItem(reloadMarkerKey, version);
      window.localStorage.setItem(storageKey, version);
    }catch(e){}

    const url = new URL(window.location.href);
    url.searchParams.set('app_v', version);
    window.location.replace(url.toString());
    return true;
  }

  try{
    window.localStorage.setItem(storageKey, version);
  }catch(e){}

  return false;
}

const appRefreshInProgress = refreshOnceForNewAppVersion();
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
});

function registerServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  if(!window.isSecureContext && window.location.hostname !== 'localhost') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Service worker registratie mislukt:', error);
    });
  });
}

async function showInstallHelp(){
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return;
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if(isStandalone){
    alert('Budget staat al als app op dit apparaat.');
    return;
  }

  if(isIos){
    alert('Op iPhone of iPad: tik op de deelknop in je browser en kies "Zet op beginscherm" of "Add to Home Screen".');
    return;
  }

  alert('Open het browsermenu en kies "App installeren" of "Toevoegen aan startscherm".');
}

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

function withTimeout(promise, timeoutMs, fallbackValue){
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallbackValue), timeoutMs))
  ]);
}

async function init(){
  if(typeof restoreLocal === 'function') restoreLocal();
  setStartupProgress(12, 'App voorbereiden...');

  if(typeof normalizeData === 'function'){
    normalizeData();
  }

  try{
    let hasSession = false;
    let sessionTimedOut = false;

    if(typeof syncCloudSession === 'function'){
      setStartupProgress(32, 'Sessie controleren...');
      const sessionResult = await withTimeout(
        syncCloudSession().then(result => ({ timedOut:false, result })),
        2200,
        { timedOut:true, result:false }
      );
      sessionTimedOut = sessionResult.timedOut;
      hasSession = sessionResult.result;
    }

    if(sessionTimedOut){
      setStartupProgress(48, 'Verder laden op achtergrond...');
    }

    if(hasSession && typeof loadFromCloud === 'function' && !sessionTimedOut){
      setStartupProgress(58, 'Huishoudgegevens ophalen...');
      await loadFromCloud({ silent:true });
      setStartupProgress(100, 'Gegevens bijgewerkt');
    }else if(!sessionTimedOut){
      setStartupProgress(100, 'Klaar om te beginnen');
    }

    if(sessionTimedOut){
      setTimeout(async () => {
        try{
          const hasSession = typeof syncCloudSession === 'function'
            ? await syncCloudSession()
            : false;

          if(hasSession && typeof loadFromCloud === 'function'){
            await loadFromCloud({ silent:true });
          }
        }catch(e){
          console.error('Achtergrond startup sync mislukt:', e);
        }
      }, 0);
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

if(!appRefreshInProgress){
  registerServiceWorker();
  loadTheme();

  if(typeof renderHeaderActions === 'function'){
    renderHeaderActions();
  }

  if(typeof syncSakuraPetals === 'function'){
    window.addEventListener('resize', syncSakuraPetals);
  }

  window.addEventListener('click', (e) => {
    const target = e.target;
    if(target instanceof Element && target.closest('.account-menu-panel, .account-avatar-btn, #app-modal-root')) return;
    if(typeof closeAccountMenu === 'function') closeAccountMenu();
  });

  init();
}
