// ============================================================
// EF CLIENT PORTAL — APP LOGIC
// ============================================================

// ── STATE ──────────────────────────────────────────────────
const App = {
  currentClient: null,
  currentPage: 'client-list',
  enteredValues: {},
  reportData: null,
};

// ── UTILS ──────────────────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function fmtInput(n) {
  if (!n && n !== 0) return '';
  return Math.round(n).toLocaleString('en-US');
}

function parseAmt(s) {
  const n = parseFloat(String(s).replace(/[,$]/g, ''));
  return isNaN(n) ? null : n;
}

function getQuarter() {
  const d = new Date();
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calcAge(dob) {
  const now = new Date();
  const b = new Date(dob);
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
}

function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── CALCULATIONS ────────────────────────────────────────────
function calcSACS(client, vals) {
  const inflow = client.salary;
  const outflow = client.expenseBudget;
  const excess = inflow - outflow;
  const reserveBalance = parseAmt(vals['pinnacle_reserve']) || 0;
  const reserveTarget = (6 * client.expenseBudget) + client.insuranceDeductibles;
  const schwabBalance = parseAmt(vals['schwab_brokerage']) || 0;
  return { inflow, outflow, excess, reserveBalance, reserveTarget, schwabBalance };
}

function calcTCC(client, vals) {
  let ret_c1 = 0;
  (client.accounts.retirement_c1 || []).forEach((a, i) => {
    const v = parseAmt(vals[`ret_c1_${i}`]);
    if (v !== null) ret_c1 += v;
  });

  let ret_c2 = 0;
  (client.accounts.retirement_c2 || []).forEach((a, i) => {
    const v = parseAmt(vals[`ret_c2_${i}`]);
    if (v !== null) ret_c2 += v;
  });

  let nonRet = 0;
  (client.accounts.nonRetirement || []).forEach((a, i) => {
    const v = parseAmt(vals[`nonret_${i}`]);
    if (v !== null) nonRet += v;
  });

  const trust = parseAmt(vals['zillow_trust']) || 0;
  const grand = ret_c1 + ret_c2 + nonRet + trust;

  let liabilities = 0;
  (client.accounts.liabilities || []).forEach((a, i) => {
    const v = parseAmt(vals[`liability_${i}`]);
    if (v !== null) liabilities += v;
  });

  return { ret_c1, ret_c2, nonRet, trust, grand, liabilities };
}

// ── FIELD DEFINITIONS ───────────────────────────────────────
function getFields(client) {
  const fields = [];

  // Pinnacle Bank
  const pinnacle = client.accounts.pinnacle;
  fields.push({
    section: 'pinnacle', key: 'pinnacle_checking',
    label: `Checking ••••${pinnacle.checking.lastFour}`,
    last: pinnacle.checking.lastBalance
  });
  fields.push({
    section: 'pinnacle', key: 'pinnacle_reserve',
    label: `Private Reserve ••••${pinnacle.reserve.lastFour}`,
    last: pinnacle.reserve.lastBalance
  });

  // Schwab
  fields.push({
    section: 'schwab', key: 'schwab_brokerage',
    label: 'Schwab Investment Account',
    last: null
  });

  // Retirement C1
  (client.accounts.retirement_c1 || []).forEach((a, i) => {
    fields.push({
      section: 'schwab', key: `ret_c1_${i}`,
      label: `${a.type} ••••${a.lastFour} (${client.client1.name.split(' ')[0]})`,
      last: a.lastBalance
    });
  });

  // Retirement C2
  if (client.client2) {
    (client.accounts.retirement_c2 || []).forEach((a, i) => {
      fields.push({
        section: 'schwab', key: `ret_c2_${i}`,
        label: `${a.type} ••••${a.lastFour} (${client.client2.name.split(' ')[0]})`,
        last: a.lastBalance
      });
    });
  }

  // Non-retirement
  (client.accounts.nonRetirement || []).forEach((a, i) => {
    fields.push({
      section: 'schwab', key: `nonret_${i}`,
      label: `${a.type} ••••${a.lastFour}`,
      last: a.lastBalance
    });
  });

  // Zillow
  fields.push({
    section: 'zillow', key: 'zillow_trust',
    label: `Zestimate — ${client.accounts.trust.address}`,
    last: client.accounts.trust.lastZillow
  });

  // Liabilities
  (client.accounts.liabilities || []).forEach((a, i) => {
    fields.push({
      section: 'liabilities', key: `liability_${i}`,
      label: `${a.type} (${a.rate})`,
      last: a.lastBalance
    });
  });

  return fields;
}

function countFieldsReady(client) {
  const fields = getFields(client);
  let filled = 0;
  fields.forEach(f => {
    const v = App.enteredValues[f.key];
    if (v !== undefined && v !== '' && v !== null) filled++;
    else if (f.last !== null) filled++; // ghost value counts if not overridden
  });
  return { filled, total: fields.length };
}

// ── RENDER FUNCTIONS ────────────────────────────────────────
function renderClientList() {
  const container = document.querySelector('.client-grid');
  container.innerHTML = CLIENTS.map(c => `
    <div class="client-card" onclick="openClient('${c.id}')">
      <div class="client-info">
        <div class="client-name">${c.name}</div>
        <div class="client-meta">
          <span>${c.client2 ? 'Joint Client' : 'Individual'}</span>
          <span class="client-meta-dot"></span>
          <span>${(c.accounts.retirement_c1.length + c.accounts.retirement_c2.length)} retirement accounts</span>
          <span class="client-meta-dot"></span>
          <span>Inflow ${fmt(c.salary)}/mo</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span class="last-report-badge">
          <span class="dot"></span>
          Last report: ${formatDate(c.lastReport)}
        </span>
        <button class="client-cta" onclick="event.stopPropagation();openClient('${c.id}')">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L13 5.414V8a1 1 0 102 0V3a1 1 0 00-1-1H9z"/><path d="M3 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H3V7h3a1 1 0 000-2H3z"/></svg>
          Prepare ${getQuarter()} Report →
        </button>
      </div>
    </div>
  `).join('');
}

function openClient(id) {
  const client = CLIENTS.find(c => c.id === id);
  App.currentClient = client;
  App.enteredValues = {};
  navigateTo('data-entry');
  renderDataEntry(client);
}

function renderDataEntry(client) {
  // Header
  document.getElementById('de-client-name').textContent = client.name;
  document.getElementById('de-quarter').textContent = getQuarter() + ' Prep';

  // Render form sections
  renderFormSections(client);
  // Render preview
  updatePreview();
  updateProgress();
  updateGenerateBtn();

  // Fire live calcs
  const sacs = calcSACS(client, getEffectiveVals(client));
  const tcc = calcTCC(client, getEffectiveVals(client));
  const excess = sacs.inflow - sacs.outflow;
  const lce = document.getElementById('lc-excess');
  const lct = document.getElementById('lc-target');
  const lcn = document.getElementById('lc-networth');
  const lcl = document.getElementById('lc-liabilities');
  if (lce) lce.textContent = fmt(excess);
  if (lct) lct.textContent = fmt(sacs.reserveTarget);
  if (lcn) lcn.textContent = fmt(tcc.grand);
  if (lcl) lcl.textContent = fmt(tcc.liabilities);
}

function renderFormSections(client) {
  const form = document.getElementById('form-sections');

  const sections = [
    {
      id: 'static',
      icon: '📋',
      iconClass: 'static',
      label: 'Client Info',
      sublabel: 'Pre-filled from client profile',
      content: renderStaticSection(client),
    },
    {
      id: 'pinnacle',
      icon: '🏦',
      iconClass: 'bank',
      label: 'Pinnacle Bank',
      sublabel: 'Checking & Private Reserve balances',
      keys: ['pinnacle_checking', 'pinnacle_reserve'],
    },
    {
      id: 'schwab',
      icon: '📈',
      iconClass: 'schwab',
      label: 'Charles Schwab',
      sublabel: 'Investment & retirement account balances',
      keys: getFields(client).filter(f => f.section === 'schwab').map(f => f.key),
    },
    {
      id: 'zillow',
      icon: '🏡',
      iconClass: 'zillow',
      label: 'Zillow Zestimate',
      sublabel: client.accounts.trust.address,
      keys: ['zillow_trust'],
    },
    {
      id: 'liabilities',
      icon: '📉',
      iconClass: 'liabilities',
      label: 'Liabilities',
      sublabel: 'Mortgage, auto, and other balances',
      keys: getFields(client).filter(f => f.section === 'liabilities').map(f => f.key),
    },
  ];

  const allFields = getFields(client);

  form.innerHTML = sections.map(sec => {
    const secFields = allFields.filter(f => f.section === sec.id);
    const filledCount = sec.id === 'static' ? 'pre-filled' :
      secFields.filter(f => {
        const v = App.enteredValues[f.key];
        return (v !== undefined && v !== '' && v !== null) || f.last !== null;
      }).length;
    const totalCount = secFields.length;
    const isStatic = sec.id === 'static';

    let badge = '';
    if (isStatic) badge = `<span class="section-badge complete">Pre-filled</span>`;
    else if (filledCount === totalCount && totalCount > 0)
      badge = `<span class="section-badge complete">✓ Complete</span>`;
    else if (filledCount > 0)
      badge = `<span class="section-badge partial">${filledCount}/${totalCount}</span>`;
    else
      badge = `<span class="section-badge empty">${totalCount} fields</span>`;

    const isOpen = sec.id !== 'static';
    const content = isStatic ? sec.content : renderDynamicSection(secFields);

    return `
      <div class="form-section" id="sec-${sec.id}">
        <div class="section-header ${isOpen ? '' : 'collapsed'}" onclick="toggleSection('${sec.id}')">
          <div class="section-header-left">
            <div class="section-icon ${sec.iconClass}">${sec.icon}</div>
            <div>
              <div class="section-label">${sec.label}</div>
              <div class="section-sublabel">${sec.sublabel}</div>
            </div>
          </div>
          <div class="section-status">
            ${badge}
            <svg class="chevron" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
          </div>
        </div>
        <div class="section-body ${isOpen ? '' : 'hidden'}" id="body-${sec.id}">
          ${content}
        </div>
      </div>
    `;
  }).join('');

  // After rendering, show calcs in static section
  updateCalculatedFields();
}

function renderStaticSection(client) {
  const c1 = client.client1;
  const c2 = client.client2;
  return `
    <div class="field-group">
      <div class="field-group-title">Monthly Cash Flow (Static)</div>
      <div class="field-row">
        <div class="field-wrap">
          <div class="field-label">Monthly Inflow (Take-home)</div>
          <div class="field-input-wrap">
            <span class="field-prefix">$</span>
            <input class="field-input filled" value="${fmtInput(client.salary)}" readonly style="background:#f0f4ff;cursor:default">
          </div>
        </div>
        <div class="field-wrap">
          <div class="field-label">Monthly Expense Budget</div>
          <div class="field-input-wrap">
            <span class="field-prefix">$</span>
            <input class="field-input filled" value="${fmtInput(client.expenseBudget)}" readonly style="background:#f0f4ff;cursor:default">
          </div>
        </div>
      </div>
      <div class="calc-row">
        <span class="calc-label">Monthly Excess to Private Reserve</span>
        <span class="calc-value positive" id="calc-excess">${fmt(client.salary - client.expenseBudget)}</span>
      </div>
      <div class="calc-row">
        <span class="calc-label">Private Reserve Target (6mo + deductibles)</span>
        <span class="calc-value" id="calc-target">${fmt((6 * client.expenseBudget) + client.insuranceDeductibles)}</span>
      </div>
    </div>
    <div class="field-group">
      <div class="field-group-title">Client Info</div>
      <div class="field-row">
        <div class="field-wrap">
          <div class="field-label">${c2 ? 'Client 1' : 'Client'}</div>
          <input class="field-input filled" value="${c1.name} | DOB: ${c1.dob} | Age: ${calcAge(c1.dob)} | SSN ••••${c1.ssn}" readonly style="background:#f0f4ff;cursor:default;font-size:12px">
        </div>
        ${c2 ? `
        <div class="field-wrap">
          <div class="field-label">Client 2</div>
          <input class="field-input filled" value="${c2.name} | DOB: ${c2.dob} | Age: ${calcAge(c2.dob)} | SSN ••••${c2.ssn}" readonly style="background:#f0f4ff;cursor:default;font-size:12px">
        </div>` : ''}
      </div>
    </div>
  `;
}

function renderDynamicSection(fields) {
  return fields.map(f => `
    <div class="field-wrap" style="margin-top:14px">
      <div class="field-label">
        ${f.label}
        ${f.last !== null ? `
          <span class="last-val-pill" onclick="useLastVal('${f.key}', ${f.last})">
            <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            Use last: ${fmt(f.last)}
          </span>` : ''}
      </div>
      <div class="field-input-wrap">
        <span class="field-prefix">$</span>
        <input
          class="field-input"
          id="inp-${f.key}"
          type="text"
          inputmode="numeric"
          placeholder="${f.last !== null ? fmtInput(f.last) : '0'}"
          value="${App.enteredValues[f.key] !== undefined ? App.enteredValues[f.key] : ''}"
          oninput="onFieldInput('${f.key}', this.value)"
          onblur="onFieldBlur('${f.key}', this)"
        >
      </div>
    </div>
  `).join('');
}

function useLastVal(key, val) {
  App.enteredValues[key] = fmtInput(val);
  const input = document.getElementById(`inp-${key}`);
  if (input) {
    input.value = fmtInput(val);
    input.classList.add('filled');
    input.classList.remove('ghost');
  }
  onAfterInput();
}

function onFieldInput(key, val) {
  const raw = val.replace(/[,$]/g, '');
  App.enteredValues[key] = raw;
  const input = document.getElementById(`inp-${key}`);
  if (input) {
    input.classList.toggle('filled', raw !== '' && !isNaN(parseFloat(raw)));
    input.classList.remove('ghost');
  }
  onAfterInput();
}

function onFieldBlur(key, input) {
  const val = parseAmt(input.value);
  if (val !== null) {
    App.enteredValues[key] = fmtInput(val);
    input.value = fmtInput(val);
    input.classList.add('filled');
  }
  onAfterInput();
}

function onAfterInput() {
  updateProgress();
  updatePreview();
  updateCalculatedFields();
  updateSectionBadges();
  updateGenerateBtn();
}

function updateCalculatedFields() {
  // already shown statically; called for future real-time update hooks
}

function updateSectionBadges() {
  if (!App.currentClient) return;
  const client = App.currentClient;
  const allFields = getFields(client);

  ['pinnacle', 'schwab', 'zillow', 'liabilities'].forEach(secId => {
    const secEl = document.getElementById(`sec-${secId}`);
    if (!secEl) return;
    const secFields = allFields.filter(f => f.section === secId);
    const filledCount = secFields.filter(f => {
      const v = App.enteredValues[f.key];
      return (v !== undefined && v !== '' && v !== null) || f.last !== null;
    }).length;
    const totalCount = secFields.length;
    const badge = secEl.querySelector('.section-badge');
    if (!badge) return;
    if (filledCount === totalCount && totalCount > 0) {
      badge.className = 'section-badge complete';
      badge.textContent = '✓ Complete';
    } else if (filledCount > 0) {
      badge.className = 'section-badge partial';
      badge.textContent = `${filledCount}/${totalCount}`;
    } else {
      badge.className = 'section-badge empty';
      badge.textContent = `${totalCount} fields`;
    }
  });
}

function toggleSection(id) {
  const header = document.querySelector(`#sec-${id} .section-header`);
  const body = document.getElementById(`body-${id}`);
  if (!header || !body) return;
  const isCollapsed = header.classList.contains('collapsed');
  header.classList.toggle('collapsed', !isCollapsed);
  body.classList.toggle('hidden', !isCollapsed);
}

function updateProgress() {
  if (!App.currentClient) return;
  const fields = getFields(App.currentClient);
  let filled = 0;
  fields.forEach(f => {
    const v = App.enteredValues[f.key];
    if ((v !== undefined && v !== '' && v !== null) || f.last !== null) filled++;
  });
  const pct = fields.length ? Math.round((filled / fields.length) * 100) : 0;
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct + '%';
}

function getEffectiveVal(key, client) {
  const entered = App.enteredValues[key];
  if (entered !== undefined && entered !== '' && entered !== null) {
    return parseAmt(entered);
  }
  // Fall back to last value
  const fields = getFields(client);
  const f = fields.find(f => f.key === key);
  return f && f.last !== null ? f.last : null;
}

function getEffectiveVals(client) {
  const vals = {};
  getFields(client).forEach(f => {
    vals[f.key] = getEffectiveVal(f.key, client) || 0;
  });
  return vals;
}

function updatePreview() {
  if (!App.currentClient) return;
  const client = App.currentClient;
  const vals = getEffectiveVals(client);
  const sacs = calcSACS(client, vals);
  renderSACSPreview(sacs, client);
}

function renderSACSPreview(sacs, client) {
  const container = document.getElementById('sacs-live-preview');
  if (!container) return;
  const excess = sacs.inflow - sacs.outflow;
  container.innerHTML = `
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" font-family="Inter,sans-serif">
      <!-- Inflow -->
      <circle cx="58" cy="100" r="50" fill="#E8F5E9" stroke="#4CAF50" stroke-width="2.5"/>
      <text x="58" y="88" text-anchor="middle" font-size="7.5" font-weight="700" fill="#2E7D32" letter-spacing="0.5">INFLOW</text>
      <text x="58" y="102" text-anchor="middle" font-size="12" font-weight="700" fill="#1B2A4A">${fmt(sacs.inflow)}</text>
      <text x="58" y="113" text-anchor="middle" font-size="7" fill="#5A6A82">monthly</text>

      <!-- Arrow 1 -->
      <line x1="108" y1="100" x2="130" y2="100" stroke="#4CAF50" stroke-width="2"/>
      <polygon points="130,96 138,100 130,104" fill="#4CAF50"/>

      <!-- Outflow -->
      <circle cx="180" cy="100" r="50" fill="#FFEBEE" stroke="#E53935" stroke-width="2.5"/>
      <text x="180" y="88" text-anchor="middle" font-size="7.5" font-weight="700" fill="#C62828" letter-spacing="0.5">OUTFLOW</text>
      <text x="180" y="102" text-anchor="middle" font-size="12" font-weight="700" fill="#1B2A4A">${fmt(sacs.outflow)}</text>
      <text x="180" y="113" text-anchor="middle" font-size="7" fill="#5A6A82">monthly</text>

      <!-- Arrow 2 -->
      <line x1="230" y1="100" x2="250" y2="100" stroke="#1E88E5" stroke-width="2"/>
      <polygon points="250,96 258,100 250,104" fill="#1E88E5"/>
      <text x="240" y="94" text-anchor="middle" font-size="7" fill="#1565C0">+${fmt(excess)}</text>

      <!-- Reserve -->
      <circle cx="292" cy="100" r="28" fill="#E3F2FD" stroke="#1E88E5" stroke-width="2"/>
      <text x="292" y="94" text-anchor="middle" font-size="6" font-weight="700" fill="#1565C0">RESERVE</text>
      <text x="292" y="105" text-anchor="middle" font-size="9" font-weight="700" fill="#1B2A4A">${fmt(sacs.reserveBalance)}</text>

      <!-- Label -->
      <text x="160" y="180" text-anchor="middle" font-size="8" fill="#8A99AD">${client.name} · ${getQuarter()}</text>
    </svg>
  `;
}

function updateGenerateBtn() {
  const btn = document.getElementById('generate-btn');
  const rem = document.getElementById('fields-remaining');
  if (!btn || !App.currentClient) return;
  // All fields must have a value (entered or last)
  const fields = getFields(App.currentClient);
  const missing = fields.filter(f => {
    const v = App.enteredValues[f.key];
    if (v !== undefined && v !== '' && v !== null) return false;
    if (f.last !== null) return false;
    return true;
  });
  const ready = missing.length === 0;
  btn.disabled = !ready;
  if (rem) {
    rem.textContent = ready
      ? 'All fields ready✓ Click to generate'
      : `${missing.length} field${missing.length > 1 ? 's' : ''} still needed`;
  }
}

// ── GENERATE REPORT ─────────────────────────────────────────
function generateReport() {
  const client = App.currentClient;
  const vals = getEffectiveVals(client);
  const sacs = calcSACS(client, vals);
  const tcc = calcTCC(client, vals);
  App.reportData = { client, vals, sacs, tcc };
  renderReportPage(client, sacs, tcc, vals);
  navigateTo('report');
  showToast('✓ Reports generated! ready to download');
}

function renderReportPage(client, sacs, tcc, vals) {
  renderSACSReport(client, sacs);
  renderTCCReport(client, tcc, vals);
  document.getElementById('report-client-name').textContent = client.name + ' : ' + getQuarter();
}

function renderSACSReport(client, sacs) {
  const el = document.getElementById('sacs-report');
  const excess = sacs.inflow - sacs.outflow;
  el.innerHTML = `
    <div class="report-header">
      <div>
        <div class="report-firm-name">Windbrook Solutions</div>
        <div class="report-client-name">${client.name}</div>
      </div>
      <div class="report-date-badge">
        Simple Automated Cash Flow System<br>
        ${getQuarter()} · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>

    <div class="report-title">Monthly Cash Flow Overview</div>

    <div class="sacs-diagram">
      <div class="sacs-node">
        <div class="sacs-circle inflow">
          <div class="sacs-circle-label">Inflow</div>
          <div class="sacs-circle-amount">${fmt(sacs.inflow)}</div>
          <div class="sacs-circle-sub">take-home / mo</div>
        </div>
        <div class="sacs-node-label">Pinnacle Checking</div>
      </div>

      <div class="sacs-arrow">
        <div class="sacs-arrow-line green"></div>
        <div class="sacs-arrow-label">expense transfer</div>
      </div>

      <div class="sacs-node">
        <div class="sacs-circle outflow">
          <div class="sacs-circle-label">Outflow</div>
          <div class="sacs-circle-amount">${fmt(sacs.outflow)}</div>
          <div class="sacs-circle-sub">agreed budget / mo</div>
        </div>
        <div class="sacs-node-label">Pinnacle Spending</div>
      </div>

      <div class="sacs-arrow">
        <div class="sacs-arrow-line blue"></div>
        <div class="sacs-arrow-label">excess ${fmt(excess)}</div>
      </div>

      <div class="sacs-node">
        <div class="sacs-circle reserve">
          <div class="sacs-circle-label">Private Reserve</div>
          <div class="sacs-circle-amount">${fmt(sacs.reserveBalance)}</div>
          <div class="sacs-circle-sub">current balance</div>
        </div>
        <div class="sacs-node-label">High-Yield Savings</div>
      </div>
    </div>

    <div class="sacs-detail-row">
      <div class="sacs-detail-box">
        <div class="sacs-detail-box-label">Monthly Excess</div>
        <div class="sacs-detail-box-value" style="color:var(--sage)">${fmt(excess)}</div>
        <div class="sacs-detail-box-sub">Inflow minus Outflow</div>
      </div>
      <div class="sacs-detail-box">
        <div class="sacs-detail-box-label">Private Reserve Balance</div>
        <div class="sacs-detail-box-value">${fmt(sacs.reserveBalance)}</div>
        <div class="sacs-detail-box-sub">Pinnacle ••••${client.accounts.pinnacle.reserve.lastFour}</div>
      </div>
      <div class="sacs-detail-box">
        <div class="sacs-detail-box-label">Reserve Target</div>
        <div class="sacs-detail-box-value">${fmt(sacs.reserveTarget)}</div>
        <div class="sacs-detail-box-sub">6 months + deductibles</div>
      </div>
      <div class="sacs-detail-box">
        <div class="sacs-detail-box-label">Schwab Investment</div>
        <div class="sacs-detail-box-value">${fmt(sacs.schwabBalance)}</div>
        <div class="sacs-detail-box-sub">Brokerage balance</div>
      </div>
    </div>
  `;
}

function renderTCCReport(client, tcc, vals) {
  const el = document.getElementById('tcc-report');
  const c1 = client.client1;
  const c2 = client.client2;

  const retC1Bubbles = (client.accounts.retirement_c1 || []).map((a, i) => `
    <div class="tcc-bubble retirement">
      <div class="tcc-bubble-type">${a.type}</div>
      <div class="tcc-bubble-last4">••••${a.lastFour}</div>
      <div class="tcc-bubble-amount">${fmt(vals[`ret_c1_${i}`] || a.lastBalance)}</div>
    </div>
  `).join('');

  const retC2Bubbles = c2 ? (client.accounts.retirement_c2 || []).map((a, i) => `
    <div class="tcc-bubble retirement">
      <div class="tcc-bubble-type">${a.type}</div>
      <div class="tcc-bubble-last4">••••${a.lastFour}</div>
      <div class="tcc-bubble-amount">${fmt(vals[`ret_c2_${i}`] || a.lastBalance)}</div>
    </div>
  `).join('') : '';

  const nonRetBubbles = (client.accounts.nonRetirement || []).map((a, i) => `
    <div class="tcc-bubble non-retirement">
      <div class="tcc-bubble-type">${a.type}</div>
      <div class="tcc-bubble-last4">••••${a.lastFour}</div>
      <div class="tcc-bubble-amount">${fmt(vals[`nonret_${i}`] || a.lastBalance)}</div>
    </div>
  `).join('');

  const liabilityBubbles = (client.accounts.liabilities || []).map((a, i) => `
    <div class="tcc-bubble liability">
      <div class="tcc-bubble-type">${a.type}</div>
      <div class="tcc-bubble-last4">${a.rate} interest</div>
      <div class="tcc-bubble-amount" style="color:var(--red-soft)">${fmt(vals[`liability_${i}`] || a.lastBalance)}</div>
    </div>
  `).join('');

  el.innerHTML = `
    <div class="report-header">
      <div>
        <div class="report-firm-name">Windbrook Solutions</div>
        <div class="report-client-name">${client.name}</div>
      </div>
      <div class="report-date-badge">
        Total Client Chart<br>
        ${getQuarter()} · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>

    <div class="report-title">Net Worth Overview</div>

    <!-- Retirement -->
    <div class="tcc-section">
      <div class="tcc-section-title">Retirement Accounts</div>
      ${retC1Bubbles || retC2Bubbles ? `
        <div class="tcc-client-header">
          <span class="tcc-client-pill c1">${c1.name.split(' ')[0]} — Age ${calcAge(c1.dob)} · ••••${c1.ssn}</span>
        </div>
        <div class="tcc-bubbles">${retC1Bubbles}</div>
        ${c2 ? `
          <div class="tcc-client-header" style="margin-top:12px">
            <span class="tcc-client-pill c2">${c2.name.split(' ')[0]} — Age ${calcAge(c2.dob)} · ••••${c2.ssn}</span>
          </div>
          <div class="tcc-bubbles">${retC2Bubbles}</div>
        ` : ''}
        <div class="tcc-total-row">
          ${c2 ? `
          <div class="tcc-total-box light">
            <div class="tcc-total-label">${c1.name.split(' ')[0]} Retirement</div>
            <div class="tcc-total-value">${fmt(tcc.ret_c1)}</div>
          </div>
          <div class="tcc-total-box light">
            <div class="tcc-total-label">${c2.name.split(' ')[0]} Retirement</div>
            <div class="tcc-total-value">${fmt(tcc.ret_c2)}</div>
          </div>` : ''}
          <div class="tcc-total-box">
            <div class="tcc-total-label">Total Retirement</div>
            <div class="tcc-total-value">${fmt(tcc.ret_c1 + tcc.ret_c2)}</div>
          </div>
        </div>
      ` : '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">No retirement accounts</div>'}
    </div>

    <!-- Non-Retirement -->
    <div class="tcc-section">
      <div class="tcc-section-title">Non-Retirement Accounts</div>
      <div class="tcc-client-header">
        <span class="tcc-client-pill joint">Joint Accounts</span>
      </div>
      <div class="tcc-bubbles">${nonRetBubbles}</div>
      <div class="tcc-total-row">
        <div class="tcc-total-box light">
          <div class="tcc-total-label">Non-Retirement Total</div>
          <div class="tcc-total-value">${fmt(tcc.nonRet)}</div>
        </div>
      </div>
    </div>

    <!-- Trust -->
    <div class="tcc-section">
      <div class="tcc-section-title">Trust / Real Estate</div>
      <div class="tcc-bubbles">
        <div class="tcc-bubble trust">
          <div class="tcc-bubble-type">Primary Residence</div>
          <div class="tcc-bubble-last4">${client.accounts.trust.address}</div>
          <div class="tcc-bubble-amount" style="color:var(--amber)">${fmt(tcc.trust)}</div>
        </div>
      </div>
    </div>

    <!-- Grand Total -->
    <div class="tcc-total-row" style="margin-bottom:28px">
      <div class="tcc-total-box" style="background:var(--navy)">
        <div class="tcc-total-label">Grand Total Net Worth</div>
        <div class="tcc-total-value" style="font-size:26px">${fmt(tcc.grand)}</div>
      </div>
    </div>

    <!-- Liabilities -->
    <div class="tcc-section">
      <div class="tcc-section-title">Liabilities (not subtracted from net worth)</div>
      <div class="tcc-bubbles">${liabilityBubbles}</div>
      <div class="tcc-total-row">
        <div class="tcc-total-box light" style="border-left:3px solid var(--red-soft)">
          <div class="tcc-total-label">Total Liabilities</div>
          <div class="tcc-total-value" style="color:var(--red-soft)">${fmt(tcc.liabilities)}</div>
        </div>
      </div>
    </div>
  `;
}

// ── DOWNLOAD PDF ─────────────────────────────────────────────
function downloadSACS() {
  const el = document.getElementById('sacs-report');
  const opt = {
    margin: 0.3,
    filename: `SACS_${App.currentClient.name.replace(/\s+/g, '_')}_${getQuarter().replace(' ', '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
  };
  showToast('⬇ Generating SACS PDF...');
  html2pdf().set(opt).from(el).save();
}

function downloadTCC() {
  const el = document.getElementById('tcc-report');
  const opt = {
    margin: 0.3,
    filename: `TCC_${App.currentClient.name.replace(/\s+/g, '_')}_${getQuarter().replace(' ', '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  showToast('⬇ Generating TCC PDF...');
  html2pdf().set(opt).from(el).save();
}

function downloadBoth() {
  downloadSACS();
  setTimeout(downloadTCC, 1500);
}

// ── NAVIGATION ───────────────────────────────────────────────
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');
  App.currentPage = pageId;
  window.scrollTo(0, 0);
}

function switchReportTab(tab) {
  document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.report-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`content-${tab}`).classList.add('active');
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderClientList();
  navigateTo('client-list');
  // Set quarter in topbar
  const q = document.getElementById('topbar-quarter');
  if (q) q.textContent = getQuarter();
});
