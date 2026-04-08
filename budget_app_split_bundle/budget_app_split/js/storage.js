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

async function safeJson(res){
  const text = await res.text();
  try { return JSON.parse(text); }
  catch(e){ return { ok:false, error:'Parse fout', raw:text.slice(0,200) }; }
}

async function sheetsGet(){
  const res = await fetch(state.sheetsUrl + '?action=getAll', { redirect:'follow' });
  return safeJson(res);
}

async function sheetsPost(data){
  const res = await fetch(state.sheetsUrl, { method:'POST', redirect:'follow', body: JSON.stringify(data) });
  return safeJson(res);
}

function normalizeData(){
  state.categorieen = orderedCats().map((cat, idx)=>({
    id: String(cat.id || uid('cat')),
    naam: String(cat.naam || 'Nieuwe categorie'),
    volgorde: idx + 1
  }));
  state.budget = state.budget.map(row=>({
    id: String(row.id || uid('bud')),
    categorieId: String(row.categorieId || ''),
    post: String(row.post || 'Nieuwe post'),
    budget: Number(row.budget || 0),
    volgorde: Number(row.volgorde || 0)
  }));
  const validCatIds = new Set(state.categorieen.map(c=>c.id));
  state.budget = state.budget.filter(r=>validCatIds.has(r.categorieId));
  for (const cat of state.categorieen){
    const rows = itemsForCategory(cat.id);
    rows.forEach((row, idx)=>{ row.volgorde = idx + 1; });
  }
  ensureBudgetSelection();
}

function toRows(){
  normalizeData();
  return {
    action:'saveAll',
    inkomsten: state.inkomsten.map(r=>({
      naam: r.naam || '',
      bedrag: Number(r.bedrag || 0)
    })),
    categorieen: orderedCats().map((c,i)=>({
      id: c.id,
      naam: c.naam || '',
      volgorde: i + 1
    })),
    budget: orderedCats().flatMap(c =>
      itemsForCategory(c.id).map((r, rowIndex)=>({
        id: r.id,
        categorieId: c.id,
        post: r.post || '',
        budget: Number(r.budget || 0),
        volgorde: rowIndex + 1
      }))
    ),
    leningen: state.leningen.map(r=>({
      id: r.id,
      naam: r.naam || '',
      totaal: Number(r.totaal || 0),
      betaald: Number(r.betaald || 0),
      kleur: r.kleur || '#7c6af7'
    }))
  };
}

async function loadFromSheets(){
  if(data.inkomsten) state.inkomsten = data.inkomsten.map(r=>({ naam: String(r.naam || ''), bedrag: Number(r.bedrag || 0) }));
  if(data.categorieen) state.categorieen = data.categorieen.map((r,i)=>({ id: String(r.id || uid('cat')), naam: String(r.naam || ''), volgorde: Number(r.volgorde || (i+1)) }));
  if(data.budget) state.budget = data.budget.map((r,i)=>({ id: String(r.id || uid('bud')), categorieId: String(r.categorieId || ''), post: String(r.post || ''), budget: Number(r.budget || 0), volgorde: Number(r.volgorde || (i+1)) }));
  if(data.leningen) state.leningen = data.leningen.map(r=>({ id: String(r.id || uid('ln')), naam: String(r.naam || ''), totaal: Number(r.totaal || 0), betaald: Number(r.betaald || 0), kleur: String(r.kleur || '#7c6af7') }));
  normalizeData();
  persistLocal();
  rerenderAll();
}

async function loadFromSheets(){
  const saveStatus = document.getElementById('save-status');
  if(saveStatus) saveStatus.textContent = 'Ophalen...';
  try{
    const result = await sheetsGet();
    if(result?.ok){
      applySheets(result);
      showToast('Data opgehaald');
      if(saveStatus) saveStatus.textContent = 'Vers geladen uit Sheets';
    }else{
      showToast(result?.error || 'Ophalen mislukt');
      if(saveStatus) saveStatus.textContent = 'Ophalen mislukt';
    }
  }catch(e){
    showToast('Ophalen mislukt');
    if(saveStatus) saveStatus.textContent = 'Ophalen mislukt';
  }
}

async function saveToSheets(){
  const status = document.getElementById('save-status');
  if(status) status.textContent = 'Opslaan...';
  try{
    const result = await sheetsPost(toRows());
    if(result?.ok){
      persistLocal();
      if(status) status.textContent = 'Opgeslagen in Sheets';
      showToast('Opgeslagen');
    }else{
      if(status) status.textContent = result?.error || 'Opslaan mislukt';
      showToast(result?.error || 'Opslaan mislukt');
    }
  }catch(e){
    if(status) status.textContent = 'Opslaan mislukt';
    showToast('Opslaan mislukt');
  }
}