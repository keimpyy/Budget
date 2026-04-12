function persistLocal(){
  try{
    if(!isCloudSignedIn()) return;
    window.localStorage.setItem(CLOUD_DATA_CACHE_KEY, JSON.stringify(toRows()));
  }catch(e){}
}

function restoreLocal(){
  try{
    localStorage.removeItem('bv_budget_state_v3');

    const raw = window.localStorage.getItem(CLOUD_DATA_CACHE_KEY);
    if(!raw) return;

    const cached = JSON.parse(raw);
    if(!cached || typeof cached !== 'object') return;

    applyCloudData(cached, { skipLocalPersist:true, skipRender:true });
    setCloudStatus('Laatste lokale kopie geladen');
  }catch(e){}
}

function setCloudStatus(message){
  state.cloudStatus = message || '';
  const status = document.getElementById('save-status');
  if(status) status.textContent = state.cloudStatus;
  const inlineStatus = document.getElementById('inline-sync-status');
  if(inlineStatus) inlineStatus.textContent = state.cloudStatus;
}

function setCloudLoadProgress(progress, step){
  state.cloudLoadProgress = Math.max(0, Math.min(100, Number(progress || 0)));
  state.cloudLoadStep = step || '';

  const fill = document.querySelector('.inline-sync-progress__fill');
  if(fill) fill.style.width = `${state.cloudLoadProgress}%`;

  const menuFill = document.querySelector('.account-menu-sync__fill');
  if(menuFill) menuFill.style.width = `${state.cloudLoadProgress}%`;

  const labels = document.querySelectorAll('.inline-sync-progress__top span');
  if(labels[0]) labels[0].textContent = state.cloudLoadStep || 'Bezig met laden...';
  if(labels[1]) labels[1].textContent = `${Math.round(state.cloudLoadProgress)}%`;

  const menuLabels = document.querySelectorAll('.account-menu-sync__top span');
  if(menuLabels[0]) menuLabels[0].textContent = state.cloudLoadStep || 'Bezig met laden...';
  if(menuLabels[1]) menuLabels[1].textContent = `${Math.round(state.cloudLoadProgress)}%`;
}

function setCloudHouseholdKey(householdKey){
  state.cloudHouseholdKey = householdKey || '';
}

function setCloudThemePreference(theme){
  state.cloudThemePreference = normalizeThemePreference(theme);
  persistCloudSessionMeta({
    email: state.cloudUserEmail || '',
    themePreference: state.cloudThemePreference || DEFAULT_THEME
  });
}

function clearCloudAuthState(){
  state.cloudUserEmail = '';
  state.cloudHouseholdKey = '';
  state.cloudThemePreference = DEFAULT_THEME;
  state.accountMenuOpen = false;
  state.cloudLoading = false;
  setCloudLoadProgress(0, '');
  persistCloudSessionMeta(null);
  try{
    window.localStorage.removeItem(CLOUD_DATA_CACHE_KEY);
  }catch(e){}
}

function clearCloudAuthStorage(){
  try{
    window.localStorage.removeItem('budget-veenstra-auth');
    window.localStorage.removeItem(CLOUD_DATA_CACHE_KEY);
  }catch(e){}

  try{
    const keysToRemove = [];
    for(let i = 0; i < window.localStorage.length; i += 1){
      const key = window.localStorage.key(i);
      if(key && (key.startsWith('sb-') || key.startsWith('supabase.auth.'))){
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
  }catch(e){}
}

function persistCloudSessionMeta(meta){
  try{
    if(!meta){
      window.localStorage.removeItem(CLOUD_AUTH_META_KEY);
      return;
    }

    window.localStorage.setItem(CLOUD_AUTH_META_KEY, JSON.stringify({
      email: meta.email || '',
      themePreference: normalizeThemePreference(meta.themePreference)
    }));
  }catch(e){}
}

function restoreCloudSessionMeta(){
  try{
    const raw = window.localStorage.getItem(CLOUD_AUTH_META_KEY);
    if(!raw) return;

    const parsed = JSON.parse(raw);
    state.cloudUserEmail = parsed?.email || '';
    state.cloudThemePreference = normalizeThemePreference(parsed?.themePreference);
  }catch(e){}
}

let cloudSyncTimer = null;
let cloudSyncInFlight = false;
let cloudLoadPromise = null;
const CLOUD_REQUEST_TIMEOUT_MS = 12000;
const CLOUD_AUTH_META_KEY = 'budget-veenstra-auth-meta';
const CLOUD_DATA_CACHE_KEY = 'budget-veenstra-cloud-data-cache';

function withCloudTimeout(promise, timeoutMs, label){
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(label || 'Supabase request duurde te lang'));
      }, timeoutMs);
    })
  ]);
}

function getSupabaseClient(){
  if(window.supabaseClient) return window.supabaseClient;
  throw new Error('Supabase client niet geladen');
}

function normalizeHouseholdSlug(lastName){
  const fallback = 'huishouden';
  const cleaned = String(lastName || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || fallback;
}

function buildHouseholdKey(lastName, userId){
  const slug = normalizeHouseholdSlug(lastName);
  const suffix = String(userId || '').replace(/-/g, '').slice(0, 8);
  return suffix ? `${slug}-household-${suffix}` : `${slug}-household`;
}

function getSignupHouseholdKey(user){
  const meta = user?.user_metadata || {};
  return meta.household_key || buildHouseholdKey(meta.last_name || '', user?.id || '');
}

function cloudIdPrefix(householdKey){
  return `${String(householdKey || '').trim()}__`;
}

function toCloudRowId(householdKey, id){
  const resolvedId = String(id || '').trim();
  if(!resolvedId) return resolvedId;

  const prefix = cloudIdPrefix(householdKey);
  if(!prefix.trim() || resolvedId.startsWith(prefix)) return resolvedId;

  return `${prefix}${resolvedId}`;
}

function fromCloudRowId(householdKey, id){
  const resolvedId = String(id || '');
  const prefix = cloudIdPrefix(householdKey);

  return prefix.trim() && resolvedId.startsWith(prefix)
    ? resolvedId.slice(prefix.length)
    : resolvedId;
}

async function ensureCloudHouseholdRecord(householdKey, householdName){
  const resolvedHouseholdKey = String(householdKey || '').trim();
  if(!resolvedHouseholdKey) throw new Error('Geen huishoudsleutel gevonden');

  const supabase = getSupabaseClient();
  const name = String(householdName || resolvedHouseholdKey).trim();
  const shapes = [
    { household_key: resolvedHouseholdKey, name },
    { id: resolvedHouseholdKey, name }
  ];
  const attempts = shapes.flatMap(payload => ([
    { payload, mode:'insert' },
    { payload, mode:'upsert' }
  ]));

  let lastError = null;
  for(const attempt of attempts){
    const keyColumn = Object.keys(attempt.payload)[0];
    const query = attempt.mode === 'upsert'
      ? supabase.from('households').upsert([attempt.payload], { onConflict:keyColumn })
      : supabase.from('households').insert([attempt.payload]);

    const { error } = await withCloudTimeout(
      query,
      CLOUD_REQUEST_TIMEOUT_MS,
      'Huishouden aanmaken duurde te lang'
    );

    if(!error) return { ok:true };
    if(/duplicate|already exists|unique/i.test(error.message || '')) return { ok:true };

    lastError = error;
    const message = error.message || '';
    if(attempt.mode === 'upsert' && /row-level security|rls policy/i.test(message)){
      continue;
    }
    if(!/column|schema cache|Could not find|PGRST204|does not exist|no unique|exclusion constraint|ON CONFLICT/i.test(message)){
      break;
    }
  }

  if(lastError && /Could not find the table|does not exist/i.test(lastError.message || '')){
    return { ok:true, skipped:true };
  }

  if(lastError) throw lastError;
  return { ok:true };
}

async function createCloudMemberForUser(user, householdKey, themePreference = DEFAULT_THEME){
  if(!user?.id) throw new Error('Geen Supabase gebruiker gevonden');
  const supabase = getSupabaseClient();
  const resolvedHouseholdKey = householdKey || getSignupHouseholdKey(user);
  const resolvedTheme = normalizeThemePreference(themePreference);

  const rpcResult = await withCloudTimeout(
    supabase
      .rpc('ensure_own_household_member', {
        p_household_key: resolvedHouseholdKey,
        p_household_name: user.user_metadata?.last_name || resolvedHouseholdKey,
        p_theme_preference: resolvedTheme
      }),
    CLOUD_REQUEST_TIMEOUT_MS,
    'Huishouden aanmaken duurde te lang'
  );

  if(!rpcResult.error){
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    return {
      household_key: row?.household_key || resolvedHouseholdKey,
      theme_preference: row?.theme_preference || resolvedTheme
    };
  }

  if(!/ensure_own_household_member|function.*not found|schema cache|PGRST202|Could not find/i.test(rpcResult.error.message || '')){
    throw rpcResult.error;
  }

  await ensureCloudHouseholdRecord(resolvedHouseholdKey, user.user_metadata?.last_name || resolvedHouseholdKey);

  const basePayload = {
    user_id: user.id,
    household_key: resolvedHouseholdKey
  };

  let { data, error } = await withCloudTimeout(
    supabase
      .from('household_members')
      .insert([{ ...basePayload, theme_preference: resolvedTheme }])
      .select('household_key, theme_preference')
      .maybeSingle(),
    CLOUD_REQUEST_TIMEOUT_MS,
    'Huishouden aanmaken duurde te lang'
  );

  if(error && /theme_preference/i.test(error.message || '')){
    const fallback = await withCloudTimeout(
      supabase
        .from('household_members')
        .insert([basePayload])
        .select('household_key')
        .maybeSingle(),
      CLOUD_REQUEST_TIMEOUT_MS,
      'Huishouden aanmaken duurde te lang'
    );

    data = fallback.data ? {
      household_key: fallback.data.household_key,
      theme_preference: resolvedTheme
    } : null;
    error = fallback.error;
  }

  if(error && /duplicate|already exists|unique/i.test(error.message || '')){
    const existing = await withCloudTimeout(
      supabase
        .from('household_members')
        .select('household_key, theme_preference')
        .eq('user_id', user.id)
        .maybeSingle(),
      CLOUD_REQUEST_TIMEOUT_MS,
      'Huishouden ophalen duurde te lang'
    );

    if(existing.error && /theme_preference/i.test(existing.error.message || '')){
      const fallback = await withCloudTimeout(
        supabase
          .from('household_members')
          .select('household_key')
          .eq('user_id', user.id)
          .maybeSingle(),
        CLOUD_REQUEST_TIMEOUT_MS,
        'Huishouden ophalen duurde te lang'
      );

      if(fallback.error) throw fallback.error;
      return fallback.data ? {
        household_key: fallback.data.household_key,
        theme_preference: resolvedTheme
      } : null;
    }

    if(existing.error) throw existing.error;
    return existing.data || null;
  }

  if(error) throw error;

  return data || {
    household_key: resolvedHouseholdKey,
    theme_preference: resolvedTheme
  };
}

async function getCloudUser(){
  const supabase = getSupabaseClient();
  setCloudLoadProgress(12, 'Sessie controleren...');
  const sessionResult = await withCloudTimeout(
    supabase.auth.getSession(),
    CLOUD_REQUEST_TIMEOUT_MS,
    'Sessie ophalen duurde te lang'
  );
  if(sessionResult.error) throw sessionResult.error;

  const user = sessionResult.data?.session?.user || null;

  state.cloudUserEmail = user?.email || '';
  if(user){
    persistCloudSessionMeta({
      email: user.email || '',
      themePreference: state.cloudThemePreference || DEFAULT_THEME
    });
    setCloudLoadProgress(24, 'Sessie gevonden');
  }else{
    persistCloudSessionMeta(null);
    setCloudLoadProgress(0, '');
  }
  return user;
}

async function getCloudMemberRecord(){
  const user = await getCloudUser();
  if(!user){
    throw new Error('Log eerst in op Supabase');
  }

  const supabase = getSupabaseClient();
  setCloudLoadProgress(36, 'Huishouden koppelen...');
  let { data, error } = await withCloudTimeout(
    supabase
      .from('household_members')
      .select('household_key, theme_preference')
      .eq('user_id', user.id)
      .maybeSingle(),
    CLOUD_REQUEST_TIMEOUT_MS,
    'Huishouden ophalen duurde te lang'
  );

  if(error && /theme_preference/i.test(error.message || '')){
    const fallback = await withCloudTimeout(
      supabase
        .from('household_members')
        .select('household_key')
        .eq('user_id', user.id)
        .maybeSingle(),
      CLOUD_REQUEST_TIMEOUT_MS,
      'Huishouden ophalen duurde te lang'
    );

    data = fallback.data ? {
      household_key: fallback.data.household_key,
      theme_preference: DEFAULT_THEME
    } : null;
    error = fallback.error;
  }

  if(error) throw error;
  if(data?.household_key){
    await ensureCloudHouseholdRecord(data.household_key, user.user_metadata?.last_name || data.household_key);
  }

  if(!data && (user?.user_metadata?.household_key || user?.user_metadata?.last_name)){
    setCloudLoadProgress(42, 'Nieuw huishouden aanmaken...');
    data = await createCloudMemberForUser(
      user,
      user.user_metadata.household_key,
      user.user_metadata.theme_preference || DEFAULT_THEME
    );
  }

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
  setCloudThemePreference(member?.theme_preference || DEFAULT_THEME);
  return householdKey;
}

async function saveThemePreference(theme){
  const resolved = normalizeThemePreference(theme);
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
  const user = await getCloudUser();
  if(!user){
    state.cloudUserEmail = '';
    state.cloudHouseholdKey = '';
    state.cloudThemePreference = DEFAULT_THEME;
    if(typeof resetBudgetData === 'function'){
      resetBudgetData();
    }
    if(typeof applyTheme === 'function'){
      applyTheme(DEFAULT_THEME, {
        persist:false,
        skipCloudPersist:true
      });
    }

    if(typeof renderInstellingen === 'function' && state.currentView === 'instellingen'){
      renderInstellingen();
    }

    if(typeof renderHeaderActions === 'function'){
      renderHeaderActions();
    }
    return false;
  }

  try{
    await getCloudHouseholdKey();
    setCloudLoadProgress(48, 'Cloud sessie klaar');
    if(typeof applyTheme === 'function'){
      applyTheme(state.cloudThemePreference || DEFAULT_THEME, {
        persist:false,
        skipCloudPersist:true
      });
    }
  }catch(e){
    state.cloudHouseholdKey = '';
    state.cloudThemePreference = DEFAULT_THEME;
    setCloudStatus(e.message || 'Cloud koppeling niet beschikbaar');
    console.error('Cloud sessie koppelen mislukt:', e);
  }

  if(typeof renderInstellingen === 'function' && state.currentView === 'instellingen'){
    renderInstellingen();
  }

  if(typeof renderHeaderActions === 'function'){
    renderHeaderActions();
  }

  return true;
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

function applyCloudData(data, options = {}){
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
  if(!options.skipLocalPersist){
    persistLocal();
  }
  if(!options.skipRender){
    if(typeof rerenderCurrentView === 'function'){
      rerenderCurrentView();
    }else{
      rerenderAll();
    }
  }
}

async function fetchCloudState(){
  const user = await getCloudUser();
  if(!user){
    return { ok:false, error:'Log eerst in op Supabase' };
  }
  const householdKey = await getCloudHouseholdKey();
  setCloudLoadProgress(60, 'Financiele gegevens ophalen...');
  if(typeof setStartupProgress === 'function'){
    setStartupProgress(66, 'Financiële gegevens ophalen...');
  }

  const supabase = getSupabaseClient();
  const [
    incomeResult,
    categoryResult,
    budgetResult,
    loanResult
  ] = await withCloudTimeout(
    Promise.all([
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
    ]),
    CLOUD_REQUEST_TIMEOUT_MS,
    'Gegevens ophalen uit Supabase duurde te lang'
  );

  const error = incomeResult.error || categoryResult.error || budgetResult.error || loanResult.error;
  if(error){
    return { ok:false, error:error.message || 'Ophalen mislukt' };
  }

  setCloudLoadProgress(84, 'Gegevens verwerken...');
  if(typeof setStartupProgress === 'function'){
    setStartupProgress(88, 'Gegevens verwerken...');
  }

  return {
    ok:true,
    inkomsten: (incomeResult.data || []).map((row, idx) => ({
      id: fromCloudRowId(householdKey, row.id),
      naam: row.name || '',
      bedrag: Number(row.amount || 0),
      volgorde: Number(row.sort_order || (idx + 1))
    })),
    categorieen: (categoryResult.data || []).map((row, idx) => ({
      id: fromCloudRowId(householdKey, row.id),
      naam: row.name || '',
      volgorde: Number(row.sort_order || (idx + 1))
    })),
    budget: (budgetResult.data || []).map((row, idx) => ({
      id: fromCloudRowId(householdKey, row.id),
      categorieId: fromCloudRowId(householdKey, row.category_id || ''),
      post: row.name || '',
      budget: Number(row.amount || 0),
      volgorde: Number(row.sort_order || (idx + 1))
    })),
    leningen: (loanResult.data || []).map((row, idx) => ({
      id: fromCloudRowId(householdKey, row.id),
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
  const ids = rows.map(row => toCloudRowId(householdKey, row.id)).filter(Boolean);

  let deleteQuery = supabase
    .from(tableName)
    .delete()
    .eq('household_key', householdKey);

  if(ids.length){
    deleteQuery = deleteQuery.not('id', 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
  }

  const { error: deleteError } = await deleteQuery;
  if(deleteError) throw new Error(`${tableName}: ${deleteError.message || 'verwijderen mislukt'}`);

  if(!rows.length) return;

  const payload = rows.map(mapRow);
  const { error: upsertError } = await supabase
    .from(tableName)
    .upsert(payload, { onConflict:'id' });

  if(upsertError) throw new Error(`${tableName}: ${upsertError.message || 'opslaan mislukt'}`);
}

async function saveCloudState(data){
  const user = await getCloudUser();
  if(!user){
    return { ok:false, error:'Log eerst in op Supabase' };
  }
  const householdKey = await getCloudHouseholdKey();

  try{
    await replaceHouseholdTable('income_items', householdKey, data.inkomsten || [], (row) => ({
      id: toCloudRowId(householdKey, row.id),
      household_key: householdKey,
      name: row.naam || '',
      amount: Number(row.bedrag || 0),
      sort_order: Number(row.volgorde || 0),
      updated_at: new Date().toISOString()
    }));

    await replaceHouseholdTable('categories', householdKey, data.categorieen || [], (row) => ({
      id: toCloudRowId(householdKey, row.id),
      household_key: householdKey,
      name: row.naam || '',
      sort_order: Number(row.volgorde || 0),
      updated_at: new Date().toISOString()
    }));

    await replaceHouseholdTable('budget_items', householdKey, data.budget || [], (row) => ({
      id: toCloudRowId(householdKey, row.id),
      household_key: householdKey,
      category_id: toCloudRowId(householdKey, row.categorieId || ''),
      name: row.post || '',
      amount: Number(row.budget || 0),
      sort_order: Number(row.volgorde || 0),
      updated_at: new Date().toISOString()
    }));

    await replaceHouseholdTable('loans', householdKey, data.leningen || [], (row) => ({
      id: toCloudRowId(householdKey, row.id),
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
  const progress = Math.max(0, Math.min(100, Number(state.cloudLoadProgress || 0)));
  const step = escapeHtml(state.cloudLoadStep || '');

  return `
    <div class="inline-sync-status-wrap">
      <div class="inline-sync-status" id="inline-sync-status">${text}</div>
      ${state.cloudLoading ? `
        <div class="inline-sync-progress" aria-live="polite">
          <div class="inline-sync-progress__top">
            <span>${step || 'Bezig met laden...'}</span>
            <span>${Math.round(progress)}%</span>
          </div>
          <div class="inline-sync-progress__bar" aria-hidden="true">
            <div class="inline-sync-progress__fill" style="width:${progress}%"></div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

async function loadFromCloud(options = {}){
  if(cloudLoadPromise) return cloudLoadPromise;
  const silent = options.silent === true;

  cloudLoadPromise = (async () => {
    state.cloudLoading = true;
    setCloudLoadProgress(6, 'Voorbereiden...');
    console.info('loadFromCloud:start');
    setCloudStatus('Ophalen...');
    if(typeof setStartupProgress === 'function'){
      setStartupProgress(52, 'Verbinding maken met Supabase...');
    }
    if(typeof rerenderCurrentView === 'function'){
      rerenderCurrentView();
    }else if(typeof renderHeaderActions === 'function'){
      renderHeaderActions();
    }

    try{
      setCloudLoadProgress(18, 'Sessie valideren...');
      const result = await fetchCloudState();

      if(result?.ok){
        setCloudLoadProgress(94, 'Gegevens toepassen...');
        applyCloudData(result);
        if(!silent){
          showToast('Data opgehaald');
        }
        setCloudStatus('Vers geladen uit Supabase');
        setCloudLoadProgress(100, 'Klaar');
        if(typeof setStartupProgress === 'function'){
          setStartupProgress(100, 'Gegevens bijgewerkt');
        }
      }else{
        showToast(result?.error || 'Ophalen mislukt');
        setCloudStatus(result?.error || 'Ophalen mislukt');
        console.error('Supabase fout:', result);
        if(typeof setStartupProgress === 'function'){
          setStartupProgress(100, result?.error || 'Ophalen mislukt');
        }
      }
    }catch(e){
      console.error('loadFromCloud crash:', e);
      showToast('Ophalen mislukt');
      setCloudStatus(e.message || 'Ophalen mislukt');
      if(typeof setStartupProgress === 'function'){
        setStartupProgress(100, e.message || 'Ophalen mislukt');
      }
    }finally{
      state.cloudLoading = false;
      cloudLoadPromise = null;
      if(state.cloudStatus !== 'Vers geladen uit Supabase'){
        setCloudLoadProgress(0, '');
      }
      if(typeof rerenderCurrentView === 'function'){
        rerenderCurrentView();
      }else if(typeof renderHeaderActions === 'function'){
        renderHeaderActions();
      }
    }
  })();

  return cloudLoadPromise;
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
    state.cloudThemePreference = DEFAULT_THEME;
    setCloudStatus(e.message || 'Inloggen mislukt');
    showToast('Inloggen mislukt');
    return { ok:false, error:e.message || 'Inloggen mislukt' };
  }
}

async function createCloudAccount(emailArg, passwordArg, lastNameArg){
  const email = String(emailArg || '').trim();
  const password = String(passwordArg || '');
  const lastName = String(lastNameArg || '').trim();

  if(!email || !password || !lastName){
    setCloudStatus('Vul e-mail, wachtwoord en achternaam in');
    showToast('Vul alles in');
    return { ok:false, error:'Vul e-mail, wachtwoord en achternaam in' };
  }

  if(password.length < 6){
    setCloudStatus('Gebruik minimaal 6 tekens voor het wachtwoord');
    showToast('Wachtwoord is te kort');
    return { ok:false, error:'Gebruik minimaal 6 tekens voor het wachtwoord' };
  }

  state.cloudCreatingAccount = true;
  setCloudStatus('Account aanmaken...');
  if(typeof renderAppModal === 'function'){
    renderAppModal();
  }

  let createdUserEmail = '';

  try{
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          last_name: lastName,
          theme_preference: state.cloudThemePreference || DEFAULT_THEME
        }
      }
    });

    if(error) throw error;

    const user = data?.user || null;
    const session = data?.session || null;
    createdUserEmail = user?.email || email;
    let householdKey = buildHouseholdKey(lastName, user?.id || '');

    if(user?.id){
      householdKey = buildHouseholdKey(lastName, user.id);

      if(session){
        const member = await createCloudMemberForUser(
          user,
          householdKey,
          state.cloudThemePreference || DEFAULT_THEME
        );
        householdKey = member?.household_key || householdKey;
      }else{
        householdKey = getSignupHouseholdKey(user);
      }
    }

    setCloudStatus(session ? 'Account en huishouden aangemaakt' : 'Check je e-mail om het account te bevestigen');
    showToast(session ? 'Account aangemaakt' : 'Check je e-mail');

    return {
      ok:true,
      email:createdUserEmail || email,
      needsConfirmation:!session,
      householdKey
    };
  }catch(e){
    const message = e.message || 'Account aanmaken mislukt';
    const accountLikelyExists = Boolean(createdUserEmail);
    const status = accountLikelyExists
      ? `Account bestaat, maar huishouden koppelen mislukt: ${message}`
      : message;

    setCloudStatus(status);
    showToast(accountLikelyExists ? 'Huishouden koppelen mislukt' : 'Account aanmaken mislukt');
    return { ok:false, error:status };
  }finally{
    state.cloudCreatingAccount = false;
    if(typeof renderAppModal === 'function' && state.appModalOpen && state.appModalType === 'cloud-signup'){
      renderAppModal();
    }
  }
}

function finalizeCloudLogin(email){
  state.cloudUserEmail = email || '';
  state.accountMenuOpen = false;
  setCloudHouseholdKey('');
  setCloudThemePreference(DEFAULT_THEME);

  if(typeof applyTheme === 'function'){
    applyTheme(DEFAULT_THEME, { persist:false, skipCloudPersist:true });
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
}

async function signOutFromCloud(){
  if(state.cloudSigningOut) return;
  state.cloudSigningOut = true;
  setCloudStatus('Uitloggen...');

  try{
    clearCloudAuthState();
    closeAppModal();
    clearCloudAuthStorage();
    if(typeof resetBudgetData === 'function'){
      resetBudgetData();
    }
    if(typeof applyTheme === 'function'){
      applyTheme(DEFAULT_THEME, { persist:false, skipCloudPersist:true });
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
    try{
      let signOutResult = await Promise.race([
        supabase.auth.signOut({ scope:'local' }),
        new Promise(resolve => setTimeout(() => resolve({ error:null, timedOut:true }), 2500))
      ]);

      if(signOutResult?.error){
        signOutResult = await supabase.auth.signOut();
      }
      if(signOutResult?.error) throw signOutResult.error;
    }catch(e){
      console.error('Supabase signOut achtergrondfout:', e);
    }

    setCloudStatus('Uitgelogd');

    showToast('Uitgelogd');
  }catch(e){
    setCloudStatus(e.message || 'Uitloggen mislukt');
    showToast('Uitloggen mislukt');
  }finally{
    state.cloudSigningOut = false;
    if(typeof renderHeaderActions === 'function'){
      renderHeaderActions();
    }
  }
}

function isCloudSignedIn(){
  return Boolean(state.cloudUserEmail);
}

function getCloudUserEmail(){
  return state.cloudUserEmail || 'Niet ingelogd';
}

restoreCloudSessionMeta();
