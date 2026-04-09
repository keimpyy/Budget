const SUPABASE_URL = 'https://jxihwwdnowvwgzpgviab.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2dWE27Su68lB3zFIVZRs_A_mFMd7haz';

const state = {
  cloudStatus: '',
  cloudLoading: false,
  cloudSigningOut: false,
  cloudHouseholdKey: '',
  cloudUserEmail: '',
  cloudThemePreference: 'midnight',
  startupProgress: 8,
  startupStatus: 'App starten...',
  accountMenuOpen:false,
  inkomsten: [
    { naam:'KT', bedrag:2950 },
    { naam:'Ryanne', bedrag:1581.89 },
  ],
  categorieen: [],
  budget: [],
  leningen: [
    { id:'l1', naam:'Auto 1', totaal:2700, betaald:750, kleur:'#7c6af7' },
    { id:'l2', naam:'Auto 2', totaal:7500, betaald:0, kleur:'#4ecdc4' },
  ],
  openCats:{},
  budgetSubtab:'categorieen',
  currentView:'dashboard',
  lastNonSettingsView:'dashboard',
  budgetSelectedCategoryId:null,
  budgetFocusCategoryId:null,
  budgetComposerOpen:false,
  budgetComposerMode:'category',
  budgetComposerTargetId:null,
  budgetComposerCategoryId:null,
  appModalOpen:false,
  appModalType:null,
  appModalPayload:null,
  appModalOnConfirm:null
};

function uid(prefix){ return `${prefix}_${Date.now()}_${Math.floor(Math.random()*100000)}`; }
function fmt(n){ const v = Number(n || 0); return '€ ' + v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
function fmtShort(n){ return '€' + Math.round(Number(n || 0)).toLocaleString('nl'); }
function inkomstenTotaal(){ return state.inkomsten.reduce((s,r)=>s + Number(r.bedrag || 0), 0); }
function budgetTotaal(){ return state.budget.reduce((s,r)=>s + Number(r.budget || 0), 0); }
function overschot(){ return inkomstenTotaal() - budgetTotaal(); }
function spaarquote(){ const inc = inkomstenTotaal(); return inc ? (overschot() / inc) * 100 : 0; }
function orderedCats(){ return [...state.categorieen].sort((a,b)=>(a.volgorde||0)-(b.volgorde||0)); }
function itemsForCategory(catId){ return state.budget.filter(r=>String(r.categorieId) === String(catId)).sort((a,b)=>(a.volgorde||0)-(b.volgorde||0)); }
function totalForCategory(catId){ return itemsForCategory(catId).reduce((s,r)=>s + Number(r.budget || 0), 0); }
function postsCount(catId){ return itemsForCategory(catId).length; }
function ensureBudgetSelection(){
  const cats = orderedCats();
  if(!cats.length){
    state.budgetSelectedCategoryId = null;
    return null;
  }
  const exists = cats.some(c => c.id === state.budgetSelectedCategoryId);
  if(!exists) state.budgetSelectedCategoryId = cats[0].id;
  return state.budgetSelectedCategoryId;
}
function budgetRemaining(){ return overschot(); }
function budgetUsagePct(catId){
  const total = budgetTotaal();
  return total ? (totalForCategory(catId) / total) * 100 : 0;
}
