function renderLeningen(){
  const totaalRestant = state.leningen.reduce((s,l)=>s+(Number(l.totaal||0)-Number(l.betaald||0)),0);
  const totaalLening = state.leningen.reduce((s,l)=>s+Number(l.totaal||0),0);
  const totaalBetaald = state.leningen.reduce((s,l)=>s+Number(l.betaald||0),0);

  document.getElementById('v-leningen').innerHTML = `
    <div class="loan-hero">
      <div class="loan-hero-top">
        <div>
          <div class="hero-label">LENINGEN OVERZICHT</div>
          <div class="loan-hero-title">${state.leningen.length} actieve leningen</div>
        </div>
        <div class="loan-hero-pct">${fmtShort(totaalRestant)}</div>
      </div>

      <div class="loan-stats">
        <div class="loan-stat">
          <div class="loan-stat-label">Restant</div>
          <div class="loan-stat-row">
            <div class="loan-stat-val mono">${fmt(totaalRestant)}</div>
          </div>
        </div>

        <div class="loan-stat">
          <div class="loan-stat-label">Totaal</div>
          <div class="loan-stat-row">
            <div class="loan-stat-val mono">${fmt(totaalLening)}</div>
          </div>
        </div>

        <div class="loan-stat">
          <div class="loan-stat-label">Betaald</div>
          <div class="loan-stat-row">
            <div class="loan-stat-val mono">${fmt(totaalBetaald)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="sec" style="margin-top:0">Leningen</div>
      ${renderInlineSyncStatus()}

      ${state.leningen.map((l, idx)=>{
        const restant = Number(l.totaal||0) - Number(l.betaald||0);
        const pct = Number(l.totaal||0)
          ? Math.min(100, (Number(l.betaald||0) / Number(l.totaal||0)) * 100)
          : 0;

        const isEditing = state.editingLoanId === l.id;

        return `
          <div class="loan-card">
            <div class="loan-top">
              <div class="loan-name-wrap">
                <div class="loan-name-header">
                  <div class="loan-name-display">${escapeHtml(l.naam)}</div>
                  <button class="loan-edit-btn" onclick="toggleLoanEdit('${l.id}')">
                    ${isEditing ? 'Klaar' : 'Wijzig'}
                  </button>
                </div>

                ${isEditing ? `
                  <div class="loan-name-edit">
                    <input class="input" value="${escapeHtml(l.naam)}" onchange="updateLoanName(${idx}, this.value)">
                  </div>
                ` : ``}
              </div>
            </div>

            <div class="loan-progress-head">
              <div class="loan-progress-label">Voortgang</div>
              <div class="loan-percent-badge">${pct.toFixed(0)}%</div>
            </div>

            <div class="track loan-track">
              <div class="fill" style="width:${pct}%"></div>
            </div>

            <div class="loan-progress-row">
              <div class="note">Restant: ${fmt(restant)}</div>
              <div class="note">Betaald: ${fmt(Number(l.betaald||0))}</div>
            </div>

            <div class="loan-inputs">
              <div class="loan-metric">
                <div class="loan-metric-label">Totaal lening</div>
                <input class="input" type="number" value="${Number(l.totaal||0)}" onchange="updateLoanTotal(${idx}, this.value)">
              </div>

              <div class="loan-metric">
                <div class="loan-metric-label">Al betaald</div>
                <input class="input" type="number" value="${Number(l.betaald||0)}" onchange="updateLoanPaid(${idx}, this.value)">
              </div>

              <div class="loan-metric loan-metric--action">
                <div class="loan-metric-label">Snelle aflossing</div>
                <button class="loan-addpay" onclick="openAppModal('loan-payment',{ idx:${idx} })">+ Aflossing toevoegen</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}

      <div class="loan-actions">
        <button class="loan-save" onclick="addLoan()">+ Lening toevoegen</button>
        <button class="loan-addpay" onclick="loadFromCloud()">Leningen ophalen</button>
      </div>
    </div>
  `;
  renderAppModal();
}

function toggleLoanEdit(id){ state.editingLoanId = state.editingLoanId === id ? null : id; renderLeningen(); }

function updateLoanName(idx, value){ state.leningen[idx].naam = value.trim(); persistAndSync('loans'); }

function updateLoanTotal(idx, value){ state.leningen[idx].totaal = Number(value||0); persistAndSync('loans'); }

function updateLoanPaid(idx, value){ state.leningen[idx].betaald = Number(value||0); persistAndSync('loans'); }

function addLoan(){
  state.leningen.push({
    id: uid('ln'),
    naam: 'Nieuwe lening',
    totaal: 0,
    betaald: 0,
    kleur: ''
  });
  persistAndSync('loans');
}

function addLoanPayment(idx){
  const loan = state.leningen[idx];
  if(!loan) return;
  openAppModal('loan-payment', { idx });
}

function confirmLoanPayment(idx){
  const input = document.getElementById('loan-payment-input');
  if(!input) return;

  const amount = Number(input.value || 0);
  if(amount <= 0){
    showToast('Voer een bedrag in');
    return;
  }

  const loan = state.leningen[idx];
  if(!loan) return;

  loan.betaald = Math.min(
    Number(loan.totaal || 0),
    Number(loan.betaald || 0) + amount
  );

  persistAndSync('loans');
  closeAppModal();
  showToast('Aflossing toegevoegd');
}
