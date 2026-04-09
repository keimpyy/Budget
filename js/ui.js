const VIEW_ORDER = ['dashboard','budget','leningen','instellingen'];

const appSwipe = { startX:0, startY:0, dx:0, dy:0 };

function rerenderAll(){
  if(typeof renderDashboard === 'function') renderDashboard();
  if(typeof renderBudget === 'function') renderBudget();
  if(typeof renderLeningen === 'function') renderLeningen();
  if(typeof renderInstellingen === 'function') renderInstellingen();
  if(typeof renderHeaderActions === 'function') renderHeaderActions();
}

function rerenderCurrentView(){
  const current = state.currentView || 'dashboard';

  if(current === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
  if(current === 'budget' && typeof renderBudget === 'function') renderBudget();
  if(current === 'leningen' && typeof renderLeningen === 'function') renderLeningen();
  if(current === 'instellingen' && typeof renderInstellingen === 'function') renderInstellingen();
  if(typeof renderHeaderActions === 'function') renderHeaderActions();
}

function appSwipeStart(e){
  const t = e.changedTouches[0];
  appSwipe.startX = t.clientX;
  appSwipe.startY = t.clientY;
  appSwipe.dx = 0;
  appSwipe.dy = 0;
}

function appSwipeMove(e){
  const t = e.changedTouches[0];
  appSwipe.dx = t.clientX - appSwipe.startX;
  appSwipe.dy = t.clientY - appSwipe.startY;
}

function appSwipeEnd(e){
  const absX = Math.abs(appSwipe.dx);
  const absY = Math.abs(appSwipe.dy);
  if(absX < 60 || absX < absY * 1.4) return;

  const activeEl = document.querySelector('.view.active');
  if(!activeEl) return;

  const current = activeEl.id.replace('v-','');
  const idx = VIEW_ORDER.indexOf(current);
  if(idx < 0) return;

  const target = e.target;
  const tag = (target && target.tagName || '').toLowerCase();
  if(['input','textarea','select','button'].includes(tag)) return;

  if(appSwipe.dx < 0 && idx < VIEW_ORDER.length - 1){
    const next = VIEW_ORDER[idx + 1];
    const btn = [...document.querySelectorAll('.tab')].find(
      b => b.textContent.trim().toLowerCase() === next
    ) || document.getElementById('settings-tab-btn');
    if(btn) go(next, btn);
  }else if(appSwipe.dx > 0 && idx > 0){
    const prev = VIEW_ORDER[idx - 1];
    const btn = [...document.querySelectorAll('.tab')].find(
      b => b.textContent.trim().toLowerCase() === prev
    ) || document.querySelectorAll('.tab')[0];
    if(btn) go(prev, btn);
  }
}

function showToast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;padding:11px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:999;white-space:nowrap;box-shadow:0 4px 20px rgba(124,106,247,.4);font-family:inherit';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function go(name, btn){
  const currentEl = document.querySelector('.view.active');
  const current = currentEl ? currentEl.id.replace('v-','') : null;
  const oldIdx = Math.max(0, VIEW_ORDER.indexOf(current));
  const newIdx = Math.max(0, VIEW_ORDER.indexOf(name));
  const dir = newIdx >= oldIdx ? 'left' : 'right';

  if(name === 'instellingen' && current && current !== 'instellingen') state.lastNonSettingsView = current;
  if(name !== 'instellingen') state.lastNonSettingsView = name;
  state.currentView = name;

  if(name === 'dashboard') renderDashboard();
  if(name === 'budget') renderBudget();
  if(name === 'leningen') renderLeningen();
  if(name === 'instellingen') renderInstellingen();

  const nextEl = document.getElementById('v-' + name);
  if(!nextEl) return;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if(btn) btn.classList.add('active');

  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('anim-enter-right','anim-enter-left','anim-exit-left','anim-exit-right');
    if(v !== nextEl) v.classList.remove('active');
  });

  if(currentEl && currentEl !== nextEl){
    currentEl.classList.add(dir === 'left' ? 'anim-exit-left' : 'anim-exit-right');
    setTimeout(() => currentEl.classList.remove('active','anim-exit-left','anim-exit-right'), 240);
  }

  nextEl.classList.add('active', dir === 'left' ? 'anim-enter-right' : 'anim-enter-left');
  setTimeout(() => nextEl.classList.remove('anim-enter-right','anim-enter-left'), 260);
}

function openSettings(){
  if(typeof closeAccountMenu === 'function') closeAccountMenu();
  const btn = document.getElementById('settings-tab-btn');
  if(btn) go('instellingen', btn);
}

function closeSettings(){
  const target = state.lastNonSettingsView || 'dashboard';
  const btn = [...document.querySelectorAll('.tab')].find(
    b => b.textContent.trim().toLowerCase() === target
  ) || document.querySelector('.tab');
  if(btn) go(target, btn);
}

function setBudgetSubtab(tab){
  state.budgetSubtab = tab;
  renderBudget();
}

function syncSakuraPetals(){
  const layer = document.getElementById('sakura-layer');
  if(!layer) return;

  const isSakura = document.body.getAttribute('data-theme') === 'sakura';
  layer.innerHTML = '';
  if(!isSakura) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  let count;
  if(w >= 1400) count = 42;
  else if(w >= 1100) count = 34;
  else if(w >= 768) count = 26;
  else count = 18;

  for(let i = 0; i < count; i++){
    const petal = document.createElement('span');
    petal.className = 'sakura-petal';

    petal.style.left = `${Math.random() * 100}%`;

    // verspreid petals over de hele animatie, niet alleen bovenin
    petal.style.animationDelay = `${-Math.random() * 18}s`;

    // iets langere en variabele valduur
    petal.style.animationDuration = `${10 + Math.random() * 10}s`;

    // horizontale drift
    petal.style.setProperty('--drift', `${-120 + Math.random() * 240}px`);

    // startspread over schermhoogte
    petal.style.setProperty('--start-y', `${-20 + Math.random() * (h + 120)}px`);

    // maatvariatie
    const scale = 0.65 + Math.random() * 0.95;
    petal.style.transform = `translate3d(0,0,0) scale(${scale})`;

    // kleine opacity-variatie
    petal.style.opacity = `${0.55 + Math.random() * 0.4}`;

    layer.appendChild(petal);
  }
}

function escapeHtml(v){
  return String(v ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

function openAppModal(type, payload = null, onConfirm = null){
  state.appModalOpen = true;
  state.appModalType = type;
  state.appModalPayload = payload;
  state.appModalOnConfirm = onConfirm;
  renderAppModal();
}

function openConfirmModal(title, text, onConfirm){
  openAppModal('confirm', { title, text }, onConfirm);
}

function closeAppModal(){
  state.appModalOpen = false;
  state.appModalType = null;
  state.appModalPayload = null;
  state.appModalOnConfirm = null;
  renderAppModal();
}

function confirmAppModal(){
  const fn = state.appModalOnConfirm;
  closeAppModal();
  if(typeof fn === 'function') fn();
}

function togglePasswordVisibility(inputId, button){
  const input = document.getElementById(inputId);
  if(!input || !button) return;

  const nextType = input.type === 'password' ? 'text' : 'password';
  input.type = nextType;
  button.textContent = nextType === 'password' ? '👁' : '🙈';
  button.setAttribute('aria-label', nextType === 'password' ? 'Toon wachtwoord' : 'Verberg wachtwoord');
}

function renderAppModal(){
  const root = document.getElementById('app-modal-root');
  if(!root) return;

  if(!state.appModalOpen){
    root.innerHTML = '';
    return;
  }

  let content = '';

  if(state.appModalType === 'confirm'){
    const { title, text } = state.appModalPayload || {};

    content = `
      <div class="budget-modal-backdrop" onclick="closeAppModal()">
        <div class="budget-modal-sheet" onclick="event.stopPropagation()">
          <div class="budget-modal-handle"></div>

          <div class="budget-modal-title">${title || 'Bevestigen'}</div>
          <div class="budget-modal-copy">${text || ''}</div>

          <div class="budget-modal-actions">
            <button class="btn secondary" onclick="closeAppModal()">Annuleren</button>
            <button class="btn" onclick="confirmAppModal()">Doorgaan</button>
          </div>
        </div>
      </div>
    `;
  }

  if(state.appModalType === 'loan-payment'){
    const { idx } = state.appModalPayload || {};
    const loan = state.leningen[idx];

    if(!loan){
      root.innerHTML = '';
      return;
    }

    content = `
      <div class="budget-modal-backdrop" onclick="closeAppModal()">
        <div class="budget-modal-sheet" onclick="event.stopPropagation()">
          <div class="budget-modal-handle"></div>

          <div class="budget-modal-title">Aflossing toevoegen</div>
          <div class="budget-modal-copy">${escapeHtml(loan.naam || '')}</div>

          <div class="stack">
            <div>
              <div class="budget-inline-label">Bedrag</div>
              <input
                id="loan-payment-input"
                class="input composer-amount-input"
                type="number"
                inputmode="decimal"
                placeholder="0"
              >
            </div>
          </div>

          <div class="budget-modal-actions">
            <button class="btn secondary" onclick="closeAppModal()">Annuleren</button>
            <button class="btn" onclick="confirmLoanPayment(${idx})">Opslaan</button>
          </div>
        </div>
      </div>
    `;
  }

  if(state.appModalType === 'cloud-login'){
    content = `
      <div class="budget-modal-backdrop" onclick="closeAppModal()">
        <div class="budget-modal-sheet" onclick="event.stopPropagation()">
          <div class="budget-modal-handle"></div>

          <div class="budget-modal-title">Inloggen</div>
          <div class="budget-modal-copy">Log in met jullie account om meteen te synchroniseren tussen apparaten.</div>

          <div class="stack">
            <div>
              <div class="budget-inline-label">E-mail</div>
              <input
                id="cloud-login-email"
                class="input"
                type="email"
                autocomplete="email"
                placeholder="naam@email.com"
              >
            </div>
            <div>
              <div class="budget-inline-label">Wachtwoord</div>
              <div class="password-field">
                <input
                  id="cloud-login-password"
                  class="input password-field-input"
                  type="password"
                  autocomplete="current-password"
                  placeholder="Wachtwoord"
                >
                <button
                  type="button"
                  class="password-toggle-btn"
                  onclick="togglePasswordVisibility('cloud-login-password', this)"
                  aria-label="Toon wachtwoord"
                >👁</button>
              </div>
            </div>
          </div>

          <div class="budget-modal-actions">
            <button class="btn secondary" onclick="closeAppModal()">Annuleren</button>
            <button class="btn" onclick="submitLoginModal()">Inloggen</button>
          </div>
        </div>
      </div>
    `;
  }

  root.innerHTML = content;

  if(state.appModalType === 'loan-payment'){
    setTimeout(() => {
      const el = document.getElementById('loan-payment-input');
      if(el) el.focus();
    }, 30);
  }

  if(state.appModalType === 'cloud-login'){
    setTimeout(() => {
      const el = document.getElementById('cloud-login-email');
      if(el) el.focus();
    }, 30);
  }
}
