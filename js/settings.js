const THEME_COLORS = {
  kuro: '#050606',
  sakura: '#140d15',
  neon: '#0a0706'
};

const ALLOWED_THEMES = new Set(['kuro', 'sakura', 'neon']);

function updateThemeMeta(theme){
  const meta = document.querySelector('meta[name="theme-color"]');
  const resolved = normalizeThemePreference(theme);
  if(meta) meta.setAttribute('content', THEME_COLORS[resolved] || THEME_COLORS[DEFAULT_THEME]);
}

function getThemeLabel(theme){
  const resolved = normalizeThemePreference(theme);
  if(resolved === 'kuro') return 'Kuro Steel';
  if(resolved === 'neon') return 'Ronin Ember';
  return 'Sakura v2';
}

function syncThemeSelection(theme){
  const root = document.getElementById('v-instellingen');
  if(!root || !root.children.length) return;

  const themeLabel = getThemeLabel(theme);
  const badge = root.querySelector('.settings-badge');
  const value = root.querySelector('.current-theme-value');

  if(badge) badge.textContent = themeLabel;
  if(value) value.textContent = themeLabel;

  root.querySelectorAll('.theme-tile').forEach(tile => {
    const tileTheme = tile.getAttribute('data-theme');
    const active = tileTheme === theme;
    tile.classList.toggle('active', active);
    tile.setAttribute('aria-selected', String(active));
  });
}

function applyTheme(theme, options = {}){
  const resolved = normalizeThemePreference(theme);
  const shouldPersist = options.persist !== false;

  document.body.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = 'dark';
  updateThemeMeta(resolved);
  state.cloudThemePreference = resolved;

  if(typeof syncSakuraPetals === 'function'){
    syncSakuraPetals();
  }

  syncThemeSelection(resolved);

  if(typeof renderHeaderActions === 'function'){
    renderHeaderActions();
  }

  if(shouldPersist && !options.skipCloudPersist && typeof saveThemePreference === 'function' && typeof isCloudSignedIn === 'function' && isCloudSignedIn()){
    saveThemePreference(resolved).then(result => {
      if(!result?.ok){
        console.error('Theme voorkeur opslaan mislukt:', result?.error || result);
        setCloudStatus(result?.error || 'Theme voorkeur opslaan mislukt');
      }
    }).catch(error => {
      console.error('Theme voorkeur opslaan crash:', error);
      setCloudStatus(error.message || 'Theme voorkeur opslaan mislukt');
    });
  }
}

function loadTheme(){
  applyTheme(state.cloudThemePreference || DEFAULT_THEME, { persist:false, skipCloudPersist:true });
}

function renderInstellingen(){
  const currentTheme = normalizeThemePreference(document.body.getAttribute('data-theme'));
  const themeLabel = getThemeLabel(currentTheme);

  document.getElementById('v-instellingen').innerHTML = `
    <div class="settings-panel">
      <div class="settings-hero card">
        <div>
          <div class="settings-kicker">Instellingen</div>
          <div class="settings-title">App voorkeuren</div>
          <div class="settings-subtitle">Pas de look van de app aan en houd de ervaring per apparaat netjes afgestemd.</div>
        </div>
        <div class="settings-badge">${themeLabel}</div>
      </div>

      <div class="settings-group card">
        <div class="settings-group-title">Weergave</div>

        <button class="settings-row settings-row-button" onclick="cycleTheme()">
          <span class="settings-row-main">
            <span class="settings-row-label">Actief theme</span>
            <span class="settings-row-note">Tik om door de themes te wisselen</span>
          </span>
          <span class="settings-row-side">
            <span class="settings-value current-theme-value">${themeLabel}</span>
            <span class="settings-chevron">&gt;</span>
          </span>
        </button>

        <div class="theme-picker" role="listbox" aria-label="Theme keuze">
          <button class="theme-tile ${currentTheme==='kuro'?'active':''}" data-theme="kuro" onclick="applyTheme('kuro')" aria-selected="${currentTheme==='kuro'}">
            <span class="theme-swatch theme-swatch-kuro"></span>
            <span class="theme-copy">
              <span class="theme-name">Kuro Steel</span>
              <span class="theme-note">Black steel, blade rain, red edge</span>
            </span>
            <span class="theme-check">✓</span>
          </button>

          <button class="theme-tile ${currentTheme==='neon'?'active':''}" data-theme="neon" onclick="applyTheme('neon')" aria-selected="${currentTheme==='neon'}">
            <span class="theme-swatch theme-swatch-neon"></span>
            <span class="theme-copy">
              <span class="theme-name">Ronin Ember</span>
              <span class="theme-note">Crimson, ember drift, battle heat</span>
            </span>
            <span class="theme-check">✓</span>
          </button>

          <button class="theme-tile ${currentTheme==='sakura'?'active':''}" data-theme="sakura" onclick="applyTheme('sakura')" aria-selected="${currentTheme==='sakura'}">
            <span class="theme-swatch theme-swatch-sakura"></span>
            <span class="theme-copy">
              <span class="theme-name">Sakura v2</span>
              <span class="theme-note">Donker, blossom glow, luxe</span>
            </span>
            <span class="theme-check">✓</span>
          </button>
        </div>
      </div>

      <div class="settings-group card">
        <div class="settings-group-title">Info</div>
        <div class="settings-row static compact">
          <span class="settings-row-main">
            <span class="settings-row-label">Theme opslag</span>
            <span class="settings-row-note">Per account opgeslagen in Supabase en overal hetzelfde na inloggen.</span>
          </span>
          <span class="settings-value">Actief</span>
        </div>
        <button class="settings-row settings-row-button" onclick="showInstallHelp()">
          <span class="settings-row-main">
            <span class="settings-row-label">Installeren op dit apparaat</span>
            <span class="settings-row-note">Zet Budget op je beginscherm voor sneller openen.</span>
          </span>
          <span class="settings-row-side">
            <span class="settings-value">Open</span>
            <span class="settings-chevron">&gt;</span>
          </span>
        </button>
        <button class="btn secondary settings-back-btn" onclick="closeSettings()">Terug</button>
      </div>
    </div>
  `;
}

function cycleTheme(){
  const order = ['kuro', 'neon', 'sakura'];
  const current = normalizeThemePreference(document.body.getAttribute('data-theme'));
  const idx = order.indexOf(current);
  applyTheme(order[(idx + 1) % order.length]);
}

function renderSettings(){
  renderInstellingen();
}

function getAccountInitial(){
  const email = state.cloudUserEmail || '';
  const source = email.split('@')[0] || 'V';
  return source.trim().charAt(0).toUpperCase() || 'V';
}

function ensureHeaderActionsHost(){
  let host = document.getElementById('header-actions');
  if(host) return host;

  const headerTop = document.querySelector('.header-top');
  if(!headerTop) return null;

  const oldButton = headerTop.querySelector('.badge-btn');
  if(oldButton) oldButton.remove();

  host = document.createElement('div');
  host.id = 'header-actions';
  host.className = 'header-actions';
  headerTop.appendChild(host);
  return host;
}

function ensureAccountMenuRoot(){
  let root = document.getElementById('account-menu-root');
  if(root) return root;

  root = document.createElement('div');
  root.id = 'account-menu-root';
  document.body.appendChild(root);
  return root;
}

function renderHeaderActions(){
  const root = ensureHeaderActionsHost();
  if(!root) return;

  const signedIn = typeof isCloudSignedIn === 'function' ? isCloudSignedIn() : false;
  const currentTheme = normalizeThemePreference(document.body.getAttribute('data-theme'));
  const loadLabel = state.cloudLoading ? 'Ophalen...' : 'Ophalen';
  const signOutLabel = state.cloudSigningOut ? 'Uitloggen...' : 'Uitloggen';
  const loadProgress = Math.max(0, Math.min(100, Number(state.cloudLoadProgress || 0)));
  const loadStep = escapeHtml(state.cloudLoadStep || 'Bezig met laden...');

  root.innerHTML = `
    <div class="header-actions-inner">
      ${signedIn ? `
        <div class="account-menu-wrap">
          <button class="account-avatar-btn" onclick="toggleAccountMenu()" aria-expanded="${state.accountMenuOpen ? 'true' : 'false'}" title="${escapeHtml(state.cloudUserEmail || '')}">
            ${escapeHtml(getAccountInitial())}
          </button>
          ${state.accountMenuOpen ? `
            <div class="account-menu-backdrop" onclick="closeAccountMenu()" aria-hidden="true"></div>
            <div class="account-menu-panel" role="dialog" aria-modal="true" aria-label="Account menu" onclick="event.stopPropagation()">
              <button class="account-menu-close" type="button" onclick="closeAccountMenu()" aria-label="Sluit account menu">×</button>
              <div class="account-menu-handle" aria-hidden="true"></div>
              <div class="account-menu-head">
                <div class="account-menu-kicker">Ingelogd</div>
                <div class="account-menu-email mono">${escapeHtml(state.cloudUserEmail || '')}</div>
              </div>
              <div class="account-menu-group">
                <div class="account-menu-label">Theme</div>
                <div class="account-theme-row">
                  <button class="account-theme-chip ${currentTheme==='kuro'?'active':''}" onclick="setAccountTheme('kuro')">Kuro</button>
                  <button class="account-theme-chip ${currentTheme==='neon'?'active':''}" onclick="setAccountTheme('neon')">Ronin</button>
                  <button class="account-theme-chip ${currentTheme==='sakura'?'active':''}" onclick="setAccountTheme('sakura')">Sakura</button>
                </div>
              </div>
              <div class="account-menu-actions">
                <button class="btn secondary btn.sm" onclick="loadFromCloud()" ${state.cloudLoading ? 'disabled' : ''}>${loadLabel}</button>
                <button class="btn secondary btn.sm" onclick="signOutFromCloud()" ${state.cloudSigningOut ? 'disabled' : ''}>${signOutLabel}</button>
              </div>
              ${state.cloudLoading ? `
                <div class="account-menu-sync">
                  <div class="account-menu-sync__top">
                    <span>${loadStep}</span>
                    <span>${Math.round(loadProgress)}%</span>
                  </div>
                  <div class="account-menu-sync__bar">
                    <div class="account-menu-sync__fill" style="width:${loadProgress}%"></div>
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      ` : `
        <button class="badge-btn" onclick="openLoginModal()">Inloggen</button>
      `}
      <button class="settings-icon-btn" onclick="openSettings()" aria-label="Instellingen" title="Instellingen">&#9881;</button>
    </div>
  `;

  const accountMenuRoot = ensureAccountMenuRoot();
  accountMenuRoot.innerHTML = '';

  const accountBackdrop = root.querySelector('.account-menu-backdrop');
  const accountPanel = root.querySelector('.account-menu-panel');
  if(accountBackdrop && accountPanel){
    accountMenuRoot.append(accountBackdrop, accountPanel);
  }
}

function toggleAccountMenu(){
  state.accountMenuOpen = !state.accountMenuOpen;
  renderHeaderActions();
}

function closeAccountMenu(){
  if(!state.accountMenuOpen) return;
  state.accountMenuOpen = false;
  renderHeaderActions();
}

function setAccountTheme(theme){
  applyTheme(theme);
  renderHeaderActions();
}

function openLoginModal(){
  state.accountMenuOpen = false;
  renderHeaderActions();
  openAppModal('cloud-login');
}

function openSignupModal(){
  state.accountMenuOpen = false;
  renderHeaderActions();
  openAppModal('cloud-signup');
}

async function submitLoginModal(){
  const email = document.getElementById('cloud-login-email')?.value || '';
  const password = document.getElementById('cloud-login-password')?.value || '';
  const result = await signInToCloud(email, password);

  if(result?.ok){
    closeAppModal();
    if(typeof finalizeCloudLogin === 'function'){
      finalizeCloudLogin(result.email || email);
    }
    if(typeof rerenderCurrentView === 'function'){
      rerenderCurrentView();
    }else if(typeof rerenderAll === 'function'){
      rerenderAll();
    }else if(typeof renderHeaderActions === 'function'){
      renderHeaderActions();
    }
  }
}

async function submitSignupModal(){
  const email = document.getElementById('cloud-signup-email')?.value || '';
  const password = document.getElementById('cloud-signup-password')?.value || '';
  const lastName = document.getElementById('cloud-signup-last-name')?.value || '';
  const result = await createCloudAccount(email, password, lastName);

  if(result?.ok){
    if(result.needsConfirmation){
      closeAppModal();
      return;
    }

    closeAppModal();
    if(typeof finalizeCloudLogin === 'function'){
      finalizeCloudLogin(result.email || email);
    }
    if(typeof rerenderCurrentView === 'function'){
      rerenderCurrentView();
    }else if(typeof rerenderAll === 'function'){
      rerenderAll();
    }else if(typeof renderHeaderActions === 'function'){
      renderHeaderActions();
    }
  }
}

function closeSettings(){
  const target = state.lastNonSettingsView || 'dashboard';
  const btn = [...document.querySelectorAll('.tab')].find(
    b => b.textContent.trim().toLowerCase() === target
  ) || document.querySelector('.tab');

  if(btn) go(target, btn);
}
