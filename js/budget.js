function renderBudget(){
  ensureBudgetSelection();
  const total = budgetTotaal();
  const cats = orderedCats();
  const selectedCatId = state.budgetSelectedCategoryId;
  const selectedCat = cats.find(c => c.id === selectedCatId) || null;
  const selectedItems = selectedCat ? itemsForCategory(selectedCat.id) : [];
  const remaining = budgetRemaining();
  const budgetHtml = state.budgetSubtab === 'inkomsten' ? `
    <div class="budget-income-layout">
      <div class="budget-overview-card card">
        <div class="budget-overview-top">
          <div>
            <div class="budget-kicker">Inkomsten</div>
            <div class="budget-overview-amount">${fmt(inkomstenTotaal())}</div>
          </div>
          <button class="btn secondary budget-small-btn" onclick="addIncomeRow()">+ Inkomst</button>
        </div>
        <div class="budget-overview-meta">
          <span>${state.inkomsten.length} bronnen</span>
          <span>${remaining >= 0 ? 'Ruimte over' : 'Tekort'}: ${fmt(Math.abs(remaining))}</span>
        </div>
      </div>

      <div class="stack">
        ${state.inkomsten.map((r, idx)=>`
          <div class="card income-row-card">
            <div class="income-row-head">
              <input class="input" value="${escapeHtml(r.naam)}" onchange="updateIncomeName(${idx}, this.value)" placeholder="Naam inkomen">
              <button class="icon-btn" onclick="removeIncomeRow(${idx})" title="Verwijder">✕</button>
            </div>
            <div class="income-amount-row">
              <div class="budget-inline-label">Bedrag per maand</div>
              <input class="input income-amount-input" type="number" inputmode="decimal" value="${Number(r.bedrag||0)}" onchange="updateIncomeAmount(${idx}, this.value)">
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : `
    <div class="budget-overview-card card">
      <div class="budget-overview-top">
        <div>
          <div class="budget-kicker">Budget planner</div>
          <div class="budget-overview-amount">${fmt(total)}</div>
        </div>
        <button class="btn budget-primary-btn" onclick="openBudgetComposer('category')">+ Categorie</button>
      </div>
      <div class="budget-overview-meta">
        <span>${cats.length} categorieën</span>
        <span>${state.budget.length} posten</span>
        <span style="color:${remaining>=0?'var(--green)':'var(--red)'}">${remaining>=0?'Over':'Tekort'} ${fmt(Math.abs(remaining))}</span>
      </div>
    </div>

    <div class="budget-shell-grid ${selectedCat ? 'has-selection' : ''}">
      <div class="budget-sidebar">
        <div class="budget-section-head">
          <div>
            <div class="sec" style="margin:0">Categorieën</div>
            <div class="budget-section-copy">Kies een categorie om posten te bekijken of aan te passen.</div>
          </div>
          <button class="btn secondary budget-small-btn" onclick="openBudgetComposer('category')">Nieuw</button>
        </div>

        <div class="budget-category-list">
          ${cats.length ? cats.map(cat => {
            const catTotal = totalForCategory(cat.id);
            const count = postsCount(cat.id);
            const topPosts = itemsForCategory(cat.id).slice(0,2);
            const selected = selectedCatId === cat.id;
            return `
              <button class="budget-category-card ${selected ? 'active' : ''}" onclick="selectBudgetCategory('${cat.id}')">
                <div class="budget-category-card-top">
                  <div>
                    <div class="budget-category-name">${escapeHtml(cat.naam)}</div>
                    <div class="budget-category-sub">${count} ${count === 1 ? 'post' : 'posten'}</div>
                  </div>
                  <div class="budget-category-amount">${fmtShort(catTotal)}</div>
                </div>
                <div class="budget-category-progress"><div class="budget-category-progress-fill" style="width:${Math.min(100, budgetUsagePct(cat.id))}%"></div></div>
                <div class="budget-category-preview">
                  ${topPosts.length ? topPosts.map(p => `<span>${escapeHtml(p.post)}</span>`).join('') : '<span>Nog geen posten</span>'}
                </div>
              </button>
            `;
          }).join('') : `
            <div class="card budget-empty-card">
              <div class="budget-empty-title">Nog geen categorieën</div>
              <div class="budget-empty-copy">Maak eerst een categorie aan. Daarna voeg je makkelijk posten en bedragen toe.</div>
              <button class="btn" onclick="openBudgetComposer('category')">Eerste categorie</button>
            </div>
          `}
        </div>
      </div>

      <div class="budget-detail card">
        ${selectedCat ? `
          <div class="budget-detail-head">
            <div>
              <div class="budget-kicker">Geselecteerde categorie</div>
              <div class="budget-detail-title">${escapeHtml(selectedCat.naam)}</div>
              <div class="budget-detail-sub">${selectedItems.length} ${selectedItems.length === 1 ? 'post' : 'posten'} · ${fmt(totalForCategory(selectedCat.id))}</div>
            </div>
          </div>

          ${selectedItems.length ? `
            <div class="budget-line-list">
              ${selectedItems.map(item => `
                <div class="post-row budget-line-row" data-id="${item.id}" ontouchstart="swipeStart(event, '${item.id}')" ontouchmove="swipeMove(event, '${item.id}')" ontouchend="swipeEnd(event, '${item.id}')">
                  <div class="swipe-delete-bg">
                    <div class="swipe-action">
                      <span class="swipe-action-icon">✕</span>
                      <span class="swipe-action-label">Verwijder</span>
                    </div>
                  </div>
                  <div class="post-row-content budget-line-content">
                    <button class="budget-line-main" onclick="openBudgetComposer('post','${item.id}')">
                      <span class="budget-line-name">${escapeHtml(item.post)}</span>
                      <span class="budget-line-hint">Tik om te wijzigen</span>
                    </button>
                    <div class="budget-line-right">
                      <button class="budget-chip" onclick="event.stopPropagation();quickAdjustBudget('${item.id}',-10)">-10</button>
                      <button class="budget-chip" onclick="event.stopPropagation();quickAdjustBudget('${item.id}',10)">+10</button>
                      <button class="budget-line-amount" onclick="event.stopPropagation();openBudgetComposer('post','${item.id}')">${fmt(item.budget)}</button>
                      <button class="icon-btn" onclick="event.stopPropagation();removeBudgetPost('${item.id}')" title="Verwijder">✕</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="budget-empty-state">
              <div class="budget-empty-title">Nog geen posten in deze categorie</div>
              <div class="budget-empty-copy">Voeg je eerste post toe, bijvoorbeeld huur, boodschappen of streaming.</div>
              <button class="btn" onclick="openBudgetComposer('post', null, '${selectedCat.id}')">Eerste post toevoegen</button>
            </div>
          `}
        ` : `
          <div class="budget-empty-state budget-empty-state-large">
            <div class="budget-empty-title">Kies een categorie</div>
            <div class="budget-empty-copy">Selecteer links een categorie. Op iPhone staat de detailkaart automatisch onder de lijst.</div>
          </div>
        `}
      </div>
    </div>

    <div class="budget-mobile-actions">
      <button class="btn secondary" onclick="openBudgetComposer('category')">+ Categorie</button>
      <button class="btn" onclick="openBudgetComposer('post', null, state.budgetSelectedCategoryId)" ${selectedCat ? '' : 'disabled'}>+ Post</button>
    </div>
  `;

  document.getElementById('v-budget').innerHTML = `
    <div class="subtabs">
      <button class="subtab ${state.budgetSubtab==='inkomsten'?'active':''}" onclick="setBudgetSubtab('inkomsten')">Inkomsten</button>
      <button class="subtab ${state.budgetSubtab==='categorieen'?'active':''}" onclick="setBudgetSubtab('categorieen')">Categorieën / Uitgaven</button>
    </div>
    ${budgetHtml}
    <div class="card budget-summary-card">
      <div class="row">
        <div style="font-weight:700">Totaal budget</div>
        <div class="mono" style="color:var(--accent)">${fmt(total)}</div>
      </div>
      <div class="row" style="margin-top:8px">
        <div class="muted">Overschot</div>
        <div class="mono" style="color:${remaining>=0?'var(--green)':'var(--red)'}">${fmt(remaining)}</div>
      </div>
      <div class="stack" style="margin-top:14px">
        <button class="btn" onclick="saveToSheets()">☁️ Opslaan in Sheets</button>
        <button class="btn secondary" onclick="loadFromSheets()">↻ Opnieuw ophalen</button>
      </div>
      <div id="save-status" class="note" style="margin-top:10px"></div>
    </div>
  `;

  renderBudgetComposer();
}

function updateIncomeName(idx, value){
  if(!state.inkomsten[idx]) return;
  state.inkomsten[idx].naam = value.trim() || 'Inkomsten';
  persistLocal(); rerenderAll();
}

function updateIncomeAmount(idx, value){
  if(!state.inkomsten[idx]) return;
  state.inkomsten[idx].bedrag = Number(value||0);
  persistLocal(); rerenderAll();
}

function addIncomeRow(){
  state.inkomsten.push({ naam:'Nieuwe inkomsten', bedrag:0 });
  persistLocal(); rerenderAll();
}

function removeIncomeRow(idx){
  if(!state.inkomsten[idx]) return;
  if(state.inkomsten.length <= 1){
    showToast('Laat minimaal één inkomstenregel staan');
    return;
  }
  if(!confirm('Inkomstenregel verwijderen?')) return;
  state.inkomsten.splice(idx,1);
  persistLocal(); rerenderAll();
}

function selectBudgetCategory(catId){
  state.budgetSelectedCategoryId = catId;
  renderBudget();
}

function openBudgetComposer(mode='category', targetId=null, categoryId=null){
  ensureBudgetSelection();
  state.budgetComposerOpen = true;
  state.budgetComposerMode = mode;
  state.budgetComposerTargetId = targetId || null;
  state.budgetComposerCategoryId = categoryId || null;
  if(mode === 'post' && !state.budgetComposerCategoryId){
    const target = targetId ? state.budget.find(r => r.id === targetId) : null;
    state.budgetComposerCategoryId = target?.categorieId || state.budgetSelectedCategoryId || orderedCats()[0]?.id || null;
  }
  renderBudgetComposer();
}

function closeBudgetComposer(){
  state.budgetComposerOpen = false;
  state.budgetComposerMode = 'category';
  state.budgetComposerTargetId = null;
  state.budgetComposerCategoryId = null;
  renderBudgetComposer();
}

function renderBudgetComposer(){
  const root = document.getElementById('budget-modal-root');
  if(!root) return;
  if(!state.budgetComposerOpen || state.currentView !== 'budget' || state.budgetSubtab !== 'categorieen'){
    root.innerHTML = '';
    return;
  }
  const mode = state.budgetComposerMode;
  const cats = orderedCats();
  const category = mode === 'category' && state.budgetComposerTargetId
    ? state.categorieen.find(c => c.id === state.budgetComposerTargetId)
    : null;
  const post = mode === 'post' && state.budgetComposerTargetId
    ? state.budget.find(r => r.id === state.budgetComposerTargetId)
    : null;
  const currentCategoryId = post?.categorieId || state.budgetComposerCategoryId || state.budgetSelectedCategoryId || cats[0]?.id || '';
  root.innerHTML = `
    <div class="budget-modal-backdrop" onclick="closeBudgetComposer()">
      <div class="budget-modal-sheet ${mode === 'post' ? 'post-mode' : 'category-mode'}" onclick="event.stopPropagation()">
        <div class="budget-modal-handle"></div>
        <div class="budget-modal-title">${mode === 'category' ? (category ? 'Categorie wijzigen' : 'Nieuwe categorie') : (post ? 'Post wijzigen' : 'Nieuwe post')}</div>
        <div class="budget-modal-copy">${mode === 'category' ? 'Maak categorieën aan als blokken. De details pas je daarna per categorie aan.' : 'Maak een post aan of wijzig een bestaand bedrag zonder dat de pagina als een spreadsheet voelt.'}</div>

        ${mode === 'category' ? `
          <div class="stack">
            <div>
              <div class="budget-inline-label">Naam categorie</div>
              <input id="composer-category-name" class="input" value="${escapeHtml(category?.naam || '')}" placeholder="Bijv. Boodschappen">
            </div>
          </div>
        ` : `
          <div class="stack">
            <div>
              <div class="budget-inline-label">Categorie</div>
              <select id="composer-post-category" class="input">
                ${cats.map(cat => `<option value="${cat.id}" ${cat.id === currentCategoryId ? 'selected' : ''}>${escapeHtml(cat.naam)}</option>`).join('')}
              </select>
            </div>
            <div>
              <div class="budget-inline-label">Naam post</div>
              <input id="composer-post-name" class="input" value="${escapeHtml(post?.post || '')}" placeholder="Bijv. Albert Heijn">
            </div>
            <div>
              <div class="budget-inline-label">Budget per maand</div>
              <input id="composer-post-amount" class="input composer-amount-input" type="number" inputmode="decimal" value="${Number(post?.budget || 0)}" placeholder="0">
            </div>
          </div>
        `}

        <div class="budget-modal-actions">
          <button class="btn secondary" onclick="closeBudgetComposer()">Annuleren</button>
          <button class="btn" onclick="saveBudgetComposer()">Opslaan</button>
        </div>
      </div>
    </div>
  `;
  const focusId = mode === 'category' ? 'composer-category-name' : (post ? 'composer-post-amount' : 'composer-post-name');
  setTimeout(()=>{
    const el = document.getElementById(focusId);
    if(el){
      el.focus();
      if(el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length);
    }
  }, 30);
}

function saveBudgetComposer(){
  const mode = state.budgetComposerMode;
  if(mode === 'category'){
    const input = document.getElementById('composer-category-name');
    const name = (input?.value || '').trim();
    if(!name){
      showToast('Geef de categorie een naam');
      return;
    }
    if(state.budgetComposerTargetId){
      const cat = state.categorieen.find(c => c.id === state.budgetComposerTargetId);
      if(cat) cat.naam = name;
    }else{
      const newCat = { id: uid('cat'), naam: name, volgorde: state.categorieen.length + 1 };
      state.categorieen.push(newCat);
      state.budgetSelectedCategoryId = newCat.id;
    }
  }else{
    const name = (document.getElementById('composer-post-name')?.value || '').trim();
    const amount = Number(document.getElementById('composer-post-amount')?.value || 0);
    const categoryId = document.getElementById('composer-post-category')?.value || state.budgetComposerCategoryId;
    if(!categoryId){
      showToast('Maak eerst een categorie aan');
      return;
    }
    if(!name){
      showToast('Geef de post een naam');
      return;
    }
    if(state.budgetComposerTargetId){
      const row = state.budget.find(r => r.id === state.budgetComposerTargetId);
      if(row){
        row.post = name;
        row.budget = amount;
        row.categorieId = categoryId;
      }
    }else{
      state.budget.push({
        id: uid('bud'),
        categorieId: categoryId,
        post: name,
        budget: amount,
        volgorde: itemsForCategory(categoryId).length + 1
      });
    }
    state.budgetSelectedCategoryId = categoryId;
  }
  normalizeData();
  persistLocal();
  closeBudgetComposer();
  rerenderAll();
}

function addCategory(){ openBudgetComposer('category'); }

function renameCategory(catId, value){
  const cat = state.categorieen.find(c=>c.id===catId); if(!cat) return;
  cat.naam = value.trim() || 'Nieuwe categorie'; persistLocal(); rerenderAll();
}

function removeCategory(catId){
  const cat = state.categorieen.find(c => c.id === catId);
  if(!cat) return;
  if(!confirm(`Categorie "${cat.naam}" verwijderen inclusief alle posten?`)) return;
  state.categorieen = state.categorieen.filter(c=>c.id!==catId);
  state.budget = state.budget.filter(r=>r.categorieId!==catId);
  ensureBudgetSelection();
  persistLocal(); rerenderAll();
}

function toggleCategory(catId){ selectBudgetCategory(catId); }

function allCategoriesOpen(){ return false; }

function toggleAllCategories(){}

function addBudgetPost(catId){ openBudgetComposer('post', null, catId || state.budgetSelectedCategoryId); }

function renameBudgetPost(id, value){
  const row = state.budget.find(r=>r.id===id); if(!row) return;
  row.post = value.trim() || 'Nieuwe post'; persistLocal(); rerenderAll();
}

function updateBudgetAmount(id, value){
  const row = state.budget.find(r=>r.id===id); if(!row) return;
  row.budget = Number(value||0); persistLocal(); rerenderAll();
}

function quickAdjustBudget(id, delta){
  const row = state.budget.find(r => r.id === id);
  if(!row) return;
  row.budget = Math.max(0, Number(row.budget || 0) + Number(delta || 0));
  persistLocal(); rerenderAll();
}

function removeBudgetPost(id){
  const row = state.budget.find(r=>r.id===id);
  if(!row) return;
  if(!confirm(`Post "${row.post}" verwijderen?`)) return;
  const catId = row.categorieId;
  state.budget = state.budget.filter(r=>r.id!==id);
  const rows = itemsForCategory(catId);
  rows.forEach((item, idx)=> item.volgorde = idx + 1);
  persistLocal(); rerenderAll();
}

function moveCategoryUp(catId){
  const cats = orderedCats();
  const idx = cats.findIndex(c => c.id === catId);
  if(idx <= 0) return;
  [cats[idx-1], cats[idx]] = [cats[idx], cats[idx-1]];
  state.categorieen = cats.map((c, i) => ({...c, volgorde:i+1}));
  persistLocal();
  renderBudget();
}

function moveCategoryDown(catId){
  const cats = orderedCats();
  const idx = cats.findIndex(c => c.id === catId);
  if(idx < 0 || idx >= cats.length - 1) return;
  [cats[idx], cats[idx+1]] = [cats[idx+1], cats[idx]];
  state.categorieen = cats.map((c, i) => ({...c, volgorde:i+1}));
  persistLocal();
  renderBudget();
}

function toggleCategoryActions(id){}