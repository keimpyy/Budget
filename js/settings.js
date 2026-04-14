const THEME_COLORS = {
  donker: '#0a0a0f',
  wit: '#f4f4fa',
  sakura: '#0f0a11',
  vuur: '#060304'
};

const ALLOWED_THEMES = new Set(['donker', 'wit', 'sakura', 'vuur']);

function updateThemeMeta(theme){
  const meta = document.querySelector('meta[name="theme-color"]');
  const resolved = normalizeThemePreference(theme);
  if(meta) meta.setAttribute('content', THEME_COLORS[resolved] || THEME_COLORS['donker']);
}

function getThemeLabel(theme){
  const resolved = normalizeThemePreference(theme);
  if(resolved === 'donker') return 'Donker';
  if(resolved === 'wit') return 'Wit';
  if(resolved === 'vuur') return 'Vuur';
  return 'Sakura';
}

function syncThemeSelection(theme){
  const roots = [
    document.getElementById('v-instellingen'),
    document.getElementById('v-thema')
  ];

  const themeLabel = getThemeLabel(theme);

  roots.forEach(root => {
    if(!root || !root.children.length) return;

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
  });
}

function applyTheme(theme, options = {}){
  const resolved = normalizeThemePreference(theme);
  const shouldPersist = options.persist !== false;

  document.body.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = resolved === 'neon' ? 'light' : 'dark';
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
  const stored = state.cloudThemePreference || DEFAULT_THEME;
  const resolved = normalizeThemePreference(stored);
  applyTheme(resolved, { persist:false, skipCloudPersist:true });
  // Auto-migrate old theme keys (kuro→donker, neon→wit) in Supabase
  if(stored !== resolved && typeof isCloudSignedIn === 'function' && isCloudSignedIn() && typeof saveThemePreference === 'function'){
    saveThemePreference(resolved).catch(() => {});
  }
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

        <button class="settings-row settings-row-button" onclick="openThema()">
          <span class="settings-row-main">
            <span class="settings-row-label">Thema</span>
            <span class="settings-row-note">Kies een kleurthema voor de app</span>
          </span>
          <span class="settings-row-side">
            <span class="settings-value current-theme-value">${themeLabel}</span>
            <span class="settings-chevron">&gt;</span>
          </span>
        </button>
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

function renderThema(){
  const root = document.getElementById('v-thema');
  if(!root) return;

  const currentTheme = normalizeThemePreference(document.body.getAttribute('data-theme'));
  const themeLabel = getThemeLabel(currentTheme);

  root.innerHTML = `
    <div class="settings-panel">
      <div class="settings-hero card">
        <div>
          <div class="settings-kicker">Uiterlijk</div>
          <div class="settings-title">Thema kiezen</div>
          <div class="settings-subtitle">Kies een look die bij je past. Wordt per account opgeslagen.</div>
        </div>
        <div class="settings-badge">${themeLabel}</div>
      </div>

      <div class="settings-group card">
        <div class="settings-group-title">Beschikbare thema's</div>

        <div class="theme-picker" role="listbox" aria-label="Thema keuze">
          <button class="theme-tile ${currentTheme==='donker'?'active':''}" data-theme="donker" onclick="applyTheme('donker')" aria-selected="${currentTheme==='donker'}">
            <span class="theme-swatch theme-swatch-donker"></span>
            <span class="theme-copy">
              <span class="theme-name">Donker</span>
              <span class="theme-note">Strak zwart, indigo accent, rustig</span>
            </span>
            <span class="theme-check">✓</span>
          </button>

          <button class="theme-tile ${currentTheme==='wit'?'active':''}" data-theme="wit" onclick="applyTheme('wit')" aria-selected="${currentTheme==='wit'}">
            <span class="theme-swatch theme-swatch-wit"></span>
            <span class="theme-copy">
              <span class="theme-name">Wit</span>
              <span class="theme-note">Helder wit, clean en fris</span>
            </span>
            <span class="theme-check">✓</span>
          </button>

          <button class="theme-tile ${currentTheme==='sakura'?'active':''}" data-theme="sakura" onclick="applyTheme('sakura')" aria-selected="${currentTheme==='sakura'}">
            <span class="theme-swatch theme-swatch-sakura"></span>
            <span class="theme-copy">
              <span class="theme-name">Sakura</span>
              <span class="theme-note">Donker, blossom glow, luxe</span>
            </span>
            <span class="theme-check">✓</span>
          </button>

          <button class="theme-tile ${currentTheme==='vuur'?'active':''}" data-theme="vuur" onclick="applyTheme('vuur')" aria-selected="${currentTheme==='vuur'}">
            <span class="theme-swatch theme-swatch-vuur"></span>
            <span class="theme-copy">
              <span class="theme-name">Vuur</span>
              <span class="theme-note">Donker, vlammen, stoer &amp; mannelijk</span>
            </span>
            <span class="theme-check">✓</span>
          </button>
        </div>
      </div>

      <div class="settings-group card">
        <button class="btn secondary settings-back-btn" onclick="closeThema()">Terug naar instellingen</button>
      </div>
    </div>
  `;
}

function cycleTheme(){
  const order = ['donker', 'wit', 'sakura', 'vuur'];
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
  const themeLabel = getThemeLabel(currentTheme);
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

              <div class="account-action-list">
                <button class="account-action-row" onclick="loadFromCloud()" ${state.cloudLoading ? 'disabled' : ''}>
                  <span class="account-action-left">
                    <span class="account-action-icon">&#8635;</span>
                    <span>${state.cloudLoading ? 'Ophalen...' : 'Ophalen'}</span>
                  </span>
                  ${!state.cloudLoading ? '<span class="account-action-chevron">&#8250;</span>' : ''}
                </button>

                <button class="account-action-row" onclick="closeAccountMenu();openThema()">
                  <span class="account-action-left">
                    <span class="account-action-icon">&#9673;</span>
                    <span>Thema</span>
                  </span>
                  <span class="account-action-right">
                    <span class="account-action-value">${themeLabel}</span>
                    <span class="account-action-chevron">&#8250;</span>
                  </span>
                </button>

                <button class="account-action-row" onclick="closeAccountMenu();openSettings()">
                  <span class="account-action-left">
                    <span class="account-action-icon">&#9881;</span>
                    <span>Instellingen</span>
                  </span>
                  <span class="account-action-chevron">&#8250;</span>
                </button>
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

              <button class="account-action-signout" onclick="signOutFromCloud()" ${state.cloudSigningOut ? 'disabled' : ''}>
                ${state.cloudSigningOut ? 'Uitloggen...' : 'Uitloggen'}
              </button>
            </div>
          ` : ''}
        </div>
      ` : `
        <button class="badge-btn" onclick="openLoginModal()">Inloggen</button>
        <button class="settings-icon-btn" onclick="openSettings()" aria-label="Instellingen" title="Instellingen">&#9881;</button>
      `}
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

function openThema(){
  const btn = document.getElementById('thema-tab-btn');
  go('thema', btn);
}

function closeThema(){
  const btn = document.getElementById('settings-tab-btn');
  if(btn) go('instellingen', btn);
}
