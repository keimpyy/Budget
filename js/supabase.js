window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

window.supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  state.cloudUserEmail = session?.user?.email || '';
  state.cloudHouseholdKey = '';
  state.cloudThemePreference = 'midnight';
  state.accountMenuOpen = false;

  if(session?.user && state.appModalOpen && state.appModalType === 'cloud-login' && typeof closeAppModal === 'function'){
    closeAppModal();
  }

  if(session?.user && typeof syncCloudSession === 'function'){
    try{
      await syncCloudSession();
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
