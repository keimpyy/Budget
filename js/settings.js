const THEME_KEY = 'bv_theme_pref_v2';
const LEGACY_THEME_KEY = 'bv_theme';

const THEME_COLORS = {
  midnight:'#0a0a0f',
  carbon:'#101214',
  sakura:'#140d15'
};

const ALLOWED_THEMES = new Set(['midnight','carbon','sakura']);

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

function syncThemeSelection(theme){
  const root = document.getElementById('v-instellingen');
  if(!root || !root.children.length) return;

  const themeLabel = theme === 'midnight' ? 'Midnight RGB' : theme === 'carbon' ? 'Carbon' : 'Sakura v2';
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
  const themeLabel = currentTheme === 'midnight'
    ? 'Midnight RGB'
    : currentTheme === 'carbon'
      ? 'Carbon'
      : 'Sakura v2';

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
          <button class="theme-tile ${currentTheme==='carbon'?'active':''}" data-theme="carbon" onclick="applyTheme('carbon')" aria-selected="${currentTheme==='carbon'}">
            <span class="theme-swatch theme-swatch-carbon"></span>
            <span class="theme-copy">
              <span class="theme-name">Carbon</span>
              <span class="theme-note">Rustig, staal, zakelijk</span>
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
            <span class="settings-row-label">Google Sheets koppeling</span>
            <span class="settings-row-note">Gebruik ophalen of opslaan wanneer jij zelf wilt syncen.</span>
          </span>
        </div>
        <div class="settings-endpoint mono">${typeof escapeHtml === 'function' ? escapeHtml(state.sheetsUrl || '') : (state.sheetsUrl || '')}</div>
        <div class="settings-actions-grid">
          <button class="btn secondary" onclick="loadFromSheets()">Ophalen</button>
          <button class="btn" onclick="saveToSheets()">Opslaan</button>
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
  const order = ['midnight','carbon','sakura'];
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