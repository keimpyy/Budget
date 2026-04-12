const SUPABASE_URL = 'https://jxihwwdnowvwgzpgviab.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2dWE27Su68lB3zFIVZRs_A_mFMd7haz';
const APP_VERSION = '20260412b';
const DEFAULT_THEME = 'kuro';

function normalizeThemePreference(theme){
  if(theme === 'midnight') return 'kuro';
  if(theme === 'kuro' || theme === 'sakura' || theme === 'neon') return theme;
  return DEFAULT_THEME;
}

const state = {
  cloudStatus: '',
  cloudLoading: false,
  cloudLoadProgress: 0,
  cloudLoadStep: '',
  cloudSigningOut: false,
  cloudHouseholdKey: '',
  cloudUserEmail: '',
  cloudThemePreference: DEFAULT_THEME,
  cloudCreatingAccount: false,
  startupProgress: 8,
  startupStatus: 'App starten...',
  accountMenuOpen:false,
  inkomsten: [],
  categorieen: [],
  budget: [],
  leningen: [],
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
function resetBudgetData(){
  state.inkomsten = [];
  state.categorieen = [];
  state.budget = [];
  state.leningen = [];
  state.openCats = {};
  state.budgetSelectedCategoryId = null;
  state.budgetFocusCategoryId = null;
  state.budgetComposerOpen = false;
  state.budgetComposerMode = 'category';
  state.budgetComposerTargetId = null;
  state.budgetComposerCategoryId = null;
}
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
