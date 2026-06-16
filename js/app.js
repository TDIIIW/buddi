'use strict';

// ── CATEGORIES ────────────────────────────────────────────────
const CATS = [
  { id: 'coffee',  label: 'Coffee',       icon: '☕' },
  { id: 'food',    label: 'Food',         icon: '🍔' },
  { id: 'grocery', label: 'Groceries',    icon: '🛒' },
  { id: 'drinks',  label: 'Going out',    icon: '🍻' },
  { id: 'transit', label: 'Transport',    icon: '🚌' },
  { id: 'sub',     label: 'Subscriptions',icon: '📱' },
  { id: 'shop',    label: 'Shopping',     icon: '🛍️' },
  { id: 'other',   label: 'Other',        icon: '💸' },
];

const CAT_COLORS = {
  coffee: '#C8956C', food: '#E07A5F', grocery: '#81B29A',
  drinks: '#6B7FD7', transit: '#64B5F6', sub: '#BA68C8',
  shop: '#F48FB1',   other: '#90A4AE'
};

// ── LEVELS ───────────────────────────────────────────────────
const LEVELS = [
  { n: 1,  name: 'Seedling',   emoji: '🌱', xp: 0    },
  { n: 2,  name: 'Sprout',     emoji: '🌿', xp: 100  },
  { n: 3,  name: 'Sapling',    emoji: '🪴', xp: 250  },
  { n: 4,  name: 'Budgeter',   emoji: '💡', xp: 500  },
  { n: 5,  name: 'Planner',    emoji: '📋', xp: 900  },
  { n: 6,  name: 'Saver',      emoji: '💰', xp: 1400 },
  { n: 7,  name: 'Optimizer',  emoji: '⚡', xp: 2100 },
  { n: 8,  name: 'Strategist', emoji: '🎯', xp: 3000 },
  { n: 9,  name: 'Master',     emoji: '🏆', xp: 4200 },
  { n: 10, name: 'Legend',     emoji: '💎', xp: 6000 },
];

function getLevel(xp) {
  let lv = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.xp) lv = l; }
  return lv;
}

function getXpProgress(xp) {
  const lv = getLevel(xp);
  if (lv.n === 10) return { pct: 100, cur: xp - lv.xp, max: 0, next: null };
  const next = LEVELS[lv.n]; // n is 1-based, array is 0-based so LEVELS[lv.n] is the next level
  const cur  = xp - lv.xp;
  const max  = next.xp - lv.xp;
  return { pct: Math.min(100, (cur / max) * 100), cur, max, next };
}

// ── DAILY CHALLENGES ──────────────────────────────────────────
const CHALLENGES = [
  { id: 'under_budget', icon: '🎯', title: 'Budget Hero',    desc: 'Stay under your daily budget',      xp: 50 },
  { id: 'log3',         icon: '📝', title: 'Triple Logger',  desc: 'Log 3 or more expenses today',      xp: 40 },
  { id: 'morning',      icon: '🌅', title: 'Early Bird',     desc: 'Log an expense before noon',        xp: 30 },
  { id: 'under_half',   icon: '✂️', title: 'Frugal Mode',    desc: 'Spend less than half daily budget', xp: 60 },
  { id: 'describe_well',icon: '💬', title: 'Detail Devil',   desc: 'Write a description 10+ characters',xp: 30 },
  { id: 'no_eating_out',icon: '🏠', title: 'Home Cook',      desc: 'Avoid food & drinks out today',     xp: 45 },
  { id: 'grocery_smart',icon: '🛒', title: 'Smart Shopper',  desc: 'Log a grocery expense today',       xp: 25 },
];

function getDailyChallenge() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return CHALLENGES[dayOfYear % CHALLENGES.length];
}

function checkChallenge(challenge, newDesc) {
  const today   = todayKey();
  const exps    = todayExps();
  const spent   = exps.reduce((s, e) => s + e.amount, 0);
  const db      = dailyBudget();
  const hour    = new Date().getHours();

  switch (challenge.id) {
    case 'under_budget':  return spent <= db;
    case 'log3':          return exps.length >= 3;
    case 'morning':       return exps.length >= 1 && hour < 12;
    case 'under_half':    return spent <= db * 0.5;
    case 'describe_well': return newDesc && newDesc.length >= 10;
    case 'no_eating_out': return !exps.some(e => e.cat === 'food' || e.cat === 'drinks');
    case 'grocery_smart': return exps.some(e => e.cat === 'grocery');
    default:              return false;
  }
}

// ── ACHIEVEMENTS ──────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 'first_log',   emoji: '🌱', title: 'First Step',      desc: 'Log your first expense'       },
  { id: 'streak3',     emoji: '🔥', title: 'On Fire',         desc: '3-day streak'                  },
  { id: 'streak7',     emoji: '🏆', title: 'Week Warrior',    desc: '7-day streak'                  },
  { id: 'streak30',    emoji: '💎', title: 'Diamond Saver',   desc: '30-day streak'                 },
  { id: 'level5',      emoji: '⭐', title: 'High Five',       desc: 'Reach level 5'                 },
  { id: 'level10',     emoji: '👑', title: 'Legendary',       desc: 'Reach level 10'                },
  { id: 'challenge3',  emoji: '🎯', title: 'Challenger',      desc: 'Complete 3 daily challenges'   },
  { id: 'log10',       emoji: '📊', title: 'Habit Builder',   desc: 'Log 10 expenses'               },
  { id: 'log50',       emoji: '🚀', title: 'On a Roll',       desc: 'Log 50 expenses'               },
  { id: 'under_week',  emoji: '💪', title: 'Consistent',      desc: 'Under budget 7 days in a row'  },
];

function checkAchievements(newlyUnlocked = []) {
  const s = S;
  const total  = (s.expenses || []).length;
  const streak = s.streak || 0;
  const lv     = getLevel(s.xp || 0).n;
  const cDone  = s.challengesDone || 0;

  const conditions = {
    first_log:  total >= 1,
    streak3:    streak >= 3,
    streak7:    streak >= 7,
    streak30:   streak >= 30,
    level5:     lv >= 5,
    level10:    lv >= 10,
    challenge3: cDone >= 3,
    log10:      total >= 10,
    log50:      total >= 50,
    under_week: (s.underBudgetDays || 0) >= 7,
  };

  const unlocked = s.achievements || [];
  const fresh = [];
  for (const [id, met] of Object.entries(conditions)) {
    if (met && !unlocked.includes(id)) {
      unlocked.push(id);
      fresh.push(id);
    }
  }
  s.achievements = unlocked;
  return fresh;
}

// ── STATE ─────────────────────────────────────────────────────
let S = {};
const KEY = 'buddi_v3';

function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { S = {}; }
  // migrate from old key
  if (!Object.keys(S).length) {
    try {
      const old = JSON.parse(localStorage.getItem('buddi_v2'));
      if (old && old.income) {
        S = { ...old, xp: 0, achievements: [], challengesDone: 0, streakShield: { available: true, weekKey: '' }, underBudgetDays: 0 };
        save();
      }
    } catch {}
  }
}

const save = () => localStorage.setItem(KEY, JSON.stringify(S));

// ── DATE HELPERS ──────────────────────────────────────────────
const todayKey   = () => new Date().toISOString().slice(0, 10);
const monthKey   = () => new Date().toISOString().slice(0, 7);
const weekKey    = () => { const d = new Date(); const jan1 = new Date(d.getFullYear(),0,1); return d.getFullYear()+'W'+Math.ceil(((d-jan1)/86400000+jan1.getDay()+1)/7); };
const dailyBudget = () => +(S.budget / 30).toFixed(2);

const todayExps  = () => (S.expenses || []).filter(e => e.date === todayKey());
const monthExps  = () => (S.expenses || []).filter(e => (e.date||'').startsWith(monthKey()));

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// ── SVG ICONS ─────────────────────────────────────────────────
const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  sliders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  zap: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 4H17V12A5 5 0 0 1 7 12Z"/><path d="M5 4H3V10A4 4 0 0 0 7 14"/><path d="M19 4H21V10A4 4 0 0 1 17 14"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="8 21 12 21 16 21"/></svg>`,
};

// ── SCREENS ───────────────────────────────────────────────────
let currentScreen = null;

function showScreen(id) {
  const next = document.getElementById(id);
  if (currentScreen && currentScreen !== next) {
    currentScreen.classList.remove('active');
    currentScreen.classList.add('exit');
    const prev = currentScreen;
    setTimeout(() => prev.classList.remove('exit'), 300);
  }
  currentScreen = next;
  requestAnimationFrame(() => next.classList.add('active'));

  const fab = document.getElementById('fab');
  if (fab) fab.classList.toggle('hidden', id !== 'screen-home');
}

function showAdd() {
  const el = document.getElementById('screen-add');
  el.style.display = 'flex';
  requestAnimationFrame(() => el.classList.add('active'));
  resetAdd();
  document.getElementById('fab').classList.add('hidden');
}

function hideAdd() {
  const el = document.getElementById('screen-add');
  el.classList.remove('active');
  setTimeout(() => { el.style.display = 'none'; }, 380);
  document.getElementById('fab').classList.remove('hidden');
}

// ── ONBOARDING ────────────────────────────────────────────────
function initOnboard() { showScreen('screen-onboard'); }

document.getElementById('btn-start').addEventListener('click', () => {
  const income = parseFloat(document.getElementById('income-input').value);
  const name   = document.getElementById('name-input').value.trim() || 'friend';
  if (!income || income < 1) { shakeEl(document.getElementById('income-input')); return; }

  S = { income, name, budget: Math.round(income * 0.5), expenses: [], streak: 0, lastLog: null,
        xp: 0, achievements: [], challengesDone: 0, streakShield: { available: true, weekKey: '' }, underBudgetDays: 0 };
  save();
  buildSuggestScreen();
  showScreen('screen-suggest');
});

// ── SUGGEST ───────────────────────────────────────────────────
function buildSuggestScreen() {
  const { income, name, budget } = S;
  document.getElementById('suggest-greeting').textContent = `Hey ${name}! 👋`;
  document.getElementById('suggest-msg').textContent =
    `Based on €${income.toLocaleString('nl-NL')} take-home, I'd suggest €${budget.toLocaleString('nl-NL')} for spending — that's 50%. The rest goes to savings and bills.`;

  const rows = [
    { label: 'Spending',   pct: 50, color: '#30D158' },
    { label: 'Savings',    pct: 30, color: '#007AFF' },
    { label: 'Bills',      pct: 20, color: '#AEAEB2' },
  ];
  document.getElementById('suggest-breakdown').innerHTML = rows.map(r => {
    const val = Math.round(income * r.pct / 100);
    return `<div class="breakdown-row">
      <div class="breakdown-label">
        <span class="breakdown-name">${r.label}</span>
        <span class="breakdown-val">€${val.toLocaleString('nl-NL')} <span class="breakdown-pct">${r.pct}%</span></span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${r.pct}%;background:${r.color}"></div></div>
    </div>`;
  }).join('');
  document.getElementById('custom-budget').value = '';
  document.getElementById('custom-budget').placeholder = `Suggestion: €${budget}`;
}

document.getElementById('btn-confirm').addEventListener('click', () => {
  const custom = parseFloat(document.getElementById('custom-budget').value);
  if (custom && custom > 0) S.budget = custom;
  save();
  buildHomeScreen();
  showScreen('screen-home');
  switchNav('home');
});

// ── HOME ──────────────────────────────────────────────────────
function buildHomeScreen() {
  updateStreakBadge();
  renderXpBanner();

  const spent  = todayExps().reduce((s, e) => s + e.amount, 0);
  const mSpent = monthExps().reduce((s, e) => s + e.amount, 0);
  const db     = dailyBudget();
  const dayLeft = Math.max(0, db - spent);
  const pct    = Math.min(100, (mSpent / S.budget) * 100);

  document.getElementById('home-name').textContent = S.name;
  document.getElementById('home-date').textContent = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  animateNumber('stat-spent-today', spent, '€');
  animateNumber('stat-left-today', dayLeft, '€');

  document.getElementById('month-label').textContent = `€${mSpent.toFixed(0)} of €${S.budget}`;
  const bar = document.getElementById('month-bar');
  bar.style.width = '0%';
  setTimeout(() => {
    bar.style.width = pct + '%';
    bar.className = 'progress-fill' + (pct >= 100 ? ' over' : pct >= 75 ? ' warn' : '');
  }, 50);

  let tip;
  if (pct >= 100) tip = `Monthly limit hit — €${(mSpent - S.budget).toFixed(2)} over. Keep it light for the rest of the month 💪`;
  else if (spent > db) tip = `A little over today (€${(spent - db).toFixed(2)} over). Try going easy tomorrow to balance out!`;
  else if (dayLeft < 5) tip = `Almost at today's limit! €${dayLeft.toFixed(2)} left.`;
  else tip = `€${dayLeft.toFixed(2)} left for today. You're doing great! 🎉`;
  document.getElementById('buddy-tip').textContent = tip;

  renderChallengeCard();
  renderTodayExpenses();
}

function renderChallengeCard() {
  const el = document.getElementById('challenge-card');
  if (!el) return;
  const challenge = getDailyChallenge();
  const today     = todayKey();
  const done      = S.todayChallenge && S.todayChallenge.id === challenge.id && S.todayChallenge.date === today && S.todayChallenge.completed;

  if (done) {
    el.className = 'challenge-card done';
    el.innerHTML = `
      <div class="challenge-icon">${ICONS.check.replace('<svg', '<svg style="width:22px;height:22px"')}</div>
      <div class="challenge-body">
        <div class="challenge-label">Daily Challenge</div>
        <div class="challenge-title">${challenge.title}</div>
        <div class="challenge-desc">${challenge.desc}</div>
      </div>
      <div class="challenge-done-badge">+${challenge.xp} XP ✓</div>`;
  } else {
    el.className = 'challenge-card';
    el.innerHTML = `
      <div class="challenge-icon"><span style="font-size:22px">${challenge.icon}</span></div>
      <div class="challenge-body">
        <div class="challenge-label">Daily Challenge</div>
        <div class="challenge-title">${challenge.title}</div>
        <div class="challenge-desc">${challenge.desc}</div>
      </div>
      <div class="challenge-xp">+${challenge.xp} XP</div>`;
  }
}

function renderTodayExpenses() {
  const exps = todayExps();
  const el   = document.getElementById('today-expenses');
  if (!exps.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🌱</div><p>No expenses yet — tap + to log your first one!</p></div>`;
    return;
  }
  el.innerHTML = exps.slice().reverse().map(e => {
    const cat = CATS.find(c => c.id === e.cat) || CATS[7];
    const col = CAT_COLORS[e.cat] || '#90A4AE';
    return `<div class="expense-item" data-id="${e.id}" onclick="toggleExpenseDelete(this)">
      <div class="expense-icon" style="background:${col}22">${cat.icon}</div>
      <div class="expense-info">
        <div class="expense-desc">${e.desc}</div>
        <div class="expense-cat">${cat.label}</div>
      </div>
      <div class="expense-amt">€${e.amount.toFixed(2)}</div>
      <div class="expense-delete-btn" onclick="deleteExpense(event,'${e.id}')">${ICONS.trash}</div>
    </div>`;
  }).join('');
}

function toggleExpenseDelete(el) {
  const wasOpen = el.classList.contains('reveal-delete');
  document.querySelectorAll('.expense-item.reveal-delete').forEach(i => i.classList.remove('reveal-delete'));
  if (!wasOpen) el.classList.add('reveal-delete');
}

function deleteExpense(evt, id) {
  evt.stopPropagation();
  const item = document.querySelector(`.expense-item[data-id="${id}"]`);
  if (item) { item.style.opacity = '0'; item.style.transform = 'translateX(60px) scale(0.95)'; item.style.transition = 'all 0.25s ease'; }
  setTimeout(() => {
    S.expenses = (S.expenses || []).filter(e => String(e.id) !== String(id));
    save();
    buildHomeScreen();
  }, 250);
}

// ── ADD EXPENSE ────────────────────────────────────────────────
let amtStr = '';
let selectedCat = null;

function resetAdd() {
  amtStr = '';
  selectedCat = null;
  document.getElementById('exp-desc').value = '';
  renderAmt();
  buildCatChips();
  updateXpPreview();
}

function renderAmt() {
  const el = document.getElementById('amount-value');
  el.textContent = amtStr === '' ? '0' : amtStr;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
  updateXpPreview();
}

function updateXpPreview() {
  const el = document.getElementById('xp-preview');
  if (!el) return;
  const amt    = parseFloat(amtStr) || 0;
  const spent  = todayExps().reduce((s, e) => s + e.amount, 0) + amt;
  const db     = dailyBudget();
  let xp = 10;
  if (spent <= db) xp += 20;
  el.innerHTML = `${ICONS.zap}<span>+${xp} XP</span>`;
}

function buildCatChips() {
  document.getElementById('cat-scroll').innerHTML = CATS.map(c => `
    <div class="cat-chip" data-id="${c.id}" onclick="selectCat('${c.id}')">
      <span class="cat-chip-icon">${c.icon}</span>
      <span class="cat-chip-label">${c.label}</span>
    </div>`).join('');
}

function selectCat(id) {
  selectedCat = id;
  document.querySelectorAll('.cat-chip').forEach(el => el.classList.toggle('selected', el.dataset.id === id));
}

document.getElementById('numpad').addEventListener('click', e => {
  const btn = e.target.closest('.numpad-btn');
  if (!btn) return;
  const val = btn.dataset.val;
  if (val === 'del') {
    amtStr = amtStr.slice(0, -1);
  } else if (val === '.') {
    if (!amtStr.includes('.')) amtStr += amtStr === '' ? '0.' : '.';
  } else {
    if (amtStr.includes('.') && amtStr.split('.')[1].length >= 2) return;
    if (amtStr === '0') amtStr = val;
    else amtStr += val;
  }
  renderAmt();
});

document.getElementById('btn-save-expense').addEventListener('click', () => {
  const amount = parseFloat(amtStr);
  const desc   = document.getElementById('exp-desc').value.trim();
  if (!amount || amount <= 0) { shakeEl(document.getElementById('amount-value')); return; }
  if (!desc) { shakeEl(document.getElementById('exp-desc')); return; }

  const cat   = selectedCat || 'other';
  const today = todayKey();

  S.expenses = S.expenses || [];
  S.expenses.push({ amount, desc, cat, date: today, id: Date.now() });

  const spent  = todayExps().reduce((s, e) => s + e.amount, 0);
  const mSpent = monthExps().reduce((s, e) => s + e.amount, 0);
  const dayOver = spent > dailyBudget();
  const monOver = mSpent > S.budget;

  // XP: base +10, +20 bonus if under daily budget
  let xpGained = 10;
  if (!dayOver) xpGained += 20;

  // Streak logic
  const wasNewDay = S.lastLog !== today;
  if (!dayOver && !monOver) {
    if (wasNewDay) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().slice(0, 10);
      if (S.lastLog === yKey || S.lastLog === null) {
        S.streak = (S.streak || 0) + 1;
      } else {
        S.streak = 1;
      }
      S.underBudgetDays = (S.underBudgetDays || 0) + 1;
    }
    S.lastLog = today;
  } else if (dayOver && (S.streak || 0) > 0) {
    const wk = weekKey();
    const shield = S.streakShield || { available: true, weekKey: '' };
    if (shield.available && shield.weekKey !== wk) {
      S.streakShield = { available: false, weekKey: wk };
      showToast('🛡️ Streak Shield activated — streak protected!');
    } else {
      S.streak = 0;
      S.underBudgetDays = 0;
    }
  }

  // Challenge check
  const challenge = getDailyChallenge();
  const todayChal = S.todayChallenge;
  const chalAlreadyDone = todayChal && todayChal.id === challenge.id && todayChal.date === today && todayChal.completed;
  if (!chalAlreadyDone && checkChallenge(challenge, desc)) {
    S.todayChallenge = { id: challenge.id, date: today, completed: true };
    S.challengesDone = (S.challengesDone || 0) + 1;
    xpGained += challenge.xp;
    showToast(`Challenge complete! +${challenge.xp} XP 🎯`);
  }

  // Level up check
  const prevLevel = getLevel(S.xp || 0).n;
  S.xp = (S.xp || 0) + xpGained;
  const newLevel = getLevel(S.xp).n;

  save();

  // Achievements
  const fresh = checkAchievements();
  save();

  // Animations
  burstCoins(document.getElementById('btn-save-expense'));
  if (!dayOver && !monOver) setTimeout(() => bumpStreak(), 400);

  hideAdd();
  setTimeout(() => {
    buildHomeScreen();
    if (!dayOver && !monOver && S.streak > 0) celebrate();
    if (newLevel > prevLevel) setTimeout(() => showLevelUp(getLevel(S.xp)), 600);
    fresh.forEach((id, i) => {
      const a = ACHIEVEMENTS.find(a => a.id === id);
      if (a) setTimeout(() => showAchievementToast(a), 800 + i * 1200);
    });
  }, 380);
});

// ── STREAK ────────────────────────────────────────────────────
function updateStreakBadge() {
  const el  = document.getElementById('streak-badge');
  const num = S.streak || 0;
  const wk  = weekKey();
  const shield = S.streakShield || {};
  const shieldAvail = shield.available && shield.weekKey !== wk;
  el.innerHTML = `<span class="streak-flame">🔥</span><span>${num}</span>${shieldAvail ? `<span class="shield-icon">${ICONS.shield.replace('<svg','<svg style="width:13px;height:13px"')}</span>` : ''}`;
  el.classList.toggle('streak-zero', num === 0);
}

function bumpStreak() {
  updateStreakBadge();
  const el = document.getElementById('streak-badge');
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function renderXpBanner() {
  const xp    = S.xp || 0;
  const lv    = getLevel(xp);
  const prog  = getXpProgress(xp);
  const elPill = document.getElementById('level-pill');
  const elFill = document.getElementById('xp-fill');
  const elLabel= document.getElementById('xp-label');
  if (!elPill) return;
  elPill.innerHTML  = `${ICONS.zap}<span>Lvl ${lv.n} · ${lv.name}</span>`;
  elFill.style.width = prog.pct + '%';
  elLabel.textContent = prog.next ? `${prog.cur}/${prog.max} XP` : 'MAX';
}

// ── CELEBRATE ─────────────────────────────────────────────────
function celebrate() {
  const container = document.getElementById('celebration');
  const colors = ['#30D158','#FF6B6B','#FF9500','#007AFF','#AF52DE','#FFD60A'];
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `left:${Math.random()*100}%;top:-10px;background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation:confettiFall ${1.2+Math.random()*1.2}s ${Math.random()*0.4}s linear forwards;`;
    container.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

function burstCoins(fromEl) {
  const rect = fromEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const coins = ['💰','🪙','✨','💫'];
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className = 'coin';
    const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    const dist  = 60 + Math.random() * 50;
    el.style.cssText = `left:${cx-12}px;top:${cy-12}px;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;animation-delay:${i*0.04}s;`;
    el.textContent = coins[i % coins.length];
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ── LEVEL UP ──────────────────────────────────────────────────
function showLevelUp(lv) {
  let overlay = document.getElementById('levelup-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'levelup-overlay';
    overlay.className = 'levelup-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="levelup-card">
      <div class="levelup-emoji">${lv.emoji}</div>
      <div class="levelup-label">Level Up!</div>
      <div class="levelup-title">Lvl ${lv.n} — ${lv.name}</div>
      <div class="levelup-sub">Keep going, you're on a roll!</div>
      <button class="levelup-btn" onclick="document.getElementById('levelup-overlay').classList.remove('show')">Awesome! 🎉</button>
    </div>`;
  overlay.classList.add('show');
  celebrate();
}

// ── ACHIEVEMENT TOAST ─────────────────────────────────────────
function showAchievementToast(achievement) {
  const t = document.createElement('div');
  t.className = 'achievement-toast';
  t.innerHTML = `
    <div class="achievement-toast-icon">${achievement.emoji}</div>
    <div class="achievement-toast-body">
      <div class="achievement-toast-label">Achievement Unlocked</div>
      <div class="achievement-toast-title">${achievement.title}</div>
    </div>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 500);
  }, 3000);
}

// ── INSIGHTS ──────────────────────────────────────────────────
function buildInsightsScreen() {
  const exps  = monthExps();
  const total = exps.reduce((s, e) => s + e.amount, 0);
  const byCat = {};
  exps.forEach(e => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const month = new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  document.getElementById('insights-month').textContent = month;
  document.getElementById('insights-total').textContent = `€${total.toFixed(2)}`;
  document.getElementById('insights-budget').textContent = `of €${S.budget} budget`;

  const pct = Math.min(100, (total / S.budget) * 100);
  const bar = document.getElementById('insights-bar');
  bar.style.width = '0%';
  setTimeout(() => {
    bar.style.width = pct + '%';
    bar.className = 'progress-fill' + (pct >= 100 ? ' over' : pct >= 75 ? ' warn' : '');
  }, 100);

  let tip;
  if (!sorted.length) tip = 'No expenses yet this month. Start logging!';
  else {
    const top    = CATS.find(c => c.id === sorted[0][0]);
    const topPct = Math.round((sorted[0][1] / S.budget) * 100);
    tip = `Biggest spend: ${top ? top.icon + ' ' + top.label : sorted[0][0]} at €${sorted[0][1].toFixed(2)} — ${topPct}% of budget.`;
    tip += topPct > 30 ? ' Worth keeping an eye on!' : ' Totally reasonable 👍';
  }
  document.getElementById('insights-tip').textContent = tip;

  renderWeekChart();
  renderCatBreakdown(sorted, total);
}

function renderWeekChart() {
  const days = last7Days();
  const allExps = S.expenses || [];
  const today = todayKey();
  const db = dailyBudget();

  const totals = days.map(d => allExps.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0));
  const maxVal = Math.max(...totals, db, 1);

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  document.getElementById('week-chart-bars').innerHTML = days.map((d, i) => {
    const amt  = totals[i];
    const pct  = Math.max(3, (amt / maxVal) * 100);
    const isToday = d === today;
    const isOver  = amt > db && amt > 0;
    const dayLabel = DAY_LABELS[new Date(d + 'T12:00:00').getDay()];
    return `<div class="week-bar-col">
      <div class="week-bar-wrap">
        <div class="week-bar${isToday ? ' today' : ''}${isOver ? ' over' : ''}" style="height:${pct}%"></div>
      </div>
      <div class="week-bar-day${isToday ? ' today' : ''}">${dayLabel}</div>
    </div>`;
  }).join('');
}

function renderCatBreakdown(sorted, total) {
  const el = document.getElementById('cat-breakdown');
  if (!sorted.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>Log some expenses to see your breakdown!</p></div>`;
    return;
  }
  el.innerHTML = sorted.map(([catId, amt]) => {
    const cat = CATS.find(c => c.id === catId) || CATS[7];
    const pct = total > 0 ? Math.min(100, (amt / total) * 100) : 0;
    const col = CAT_COLORS[catId] || '#90A4AE';
    return `<div class="cat-insight-row">
      <div class="cat-insight-icon">${cat.icon}</div>
      <div class="cat-insight-info">
        <div class="cat-insight-name">${cat.label}</div>
        <div class="cat-insight-bar-wrap">
          <div class="cat-insight-bar">
            <div class="cat-insight-fill" style="width:${pct.toFixed(1)}%;background:${col}"></div>
          </div>
        </div>
      </div>
      <div style="text-align:right">
        <div class="cat-insight-amt">€${amt.toFixed(2)}</div>
        <div class="cat-insight-pct">${pct.toFixed(0)}%</div>
      </div>
    </div>`;
  }).join('');
}

// ── SETTINGS ──────────────────────────────────────────────────
function buildSettingsScreen() {
  document.getElementById('set-income').value  = S.income;
  document.getElementById('set-budget').value  = S.budget;
  document.getElementById('settings-streak').textContent = `${S.streak || 0} days`;

  // Profile card
  const lv   = getLevel(S.xp || 0);
  const prog = getXpProgress(S.xp || 0);
  document.getElementById('profile-name').textContent  = S.name;
  document.getElementById('profile-level').textContent = `Level ${lv.n} · ${lv.name} ${lv.emoji}`;
  document.getElementById('profile-avatar-emoji').textContent = lv.emoji;
  document.getElementById('profile-xp-fill').style.width = prog.pct + '%';
  document.getElementById('profile-xp-text').textContent = prog.next ? `${prog.cur} / ${prog.max} XP` : 'MAX LEVEL';

  const unlocked = (S.achievements || []).length;
  document.getElementById('achievements-count').textContent = `${unlocked} of ${ACHIEVEMENTS.length} unlocked`;

  // Shield
  const wk = weekKey();
  const shield = S.streakShield || { available: true, weekKey: '' };
  const shieldAvail = shield.available && shield.weekKey !== wk;
  const shieldBtn = document.getElementById('btn-use-shield');
  if (shieldBtn) shieldBtn.textContent = shieldAvail ? 'Ready 🛡️' : 'Used this week';
}

function buildAchievementsOverlay() {
  const unlocked = S.achievements || [];
  document.getElementById('achievements-grid').innerHTML = ACHIEVEMENTS.map(a => {
    const done = unlocked.includes(a.id);
    return `<div class="achievement-cell ${done ? 'unlocked' : 'locked'}">
      <div class="achievement-emoji">${a.emoji}</div>
      <div class="achievement-title">${a.title}</div>
      <div class="achievement-desc">${a.desc}</div>
      <div class="achievement-status-badge">${done ? 'Unlocked ✓' : 'Locked'}</div>
    </div>`;
  }).join('');
}

function openAchievements() {
  buildAchievementsOverlay();
  const overlay = document.getElementById('achievements-overlay');
  overlay.style.display = 'flex';
  void overlay.offsetWidth;
  overlay.classList.add('open');
}

function closeAchievements() {
  const overlay = document.getElementById('achievements-overlay');
  overlay.classList.remove('open');
  setTimeout(() => { overlay.style.display = 'none'; }, 380);
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const income = parseFloat(document.getElementById('set-income').value);
  const budget = parseFloat(document.getElementById('set-budget').value);
  if (income > 0) S.income = income;
  if (budget > 0) S.budget = budget;
  save();
  showToast('Saved ✓');
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Delete all data and start over?')) {
    localStorage.removeItem(KEY);
    location.reload();
  }
});


// ── NAV ───────────────────────────────────────────────────────
function switchNav(tab) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'home')     { buildHomeScreen(); showScreen('screen-home'); }
  if (tab === 'insights') { buildInsightsScreen(); showScreen('screen-insights'); }
  if (tab === 'settings') { buildSettingsScreen(); showScreen('screen-settings'); }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchNav(btn.dataset.tab));
});

document.getElementById('fab').addEventListener('click', showAdd);
document.getElementById('btn-cancel-add').addEventListener('click', hideAdd);

// Close delete reveal when tapping elsewhere
document.addEventListener('click', e => {
  if (!e.target.closest('.expense-item')) {
    document.querySelectorAll('.expense-item.reveal-delete').forEach(i => i.classList.remove('reveal-delete'));
  }
});

// ── UTILS ─────────────────────────────────────────────────────
function animateNumber(id, target, prefix = '') {
  const el  = document.getElementById(id);
  const dur = 550;
  const t0  = performance.now();
  const step = now => {
    const p    = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + (target * ease).toFixed(2);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function shakeEl(el) {
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-8px)' },
    { transform: 'translateX(8px)' },
    { transform: 'translateX(-5px)' },
    { transform: 'translateX(5px)' },
    { transform: 'translateX(0)' },
  ], { duration: 340, easing: 'ease' });
}

let _toastTimer;
function showToast(msg) {
  let el = document.getElementById('__toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  clearTimeout(_toastTimer);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── BOOT ─────────────────────────────────────────────────────
load();

if (S.income) {
  buildHomeScreen();
  showScreen('screen-home');
  switchNav('home');
} else {
  initOnboard();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
