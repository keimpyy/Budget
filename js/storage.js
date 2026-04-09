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

async function syncCloudSession(){
  try{
    await getCloudUser();
  }catch(e){
    state.cloudUserEmail = '';
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
    action:'saveAll',
    inkomsten: state.inkomsten.map(r => ({
      naam: r.naam || '',
      bedrag: Number(r.bedrag || 0)
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
      kleur: String(r.kleur || '')
    }))
  };
}

function applyCloudData(data){
  if(data.inkomsten){
    state.inkomsten = data.inkomsten.map(r => ({
      naam: String(r.naam || ''),
      bedrag: Number(r.bedrag || 0)
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
    state.leningen = data.leningen.map(r => ({
      id: String(r.id || uid('ln')),
      naam: String(r.naam || ''),
      totaal: Number(r.totaal || 0),
      betaald: Number(r.betaald || 0),
      kleur: String(r.kleur || '')
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

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('app_state')
    .select('inkomsten,categorieen,budget,leningen')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if(error){
    return { ok:false, error:error.message || 'Ophalen mislukt' };
  }

  if(!data){
    return { ok:true, inkomsten:[], categorieen:[], budget:[], leningen:[] };
  }

  return { ok:true, ...data };
}

async function saveCloudState(data){
  const user = await getCloudUser();
  if(!user){
    return { ok:false, error:'Log eerst in op Supabase' };
  }

  const supabase = getSupabaseClient();
  const payload = {
    owner_user_id: user.id,
    inkomsten: data.inkomsten || [],
    categorieen: data.categorieen || [],
    budget: data.budget || [],
    leningen: data.leningen || [],
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('app_state')
    .upsert(payload, { onConflict:'owner_user_id' });

  if(error){
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
    setCloudStatus(`Ingelogd als ${state.cloudUserEmail}`);

    if(typeof renderInstellingen === 'function'){
      renderInstellingen();
    }

    showToast('Ingelogd');
    await loadFromCloud();
  }catch(e){
    state.cloudUserEmail = '';
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
