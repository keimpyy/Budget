window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

window.supabaseClient.auth.onAuthStateChange((_event, session) => {
  state.cloudUserEmail = session?.user?.email || '';
  state.cloudHouseholdKey = '';

  if(typeof renderInstellingen === 'function' && state.currentView === 'instellingen'){
    renderInstellingen();
  }
});
