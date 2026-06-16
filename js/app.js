'use strict';

// ─── CATEGORIES ───────────────────────────────────────────────
const CATS = [
  { id: 'coffee',  label: 'Coffee',      icon: '☕' },
  { id: 'food',    label: 'Food',        icon: '🍔' },
  { id: 'grocery', label: 'Groceries',   icon: '🛒' },
  { id: 'drinks',  label: 'Going out',   icon: '🍻' },
  { id: 'transit', label: 'Transport',   icon: '🚌' },
  { id: 'sub',     label: 'Subscriptions', icon: '📱' },
  { id: 'shop',    label: 'Shopping',    icon: '🛍️' },
  { id: 'other',   label: 'Other',       icon: '💸' },
];

const CAT_COLORS = {
  coffee: '#C8956C', food: '#E07A5F', grocery: '#81B29A',
  drinks: '#6B7FD7', transit: '#64B5F6', sub: '#BA68C8',
  shop: '#F48FB1', other: '#90A4AE'
};

// ─── STATE ────────────────────────────────────────────────────
let S = {};

const KEY = 'buddi_v2';
const load = () => {
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { S = {}; }
};
const save = () => localStorage.setItem(KEY, JSON.stringify(S));

// ─── DATE HELPERS ─────────────────────────────────────────────
const todayKey  = () => new Date().toISOString().slice(0, 10);
const monthKey  = () => new Date().toISOString().slice(0, 7);
const dailyBudget = () => +(S.budget / 30).toFixed(2);

const todayExps = () => (S.expenses || []).filter(e => e.date === todayKey());
const monthExps = () => (S.expenses || []).filter(e => (e.date || '').startsWith(monthKey()));

// ─── SCREENS ──────────────────────────────────────────────────
let currentScreen = null;

function showScreen(id, slide = false) {
  const next = document.getElementById(id);
  if (currentScreen && currentScreen !== next) {
    currentScreen.classList.remove('active');
    if (!slide) currentScreen.classList.add('exit');
    setTimeout(() => { if (currentScreen) currentScreen.classList.remove('exit'); }, 300);
  }
  currentScreen = next;
  requestAnimationFrame(() => next.classList.add('active'));

  const fab = document.getElementById('fab');
  if (fab) fab.classList.toggle('hidden', id !== 'screen-home');
}

function showAdd() {
  document.getElementById('screen-add').style.display = 'flex';
  requestAnimationFrame(() => document.getElementById('screen-add').classList.add('active'));
  resetAdd();
  document.getElementById('fab').classList.add('hidden');
}
function hideAdd() {
  const el = document.getElementById('screen-add');
  el.classList.remove('active');
  setTimeout(() => { el.style.display = 'none'; }, 350);
  document.getElementById('fab').classList.remove('hidden');
}

// ─── ONBOARDING ───────────────────────────────────────────────
function initOnboard() {
  showScreen('screen-onboard');
}

document.getElementById('btn-start').addEventListener('click', () => {
  const income = parseFloat(document.getElementById('income-input').value);
  const name   = document.getElementById('name-input').value.trim() || 'friend';
  if (!income || income < 1) { shakeEl(document.getElementById('income-input')); return; }

  S = { income, name, budget: Math.round(income * 0.5), expenses: [], streak: 0, lastLog: null };
  save();
  buildSuggestScreen();
  showScreen('screen-suggest');
});

// ─── SUGGEST ──────────────────────────────────────────────────
function buildSuggestScreen() {
  const { income, name, budget } = S;
  document.getElementById('suggest-greeting').textContent = `Hey ${name}! 👋`;
  document.getElementById('suggest-msg').textContent =
    `Based on €${income.toLocaleString('nl-NL')} take-home, I'd suggest keeping spending to about €${budget.toLocaleString('nl-NL')} a month — that's 50%. The rest is yours to save or pay bills with.`;

  const rows = [
    { label: 'Spending',     pct: 50, color: '#4CAF82' },
    { label: 'Savings',      pct: 30, color: '#64B5F6' },
    { label: 'Bills / fixed', pct: 20, color: '#9CA3AF' },
  ];
  const el = document.getElementById('suggest-breakdown');
  el.innerHTML = rows.map(r => {
    const val = Math.round(income * r.pct / 100);
    return `
      <div class="breakdown-row">
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

// ─── HOME ─────────────────────────────────────────────────────
function buildHomeScreen() {
  updateStreak();
  const spent     = todayExps().reduce((s, e) => s + e.amount, 0);
  const mSpent    = monthExps().reduce((s, e) => s + e.amount, 0);
  const db        = dailyBudget();
  const dayLeft   = Math.max(0, db - spent);
  const pct       = Math.min(100, (mSpent / S.budget) * 100);

  document.getElementById('home-name').textContent = S.name;
  document.getElementById('home-date').textContent = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

  animateNumber('stat-spent-today', spent, '€');
  animateNumber('stat-left-today', dayLeft, '€');

  document.getElementById('month-label').textContent = `€${mSpent.toFixed(0)} of €${S.budget} this month`;
  const bar = document.getElementById('month-bar');
  bar.style.width = '0%';
  setTimeout(() => {
    bar.style.width = pct + '%';
    bar.className = 'progress-fill' + (pct >= 100 ? ' over' : pct >= 75 ? ' warn' : '');
  }, 50);

  // Buddy tip
  let tip;
  if (pct >= 100) tip = `You've hit your monthly limit — €${(mSpent - S.budget).toFixed(2)} over. No worries, just keep it light for the rest of the month 💪`;
  else if (spent > db) tip = `Today's a little over (€${(spent - db).toFixed(2)} over). Try going easy tomorrow to balance it out!`;
  else if (dayLeft < 5) tip = `Almost at today's limit! €${dayLeft.toFixed(2)} left for the day.`;
  else tip = `Daily budget: €${db.toFixed(2)} — you've spent €${spent.toFixed(2)} today. Looking good! 🎉`;
  document.getElementById('buddy-tip').textContent = tip;

  renderTodayExpenses();
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
    return `<div class="expense-item">
      <div class="expense-icon" style="background:${col}22">${cat.icon}</div>
      <div class="expense-info">
        <div class="expense-desc">${e.desc}</div>
        <div class="expense-cat">${cat.label}</div>
      </div>
      <div class="expense-amt">€${e.amount.toFixed(2)}</div>
    </div>`;
  }).join('');
}

// ─── ADD EXPENSE ──────────────────────────────────────────────
let amtStr = '';
let selectedCat = null;

function resetAdd() {
  amtStr = '';
  selectedCat = null;
  document.getElementById('exp-desc').value = '';
  renderAmt();
  buildCatChips();
}

function renderAmt() {
  const el = document.getElementById('amount-value');
  const display = amtStr === '' ? '0' : amtStr;
  el.textContent = display;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
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
  document.querySelectorAll('.cat-chip').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
}

// Numpad
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

  // Streak logic
  const spent    = todayExps().reduce((s, e) => s + e.amount, 0);
  const mSpent   = monthExps().reduce((s, e) => s + e.amount, 0);
  const dayOver  = spent > dailyBudget();
  const monOver  = mSpent > S.budget;

  if (!dayOver && !monOver) {
    if (S.lastLog !== today) S.streak = (S.streak || 0) + 1;
    S.lastLog = today;
  } else {
    if (S.streak > 0) S.streak = 0;
  }

  save();

  // Animations
  const saveBtn = document.getElementById('btn-save-expense');
  burstCoins(saveBtn);
  if (!dayOver && !monOver) setTimeout(() => bumpStreak(), 400);

  hideAdd();
  setTimeout(() => {
    buildHomeScreen();
    if (!dayOver && !monOver && S.streak > 0) celebrate();
  }, 350);
});

// ─── STREAK ───────────────────────────────────────────────────
function updateStreak() {
  const el   = document.getElementById('streak-badge');
  const num  = S.streak || 0;
  el.innerHTML = `<span class="streak-flame">🔥</span><span>${num}</span>`;
  if (num === 0) el.classList.add('streak-zero');
  else el.classList.remove('streak-zero');
}

function bumpStreak() {
  updateStreak();
  const el = document.getElementById('streak-badge');
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// ─── CELEBRATE ────────────────────────────────────────────────
function celebrate() {
  const container = document.getElementById('celebration');
  const colors = ['#4CAF82','#FF6B6B','#F5A623','#6B7FD7','#64B5F6','#F48FB1'];
  for (let i = 0; i < 48; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      top: -10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 6}px;
      height: ${6 + Math.random() * 6}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confettiFall ${1.2 + Math.random() * 1.2}s ${Math.random() * 0.4}s linear forwards;
    `;
    container.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

function burstCoins(fromEl) {
  const rect = fromEl.getBoundingClientRect();
  const cx   = rect.left + rect.width / 2;
  const cy   = rect.top  + rect.height / 2;
  const coins = ['💰','🪙','✨','💫'];
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className = 'coin';
    const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    const dist  = 60 + Math.random() * 50;
    el.style.cssText = `
      left: ${cx - 12}px; top: ${cy - 12}px;
      --tx: ${Math.cos(angle) * dist}px;
      --ty: ${Math.sin(angle) * dist}px;
      animation-delay: ${i * 0.04}s;
    `;
    el.textContent = coins[i % coins.length];
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ─── INSIGHTS ─────────────────────────────────────────────────
function buildInsightsScreen() {
  const exps   = monthExps();
  const total  = exps.reduce((s, e) => s + e.amount, 0);

  const byCat = {};
  exps.forEach(e => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const month  = new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  document.getElementById('insights-month').textContent = month;
  document.getElementById('insights-total').textContent = `€${total.toFixed(2)} spent`;
  document.getElementById('insights-budget').textContent = `of €${S.budget} budget`;

  const pct = Math.min(100, (total / S.budget) * 100);
  const bar = document.getElementById('insights-bar');
  bar.style.width = '0%';
  setTimeout(() => {
    bar.style.width = pct + '%';
    bar.className = 'progress-fill' + (pct >= 100 ? ' over' : pct >= 75 ? ' warn' : '');
  }, 100);

  // Tip
  let tip;
  if (!sorted.length) tip = "No expenses yet this month. Start logging!";
  else {
    const top = CATS.find(c => c.id === sorted[0][0]);
    const topPct = Math.round((sorted[0][1] / S.budget) * 100);
    tip = `Your biggest spend is ${top ? top.icon + ' ' + top.label : sorted[0][0]} at €${sorted[0][1].toFixed(2)} — that's ${topPct}% of your budget.`;
    if (topPct > 30) tip += " Worth keeping an eye on!";
    else tip += " Totally reasonable 👍";
  }
  document.getElementById('insights-tip').textContent = tip;

  const el = document.getElementById('cat-breakdown');
  if (!sorted.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>Log some expenses to see your breakdown!</p></div>`;
    return;
  }
  el.innerHTML = sorted.map(([catId, amt]) => {
    const cat = CATS.find(c => c.id === catId) || CATS[7];
    const pct = Math.min(100, (amt / total) * 100);
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

// ─── SETTINGS ─────────────────────────────────────────────────
function buildSettingsScreen() {
  document.getElementById('set-income').value = S.income;
  document.getElementById('set-budget').value = S.budget;
  document.getElementById('settings-streak').textContent = (S.streak || 0) + ' days';
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const income = parseFloat(document.getElementById('set-income').value);
  const budget = parseFloat(document.getElementById('set-budget').value);
  if (income > 0) S.income = income;
  if (budget > 0) S.budget = budget;
  save();
  showToast('Saved! 👍');
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Delete all data and start over?')) {
    localStorage.removeItem(KEY);
    location.reload();
  }
});

// ─── NAV ──────────────────────────────────────────────────────
function switchNav(tab) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'home') { buildHomeScreen(); showScreen('screen-home'); }
  if (tab === 'insights') { buildInsightsScreen(); showScreen('screen-insights'); }
  if (tab === 'settings') { buildSettingsScreen(); showScreen('screen-settings'); }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchNav(btn.dataset.tab));
});

document.getElementById('fab').addEventListener('click', showAdd);
document.getElementById('btn-cancel-add').addEventListener('click', hideAdd);

// ─── UTILS ────────────────────────────────────────────────────
function animateNumber(id, target, prefix = '') {
  const el    = document.getElementById(id);
  const start = 0;
  const dur   = 600;
  const t0    = performance.now();
  const step  = now => {
    const p = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val  = start + (target - start) * ease;
    el.textContent = prefix + val.toFixed(2);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function shakeEl(el) {
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-8px)' },
    { transform: 'translateX(8px)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(0)' },
  ], { duration: 350, easing: 'ease' });
}

function showToast(msg) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);
    background:#1A1A2E;color:#fff;padding:12px 20px;border-radius:99px;
    font-family:var(--font);font-weight:700;font-size:14px;
    opacity:0;transition:all 0.3s;z-index:300;white-space:nowrap;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
}

// ─── BOOT ─────────────────────────────────────────────────────
load();

if (S.income) {
  buildHomeScreen();
  showScreen('screen-home');
  switchNav('home');
} else {
  initOnboard();
}

// PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
