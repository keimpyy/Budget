function renderDashboard(){
  const o = overschot();
  const s = spaarquote();
  const total = budgetTotaal();
  const cats = orderedCats();
  const sorted = cats.slice().sort((a,b)=>totalForCategory(b.id)-totalForCategory(a.id));
  const top3 = sorted.slice(0,3);

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

    <div class="sec">Grootste uitgaven</div>
    <div class="dashboard-top3">
      ${top3.map((cat, idx) => `
        <div class="top3-row">
          <div class="top3-head">
            <div class="top3-name">${idx+1}. ${escapeHtml(cat.naam)}</div>
            <div class="top3-amount">${fmt(totalForCategory(cat.id))}</div>
          </div>
          <div class="top3-sub">${postsCount(cat.id)} posten · ${total ? ((totalForCategory(cat.id)/total)*100).toFixed(0) : 0}% van je budget</div>
        </div>
      `).join('')}
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