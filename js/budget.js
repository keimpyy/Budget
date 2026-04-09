function renderBudget() {
  const total = budgetTotaal();
  const cats = orderedCats();
  const remaining = budgetRemaining();
  const incomeView = state.budgetSubtab === 'inkomsten';

  const incomeHtml = `
    <section class="budget-page">
      <div class="budget-shell budget-shell--single">
        <div class="budget-main">
          <section class="card budget-hero">
            <div class="budget-hero__content">
              <div class="budget-kicker">Inkomsten</div>
              <div class="budget-hero__amount">${fmt(inkomstenTotaal())}</div>
              <div class="budget-hero__meta">
                <span>${state.inkomsten.length} bronnen</span>
                <span class="${remaining >= 0 ? 'is-positive' : 'is-negative'}">
                  ${remaining >= 0 ? 'Ruimte over' : 'Tekort'}: ${fmt(Math.abs(remaining))}
                </span>
              </div>
            </div>
            <div class="budget-hero__actions">
              <button class="btn" onclick="addIncomeRow()">+ Inkomst</button>
            </div>
          </section>
          ${renderInlineSyncStatus()}

          <section class="budget-list">
            ${state.inkomsten.map((r, idx) => `
              <article class="card budget-item budget-item--income">
                <div class="budget-item__main">
                  <label class="budget-field">
                    <span class="budget-field__label">Naam</span>
                    <input
                      class="input"
                      value="${escapeHtml(r.naam)}"
                      onchange="updateIncomeName(${idx}, this.value)"
                      placeholder="Naam inkomen"
                    >
                  </label>

                  <label class="budget-field budget-field--amount">
                    <span class="budget-field__label">Bedrag per maand</span>
                    <input
                      class="input"
                      type="number"
                      inputmode="decimal"
                      value="${Number(r.bedrag || 0)}"
                      onchange="updateIncomeAmount(${idx}, this.value)"
                    >
                  </label>
                </div>

                <div class="budget-item__actions">
                  <button class="icon-btn" onclick="removeIncomeRow(${idx})" title="Verwijder">✕</button>
                </div>
              </article>
            `).join('')}
          </section>
        </div>
        <aside class="budget-sidebar"></aside>
      </div>
    </section>
  `;

  const categoriesHtml = `
    <section class="budget-page">
      <div class="budget-shell">
        <div class="budget-main">
          <section class="card budget-hero">
            <div class="budget-hero__content">
              <div class="budget-kicker">Budget planner</div>
              <div class="budget-hero__amount">${fmt(total)}</div>
              <div class="budget-hero__meta">
                <span>${cats.length} categorieën</span>
                <span>${state.budget.length} posten</span>
                <span class="${remaining >= 0 ? 'is-positive' : 'is-negative'}">
                  ${remaining >= 0 ? 'Over' : 'Tekort'} ${fmt(Math.abs(remaining))}
                </span>
              </div>
            </div>
              <div class="budget-hero__actions">
                <button class="btn" onclick="openBudgetComposer('category')">+ Categorie</button>
                <button class="btn secondary" onclick="loadFromCloud()">Ophalen</button>
              </div>
          </section>
          ${renderInlineSyncStatus()}

${cats.length
  ? `<section class="budget-category-list">
      ${cats.map(cat => {
        const rows = itemsForCategory(cat.id);
        const catTotal = totalForCategory(cat.id);
        const count = rows.length;
        const pct = Math.min(100, budgetUsagePct(cat.id));
        const isOpen = !!state.openCats[cat.id];

        return `
          <article class="card budget-category-card">
            <header class="budget-category-card__head">
              <button
                class="budget-category-card__titlewrap budget-category-card__toggle"
                onclick="toggleBudgetCategory('${cat.id}')"
                aria-expanded="${isOpen ? 'true' : 'false'}"
              >
                <div>
                  <h3 class="budget-category-card__title">${escapeHtml(cat.naam)}</h3>
                  <div class="budget-category-card__meta">
                    ${count} ${count === 1 ? 'post' : 'posten'} · ${fmt(catTotal)}
                  </div>
                </div>
                <span class="budget-category-card__chevron">${isOpen ? '▾' : '▸'}</span>
              </button>

              <div class="budget-category-card__actions">
                <button class="pill-btn" onclick="event.stopPropagation();addBudgetPost('${cat.id}')">+ Post</button>
                <button class="icon-btn" onclick="event.stopPropagation();openBudgetComposer('category','${cat.id}')" title="Categorie wijzigen">✎</button>
                <button class="icon-btn" onclick="event.stopPropagation();removeCategory('${cat.id}')" title="Categorie verwijderen">✕</button>
              </div>
            </header>

            <div class="budget-progress" aria-hidden="true">
              <div class="budget-progress__fill" style="width:${pct}%"></div>
            </div>

            ${isOpen ? (
              rows.length
                ? `<div class="budget-post-list">
                    ${rows.map(item => `
                      <article
                        class="budget-post-card"
                        data-id="${item.id}"
                        ontouchstart="swipeStart(event, '${item.id}')"
                        ontouchmove="swipeMove(event, '${item.id}')"
                        ontouchend="swipeEnd(event, '${item.id}')"
                      >
                        <div class="swipe-delete-bg">
                          <div class="swipe-action">
                            <span class="swipe-action-icon">✕</span>
                            <span class="swipe-action-label">Verwijder</span>
                          </div>
                        </div>

                        <div class="budget-post-card__content">
                          <button class="budget-post-card__main" onclick="openBudgetComposer('post','${item.id}')">
                            <span class="budget-post-card__name">${escapeHtml(item.post)}</span>
                            <span class="budget-post-card__hint">Tik om te wijzigen</span>
                          </button>

                          <div class="budget-post-card__right">
                            <div class="budget-post-card__quick">
                              <button class="budget-chip" onclick="event.stopPropagation();quickAdjustBudget('${item.id}',-10)">-10</button>
                              <button class="budget-chip" onclick="event.stopPropagation();quickAdjustBudget('${item.id}',10)">+10</button>
                            </div>

                            <button class="budget-post-card__amount" onclick="event.stopPropagation();openBudgetComposer('post','${item.id}')">
                              ${fmt(item.budget)}
                            </button>

                            <button class="icon-btn" onclick="event.stopPropagation();removeBudgetPost('${item.id}')" title="Verwijder">✕</button>
                          </div>
                        </div>
                      </article>
                    `).join('')}
                  </div>`
                : `
                  <div class="budget-empty-state">
                    <div class="budget-empty-title">Nog geen posten in deze categorie</div>
                    <div class="budget-empty-copy">Voeg je eerste post toe, bijvoorbeeld huur, boodschappen of streaming.</div>
                    <button class="btn" onclick="openBudgetComposer('post', null, '${cat.id}')">Eerste post toevoegen</button>
                  </div>
                `
            ) : ''}
          </article>
        `;
      }).join('')}
    </section>`
  : `
    <section class="card budget-empty-card">
      <div class="budget-empty-title">Nog geen categorieën</div>
      <div class="budget-empty-copy">Maak eerst een categorie aan. Daarna voeg je makkelijk posten en bedragen toe.</div>
      <button class="btn" onclick="openBudgetComposer('category')">Eerste categorie</button>
    </section>
  `
}
        </div>
        <aside class="budget-sidebar"></aside>
      </div>
    </section>
  `;

  document.getElementById('v-budget').innerHTML = `
    <div class="subtabs budget-subtabs">
      <button class="subtab ${incomeView ? 'active' : ''}" onclick="setBudgetSubtab('inkomsten')">Inkomsten</button>
      <button class="subtab ${!incomeView ? 'active' : ''}" onclick="setBudgetSubtab('categorieen')">Categorieën / Uitgaven</button>
    </div>
    ${incomeView ? incomeHtml : categoriesHtml}
  `;

  renderBudgetComposer();
}

function updateIncomeName(idx, value){
  if(!state.inkomsten[idx]) return;
  state.inkomsten[idx].naam = value.trim() || 'Inkomsten';
  persistAndSync();
}

function updateIncomeAmount(idx, value){
  if(!state.inkomsten[idx]) return;
  state.inkomsten[idx].bedrag = Number(value||0);
  persistAndSync();
}

function addIncomeRow(){
  state.inkomsten.push({ naam:'Nieuwe inkomsten', bedrag:0 });
  persistAndSync();
}

function removeIncomeRow(idx){
  if(!state.inkomsten[idx]) return;

  if(state.inkomsten.length <= 1){
    showToast('Laat minimaal één inkomstenregel staan');
    return;
  }

  openConfirmModal('Verwijderen?', 'Inkomstenregel verwijderen?', () => {
    state.inkomsten.splice(idx,1);
    persistAndSync();
  });
}

function selectBudgetCategory(catId){
  state.budgetSelectedCategoryId = catId;
  renderBudget();
}

function openFirstCategoryPostComposer(){
  const firstCat = orderedCats()[0];
  if(!firstCat){
    showToast('Maak eerst een categorie aan');
    return;
  }
  openBudgetComposer('post', null, firstCat.id);
}

function openBudgetComposer(mode='category', targetId=null, categoryId=null){
  state.budgetComposerOpen = true;
  state.budgetComposerMode = mode;
  state.budgetComposerTargetId = targetId || null;
  state.budgetComposerCategoryId = categoryId || null;

  if(mode === 'post' && !state.budgetComposerCategoryId){
    const target = targetId ? state.budget.find(r => r.id === targetId) : null;
    state.budgetComposerCategoryId = target?.categorieId || orderedCats()[0]?.id || null;
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

  const currentCategoryId = post?.categorieId || state.budgetComposerCategoryId || cats[0]?.id || '';

  root.innerHTML = `
    <div class="budget-modal-backdrop" onclick="closeBudgetComposer()">
      <div class="budget-modal-sheet ${mode === 'post' ? 'post-mode' : 'category-mode'}" onclick="event.stopPropagation()">
        <div class="budget-modal-handle"></div>
        <div class="budget-modal-title">${mode === 'category' ? (category ? 'Categorie wijzigen' : 'Nieuwe categorie') : (post ? 'Post wijzigen' : 'Nieuwe post')}</div>
        <div class="budget-modal-copy">${mode === 'category' ? 'Maak categorieën aan als blokken. De details pas je daarna per categorie aan.' : 'Maak een post aan of wijzig een bestaand bedrag snel en simpel.'}</div>

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

  const focusId = mode === 'category'
    ? 'composer-category-name'
    : (post ? 'composer-post-amount' : 'composer-post-name');

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
  }

  normalizeData();
  for (const cat of state.categorieen){
    if(typeof state.openCats[cat.id] !== 'boolean'){
      state.openCats[cat.id] = false;
    }
  }
  persistAndSync('none');
  closeBudgetComposer();
  rerenderAll();
}

function addCategory(){ openBudgetComposer('category'); }

function renameCategory(catId, value){
  const cat = state.categorieen.find(c=>c.id===catId); if(!cat) return;
  cat.naam = value.trim() || 'Nieuwe categorie'; persistAndSync();
}

function removeCategory(catId){
  const cat = state.categorieen.find(c => c.id === catId);
  if(!cat) return;
  openConfirmModal('Categorie verwijderen?', `Categorie "${cat.naam}" verwijderen inclusief alle posten?`, () => {
    state.categorieen = state.categorieen.filter(c=>c.id!==catId);
    state.budget = state.budget.filter(r=>r.categorieId!==catId);
    persistAndSync();
  });
}

function toggleCategory(catId){ selectBudgetCategory(catId); }

function allCategoriesOpen(){ return true; }

function toggleAllCategories(){}

function addBudgetPost(catId){ openBudgetComposer('post', null, catId); }

function renameBudgetPost(id, value){
  const row = state.budget.find(r=>r.id===id); if(!row) return;
  row.post = value.trim() || 'Nieuwe post'; persistAndSync();
}

function updateBudgetAmount(id, value){
  const row = state.budget.find(r=>r.id===id); if(!row) return;
  row.budget = Number(value||0); persistAndSync();
}

function quickAdjustBudget(id, delta){
  const row = state.budget.find(r => r.id === id);
  if(!row) return;
  row.budget = Math.max(0, Number(row.budget || 0) + Number(delta || 0));
  persistAndSync();
}

function removeBudgetPost(id){
  const row = state.budget.find(r=>r.id===id);
  if(!row) return;
  openConfirmModal('Post verwijderen?', `Post "${row.post}" verwijderen?`, () => {
    const catId = row.categorieId;
    state.budget = state.budget.filter(r=>r.id!==id);

    const rows = itemsForCategory(catId);
    rows.forEach((item, idx)=> item.volgorde = idx + 1);

    persistAndSync();
  });
}

function moveCategoryUp(catId){
  const cats = orderedCats();
  const idx = cats.findIndex(c => c.id === catId);
  if(idx <= 0) return;
  [cats[idx-1], cats[idx]] = [cats[idx], cats[idx-1]];
  state.categorieen = cats.map((c, i) => ({...c, volgorde:i+1}));
  persistAndSync('budget');
}

function moveCategoryDown(catId){
  const cats = orderedCats();
  const idx = cats.findIndex(c => c.id === catId);
  if(idx < 0 || idx >= cats.length - 1) return;
  [cats[idx], cats[idx+1]] = [cats[idx+1], cats[idx]];
  state.categorieen = cats.map((c, i) => ({...c, volgorde:i+1}));
  persistAndSync('budget');
}

function toggleCategoryActions(id){}

function toggleBudgetCategory(catId){
  state.openCats[catId] = !state.openCats[catId];
  persistLocal();
  renderBudget();
}
