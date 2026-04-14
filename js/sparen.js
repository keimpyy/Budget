function renderSparen(){
  const totaalGespaart = state.sparen.reduce((s,g) => s + Number(g.gespaart || 0), 0);
  const totaalDoel = state.sparen.reduce((s,g) => s + Number(g.doel || 0), 0);
  const totaalNogTeGaan = Math.max(0, totaalDoel - totaalGespaart);
  const overallPct = totaalDoel > 0 ? Math.min(100, (totaalGespaart / totaalDoel) * 100) : 0;
  const cloudLoadLabel = state.cloudLoading ? 'Ophalen...' : 'Gegevens ophalen';

  document.getElementById('v-sparen').innerHTML = `
    <section class="sparen-page">
      <div class="sparen-shell">
        <div class="sparen-hero">
          <div class="sparen-hero-top">
            <div>
              <div class="hero-label">SPAAROVERZICHT</div>
              <div class="sparen-hero-title">${state.sparen.length} ${state.sparen.length === 1 ? 'spaardoel' : 'spaardoelen'}</div>
            </div>
            <div class="sparen-hero-amount">${fmtShort(totaalGespaart)}</div>
          </div>

          ${totaalDoel > 0 ? `
            <div class="sparen-hero-progress-wrap">
              <div class="track sparen-hero-track">
                <div class="fill" style="width:${overallPct}%"></div>
              </div>
              <div class="sparen-hero-progress-meta">
                <span>${overallPct.toFixed(0)}% van totaal doel</span>
                <span>${fmt(totaalDoel)}</span>
              </div>
            </div>
          ` : ''}

          <div class="sparen-stats">
            <div class="sparen-stat">
              <div class="sparen-stat-label">Totaal doel</div>
              <div class="sparen-stat-val mono">${fmt(totaalDoel)}</div>
            </div>
            <div class="sparen-stat">
              <div class="sparen-stat-label">Al gespaard</div>
              <div class="sparen-stat-val mono">${fmt(totaalGespaart)}</div>
            </div>
            <div class="sparen-stat">
              <div class="sparen-stat-label">Nog te gaan</div>
              <div class="sparen-stat-val mono">${fmt(totaalNogTeGaan)}</div>
            </div>
          </div>
        </div>

        <div class="card sparen-panel">
          <div class="sec" style="margin-top:0">Spaardoelen</div>
          ${renderInlineSyncStatus()}

          ${state.sparen.map((g, idx) => {
            const nogTeGaan = Math.max(0, Number(g.doel || 0) - Number(g.gespaart || 0));
            const pct = Number(g.doel || 0)
              ? Math.min(100, (Number(g.gespaart || 0) / Number(g.doel || 0)) * 100)
              : 0;
            const isEditing = state.editingSparenId === g.id;
            const isVoltooid = Number(g.doel || 0) > 0 && Number(g.gespaart || 0) >= Number(g.doel || 0);

            return `
              <div class="sparen-card${isVoltooid ? ' sparen-card--done' : ''}">
                <div class="sparen-top">
                  <div class="sparen-name-wrap">
                    <div class="sparen-name-header">
                      <div class="sparen-name-display">
                        ${isVoltooid ? '<span class="sparen-done-badge">✓</span> ' : ''}${escapeHtml(g.naam)}
                      </div>
                      <button class="loan-edit-btn" onclick="toggleSparenEdit('${g.id}')">
                        ${isEditing ? 'Klaar' : 'Wijzig'}
                      </button>
                    </div>
                    ${isEditing ? `
                      <div class="loan-name-edit">
                        <input class="input" value="${escapeHtml(g.naam)}" onchange="updateSparenNaam(${idx}, this.value)">
                      </div>
                    ` : ''}
                  </div>
                </div>

                <div class="loan-progress-head">
                  <div class="loan-progress-label">Voortgang</div>
                  <div class="loan-percent-badge">${pct.toFixed(0)}%</div>
                </div>

                <div class="track loan-track sparen-track">
                  <div class="fill" style="width:${pct}%"></div>
                </div>

                <div class="loan-progress-row">
                  <div class="note">Gespaard: ${fmt(Number(g.gespaart || 0))}</div>
                  <div class="note">Nog: ${fmt(nogTeGaan)}</div>
                </div>

                <div class="loan-inputs">
                  <div class="loan-metric">
                    <div class="loan-metric-label">Spaardoel</div>
                    <input class="input" type="number" inputmode="decimal" value="${Number(g.doel || 0)}" onchange="updateSparenDoel(${idx}, this.value)">
                  </div>
                  <div class="loan-metric">
                    <div class="loan-metric-label">Al gespaard</div>
                    <input class="input" type="number" inputmode="decimal" value="${Number(g.gespaart || 0)}" onchange="updateSparenGespaart(${idx}, this.value)">
                  </div>
                  <div class="loan-metric loan-metric--action">
                    <div class="loan-metric-label">Snel storten</div>
                    <button class="btn loan-addpay" onclick="openAppModal('savings-deposit',{ idx:${idx} })">+ Bedrag storten</button>
                  </div>
                </div>

                ${isEditing ? `
                  <div class="sparen-delete-wrap">
                    <button class="btn danger sparen-delete-btn" onclick="deleteSparenDoel(${idx})">Spaardoel verwijderen</button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}

          <div class="loan-actions">
            <button class="btn loan-save" onclick="addSparenDoel()">+ Spaardoel toevoegen</button>
            <button class="btn secondary" onclick="loadFromCloud()" ${state.cloudLoading ? 'disabled' : ''}>${cloudLoadLabel}</button>
          </div>
        </div>
      </div>
    </section>
  `;
  renderAppModal();
}

function toggleSparenEdit(id){
  state.editingSparenId = state.editingSparenId === id ? null : id;
  renderSparen();
}

function updateSparenNaam(idx, value){
  state.sparen[idx].naam = value.trim();
  persistAndSync('sparen');
}

function updateSparenDoel(idx, value){
  state.sparen[idx].doel = Number(value || 0);
  persistAndSync('sparen');
}

function updateSparenGespaart(idx, value){
  state.sparen[idx].gespaart = Number(value || 0);
  persistAndSync('sparen');
}

function addSparenDoel(){
  state.sparen.push({
    id: uid('sp'),
    naam: 'Nieuw spaardoel',
    doel: 0,
    gespaart: 0,
    volgorde: state.sparen.length + 1
  });
  persistAndSync('sparen');
}

function deleteSparenDoel(idx){
  const goal = state.sparen[idx];
  if(!goal) return;
  openConfirmModal(
    'Spaardoel verwijderen',
    `Weet je zeker dat je "${escapeHtml(goal.naam || '')}" wilt verwijderen?`,
    () => {
      state.sparen.splice(idx, 1);
      state.editingSparenId = null;
      persistAndSync('sparen');
    }
  );
}

function confirmSavingsDeposit(idx){
  const input = document.getElementById('savings-deposit-input');
  if(!input) return;

  const amount = Number(input.value || 0);
  if(amount <= 0){
    showToast('Voer een bedrag in');
    return;
  }

  const goal = state.sparen[idx];
  if(!goal) return;

  goal.gespaart = Number(goal.gespaart || 0) + amount;

  persistAndSync('sparen');
  closeAppModal();
  showToast('Bedrag gestort');
}
