function rerenderAll(){
  if(typeof renderDashboard === 'function') renderDashboard();
  if(typeof renderBudget === 'function') renderBudget();
  if(typeof renderLeningen === 'function') renderLeningen();
  if(typeof renderInstellingen === 'function') renderInstellingen();
}

function go(viewName, btn){
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  const target = document.getElementById(`v-${viewName}`);
  if(target) target.classList.add('active');

  if(btn) btn.classList.add('active');
}

function openSettings(){
  const btn = document.getElementById('settings-tab-btn');
  if(btn){
    btn.style.display = '';
    go('instellingen', btn);
  }
}

function closeSettings(){
  const btn = document.querySelector('.tabs .tab:nth-child(2)');
  if(btn){
    go('budget', btn);
  }else{
    go('budget');
  }
}

async function init(){
  if(typeof restoreLocal === 'function'){
    restoreLocal();
  }

  if(typeof normalizeData === 'function'){
    normalizeData();
  }

  rerenderAll();

  try{
    if(typeof sheetsGet === 'function' && typeof applySheets === 'function'){
      const result = await sheetsGet();
      if(result?.ok){
        applySheets(result);
      }
    }
  }catch(e){}

  const startupOverlay = document.getElementById('startup-overlay');
  if(startupOverlay){
    startupOverlay.style.display = 'none';
  }
}

loadTheme();

if(typeof syncSakuraPetals === 'function'){
  window.addEventListener('resize', syncSakuraPetals);
}

window.addEventListener('storage', (e) => {
  if(e.key === THEME_KEY || e.key === LEGACY_THEME_KEY){
    loadTheme();
  }
});

init();