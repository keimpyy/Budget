function persistLocal(){
  // App data now lives in Supabase only.
}

function restoreLocal(){
  try{
    localStorage.removeItem('bv_budget_state_v3');
  }catch(e){}
}

function setCloudStatus(message){
  state.cloudStatus = message || '';
  const status = document.getElementById('save-status');
  if(status) status.textContent = state.cloudStatus;
  const inlineStatus = document.getElementById('inline-sync-status');
  if(inlineStatus) inlineStatus.textContent = state.cloudStatus;
}

function setCloudHouseholdKey(householdKey){
  state.cloudHouseholdKey = householdKey || '';
}

function setCloudThemePreference(theme){
  state.cloudThemePreference = theme || 'midnight';
}

let cloudSyncTimer = null;
let cloudSyncInFlight = false;

function getSupabaseClient(){
  if(window.supabaseClient) return window.supabaseClient;
  throw new Error('Supabase client niet geladen');
}

async function getCloudUser(){
  const supabase = getSupabaseClient();
  const sessionResult = await supabase.auth.getSession();
  if(sessionResult.error) throw sessionResult.error;

  let user = sessionResult.data?.session?.user || null;
  if(!user){
    const { data, error } = await supabase.auth.getUser();
    if(error) throw error;
    user = data?.user || null;
  }

  state.cloudUserEmail = user?.email || '';
  return user;
}

async function getCloudMemberRecord(){
  const user = await getCloudUser();
  if(!user){
    throw new Error('Log eerst in op Supabase');
  }

  const supabase = getSupabaseClient();
  let { data, error } = await supabase
    .from('household_members')
    .select('household_key, theme_preference')
    .eq('user_id', user.id)
    .maybeSingle();

  if(error && /theme_preference/i.test(error.message || '')){
    const fallback = await supabase
      .from('household_members')
      .select('household_key')
      .eq('user_id', user.id)
      .maybeSingle();

    data = fallback.data ? {
      household_key: fallback.data.household_key,
      theme_preference: 'midnight'
    } : null;
    error = fallback.error;
  }

  if(error) throw error;
  return data || null;
}

async function getCloudHouseholdKey(){
  if(state.cloudHouseholdKey) return state.cloudHouseholdKey;

  const member = await getCloudMemberRecord();
  const householdKey = member?.household_key || '';
  if(!householdKey){
    throw new Error('Geen huishouden gekoppeld aan deze gebruiker');
  }

  setCloudHouseholdKey(householdKey);
  setCloudThemePreference(member?.theme_preference || 'midnight');
  return householdKey;
}

async function saveThemePreference(theme){
  const resolved = ALLOWED_THEMES.has(theme) ? theme : 'midnight';
  const user = await getCloudUser();
  if(!user) return { ok:false, error:'Log eerst in om je theme op te slaan' };

  const householdKey = await getCloudHouseholdKey();
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('household_members')
    .update({ theme_preference: resolved })
    .eq('user_id', user.id)
    .eq('household_key', householdKey);

  if(error && /theme_preference/i.test(error.message || '')){
    setCloudThemePreference(resolved);
    return { ok:true, skipped:true };
  }

  if(error){
    return { ok:false, error:error.message || 'Theme opslaan mislukt' };
  }

  setCloudThemePreference(resolved);
  return { ok:true };
}

async function syncCloudSession(){
  try{
    await getCloudUser();
    await getCloudHouseholdKey();
    if(typeof applyTheme === 'function'){
      applyTheme(state.cloudThemePreference || 'midnight', {
        persist:false,
        skipCloudPersist:true
      });
    }
  }catch(e){
    state.cloudUserEmail = '';
    state.cloudHouseholdKey = '';
    state.cloudThemePreference = 'midnight';
    if(typeof applyTheme === 'function'){
      applyTheme('midnight', {
        persist:false,
        skipCloudPersist:true
      });
    }
  }

  if(typeof renderInstellingen === 'function' && state.currentView === 'instellingen'){
    renderInstellingen();
  }

  if(typeof renderHeaderActions === 'function'){
    renderHeaderActions();
  }
}

async function safeJson(res){
  const text = await res.text();

  let parsed;
  try{
    parsed = JSON.parse(text);
  }catch(e){
    return {
      ok:false,
      error:`Geen geldige JSON (${res.status})`,
      raw:text.slice(0,300)
    };
  }

  if(!res.ok){
    return {
      ok:false,
      error: parsed?.error || `HTTP fout ${res.status}`,
      raw:text.slice(0,300)
    };
  }

  return parsed;
}

function normalizeData(){
  state.inkomsten = state.inkomsten.map((row, idx) => ({
    id: String(row.id || uid('inc')),
    naam: String(row.naam || 'Nieuwe inkomstenbron'),
    bedrag: Number(row.bedrag || 0),
    volgorde: Number(row.volgorde || (idx + 1))
  }));

  state.categorieen = orderedCats().map((cat, idx) => ({
    id: String(cat.id || uid('cat')),
    naam: String(cat.naam || 'Nieuwe categorie'),
    volgorde: idx + 1
  }));

  state.budget = state.budget.map(row => ({
    id: String(row.id || uid('bud')),
    categorieId: String(row.categorieId || ''),
    post: String(row.post || 'Nieuwe post'),
    budget: Number(row.budget || 0),
    volgorde: Number(row.volgorde || 0)
  }));

  state.leningen = state.leningen.map((row, idx) => ({
    id: String(row.id || uid('ln')),
    naam: String(row.naam || 'Nieuwe lening'),
    totaal: Number(row.totaal || 0),
    betaald: Number(row.betaald || 0),
    kleur: String(row.kleur || ''),
    volgorde: Number(row.volgorde || (idx + 1))
  }));

  const validCatIds = new Set(state.categorieen.map(c => c.id));
  state.budget = state.budget.filter(r => validCatIds.has(r.categorieId));

  for(const cat of state.categorieen){
    const rows = itemsForCategory(cat.id);
    rows.forEach((row, idx) => {
      row.volgorde = idx + 1;
    });
  }

  ensureBudgetSelection();
}

function toRows(){
  normalizeData();

  return {
    inkomsten: state.inkomsten.map(r => ({
      id: r.id,
      naam: r.naam || '',
      bedrag: Number(r.bedrag || 0),
      volgorde: Number(r.volgorde || 0)
    })),
    categorieen: orderedCats().map((c, i) => ({
      id: c.id,
      naam: c.naam || '',
      volgorde: i + 1
    })),
    budget: orderedCats().flatMap(c =>
      itemsForCategory(c.id).map((r, rowIndex) => ({
        id: r.id,
        categorieId: c.id,
        post: r.post || '',
        budget: Number(r.budget || 0),
        volgorde: rowIndex + 1
      }))
    ),
    leningen: state.leningen.map(r => ({
      id: r.id,
      naam: r.naam || '',
      totaal: Number(r.totaal || 0),
      betaald: Number(r.betaald || 0),
      kleur: String(r.kleur || ''),
      volgorde: Number(r.volgorde || 0)
    }))
  };
}

function applyCloudData(data){
  if(data.inkomsten){
    state.inkomsten = data.inkomsten.map((r, i) => ({
      id: String(r.id || uid('inc')),
      naam: String(r.naam || ''),
      bedrag: Number(r.bedrag || 0),
      volgorde: Number(r.volgorde || (i + 1))
    }));
  }

  if(data.categorieen){
    state.categorieen = data.categorieen.map((r, i) => ({
      id: String(r.id || uid('cat')),
      naam: String(r.naam || ''),
      volgorde: Number(r.volgorde || (i + 1))
    }));
  }

  if(data.budget){
    state.budget = data.budget.map((r, i) => ({
      id: String(r.id || uid('bud')),
      categorieId: String(r.categorieId || ''),
      post: String(r.post || ''),
      budget: Number(r.budget || 0),
      volgorde: Number(r.volgorde || (i + 1))
    }));
  }

  if(data.leningen){
    state.leningen = data.leningen.map((r, i) => ({
      id: String(r.id || uid('ln')),
      naam: String(r.naam || ''),
      totaal: Number(r.totaal || 0),
      betaald: Number(r.betaald || 0),
      kleur: String(r.kleur || ''),
      volgorde: Number(r.volgorde || (i + 1))
    }));
  }

  normalizeData();
  persistLocal();
  if(typeof rerenderCurrentView === 'function'){
    rerenderCurrentView();
  }else{
    rerenderAll();
  }
}

async function fetchCloudState(){
  const user = await getCloudUser();
  if(!user){
    return { ok:false, error:'Log eerst in op Supabase' };
  }
  const householdKey = await getCloudHouseholdKey();

  const supabase = getSupabaseClient();
  const [
    incomeResult,
    categoryResult,
    budgetResult,
    loanResult
  ] = await Promise.all([
    supabase
      .from('income_items')
      .select('id,name,amount,sort_order')
      .eq('household_key', householdKey)
      .order('sort_order', { ascending:true }),
    supabase
      .from('categories')
      .select('id,name,sort_order')
      .eq('household_key', householdKey)
      .order('sort_order', { ascending:true }),
    supabase
      .from('budget_items')
      .select('id,category_id,name,amount,sort_order')
      .eq('household_key', householdKey)
      .order('sort_order', { ascending:true }),
    supabase
      .from('loans')
      .select('id,name,total,paid,color,sort_order')
      .eq('household_key', householdKey)
      .order('sort_order', { ascending:true })
  ]);

  const error = incomeResult.error || categoryResult.error || budgetResult.error || loanResult.error;
  if(error){
    return { ok:false, error:error.message || 'Ophalen mislukt' };
  }

  return {
    ok:true,
    inkomsten: (incomeResult.data || []).map((row, idx) => ({
      id: row.id,
      naam: row.name || '',
      bedrag: Number(row.amount || 0),
      volgorde: Number(row.sort_order || (idx + 1))
    })),
    categorieen: (categoryResult.data || []).map((row, idx) => ({
      id: row.id,
      naam: row.name || '',
      volgorde: Number(row.sort_order || (idx + 1))
    })),
    budget: (budgetResult.data || []).map((row, idx) => ({
      id: row.id,
      categorieId: row.category_id || '',
      post: row.name || '',
      budget: Number(row.amount || 0),
      volgorde: Number(row.sort_order || (idx + 1))
    })),
    leningen: (loanResult.data || []).map((row, idx) => ({
      id: row.id,
      naam: row.name || '',
      totaal: Number(row.total || 0),
      betaald: Number(row.paid || 0),
      kleur: row.color || '',
      volgorde: Number(row.sort_order || (idx + 1))
    }))
  };
}

async function replaceHouseholdTable(tableName, householdKey, rows, mapRow){
  const supabase = getSupabaseClient();
  const ids = rows.map(row => String(row.id)).filter(Boolean);

  let deleteQuery = supabase
    .from(tableName)
    .delete()
    .eq('household_key', householdKey);

  if(ids.length){
    deleteQuery = deleteQuery.not('id', 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
  }

  const { error: deleteError } = await deleteQuery;
  if(deleteError) throw deleteError;

  if(!rows.length) return;

  const payload = rows.map(mapRow);
  const { error: upsertError } = await supabase
    .from(tableName)
    .upsert(payload, { onConflict:'id' });

  if(upsertError) throw upsertError;
}

async function saveCloudState(data){
  const user = await getCloudUser();
  if(!user){
    return { ok:false, error:'Log eerst in op Supabase' };
  }
  const householdKey = await getCloudHouseholdKey();

  try{
    await replaceHouseholdTable('income_items', householdKey, data.inkomsten || [], (row) => ({
      id: String(row.id),
      household_key: householdKey,
      name: row.naam || '',
      amount: Number(row.bedrag || 0),
      sort_order: Number(row.volgorde || 0),
      updated_at: new Date().toISOString()
    }));

    await replaceHouseholdTable('categories', householdKey, data.categorieen || [], (row) => ({
      id: String(row.id),
      household_key: householdKey,
      name: row.naam || '',
      sort_order: Number(row.volgorde || 0),
      updated_at: new Date().toISOString()
    }));

    await replaceHouseholdTable('budget_items', householdKey, data.budget || [], (row) => ({
      id: String(row.id),
      household_key: householdKey,
      category_id: String(row.categorieId || ''),
      name: row.post || '',
      amount: Number(row.budget || 0),
      sort_order: Number(row.volgorde || 0),
      updated_at: new Date().toISOString()
    }));

    await replaceHouseholdTable('loans', householdKey, data.leningen || [], (row) => ({
      id: String(row.id),
      household_key: householdKey,
      name: row.naam || '',
      total: Number(row.totaal || 0),
      paid: Number(row.betaald || 0),
      color: String(row.kleur || ''),
      sort_order: Number(row.volgorde || 0),
      updated_at: new Date().toISOString()
    }));
  }catch(error){
    return { ok:false, error:error.message || 'Opslaan mislukt' };
  }

  return { ok:true };
}

function queueCloudSync(){
  if(!isCloudSignedIn()) return;

  if(cloudSyncTimer){
    clearTimeout(cloudSyncTimer);
  }

  cloudSyncTimer = setTimeout(async () => {
    if(cloudSyncInFlight) return;

    cloudSyncInFlight = true;
    setCloudStatus('Wijzigingen syncen...');

    try{
      const result = await saveCloudState(toRows());
      if(result?.ok){
        setCloudStatus('Automatisch gesynchroniseerd');
      }else{
        setCloudStatus(result?.error || 'Automatisch syncen mislukt');
        console.error('Auto-sync fout:', result);
      }
    }catch(e){
      setCloudStatus(e.message || 'Automatisch syncen mislukt');
      console.error('Auto-sync crash:', e);
    }finally{
      cloudSyncInFlight = false;
    }
  }, 350);
}

function persistAndSync(renderMode = 'all'){
  persistLocal();

  if(renderMode === 'budget' && typeof renderBudget === 'function'){
    renderBudget();
  }else if(renderMode === 'loans' && typeof renderLeningen === 'function'){
    renderLeningen();
  }else if(renderMode === 'none'){
    // no-op
  }else{
    if(typeof rerenderCurrentView === 'function'){
      rerenderCurrentView();
    }else{
      rerenderAll();
    }
  }

  queueCloudSync();
}

function renderInlineSyncStatus(){
  if(!isCloudSignedIn()) return '';
  const text = escapeHtml(state.cloudStatus || 'Klaar om te synchroniseren');
  return `<div class="inline-sync-status" id="inline-sync-status">${text}</div>`;
}

async function loadFromCloud(){
  setCloudStatus('Ophalen...');

  try{
    const result = await fetchCloudState();

    if(result?.ok){
      applyCloudData(result);
      showToast('Data opgehaald');
      setCloudStatus('Vers geladen uit Supabase');
    }else{
      showToast(result?.error || 'Ophalen mislukt');
      setCloudStatus(result?.error || 'Ophalen mislukt');
      console.error('Supabase fout:', result);
    }
  }catch(e){
    console.error('loadFromCloud crash:', e);
    showToast('Ophalen mislukt');
    setCloudStatus(e.message || 'Ophalen mislukt');
  }
}

async function saveToCloud(){
  setCloudStatus('Opslaan...');

  try{
    const rows = toRows();
    const result = await saveCloudState(rows);

    if(result?.ok){
      persistLocal();
      setCloudStatus('Opgeslagen in Supabase');
      showToast('Opgeslagen');
    }else{
      setCloudStatus(result?.error || 'Opslaan mislukt');
      showToast(result?.error || 'Opslaan mislukt');
    }
  }catch(e){
    setCloudStatus(e.message || 'Opslaan mislukt');
    showToast('Opslaan mislukt');
  }
}

async function signInToCloud(emailArg, passwordArg){
  const email = String(emailArg || '').trim();
  const password = String(passwordArg || '');

  if(!email || !password){
    setCloudStatus('Vul e-mail en wachtwoord in');
    showToast('Vul e-mail en wachtwoord in');
    return { ok:false, error:'Vul e-mail en wachtwoord in' };
  }

  setCloudStatus('Inloggen...');

  try{
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if(error) throw error;

    return {
      ok:true,
      email:data?.user?.email || email.trim()
    };
  }catch(e){
    state.cloudUserEmail = '';
    state.cloudHouseholdKey = '';
    state.cloudThemePreference = 'midnight';
    setCloudStatus(e.message || 'Inloggen mislukt');
    showToast('Inloggen mislukt');
    return { ok:false, error:e.message || 'Inloggen mislukt' };
  }
}

function finalizeCloudLogin(email){
  state.cloudUserEmail = email || '';
  state.accountMenuOpen = false;
  setCloudHouseholdKey('');
  setCloudThemePreference('midnight');

  if(typeof applyTheme === 'function'){
    applyTheme('midnight', { persist:false, skipCloudPersist:true });
  }

  setCloudStatus(`Ingelogd als ${state.cloudUserEmail}`);

  if(typeof renderInstellingen === 'function'){
    renderInstellingen();
  }

  if(typeof renderHeaderActions === 'function'){
    renderHeaderActions();
  }

  showToast('Ingelogd');

  if(typeof rerenderCurrentView === 'function'){
    rerenderCurrentView();
  }else if(typeof rerenderAll === 'function'){
    rerenderAll();
  }

  setTimeout(async () => {
    try{
      await syncCloudSession();
      await loadFromCloud();
    }catch(e){
      console.error('Achtergrond laden na login mislukt:', e);
      setCloudStatus(e.message || 'Achtergrond laden mislukt');
    }
  }, 0);
}

async function signOutFromCloud(){
  setCloudStatus('Uitloggen...');

  try{
    state.cloudUserEmail = '';
    state.cloudHouseholdKey = '';
    state.cloudThemePreference = 'midnight';
    state.accountMenuOpen = false;
    closeAppModal();
    if(typeof applyTheme === 'function'){
      applyTheme('midnight', { persist:false, skipCloudPersist:true });
    }
    if(typeof renderInstellingen === 'function'){
      renderInstellingen();
    }
    if(typeof renderHeaderActions === 'function'){
      renderHeaderActions();
    }
    if(typeof rerenderCurrentView === 'function'){
      rerenderCurrentView();
    }else if(typeof rerenderAll === 'function'){
      rerenderAll();
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if(error) throw error;

    setCloudStatus('Uitgelogd');

    showToast('Uitgelogd');
  }catch(e){
    setCloudStatus(e.message || 'Uitloggen mislukt');
    showToast('Uitloggen mislukt');
  }
}

function isCloudSignedIn(){
  return Boolean(state.cloudUserEmail);
}

function getCloudUserEmail(){
  return state.cloudUserEmail || 'Niet ingelogd';
}
