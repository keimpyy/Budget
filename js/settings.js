const THEME_KEY = 'bv_theme_pref_v2';
const LEGACY_THEME_KEY = 'bv_theme';

const THEME_COLORS = {
  midnight: '#0a0a0f',
  sakura: '#140d15',
  neon: '#0a0f14'
};

const ALLOWED_THEMES = new Set(['midnight', 'sakura', 'neon']);

function updateThemeMeta(theme){
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.midnight);
}

function getStoredTheme(){
  try{
    const stored = localStorage.getItem(THEME_KEY);
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    const resolved = stored || legacy || 'midnight';

    if(ALLOWED_THEMES.has(resolved)){
      if(!stored) localStorage.setItem(THEME_KEY, resolved);
      return resolved;
    }
  }catch(e){}
  return 'midnight';
}

function getThemeLabel(theme){
  if(theme === 'midnight') return 'Midnight RGB';
  if(theme === 'neon') return 'Neon Core';
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
  const resolved = ALLOWED_THEMES.has(theme) ? theme : 'midnight';
  const shouldPersist = options.persist !== false;

  document.body.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = 'dark';
  updateThemeMeta(resolved);

  if(shouldPersist){
    try{
      localStorage.setItem(THEME_KEY, resolved);
      localStorage.setItem(LEGACY_THEME_KEY, resolved);
    }catch(e){}
  }

  if(typeof syncSakuraPetals === 'function'){
    syncSakuraPetals();
  }

  syncThemeSelection(resolved);
}

function loadTheme(){
  applyTheme(getStoredTheme(), { persist:false });
}

function renderInstellingen(){
  const currentTheme = document.body.getAttribute('data-theme') || 'midnight';
  const themeLabel = getThemeLabel(currentTheme);
  const cloudUserEmail = typeof getCloudUserEmail === 'function' ? getCloudUserEmail() : 'Niet ingelogd';
  const cloudSignedIn = typeof isCloudSignedIn === 'function' ? isCloudSignedIn() : false;
  const cloudStatus = escapeHtml(state.cloudStatus || (cloudSignedIn ? `Ingelogd als ${cloudUserEmail}` : 'Nog niet verbonden'));

  document.getElementById('v-instellingen').innerHTML = `
    <div class="settings-panel">
      <div class="settings-hero card">
        <div>
          <div class="settings-kicker">Instellingen</div>
          <div class="settings-title">App voorkeuren</div>
          <div class="settings-subtitle">Alles wordt lokaal per apparaat opgeslagen en blijft staan totdat jij het zelf wijzigt.</div>
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
            <span class="settings-chevron">›</span>
          </span>
        </button>

        <div class="theme-picker" role="listbox" aria-label="Theme keuze">
          <button class="theme-tile ${currentTheme==='midnight'?'active':''}" data-theme="midnight" onclick="applyTheme('midnight')" aria-selected="${currentTheme==='midnight'}">
            <span class="theme-swatch theme-swatch-midnight"></span>
            <span class="theme-copy">
              <span class="theme-name">Midnight RGB</span>
              <span class="theme-note">Neon, contrast, premium</span>
            </span>
            <span class="theme-check">✓</span>
          </button>

          <button class="theme-tile ${currentTheme==='neon'?'active':''}" data-theme="neon" onclick="applyTheme('neon')" aria-selected="${currentTheme==='neon'}">
            <span class="theme-swatch theme-swatch-neon"></span>
            <span class="theme-copy">
              <span class="theme-name">Neon Core</span>
              <span class="theme-note">Tech, fris, modern dark</span>
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
        <div class="settings-group-title">Synchronisatie</div>
        <div class="settings-row static">
          <span class="settings-row-main">
            <span class="settings-row-label">Supabase koppeling</span>
            <span class="settings-row-note">Wijzigingen syncen automatisch op de achtergrond. Gebruik ophalen om een ander apparaat direct te verversen.</span>
          </span>
        </div>
        <div class="settings-endpoint mono">${escapeHtml(cloudUserEmail)}</div>
        <div class="settings-row-note" id="save-status">${cloudStatus}</div>
        <div class="settings-actions-grid">
          <button class="btn secondary" onclick="signInToCloud()">${cloudSignedIn ? 'Opnieuw inloggen' : 'Inloggen'}</button>
          <button class="btn secondary" onclick="loadFromCloud()">Ophalen</button>
          <button class="btn" onclick="saveToCloud()">Opslaan</button>
          <button class="btn secondary" onclick="signOutFromCloud()">Uitloggen</button>
        </div>
      </div>

      <div class="settings-group card">
        <div class="settings-group-title">Info</div>
        <div class="settings-row static compact">
          <span class="settings-row-main">
            <span class="settings-row-label">Theme opslag</span>
            <span class="settings-row-note">Lokaal op dit apparaat, niet via browser cache.</span>
          </span>
          <span class="settings-value">Actief</span>
        </div>
        <button class="btn secondary settings-back-btn" onclick="closeSettings()">Terug</button>
      </div>
    </div>
  `;
}

function cycleTheme(){
  const order = ['midnight', 'neon', 'sakura'];
  const current = document.body.getAttribute('data-theme') || 'midnight';
  const idx = order.indexOf(current);
  applyTheme(order[(idx + 1) % order.length]);
}

function renderSettings(){
  renderInstellingen();
}

function closeSettings(){
  const target = state.lastNonSettingsView || 'dashboard';
  const btn = [...document.querySelectorAll('.tab')].find(
    b => b.textContent.trim().toLowerCase() === target
  ) || document.querySelector('.tab');

  if(btn) go(target, btn);
}
