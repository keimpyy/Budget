function renderDashboard(){
  const o = overschot();
  const s = spaarquote();
  const total = budgetTotaal();
  const cats = orderedCats();
  const sorted = cats.slice().sort((a,b)=>totalForCategory(b.id)-totalForCategory(a.id));
  const top3 = sorted.slice(0,3);

  const goals = state.sparen || [];
  const totaalGespaart = goals.reduce((acc, g) => acc + Number(g.gespaart || 0), 0);
  const totaalDoel = goals.reduce((acc, g) => acc + Number(g.doel || 0), 0);
  const sparenTab = [...document.querySelectorAll('.tab')].find(b => b.textContent.trim().toLowerCase() === 'sparen');

  document.getElementById('v-dashboard').innerHTML = `
    <div class="hero">
      <div class="hero-label">MAANDELIJKS RESULTAAT</div>
      <div class="hero-amount ${o>=0?'pos':'neg'}">${fmtShort(o)}</div>
      <div class="hero-sub">
        <div>
          <div class="hero-sub-label">INKOMSTEN</div>
          <div class="hero-sub-val" style="color:var(--text)">${fmtShort(inkomstenTotaal())}</div>
        </div>
        <div>
          <div class="hero-sub-label">BUDGET</div>
          <div class="hero-sub-val" style="color:var(--text)">${fmtShort(total)}</div>
        </div>
        <div>
          <div class="hero-sub-label">GESPAARD</div>
          <div class="hero-sub-val" style="color:var(--green)">${fmtShort(totaalGespaart)}</div>
        </div>
      </div>
    </div>

    <div class="sq-bar">
      <div class="sq-top">
        <span class="sq-label">Spaarquote</span>
        <span class="sq-val">${s.toFixed(1)}%</span>
      </div>
      <div class="track"><div class="fill" style="width:${Math.min(100, Math.max(0, s))}%"></div></div>
      <div class="sq-note">${o >= 0 ? 'Je houdt geld over' : 'Je budget is hoger dan je inkomen'}</div>
    </div>

    ${goals.length > 0 ? `
      <div class="sec">Spaardoelen</div>
      <div class="dashboard-top3">
        ${goals.map(g => {
          const pct = Number(g.doel||0) ? Math.min(100, (Number(g.gespaart||0) / Number(g.doel||0)) * 100) : 0;
          const isVoltooid = Number(g.doel||0) > 0 && Number(g.gespaart||0) >= Number(g.doel||0);
          return `
            <button class="top3-row is-clickable" type="button" onclick="openDashboardSparen()">
              <div class="top3-head">
                <div class="top3-name">${isVoltooid ? '✓ ' : ''}${escapeHtml(g.naam)}</div>
                <div class="top3-amount">${pct.toFixed(0)}%</div>
              </div>
              <div class="track" style="margin:8px 0 6px"><div class="fill sq-fill--green" style="width:${pct}%"></div></div>
              <div class="top3-sub">${fmt(Number(g.gespaart||0))} gespaard van ${fmt(Number(g.doel||0))}</div>
            </button>
          `;
        }).join('')}
      </div>
    ` : ''}

    <div class="sec">Grootste uitgaven</div>
    <div class="dashboard-top3">
      ${top3.map((cat, idx) => {
        const count = postsCount(cat.id);
        const clickable = count > 0;
        return `
          <button
            class="top3-row ${clickable ? 'is-clickable' : 'is-static'}"
            type="button"
            ${clickable ? `onclick="openDashboardBudgetCategory('${cat.id}')"` : 'disabled'}
          >
            <div class="top3-head">
              <div class="top3-name">${idx+1}. ${escapeHtml(cat.naam)}</div>
              <div class="top3-amount">${fmt(totalForCategory(cat.id))}</div>
            </div>
            <div class="top3-sub">${count} posten · ${total ? ((totalForCategory(cat.id)/total)*100).toFixed(0) : 0}% van je budget</div>
          </button>
        `;
      }).join('')}
    </div>

    <div class="sec">Verdeling budget</div>
    <div class="alloc-wrap">
      <div class="alloc-stack">
        ${sorted.map(cat => `
          <div class="alloc-row">
            <div class="alloc-label">${escapeHtml(cat.naam)}</div>
            <div class="alloc-bar">
              <div class="alloc-fill" style="width:${total ? (totalForCategory(cat.id)/total)*100 : 0}%"></div>
            </div>
            <div class="alloc-val">${fmtShort(totalForCategory(cat.id))}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function openDashboardSparen(){
  const sparenTab = [...document.querySelectorAll('.tab')].find(
    btn => btn.textContent.trim().toLowerCase() === 'sparen'
  );
  go('sparen', sparenTab || null);
}

function openDashboardBudgetCategory(catId){
  const category = state.categorieen.find(cat => cat.id === catId);
  if(!category || !postsCount(catId)) return;

  state.budgetSubtab = 'categorieen';
  state.budgetSelectedCategoryId = catId;
  state.openCats = {};
  state.openCats[catId] = true;

  const budgetTab = [...document.querySelectorAll('.tab')].find(
    btn => btn.textContent.trim().toLowerCase() === 'budget'
  );

  const categoryIndex = orderedCats().findIndex(cat => cat.id === catId);
  const shouldScrollToCategory = categoryIndex >= 3;

  go(
    'budget',
    budgetTab || null,
    shouldScrollToCategory ? { focusBudgetCategory: catId } : {}
  );
}
