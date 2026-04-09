function persistLocal(){
  const cache = {
    inkomsten: state.inkomsten,
    categorieen: state.categorieen,
    budget: state.budget,
    leningen: state.leningen
  };
  localStorage.setItem('bv_budget_state_v3', JSON.stringify(cache));
}

function restoreLocal(){
  try{
    const raw = localStorage.getItem('bv_budget_state_v3');
    if(!raw) return;

    const parsed = JSON.parse(raw);

    if(parsed.inkomsten) state.inkomsten = parsed.inkomsten;
    if(parsed.categorieen) state.categorieen = parsed.categorieen;
    if(parsed.budget) state.budget = parsed.budget;
    if(parsed.leningen) state.leningen = parsed.leningen;
  }catch(e){}
}

function setCloudStatus(message){
  state.cloudStatus = message || '';
  const status = document.getElementById('save-status');
  if(status) status.textContent = state.cloudStatus;
}

function setCloudHouseholdKey(householdKey){
  state.cloudHouseholdKey = householdKey || '';
}

function getSupabaseClient(){
  if(window.supabaseClient) return window.supabaseClient;
  throw new Error('Supabase client niet geladen');
}

async function getCloudUser(){
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if(error) throw error;

  const user = data?.user || null;
  state.cloudUserEmail = user?.email || '';
  return user;
}

async function getCloudHouseholdKey(){
  if(state.cloudHouseholdKey) return state.cloudHouseholdKey;

  const user = await getCloudUser();
  if(!user){
    throw new Error('Log eerst in op Supabase');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('household_members')
    .select('household_key')
    .eq('user_id', user.id)
    .maybeSingle();

  if(error){
    throw error;
  }

  const householdKey = data?.household_key || '';
  if(!householdKey){
    throw new Error('Geen huishouden gekoppeld aan deze gebruiker');
  }

  setCloudHouseholdKey(householdKey);
  return householdKey;
}

async function syncCloudSession(){
  try{
    await getCloudUser();
    await getCloudHouseholdKey();
  }catch(e){
    state.cloudUserEmail = '';
    state.cloudHouseholdKey = '';
  }

  if(typeof renderInstellingen === 'function' && state.currentView === 'instellingen'){
    renderInstellingen();
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
  rerenderAll();
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

async function signInToCloud(){
  const email = prompt('Supabase e-mailadres');
  if(email === null) return;

  const password = prompt('Supabase wachtwoord');
  if(password === null) return;

  setCloudStatus('Inloggen...');

  try{
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if(error) throw error;

    state.cloudUserEmail = data?.user?.email || email.trim();
    setCloudHouseholdKey('');
    await getCloudHouseholdKey();
    setCloudStatus(`Ingelogd als ${state.cloudUserEmail}`);

    if(typeof renderInstellingen === 'function'){
      renderInstellingen();
    }

    showToast('Ingelogd');
    await loadFromCloud();
  }catch(e){
    state.cloudUserEmail = '';
    state.cloudHouseholdKey = '';
    setCloudStatus(e.message || 'Inloggen mislukt');
    showToast('Inloggen mislukt');
  }
}

async function signOutFromCloud(){
  setCloudStatus('Uitloggen...');

  try{
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if(error) throw error;

    state.cloudUserEmail = '';
    state.cloudHouseholdKey = '';
    setCloudStatus('Uitgelogd');

    if(typeof renderInstellingen === 'function'){
      renderInstellingen();
    }

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

async function loadFromSheets(){ return loadFromCloud(); }
async function saveToSheets(){ return saveToCloud(); }
function applySheets(data){ return applyCloudData(data); }
