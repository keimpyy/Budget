const appStorage = {
  getItem(key){
    try{
      return window.localStorage.getItem(key);
    }catch(e){
      return null;
    }
  },
  setItem(key, value){
    try{
      window.localStorage.setItem(key, value);
    }catch(e){}
  },
  removeItem(key){
    try{
      window.localStorage.removeItem(key);
    }catch(e){}
  }
};

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'budget-veenstra-auth',
    storage: appStorage
  }
});

window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  state.cloudUserEmail = session?.user?.email || '';
  state.cloudHouseholdKey = '';
  state.cloudThemePreference = 'midnight';
  state.accountMenuOpen = false;

  if(session?.user && state.appModalOpen && state.appModalType === 'cloud-login' && typeof closeAppModal === 'function'){
    closeAppModal();
  }

  if(session?.user && typeof syncCloudSession === 'function'){
    try{
      const hasSession = await syncCloudSession();
      if(
        hasSession &&
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
        typeof loadFromCloud === 'function'
      ){
        await loadFromCloud();
      }
    }catch(e){
      console.error('Auth state sync mislukt:', e);
    }
  }else if(typeof applyTheme === 'function'){
    applyTheme('midnight', { persist:false, skipCloudPersist:true });
  }

  if(typeof renderInstellingen === 'function' && state.currentView === 'instellingen'){
    renderInstellingen();
  }

  if(typeof renderHeaderActions === 'function'){
    renderHeaderActions();
  }
});
