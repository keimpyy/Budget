window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

window.supabaseClient.auth.onAuthStateChange((_event, session) => {
  state.cloudUserEmail = session?.user?.email || '';
  state.cloudHouseholdKey = '';
  state.accountMenuOpen = false;

  if(typeof renderInstellingen === 'function' && state.currentView === 'instellingen'){
    renderInstellingen();
  }

  if(typeof renderHeaderActions === 'function'){
    renderHeaderActions();
  }
});
