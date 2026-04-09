const VIEW_ORDER = ['dashboard','budget','leningen','instellingen'];

const appSwipe = { startX:0, startY:0, dx:0, dy:0 };

function rerenderAll(){
  if(typeof renderDashboard === 'function') renderDashboard();
  if(typeof renderBudget === 'function') renderBudget();
  if(typeof renderLeningen === 'function') renderLeningen();
  if(typeof renderInstellingen === 'function') renderInstellingen();
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

  const count = Math.min(18, Math.max(10, Math.floor(window.innerWidth / 28)));
  for(let i = 0; i < count; i++){
    const petal = document.createElement('span');
    petal.className = 'sakura-petal';
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.animationDuration = `${8 + Math.random() * 8}s`;
    petal.style.animationDelay = `${-Math.random() * 10}s`;
    petal.style.setProperty('--drift', `${-60 + Math.random() * 120}px`);
    petal.style.transform = `scale(${0.75 + Math.random() * 0.8})`;
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

// Swipe to delete voor nieuwe budget cards

const swipeState = {};
const SWIPE_MAX = 120;
const SWIPE_SNAP = 88;
const SWIPE_REVEAL = 34;
const SWIPE_DELETE_THRESHOLD = 108;

function getSwipeRow(id){
  return document.querySelector(`.budget-post-card[data-id="${id}"]`);
}

function getSwipeContent(row){
  return row ? row.querySelector('.budget-post-card__content') : null;
}

function setSwipeX(stateRef, x){
  stateRef.x = x;
  if(stateRef.frame) return;

  stateRef.frame = requestAnimationFrame(() => {
    stateRef.frame = null;

    const row = stateRef.row;
    const content = stateRef.content;
    if(!row || !content) return;

    const nextX = stateRef.x || 0;
    const progress = Math.min(1, Math.max(0, Math.abs(nextX) / SWIPE_DELETE_THRESHOLD));

    row.style.setProperty('--swipe-progress', progress.toFixed(3));
    row.classList.toggle('reveal-delete', Math.abs(nextX) > SWIPE_REVEAL);
    row.classList.toggle('snap-open', Math.abs(nextX) > SWIPE_SNAP * 0.92);
    content.style.transform = `translate3d(${nextX}px,0,0)`;
  });
}

function closeSwipeRow(row){
  if(!row) return;
  const content = getSwipeContent(row);

  if(content){
    content.style.transition = 'transform .22s cubic-bezier(.22,1,.36,1)';
    content.style.transform = 'translate3d(0,0,0)';
  }

  row.classList.remove('reveal-delete','snap-open','swiping');
  row.style.setProperty('--swipe-progress', 0);
}

function openSwipeRow(row){
  if(!row) return;
  const content = getSwipeContent(row);

  if(content){
    content.style.transition = 'transform .22s cubic-bezier(.22,1,.36,1)';
    content.style.transform = `translate3d(-${SWIPE_SNAP}px,0,0)`;
  }

  row.classList.add('reveal-delete','snap-open');
  row.style.setProperty('--swipe-progress', 1);
}

function closeOtherSwipeRows(activeId){
  document.querySelectorAll('.budget-post-card.reveal-delete, .budget-post-card.snap-open').forEach(row => {
    if(row.dataset.id !== String(activeId)) closeSwipeRow(row);
  });
}

function swipeStart(e, id){
  const touch = e.changedTouches[0];
  const row = getSwipeRow(id);
  if(!row) return;

  closeOtherSwipeRows(id);

  const content = getSwipeContent(row);
  const currentOpen = row.classList.contains('snap-open') ? -SWIPE_SNAP : 0;

  swipeState[id] = {
    row,
    content,
    startX: touch.clientX,
    startY: touch.clientY,
    x: currentOpen,
    baseX: currentOpen,
    locked: false,
    isHorizontal: false,
    frame: null
  };

  row.classList.add('swiping');
  if(content) content.style.transition = 'none';
}

function swipeMove(e, id){
  const stateRef = swipeState[id];
  if(!stateRef || !stateRef.row) return;

  const touch = e.changedTouches[0];
  const rawDx = touch.clientX - stateRef.startX;
  const rawDy = touch.clientY - stateRef.startY;

  if(!stateRef.locked){
    if(Math.abs(rawDx) < 6 && Math.abs(rawDy) < 6) return;
    stateRef.locked = true;
    stateRef.isHorizontal = Math.abs(rawDx) > Math.abs(rawDy) * 1.2;
  }

  if(!stateRef.isHorizontal) return;

  e.preventDefault();

  let nextX = stateRef.baseX + rawDx;
  if(nextX > 18) nextX = 18 - Math.pow(18 - nextX, 0.72);
  if(nextX < -SWIPE_MAX) nextX = -SWIPE_MAX - Math.pow(Math.abs(nextX + SWIPE_MAX), 0.76) * 0.16;
  nextX = Math.max(-SWIPE_MAX - 12, Math.min(12, nextX));

  setSwipeX(stateRef, nextX);
}

function swipeEnd(e, id){
  const stateRef = swipeState[id];
  if(!stateRef || !stateRef.row) return;

  const row = stateRef.row;
  const dx = stateRef.x || 0;
  row.classList.remove('swiping');

  if(stateRef.frame){
    cancelAnimationFrame(stateRef.frame);
    stateRef.frame = null;
  }

  if(dx <= -SWIPE_DELETE_THRESHOLD){
    openSwipeRow(row);
    setTimeout(() => {
      if(confirm('Post verwijderen?')) removeBudgetPost(id);
      else closeSwipeRow(row);
    }, 70);
  }else if(dx <= -SWIPE_REVEAL){
    openSwipeRow(row);
  }else{
    closeSwipeRow(row);
  }

  delete swipeState[id];
}