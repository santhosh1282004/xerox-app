/**
 * Sri Sakthi Xerox - Lightweight Vanilla JavaScript Client
 * Zero heavy frameworks. Optimized for low-spec hardware (Intel 3rd Gen, 8GB RAM).
 */

const state = {
  activePage: 'income',
  income: {
    page: 1,
    perPage: 10,
    search: '',
    startDate: '',
    endDate: '',
    minAmt: '',
    maxAmt: '',
    sortBy: 'time',
    sortOrder: 'desc',
    paymentMethods: ['Cash', 'UPI', 'Card'],
    paymentStatus: '',
    categories: ['Xerox Services', 'Product Sales', 'Combo Services']
  },
  spending: {
    page: 1,
    perPage: 10,
    search: '',
    categories: ['Stationery Items', 'Paper', 'Photo Sheets', 'Spirals', 'Service Charges', 'Toner / Ink', 'EB Bill', 'Shop Rent'],
    minAmt: '',
    maxAmt: '',
    startDate: '',
    endDate: '',
    paymentMethods: ['Cash', 'UPI', 'Card'],
    sortBy: 'time',
    sortOrder: 'desc'
  },
  analysis: {
    preset: 'custom',
    startDate: '',
    endDate: '',
    trajectoryMode: 'weekly',
    activeChartMetrics: ['profit', 'spend', 'revenue'],
    spendingChartMode: 'pie',
    spendingBarOffset: 0,
    rawTrajectory: null,
    rawSpendingBreakdown: null,
    streams: ['Xerox Services', 'Product Sales', 'Combo Services'],
    velocityPeriod: 'daily',
    rawVelocity: null,
    spoolYear: '2026',
    spoolFilterDay: '',
    spoolSearch: '',
    spoolPage: 1,
    spoolPerPage: 10,
    spoolData: null
  },
  catalogSort: 'default',
  catalogSearch: '',
  catalogCategories: ['Xerox Services', 'Product Sales'],
  settings: null,
  products: [],
  editingBillItemIndex: null,
  billItems: [],
  recycle: {
    category: 'income',
    page: 1,
    perPage: 10,
    search: ''
  }
};

// =========================================================================
// 0. SHOP SETTINGS & LIVE BRANDING SYNC
// =========================================================================
async function loadShopSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const s = await res.json();
    state.settings = s;
    applyShopSettingsToUI();
  } catch (err) {
    console.error("Could not load shop settings", err);
  }
}

function applyShopSettingsToUI() {
  const s = state.settings;
  if (!s) return;

  // 1. Sidebar Brand Details (Render uploaded brand logo design)
  const sideName = document.getElementById('sidebar-shop-name');
  if (sideName) {
    sideName.innerHTML = `<img src="/static/img/sri_sakthi_logo.png" alt="${s.shop_name || 'Sri Sakthi Xerox'}" class="h-28 w-auto max-w-full object-contain drop-shadow-xs select-none" />`;
  }

  // 2. Billing Modal Receipt Preview Header (Render uploaded brand logo design)
  const prevLogo = document.getElementById('preview-shop-logo');
  const prevName = document.getElementById('preview-shop-name');
  const prevAddr = document.getElementById('preview-shop-address');
  const prevPhone = document.getElementById('preview-shop-phone');
  if (prevLogo) {
    prevLogo.src = '/static/img/sri_sakthi_logo.png';
  }
  if (prevName) {
    prevName.classList.add('hidden');
  }
  if (prevAddr && s.address) prevAddr.textContent = s.address;
  if (prevPhone && s.phone) {
    prevPhone.textContent = `Ph: ${s.phone}${s.gst_number ? ' | GST: ' + s.gst_number : ''}`;
  }
}

// =========================================================================
// 1. PAGE NAVIGATION & HEADER CONTROL
// =========================================================================
function showPage(pageId) {
  state.activePage = pageId;
  const pages = ['income', 'spending', 'analysis', 'settings', 'recycle'];
  pages.forEach(p => {
    const pageEl = document.getElementById(`page-${p}`);
    const navEl = document.getElementById(`nav-${p}`);
    if (pageEl && navEl) {
      if (p === pageId) {
        pageEl.classList.remove('hidden');
        navEl.className = 'w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-headline text-[13.5px] font-semibold transition-all duration-150 bg-indigo-50 text-indigo-700 shadow-xs';
      } else {
        pageEl.classList.add('hidden');
        navEl.className = 'w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-headline text-[13.5px] font-medium transition-all duration-150 text-slate-600 hover:text-slate-900 hover:bg-slate-50';
      }
    }
  });

  const headerTitle = document.getElementById('header-title');
  const headerSubtitle = document.getElementById('header-subtitle');
  const contextActions = document.getElementById('header-context-actions');

  if (pageId === 'income') {
    headerTitle.textContent = 'Income & Billing';
    headerSubtitle.textContent = 'Record transactions, manage customer payments, and generate bills.';
    contextActions.innerHTML = `
      <button onclick="openModal('modal-add-income')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-700 text-white font-headline text-[13px] font-semibold hover:bg-indigo-800 transition-all shadow-sm active:scale-[0.98]">
        <span class="material-symbols-outlined text-[18px]">add</span>
        <span>Add Income</span>
      </button>
      <button onclick="openModal('modal-create-bill')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-headline text-[13px] font-semibold hover:bg-indigo-100 transition-all active:scale-[0.98]">
        <span class="material-symbols-outlined text-[18px]">receipt</span>
        <span>Generate Bill</span>
      </button>
    `;
    loadTodaySummary();
    loadIncomeRecords();
  } else if (pageId === 'spending') {
    headerTitle.textContent = 'Spending Details';
    headerSubtitle.textContent = 'Track shop expenses and monitor operating costs.';
    contextActions.innerHTML = `
      <button onclick="openModal('modal-add-spending')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white font-headline text-[13px] font-semibold hover:bg-rose-700 transition-all shadow-sm active:scale-[0.98]">
        <span class="material-symbols-outlined text-[18px]">add</span>
        <span>Add Spending</span>
      </button>
    `;
    loadSpendingSummary();
    loadSpendingRecords();
  } else if (pageId === 'analysis') {
    headerTitle.textContent = 'Income Analysis';
    headerSubtitle.textContent = 'Comprehensive revenue, expense velocity, and spool telemetry.';
    contextActions.innerHTML = `
      <button onclick="exportFiscalCSV()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-headline text-[13px] font-semibold hover:bg-indigo-100 transition-all active:scale-[0.98]">
        <span class="material-symbols-outlined text-[18px]">download</span>
        <span>Export Analytics</span>
      </button>
    `;
    loadAnalysisData();
  } else if (pageId === 'settings') {
    headerTitle.textContent = 'Products & Settings';
    headerSubtitle.textContent = 'Manage product catalog, Product IDs, service pricing, and shop configuration.';
    contextActions.innerHTML = '';
    loadProductsCatalog();
    loadSettingsPage();
  } else if (pageId === 'recycle') {
    headerTitle.textContent = 'Recycle Bin';
    headerSubtitle.textContent = 'Safely review and manage deleted income and spending records. All original data is preserved.';
    contextActions.innerHTML = `
      <button onclick="refreshRecycleBin()" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-headline text-[13px] font-semibold hover:bg-indigo-100 transition-all active:scale-[0.98]">
        <span class="material-symbols-outlined text-[18px]">refresh</span>
        <span>Refresh Bin</span>
      </button>
    `;
    loadRecycleBinRecords();
    updateRecycleBadge();
  }
}

// =========================================================================
// 2. MODAL & DROPDOWN CONTROLS
// =========================================================================
function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isHidden = el.classList.contains('hidden');
  document.querySelectorAll('[id^="popover-"]').forEach(p => p.classList.add('hidden'));
  if (isHidden) el.classList.remove('hidden');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('[id^="popover-"]') && !e.target.closest('button[onclick^="toggleDropdown"]')) {
    document.querySelectorAll('[id^="popover-"]').forEach(p => p.classList.add('hidden'));
  }
});

function openModal(id) {
  if (id === 'modal-add-income' || id === 'modal-income-form') {
    openAddIncome();
    return;
  }
  if (id === 'modal-edit-income') {
    const modal = document.getElementById('modal-income-form');
    if (modal) modal.classList.remove('hidden');
    return;
  }

  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');

  if (id === 'modal-add-spending') {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const dateInput = document.getElementById('exp-date');
    if (dateInput) dateInput.value = now.toISOString().slice(0, 16);
  } else if (id === 'modal-create-bill') {
    cancelEditBillItem();
    loadShopSettings();
    loadProductsForBilling();
    renderBillItemsTable();
    calculateBillTotals();
    fetchNextBillNumber();
  } else if (id === 'modal-settings') {
    loadSettingsIntoModal();
  }
}

function closeModal(id) {
  if (id === 'modal-add-income' || id === 'modal-edit-income' || id === 'modal-income-form') {
    closeIncomeModal();
    return;
  }
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
  if (id === 'modal-create-bill') {
    cancelEditBillItem();
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px] text-${type === 'success' ? 'emerald-600' : (type === 'error' ? 'red-600' : 'indigo-600')}">${icon}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease-in';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// =========================================================================
// 3. TODAY'S SUMMARY METRICS & INCOME LOGIC
// =========================================================================
async function loadTodaySummary() {
  try {
    const res = await fetch('/api/summary/today');
    if (!res.ok) return;
    const data = await res.json();

    const todayIncEl = document.getElementById('today-income-val');
    if (todayIncEl) todayIncEl.textContent = `₹${data.today_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const pctEl = document.getElementById('today-income-pct');
    if (pctEl) {
      const arrow = data.is_increase ? 'arrow_upward' : 'arrow_downward';
      const color = data.is_increase ? 'text-emerald-600' : 'text-rose-600';
      pctEl.className = `text-[11px] font-mono ${color} font-semibold flex items-center gap-0.5 mt-0.5`;
      pctEl.innerHTML = `<span class="material-symbols-outlined text-[14px]">${arrow}</span> ${data.pct_vs_yesterday > 0 ? '+' : ''}${data.pct_vs_yesterday}% vs yesterday`;
    }

    const txCountEl = document.getElementById('today-tx-count');
    if (txCountEl) txCountEl.textContent = data.transactions_count;

    const pmSumEl = document.getElementById('today-pm-summary');
    if (pmSumEl) pmSumEl.textContent = data.payment_methods_summary;

    const billsCountEl = document.getElementById('today-bills-count');
    if (billsCountEl) billsCountEl.textContent = data.bills_count;

    const unpaidValEl = document.getElementById('unpaid-bills-val');
    if (unpaidValEl) {
      unpaidValEl.textContent = `₹${(data.unpaid_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    const unpaidCountEl = document.getElementById('unpaid-bills-count');
    if (unpaidCountEl) {
      const count = data.unpaid_count || 0;
      const countText = count === 1 ? '1 unpaid bill' : `${count} unpaid bills`;
      const dotColor = count > 0 ? 'bg-amber-500' : 'bg-slate-400';
      unpaidCountEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span><span>${countText}</span>`;
    }
  } catch (err) {
    console.error("Failed to load today's summary:", err);
  }
}

async function loadIncomeRecords() {
  const tbody = document.getElementById('income-table-body');
  if (!tbody) return;

  const params = new URLSearchParams({
    page: state.income.page,
    per_page: state.income.perPage,
    search: state.income.search,
    start_date: state.income.startDate,
    end_date: state.income.endDate,
    min_amt: state.income.minAmt,
    max_amt: state.income.maxAmt,
    sort_by: state.income.sortBy || 'time',
    sort_order: state.income.sortOrder || 'desc',
    payment_methods: (state.income.paymentMethods && state.income.paymentMethods.length > 0) ? state.income.paymentMethods.join(',') : '',
    payment_status: state.income.paymentStatus || '',
    categories: (state.income.categories && state.income.categories.length > 0) ? state.income.categories.join(',') : ''
  });

  try {
    const res = await fetch(`/api/income?${params.toString()}`);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();

    // Automatically update Unpaid Bills counter card if present in response
    if (data.unpaid_total !== undefined) {
      const unpaidValEl = document.getElementById('unpaid-bills-val');
      if (unpaidValEl) {
        unpaidValEl.textContent = `₹${Number(data.unpaid_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      }
      const unpaidCountEl = document.getElementById('unpaid-bills-count');
      if (unpaidCountEl) {
        const count = data.unpaid_count || 0;
        const countText = count === 1 ? '1 unpaid bill' : `${count} unpaid bills`;
        const dotColor = count > 0 ? 'bg-amber-500' : 'bg-slate-400';
        unpaidCountEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span><span>${countText}</span>`;
      }
    }

    if (data.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="py-8 text-center text-slate-400 font-body">
            No income transactions found for the current search/filters.
          </td>
        </tr>
      `;
      renderIncomePagination(0, 1, 1);
      return;
    }

    tbody.innerHTML = data.items.map(item => {
      const catClass = item.category === 'Xerox Services' ? 'bg-indigo-50 text-indigo-700' :
                       (item.category === 'Product Sales' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700');
      const payClass = item.payment_method === 'UPI' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                       (item.payment_method === 'Card' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700');
      const isPaid = (item.payment_status || 'Paid') === 'Paid';
      const statusBadge = isPaid
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 select-none cursor-default"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Paid</span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 select-none cursor-default"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Not Paid</span>`;

      return `
        <tr class="hover:bg-slate-50/60 transition-colors">
          <td class="py-3.5 px-4 font-mono text-slate-500 font-medium">#${item.tx_number}</td>
          <td class="py-3.5 px-4 text-slate-900">${formatDateTime(item.created_at)}</td>
          <td class="py-3.5 px-4 font-mono font-semibold text-indigo-700">
            ${item.bill_number ? `<button onclick="viewPrintBill('${item.bill_id}')" class="hover:underline">${item.bill_number}</button>` : '<span class="text-slate-400 font-normal">—</span>'}
          </td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${catClass}">${item.category}</span>
            <div class="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5" title="${item.description}">${item.description}</div>
          </td>
          <td class="py-3.5 px-4 text-right font-headline font-bold text-slate-900">₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold ${payClass}">${item.payment_method}</span>
          </td>
          <td class="py-3.5 px-4">
            ${statusBadge}
          </td>
          <td class="py-3.5 px-4 text-right">
            <div class="inline-flex items-center gap-1">
              ${item.bill_id ? `<button onclick="viewPrintBill('${item.bill_id}', false)" title="Print Invoice" class="p-1 text-slate-400 hover:text-indigo-700 rounded"><span class="material-symbols-outlined text-[18px]">print</span></button>` : ''}
              <button onclick="openEditIncome(${item.id})" title="Edit Transaction" class="p-1 text-slate-400 hover:text-indigo-700 rounded"><span class="material-symbols-outlined text-[18px]">edit</span></button>
              <button onclick="confirmDeleteIncome(${item.id}, '${item.tx_number}')" title="Delete" class="p-1 text-slate-400 hover:text-red-600 rounded"><span class="material-symbols-outlined text-[18px]">delete</span></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderIncomePagination(data.total_records, data.page, data.total_pages);
  } catch (err) {
    console.error("Failed to load income records:", err);
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-red-500 font-medium">Failed to load transactions. Check local server.</td></tr>`;
  }
}

function renderIncomePagination(total, page, totalPages) {
  const container = document.getElementById('income-pagination');
  if (!container) return;

  const startEntry = total === 0 ? 0 : (page - 1) * state.income.perPage + 1;
  const endEntry = Math.min(page * state.income.perPage, total);

  let pageButtons = '';
  for (let i = 1; i <= Math.min(5, totalPages); i++) {
    if (i === page) {
      pageButtons += `<button class="px-3 py-1 rounded-lg bg-indigo-700 text-white font-semibold text-[12px]">${i}</button>`;
    } else {
      pageButtons += `<button onclick="changeIncomePage(${i})" class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px]">${i}</button>`;
    }
  }

  container.innerHTML = `
    <span class="text-[12px] text-slate-500">Showing <strong class="text-slate-700">${startEntry} - ${endEntry}</strong> of <strong class="text-slate-700">${total}</strong> entries</span>
    <div class="flex items-center gap-1">
      <button onclick="changeIncomePage(${page - 1})" class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] disabled:opacity-40" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      ${pageButtons}
      <button onclick="changeIncomePage(${page + 1})" class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] disabled:opacity-40" ${page >= totalPages ? 'disabled' : ''}>Next</button>
    </div>
  `;
}

function changeIncomePage(newPage) {
  if (newPage < 1) return;
  state.income.page = newPage;
  loadIncomeRecords();
}

function formatDateTime(dtStr) {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dtStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month} ${day}, ${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return dtStr;
  }
}

// =========================================================================
// SHARED REUSABLE INCOME FORM ACTIONS (ADD & EDIT)
// =========================================================================
function calcIncomeFormTotal() {
  const rate = parseFloat(document.getElementById('inc-form-rate')?.value) || 0;
  const disc = parseFloat(document.getElementById('inc-form-disc')?.value) || 0;
  const total = Math.max(0, rate - disc);
  const display = document.getElementById('inc-form-total-display');
  if (display) display.textContent = `₹${total.toFixed(2)}`;
  return total;
}

function closeIncomeModal() {
  const modal = document.getElementById('modal-income-form');
  if (modal) modal.classList.add('hidden');
}

function toDatetimeLocal(str) {
  if (!str) return '';
  return str.replace(' ', 'T').substring(0, 16);
}

function openAddIncome() {
  const form = document.getElementById('income-shared-form');
  if (form) form.reset();

  document.getElementById('inc-form-id').value = '';

  const titleEl = document.getElementById('income-modal-title');
  if (titleEl) titleEl.textContent = 'New Income Entry';

  const iconEl = document.getElementById('income-modal-icon');
  if (iconEl) iconEl.textContent = 'add_circle';

  const badgeEl = document.getElementById('income-modal-tx-badge');
  if (badgeEl) {
    badgeEl.textContent = '';
    badgeEl.classList.add('hidden');
  }

  const submitLabel = document.getElementById('inc-form-submit-label');
  if (submitLabel) submitLabel.textContent = 'Save Income';

  // Set default datetime to now (local timezone)
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const dateInput = document.getElementById('inc-form-date');
  if (dateInput) dateInput.value = now.toISOString().slice(0, 16);

  // Defaults
  const rateEl = document.getElementById('inc-form-rate');
  if (rateEl) rateEl.value = '10';
  const discEl = document.getElementById('inc-form-disc');
  if (discEl) discEl.value = '0';
  const payEl = document.getElementById('inc-form-pay');
  if (payEl) payEl.value = 'Cash';
  const statusEl = document.getElementById('inc-form-status');
  if (statusEl) statusEl.value = 'Paid';
  const descEl = document.getElementById('inc-form-desc');
  if (descEl) descEl.value = '';
  const notesEl = document.getElementById('inc-form-notes');
  if (notesEl) notesEl.value = '';

  calcIncomeFormTotal();

  const modal = document.getElementById('modal-income-form');
  if (modal) modal.classList.remove('hidden');
}

async function openEditIncome(id) {
  try {
    const res = await fetch(`/api/income/${id}`);
    if (!res.ok) throw new Error("Could not fetch income transaction");
    const item = await res.json();

    const form = document.getElementById('income-shared-form');
    if (form) form.reset();

    document.getElementById('inc-form-id').value = item.id;

    const titleEl = document.getElementById('income-modal-title');
    if (titleEl) titleEl.textContent = 'Edit Income Entry';

    const iconEl = document.getElementById('income-modal-icon');
    if (iconEl) iconEl.textContent = 'edit_note';

    const badgeEl = document.getElementById('income-modal-tx-badge');
    if (badgeEl) {
      badgeEl.textContent = `${item.tx_number}${item.bill_number ? ' • Bill ' + item.bill_number : ''}`;
      badgeEl.classList.remove('hidden');
    }

    const submitLabel = document.getElementById('inc-form-submit-label');
    if (submitLabel) submitLabel.textContent = 'Update Income';

    const dateInput = document.getElementById('inc-form-date');
    if (dateInput) dateInput.value = toDatetimeLocal(item.created_at);

    const typeEl = document.getElementById('inc-form-type');
    if (typeEl) typeEl.value = item.category || 'Xerox Services';

    const descEl = document.getElementById('inc-form-desc');
    if (descEl) descEl.value = item.description || '';

    const rateEl = document.getElementById('inc-form-rate');
    const discountVal = typeof item.discount === 'number' ? item.discount : 0;
    const amountVal = typeof item.amount === 'number' ? item.amount : 0;
    if (rateEl) rateEl.value = (amountVal + discountVal).toFixed(2);

    const discEl = document.getElementById('inc-form-disc');
    if (discEl) discEl.value = discountVal.toFixed(2);

    const payEl = document.getElementById('inc-form-pay');
    if (payEl) payEl.value = item.payment_method || 'Cash';

    const statusEl = document.getElementById('inc-form-status');
    if (statusEl) statusEl.value = item.payment_status || 'Paid';

    const notesEl = document.getElementById('inc-form-notes');
    if (notesEl) notesEl.value = item.notes || '';

    calcIncomeFormTotal();

    const modal = document.getElementById('modal-income-form');
    if (modal) modal.classList.remove('hidden');
  } catch (err) {
    showToast("Error loading income details", "error");
  }
}

async function handleIncomeFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('inc-form-id').value;
  const isEdit = !!id;

  const category = document.getElementById('inc-form-type')?.value || 'Xerox Services';
  const description = document.getElementById('inc-form-desc')?.value.trim() || category;
  const discount = parseFloat(document.getElementById('inc-form-disc')?.value) || 0;
  const netAmount = calcIncomeFormTotal();
  const paymentMethod = document.getElementById('inc-form-pay')?.value || 'Cash';
  const paymentStatus = document.getElementById('inc-form-status')?.value || 'Paid';
  const notes = document.getElementById('inc-form-notes')?.value.trim() || '';
  const createdAt = document.getElementById('inc-form-date')?.value;

  const data = {
    created_at: createdAt,
    category: category,
    description: description,
    unit_rate: netAmount + discount,
    discount: discount,
    amount: netAmount,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    notes: notes
  };

  try {
    let res;
    if (isEdit) {
      res = await fetch(`/api/income/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      res = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Failed to ${isEdit ? 'update' : 'save'} income`);

    showToast(isEdit
      ? `Income transaction ${result.tx_number} updated (${paymentStatus})!`
      : `Income ${result.tx_number} (₹${result.amount.toFixed(2)}) saved!`);

    closeIncomeModal();
    loadTodaySummary();
    loadIncomeRecords();
  } catch (err) {
    showToast(err.message || `Error ${isEdit ? 'updating' : 'saving'} income record`, "error");
  }
}

function saveAndGenerateBillFromIncomeForm() {
  const category = document.getElementById('inc-form-type')?.value || 'Xerox Services';
  const desc = document.getElementById('inc-form-desc')?.value.trim() || category;
  const rate = calcIncomeFormTotal();

  closeIncomeModal();

  const custNameEl = document.getElementById('bill-cust-name');
  if (custNameEl) custNameEl.value = 'Walk-in Customer';
  const custPhoneEl = document.getElementById('bill-cust-phone');
  if (custPhoneEl) custPhoneEl.value = '';

  state.billItems = [{ name: desc, qty: 1, rate: rate, total: rate }];
  openModal('modal-create-bill');
}

// Backward-compatibility aliases
const calcIncomeTotal = calcIncomeFormTotal;
const handleIncomeSubmit = handleIncomeFormSubmit;
const saveAndGenerateBill = saveAndGenerateBillFromIncomeForm;
const calcEditIncomeTotal = calcIncomeFormTotal;
const handleEditIncomeSubmit = handleIncomeFormSubmit;

async function confirmDeleteIncome(id, txCode) {
  if (!confirm(`Are you sure you want to move transaction ${txCode} to the Recycle Bin? All original details and bill line items will be preserved.`)) return;

  try {
    const res = await fetch(`/api/income/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to move to Recycle Bin");
    const data = await res.json();
    showToast(data.message || `Transaction ${txCode} moved to Recycle Bin.`);
    loadTodaySummary();
    loadIncomeRecords();
    updateRecycleBadge();
  } catch (err) {
    showToast("Error moving transaction to Recycle Bin", "error");
  }
}

async function toggleIncomeStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/income/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: newStatus })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to update payment status");

    showToast(`Payment status set to ${newStatus}`);
    loadIncomeRecords();
    loadTodaySummary();
  } catch (err) {
    showToast("Error updating payment status", "error");
  }
}

// Income Filtering & Staging Helpers
function setupIncomeFilters() {
  const searchInput = document.getElementById('income-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyIncomeFilters();
      }
    });
  }
}

// Preset helper: sets dates in input fields without fetching
function setIncomeDatePreset(preset) {
  const today = new Date();
  const formatYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let start = '';
  let end = formatYMD(today);

  if (preset === 'today') {
    start = end;
  } else if (preset === '7days' || preset === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    start = formatYMD(d);
  } else if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    start = formatYMD(d);
  } else if (preset === 'all') {
    start = '';
    end = '';
  }

  const sEl = document.getElementById('filter-inc-start-date');
  const eEl = document.getElementById('filter-inc-end-date');
  if (sEl) sEl.value = start;
  if (eEl) eEl.value = end;
  updateIncomeFilterTriggerLabels();
}

function clearIncomeTimeInputs() {
  const sEl = document.getElementById('filter-inc-start-date');
  const eEl = document.getElementById('filter-inc-end-date');
  if (sEl) sEl.value = '';
  if (eEl) eEl.value = '';
  updateIncomeFilterTriggerLabels();
}

function applyIncomeTimeFilter() {
  applyIncomeFilters();
}

function clearIncomeTimeFilter() {
  clearIncomeTimeInputs();
  applyIncomeFilters();
}

// Amount presets helper: sets min/max in input fields without fetching
function setIncomeAmountRange(min, max) {
  const minEl = document.getElementById('filter-inc-min-amt');
  const maxEl = document.getElementById('filter-inc-max-amt');
  if (minEl) minEl.value = (min !== '' && min !== null && min !== undefined) ? min : '';
  if (maxEl) maxEl.value = (max !== '' && max !== null && max !== undefined) ? max : '';
  updateIncomeFilterTriggerLabels();
}

function clearIncomeAmountInputs() {
  const minEl = document.getElementById('filter-inc-min-amt');
  const maxEl = document.getElementById('filter-inc-max-amt');
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  updateIncomeFilterTriggerLabels();
}

function applyIncomeAmountFilter() {
  applyIncomeFilters();
}

function clearIncomeAmountFilter() {
  clearIncomeAmountInputs();
  applyIncomeFilters();
}

// Payment method helpers (Cash, UPI, Card)
function selectAllIncomePaymentModes(all) {
  ['filter-inc-pm-cash', 'filter-inc-pm-upi', 'filter-inc-pm-card'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = !!all;
  });
}

function applyIncomeTypeFilter() {
  applyIncomeFilters();
}

function toggleIncomeSort(by) {
  let newOrder = 'desc';
  if (state.income.sortBy === by) {
    newOrder = state.income.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    newOrder = 'desc';
  }
  state.income.sortBy = by;
  state.income.sortOrder = newOrder;
  syncIncomeSortUI();
  state.income.page = 1;
  loadIncomeRecords();
  const label = by === 'time'
    ? (newOrder === 'desc' ? 'Newest to Oldest' : 'Oldest to Newest')
    : (newOrder === 'desc' ? 'Highest to Lowest' : 'Lowest to Highest');
  showToast(`Sorted by ${label}`);
}

function syncIncomeSortUI() {
  const by = state.income.sortBy || 'time';
  const order = state.income.sortOrder || 'desc';

  // Table column headers sort indicators
  const colTime = document.getElementById('col-sort-inc-time');
  const colAmt = document.getElementById('col-sort-inc-amt');

  if (colTime) {
    if (by === 'time') {
      colTime.textContent = order === 'desc' ? 'arrow_downward' : 'arrow_upward';
      colTime.className = 'material-symbols-outlined text-[15px] text-indigo-600';
    } else {
      colTime.textContent = 'unfold_more';
      colTime.className = 'material-symbols-outlined text-[15px] text-slate-300';
    }
  }

  if (colAmt) {
    if (by === 'amount') {
      colAmt.textContent = order === 'desc' ? 'arrow_downward' : 'arrow_upward';
      colAmt.className = 'material-symbols-outlined text-[15px] text-indigo-600';
    } else {
      colAmt.textContent = 'unfold_more';
      colAmt.className = 'material-symbols-outlined text-[15px] text-slate-300';
    }
  }
}

// Master Apply for Income
function applyIncomeFilters() {
  // 1. Search
  const searchInput = document.getElementById('income-search');
  state.income.search = searchInput ? searchInput.value.trim() : '';

  // 2. Dates
  const startEl = document.getElementById('filter-inc-start-date');
  const endEl = document.getElementById('filter-inc-end-date');
  state.income.startDate = startEl ? startEl.value : '';
  state.income.endDate = endEl ? endEl.value : '';

  // 3. Amounts
  const minEl = document.getElementById('filter-inc-min-amt');
  const maxEl = document.getElementById('filter-inc-max-amt');
  state.income.minAmt = minEl ? minEl.value : '';
  state.income.maxAmt = maxEl ? maxEl.value : '';

  // 4. Payment Modes (Cash, UPI, Card)
  const payModes = [];
  ['Cash', 'UPI', 'Card'].forEach(pm => {
    const el = document.getElementById(`filter-inc-pm-${pm.toLowerCase()}`);
    if (el && el.checked) payModes.push(pm);
  });
  state.income.paymentMethods = payModes.length > 0 ? payModes : ['Cash', 'UPI', 'Card'];

  // 4b. Payment Status (All, Paid, Not Paid)
  const statusRadio = document.querySelector('input[name="filter-inc-status"]:checked');
  state.income.paymentStatus = statusRadio ? statusRadio.value : '';

  // 5. Categories
  const catChecks = [
    { id: 'filter-inc-cat-xerox', val: 'Xerox Services' },
    { id: 'filter-inc-cat-prod', val: 'Product Sales' },
    { id: 'filter-inc-cat-combo', val: 'Combo Services' }
  ];
  const cats = [];
  catChecks.forEach(c => {
    const el = document.getElementById(c.id);
    if (el && el.checked) cats.push(c.val);
  });
  state.income.categories = cats.length > 0 ? cats : ['Xerox Services', 'Product Sales', 'Combo Services'];

  // Close open popovers
  ['popover-income-time', 'popover-income-amount', 'popover-income-pay', 'popover-income-status', 'popover-income-type'].forEach(id => {
    const p = document.getElementById(id);
    if (p && !p.classList.contains('hidden')) p.classList.add('hidden');
  });

  // Update button badge labels
  updateIncomeFilterTriggerLabels();

  state.income.page = 1;
  syncIncomeSortUI();
  loadIncomeRecords();
  showToast("Income filters applied");
}

function updateIncomeFilterTriggerLabels() {
  const timeLabel = document.getElementById('income-time-btn-label');
  if (timeLabel) {
    const sEl = document.getElementById('filter-inc-start-date');
    const eEl = document.getElementById('filter-inc-end-date');
    const s = sEl ? sEl.value : '';
    const e = eEl ? eEl.value : '';
    if (s && e && s === e) timeLabel.textContent = 'Time: Today';
    else if (s && e) timeLabel.textContent = `Time: ${s} to ${e}`;
    else if (s) timeLabel.textContent = `Time: From ${s}`;
    else if (e) timeLabel.textContent = `Time: Up to ${e}`;
    else timeLabel.textContent = 'Time Period';
  }

  const amtLabel = document.getElementById('income-amt-btn-label');
  if (amtLabel) {
    const minEl = document.getElementById('filter-inc-min-amt');
    const maxEl = document.getElementById('filter-inc-max-amt');
    const min = minEl ? minEl.value : '';
    const max = maxEl ? maxEl.value : '';
    if (min && max) amtLabel.textContent = `₹${min} - ₹${max}`;
    else if (min) amtLabel.textContent = `≥ ₹${min}`;
    else if (max) amtLabel.textContent = `≤ ₹${max}`;
    else amtLabel.textContent = 'Amount Range';
  }

  const payLabel = document.getElementById('income-pay-btn-label');
  if (payLabel) {
    const payModes = [];
    ['Cash', 'UPI', 'Card'].forEach(pm => {
      const el = document.getElementById(`filter-inc-pm-${pm.toLowerCase()}`);
      if (el && el.checked) payModes.push(pm);
    });
    if (payModes.length === 3) payLabel.textContent = 'Payment: All';
    else if (payModes.length === 0) payLabel.textContent = 'Payment: None';
    else payLabel.textContent = `Payment: ${payModes.join(', ')}`;
  }

  const statusLabel = document.getElementById('income-status-btn-label');
  const statusIcon = document.getElementById('income-status-icon');
  const statusBtn = document.getElementById('income-status-btn');
  if (statusLabel) {
    const statusVal = state.income.paymentStatus || '';
    if (statusVal === 'Paid') {
      statusLabel.textContent = 'Status: Paid';
      if (statusIcon) {
        statusIcon.className = 'material-symbols-outlined text-[16px] text-emerald-600';
        statusIcon.textContent = 'check_circle';
      }
      if (statusBtn) {
        statusBtn.classList.add('border-emerald-300', 'bg-emerald-50/50');
        statusBtn.classList.remove('border-amber-300', 'bg-amber-50/50');
      }
    } else if (statusVal === 'Not Paid' || statusVal === 'Unpaid') {
      statusLabel.textContent = 'Status: Unpaid';
      if (statusIcon) {
        statusIcon.className = 'material-symbols-outlined text-[16px] text-amber-600';
        statusIcon.textContent = 'pending_actions';
      }
      if (statusBtn) {
        statusBtn.classList.add('border-amber-300', 'bg-amber-50/50');
        statusBtn.classList.remove('border-emerald-300', 'bg-emerald-50/50');
      }
    } else {
      statusLabel.textContent = 'Status: All';
      if (statusIcon) {
        statusIcon.className = 'material-symbols-outlined text-[16px] text-slate-400';
        statusIcon.textContent = 'check_circle';
      }
      if (statusBtn) {
        statusBtn.classList.remove('border-emerald-300', 'bg-emerald-50/50', 'border-amber-300', 'bg-amber-50/50');
      }
    }
  }

  const catLabel = document.getElementById('income-cat-btn-label');
  if (catLabel) {
    const cats = [];
    ['filter-inc-cat-xerox', 'filter-inc-cat-prod', 'filter-inc-cat-combo'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.checked) cats.push(el.value);
    });
    if (cats.length === 3) catLabel.textContent = 'Categories';
    else if (cats.length === 0) catLabel.textContent = 'Categories: None';
    else catLabel.textContent = `Categories (${cats.length})`;
  }
}

function setIncomeStatusFilter(val) {
  const radio = document.querySelector(`input[name="filter-inc-status"][value="${val}"]`);
  if (radio) radio.checked = true;
  state.income.paymentStatus = val;
  state.income.page = 1;
  updateIncomeFilterTriggerLabels();
  loadIncomeRecords();
  const pop = document.getElementById('popover-income-status');
  if (pop && !pop.classList.contains('hidden')) pop.classList.add('hidden');
  if (val === 'Paid') showToast("Filtered by Paid records");
  else if (val === 'Not Paid') showToast("Filtered by Unpaid records");
  else showToast("Showing all payment statuses");
}

function filterUnpaidBillsToggle() {
  if (state.income.paymentStatus === 'Not Paid') {
    setIncomeStatusFilter('');
  } else {
    setIncomeStatusFilter('Not Paid');
  }
}

function resetIncomeFilters() {
  state.income = {
    page: 1,
    perPage: 10,
    search: '',
    startDate: '',
    endDate: '',
    minAmt: '',
    maxAmt: '',
    sortBy: 'time',
    sortOrder: 'desc',
    paymentMethods: ['Cash', 'UPI', 'Card'],
    paymentStatus: '',
    categories: ['Xerox Services', 'Product Sales', 'Combo Services']
  };

  const searchInput = document.getElementById('income-search');
  if (searchInput) searchInput.value = '';
  const startEl = document.getElementById('filter-inc-start-date');
  if (startEl) startEl.value = '';
  const endEl = document.getElementById('filter-inc-end-date');
  if (endEl) endEl.value = '';
  const minEl = document.getElementById('filter-inc-min-amt');
  if (minEl) minEl.value = '';
  const maxEl = document.getElementById('filter-inc-max-amt');
  if (maxEl) maxEl.value = '';

  selectAllIncomePaymentModes(true);

  const allStatusRadio = document.querySelector('input[name="filter-inc-status"][value=""]');
  if (allStatusRadio) allStatusRadio.checked = true;

  ['filter-inc-cat-xerox', 'filter-inc-cat-prod', 'filter-inc-cat-combo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = true;
  });

  updateIncomeFilterTriggerLabels();
  syncIncomeSortUI();
  loadIncomeRecords();
  showToast("Income filters reset to default");
}

// =========================================================================
// 4. BILLING & INVOICE GENERATOR LOGIC
// =========================================================================
async function fetchNextBillNumber() {
  try {
    const res = await fetch('/api/bills/next-number');
    if (res.ok) {
      const data = await res.json();
      const el = document.getElementById('bill-auto-num');
      const prevEl = document.getElementById('preview-bill-id');
      if (el) el.textContent = `Bill #${data.bill_number} (Auto-Generated)`;
      if (prevEl) prevEl.textContent = `INVOICE: ${data.bill_number}`;
    }
  } catch (e) {
    console.error("Could not fetch next bill number", e);
  }
}

// =========================================================================
// 5. BILLING & PRODUCT SELECTION ACTIONS
// =========================================================================
async function loadProductsForBilling() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      state.products = await res.json();
      renderProductsDropdown();
    }
  } catch (err) {
    console.error("Could not load products for billing", err);
  }
}

function renderProductsDropdown() {
  const select = document.getElementById('item-product-select');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">-- Select Product / Service --</option>' +
    state.products.map(p => `
      <option value="${p.product_code}" data-name="${p.name}" data-rate="${p.price}">
        ${p.name} (₹${p.price.toFixed(2)}) [${p.product_code}]
      </option>
    `).join('');
  if (currentVal) select.value = currentVal;
}

function onProductNameSelect(prodCode) {
  const statusEl = document.getElementById('item-sync-status');
  const idInput = document.getElementById('item-product-id');
  const rateInput = document.getElementById('item-rate');

  if (!prodCode) {
    if (idInput) idInput.value = '';
    if (rateInput) rateInput.value = '0.00';
    if (statusEl) statusEl.innerHTML = 'Select from dropdown or enter Product ID';
    calculateItemAmount();
    return;
  }

  const p = state.products.find(item => item.product_code.toUpperCase() === prodCode.toUpperCase());
  if (p) {
    if (idInput) idInput.value = p.product_code;
    if (rateInput) rateInput.value = p.price.toFixed(2);
    if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600 font-semibold">✓ Selected: ${p.name} (₹${p.price.toFixed(2)})</span>`;
  }
  calculateItemAmount();
}

function onProductIdInput(val) {
  const clean = (val || '').trim().toUpperCase();
  const select = document.getElementById('item-product-select');
  const rateInput = document.getElementById('item-rate');
  const statusEl = document.getElementById('item-sync-status');

  if (!clean) {
    if (select) select.value = '';
    if (statusEl) statusEl.innerHTML = 'Select from dropdown or enter Product ID';
    calculateItemAmount();
    return;
  }

  const p = state.products.find(item => item.product_code.toUpperCase() === clean);
  if (p) {
    if (select) select.value = p.product_code;
    if (rateInput) rateInput.value = p.price.toFixed(2);
    if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600 font-semibold">✓ Matched: ${p.name} (₹${p.price.toFixed(2)})</span>`;
  } else {
    if (select) select.value = '';
    if (statusEl) statusEl.innerHTML = `<span class="text-slate-400 font-mono">Custom / ID '${clean}'</span>`;
  }
  calculateItemAmount();
}

function calculateItemAmount() {
  const qty = parseFloat(document.getElementById('item-qty')?.value) || 1;
  const rate = parseFloat(document.getElementById('item-rate')?.value) || 0;
  const amount = Math.max(0, qty * rate);
  const amountDisplay = document.getElementById('item-amount-display');
  if (amountDisplay) amountDisplay.textContent = `₹${amount.toFixed(2)}`;
  return amount;
}

function renderBillItemsTable() {
  const tbody = document.getElementById('bill-items-list');
  if (!tbody) return;

  if (state.billItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-4 text-center text-slate-400 font-body text-[11px]">
          No items added yet. Select a product above and click "Add to Bill".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.billItems.map((it, idx) => `
    <tr class="hover:bg-slate-50/70 transition-colors ${state.editingBillItemIndex === idx ? 'bg-indigo-50/60 ring-1 ring-indigo-300' : ''}">
      <td class="p-2 font-mono font-bold text-indigo-700 text-[11px]">
        <span class="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100">${it.product_id || '—'}</span>
      </td>
      <td class="p-2 font-medium text-slate-900">${it.name}</td>
      <td class="p-2 text-center font-bold text-slate-700">${it.qty}</td>
      <td class="p-2 text-right font-mono">₹${it.rate.toFixed(2)}</td>
      <td class="p-2 text-right font-headline font-bold text-slate-900">₹${it.total.toFixed(2)}</td>
      <td class="p-2 text-center">
        <div class="inline-flex items-center gap-1">
          <button type="button" onclick="editBillItem(${idx})" class="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors" title="Edit line item">
            <span class="material-symbols-outlined text-[16px]">edit</span>
          </button>
          <button type="button" onclick="removeBillItem(${idx})" class="p-1 text-slate-400 hover:text-red-600 rounded transition-colors" title="Remove item">
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function editBillItem(idx) {
  if (idx < 0 || idx >= state.billItems.length) return;
  state.editingBillItemIndex = idx;
  const it = state.billItems[idx];

  const select = document.getElementById('item-product-select');
  const idInput = document.getElementById('item-product-id');
  const qtyInput = document.getElementById('item-qty');
  const rateInput = document.getElementById('item-rate');
  const cancelBtn = document.getElementById('item-cancel-edit-btn');
  const addBtn = document.getElementById('item-add-btn');
  const addBtnIcon = document.getElementById('item-add-btn-icon');
  const addBtnText = document.getElementById('item-add-btn-text');

  if (idInput) idInput.value = it.product_id || '';
  if (select) {
    select.value = it.product_id || '';
  }
  if (qtyInput) qtyInput.value = it.qty;
  if (rateInput) rateInput.value = it.rate.toFixed(2);

  const statusEl = document.getElementById('item-sync-status');
  if (statusEl) statusEl.innerHTML = `<span class="text-amber-600 font-bold">Editing: ${it.name}</span>`;

  calculateItemAmount();

  if (cancelBtn) cancelBtn.classList.remove('hidden');
  if (addBtn) {
    addBtn.classList.remove('bg-indigo-700', 'hover:bg-indigo-800');
    addBtn.classList.add('bg-amber-600', 'hover:bg-amber-700');
  }
  if (addBtnIcon) addBtnIcon.textContent = 'check';
  if (addBtnText) addBtnText.textContent = 'Update Item';

  renderBillItemsTable();
}

function cancelEditBillItem() {
  state.editingBillItemIndex = null;
  const select = document.getElementById('item-product-select');
  const idInput = document.getElementById('item-product-id');
  const qtyInput = document.getElementById('item-qty');
  const rateInput = document.getElementById('item-rate');
  const cancelBtn = document.getElementById('item-cancel-edit-btn');
  const addBtn = document.getElementById('item-add-btn');
  const addBtnIcon = document.getElementById('item-add-btn-icon');
  const addBtnText = document.getElementById('item-add-btn-text');

  if (select) select.value = '';
  if (idInput) idInput.value = '';
  if (qtyInput) qtyInput.value = '1';
  if (rateInput) rateInput.value = '0.00';
  const statusEl = document.getElementById('item-sync-status');
  if (statusEl) statusEl.innerHTML = 'Select from dropdown or enter Product ID';

  calculateItemAmount();

  if (cancelBtn) cancelBtn.classList.add('hidden');
  if (addBtn) {
    addBtn.classList.remove('bg-amber-600', 'hover:bg-amber-700');
    addBtn.classList.add('bg-indigo-700', 'hover:bg-indigo-800');
  }
  if (addBtnIcon) addBtnIcon.textContent = 'add';
  if (addBtnText) addBtnText.textContent = 'Add to Bill';

  renderBillItemsTable();
}

function addBillItem() {
  const select = document.getElementById('item-product-select');
  const idInput = document.getElementById('item-product-id');
  const qtyInput = document.getElementById('item-qty');
  const rateInput = document.getElementById('item-rate');

  let prodId = (idInput?.value || '').trim().toUpperCase();
  let prodName = '';
  let rate = parseFloat(rateInput?.value) || 0;
  const qty = parseInt(qtyInput?.value) || 1;

  if (select && select.value) {
    const selectedOpt = select.options[select.selectedIndex];
    prodId = select.value;
    prodName = selectedOpt.getAttribute('data-name') || selectedOpt.text.split(' (')[0];
  } else if (prodId) {
    const p = state.products.find(item => item.product_code.toUpperCase() === prodId);
    if (p) {
      prodName = p.name;
      if (rate === 0) rate = p.price;
    } else {
      prodName = prodId;
    }
  }

  if (!prodName) {
    showToast("Please select a product from the dropdown or enter a Product ID", "error");
    return;
  }

  const total = qty * rate;

  if (state.editingBillItemIndex !== null && state.editingBillItemIndex !== undefined) {
    state.billItems[state.editingBillItemIndex] = {
      product_id: prodId,
      name: prodName,
      qty: qty,
      rate: rate,
      total: total
    };
    showToast(`Updated item: ${qty}x ${prodName} (₹${total.toFixed(2)})`);
    cancelEditBillItem();
  } else {
    // Check if product already exists in current invoice items
    const existingIndex = state.billItems.findIndex(it =>
      (prodId && it.product_id && it.product_id.toUpperCase() === prodId.toUpperCase()) ||
      (!prodId && it.name.trim().toLowerCase() === prodName.trim().toLowerCase())
    );

    if (existingIndex !== -1) {
      // Merge/update product count directly
      const existing = state.billItems[existingIndex];
      existing.qty += qty;
      if (rate > 0) existing.rate = rate;
      existing.total = existing.qty * existing.rate;
      showToast(`Updated ${prodName} count: ${existing.qty} units (₹${existing.total.toFixed(2)})`);
    } else {
      state.billItems.push({
        product_id: prodId,
        name: prodName,
        qty: qty,
        rate: rate,
        total: total
      });
      showToast(`Added ${qty}x ${prodName} (₹${total.toFixed(2)})`);
    }

    // Reset inputs
    if (select) select.value = '';
    if (idInput) idInput.value = '';
    if (qtyInput) qtyInput.value = '1';
    if (rateInput) rateInput.value = '0.00';
    const statusEl = document.getElementById('item-sync-status');
    if (statusEl) statusEl.innerHTML = 'Select from dropdown or enter Product ID';
    calculateItemAmount();
  }

  renderBillItemsTable();
  calculateBillTotals();
}

function removeBillItem(idx) {
  if (state.editingBillItemIndex === idx) {
    cancelEditBillItem();
  } else if (state.editingBillItemIndex !== null && state.editingBillItemIndex > idx) {
    state.editingBillItemIndex--;
  }
  state.billItems.splice(idx, 1);
  renderBillItemsTable();
  calculateBillTotals();
}

function calculateBillTotals() {
  let subtotal = 0;
  let totalUnits = 0;
  const previewBox = document.getElementById('preview-items-box');
  if (previewBox) previewBox.innerHTML = '';

  if (state.billItems.length === 0) {
    if (previewBox) {
      previewBox.innerHTML = '<div class="text-slate-400 py-3 text-center italic text-[10px]">No items added to invoice</div>';
    }
  } else {
    state.billItems.forEach(it => {
      subtotal += it.total;
      totalUnits += (parseInt(it.qty) || 0);
      if (previewBox) {
        const itemRow = document.createElement('div');
        itemRow.className = 'flex justify-between py-0.5 items-center';
        itemRow.innerHTML = `
          <div class="truncate max-w-[170px]">
            <span class="font-bold text-slate-900">${it.qty}x</span>
            <span>${it.name}</span>
            ${it.product_id ? `<span class="text-slate-400 font-mono text-[9px]">[${it.product_id}]</span>` : ''}
          </div>
          <span class="font-bold text-slate-900">₹${it.total.toFixed(2)}</span>
        `;
        previewBox.appendChild(itemRow);
      }
    });
  }

  const disc = parseFloat(document.getElementById('bill-discount')?.value) || 0;
  const extra = parseFloat(document.getElementById('bill-extra')?.value) || 0;
  const grand = Math.max(0, subtotal - disc + extra);

  const prevSub = document.getElementById('preview-subtotal');
  const prevDisc = document.getElementById('preview-disc');
  const prevExtra = document.getElementById('preview-extra');
  const prevGrand = document.getElementById('preview-grand');
  const badgeCount = document.getElementById('preview-items-count-badge');
  const totalUnitsEl = document.getElementById('preview-total-units');

  if (prevSub) prevSub.textContent = `₹${subtotal.toFixed(2)}`;
  if (prevDisc) prevDisc.textContent = `-₹${disc.toFixed(2)}`;
  if (prevExtra) prevExtra.textContent = `+₹${extra.toFixed(2)}`;
  if (prevGrand) prevGrand.textContent = `₹${grand.toFixed(2)}`;

  const itemCountText = `${state.billItems.length} item${state.billItems.length === 1 ? '' : 's'}`;
  if (badgeCount) badgeCount.textContent = itemCountText;
  if (totalUnitsEl) {
    totalUnitsEl.textContent = `${itemCountText} (${totalUnits} total unit${totalUnits === 1 ? '' : 's'})`;
  }

  updateBillPreview();
}

function updateBillPreview() {
  const name = document.getElementById('bill-cust-name')?.value.trim();
  const phone = document.getElementById('bill-cust-phone')?.value.trim();
  const payMethod = document.getElementById('bill-payment-method')?.value || 'UPI';

  const prevName = document.getElementById('preview-cust-name');
  const prevPhone = document.getElementById('preview-cust-phone');
  const prevPay = document.getElementById('preview-pay-badge');
  const prevDate = document.getElementById('preview-bill-date');

  if (prevName) prevName.textContent = name || 'Walk-in Customer';
  if (prevPhone) prevPhone.textContent = phone || '—';
  if (prevPay) prevPay.textContent = `PAID (${payMethod.toUpperCase()})`;
  if (prevDate) {
    const now = new Date();
    prevDate.textContent = `Date: Today ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  // Ensure current shop settings are refreshed in receipt preview
  applyShopSettingsToUI();
}

async function generateAndSaveBill(openPrint = true) {
  if (state.billItems.length === 0) {
    showToast("Please add at least one line item to the bill", "error");
    return;
  }

  const custName = document.getElementById('bill-cust-name')?.value.trim() || 'Walk-in Customer';
  const custPhone = document.getElementById('bill-cust-phone')?.value.trim() || '';
  const disc = parseFloat(document.getElementById('bill-discount')?.value) || 0;
  const extra = parseFloat(document.getElementById('bill-extra')?.value) || 0;
  const payMethod = document.getElementById('bill-payment-method')?.value || 'Cash';

  const billPayload = {
    customer_name: custName,
    customer_phone: custPhone,
    items: state.billItems,
    discount: disc,
    extra_charges: extra,
    payment_method: payMethod
  };

  try {
    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(billPayload)
    });
    if (!res.ok) throw new Error("Failed to save bill");
    const result = await res.json();

    showToast(`Bill #${result.bill_number} generated successfully (₹${result.total.toFixed(2)})!`);
    closeModal('modal-create-bill');

    // Reset bill items state and form for next invoice
    state.billItems = [];
    const custNameEl = document.getElementById('bill-cust-name');
    const custPhoneEl = document.getElementById('bill-cust-phone');
    const discEl = document.getElementById('bill-discount');
    const extraEl = document.getElementById('bill-extra');
    if (custNameEl) custNameEl.value = '';
    if (custPhoneEl) custPhoneEl.value = '';
    if (discEl) discEl.value = '0';
    if (extraEl) extraEl.value = '0';
    renderBillItemsTable();
    calculateBillTotals();
    fetchNextBillNumber();

    // Immediately update UI metrics and income records table
    await Promise.all([
      loadTodaySummary(),
      loadIncomeRecords()
    ]);

    // Immediately show bill preview allowing user to choose Print or Cancel
    if (openPrint) {
      await viewPrintBill(result.bill_id, false);
    }
  } catch (err) {
    showToast("Error creating bill", "error");
  }
}

// Keep printBillReceipt as an alias for backwards compatibility
function printBillReceipt() {
  return generateAndSaveBill(true);
}

async function viewPrintBill(billId, autoPrint = false) {
  try {
    const res = await fetch(`/api/bills/${billId}`);
    if (!res.ok) throw new Error("Bill not found");
    const bill = await res.json();

    const printableBox = document.getElementById('printable-receipt-content');
    if (!printableBox) return;

    printableBox.innerHTML = `
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 6px;">
          <img src="/static/img/sri_sakthi_logo.png" alt="${bill.shop.name}" style="height: 82px; max-width: 92%; object-fit: contain; display: block; margin: 0 auto;">
        </div>
        <div style="font-size: 10px; color: #333;">${bill.shop.address}</div>
        <div style="font-size: 10px; color: #333;">Ph: ${bill.shop.phone} ${bill.shop.gst_number ? `| GST: ${bill.shop.gst_number}` : ''}</div>
        <div style="font-size: 12px; font-weight: bold; margin-top: 4px; letter-spacing: 0.5px;">TAX INVOICE: ${bill.bill_number}</div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
        <span>Date: ${bill.created_at}</span>
        <span>Ph: ${bill.customer_phone || '—'}</span>
      </div>
      <div style="font-size: 11px; margin-bottom: 6px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px;">
        Customer: ${bill.customer_name}
      </div>
      <div style="margin-bottom: 8px;">
        <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; padding: 2px 0;">Item</th>
              <th style="text-align: center; padding: 2px 0;">Qty</th>
              <th style="text-align: right; padding: 2px 0;">Rate</th>
              <th style="text-align: right; padding: 2px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${bill.items.map(it => `
              <tr>
                <td style="padding: 2px 0;">${it.product_code ? `<strong>[${it.product_code}]</strong> ` : ''}${it.item_name}</td>
                <td style="text-align: center; padding: 2px 0;">${it.quantity}</td>
                <td style="text-align: right; padding: 2px 0;">₹${it.rate.toFixed(2)}</td>
                <td style="text-align: right; font-weight: bold; padding: 2px 0;">₹${it.line_total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="border-top: 1px dashed #000; padding-top: 6px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>₹${bill.subtotal.toFixed(2)}</span></div>
        ${bill.discount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Discount:</span><span>-₹${bill.discount.toFixed(2)}</span></div>` : ''}
        ${bill.extra_charges > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Extra / GST:</span><span>+₹${bill.extra_charges.toFixed(2)}</span></div>` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
          <span>Grand Total:</span>
          <span>₹${bill.total.toFixed(2)}</span>
        </div>
      </div>
      <div style="text-align: center; margin-top: 12px; font-size: 9px; border-top: 1px dashed #ccc; padding-top: 6px;">
        <div>Status: PAID (${bill.payment_method.toUpperCase()})</div>
        <div style="font-weight: 600; margin-top: 2px;">Thank you for choosing Sri Sakthi Xerox! Please visit again.</div>
      </div>
    `;

    openModal('modal-print-bill');

    if (autoPrint) {
      setTimeout(() => {
        window.print();
      }, 250);
    }
  } catch (err) {
    showToast("Error loading bill details", "error");
  }
}

function executePrintReceipt() {
  window.print();
}

// =========================================================================
// 5. SPENDING DETAILS LOGIC
// =========================================================================
async function loadSpendingSummary() {
  try {
    const res = await fetch('/api/summary/spending');
    if (!res.ok) return;
    const data = await res.json();

    const todaySpendEl = document.getElementById('spending-today-val');
    if (todaySpendEl) todaySpendEl.textContent = `₹${data.today_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const todayDescEl = document.getElementById('spending-today-desc');
    if (todayDescEl) todayDescEl.textContent = data.today_desc;

    const monthSpendEl = document.getElementById('spending-month-val');
    if (monthSpendEl) monthSpendEl.textContent = `₹${data.this_month_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const monthPctEl = document.getElementById('spending-month-pct');
    if (monthPctEl) {
      const color = data.is_spend_reduction ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200';
      monthPctEl.className = `px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`;
      monthPctEl.textContent = `${data.pct_vs_last_month > 0 ? '+' : ''}${data.pct_vs_last_month}%`;
    }

    const txCountEl = document.getElementById('spending-tx-count');
    if (txCountEl) txCountEl.textContent = data.month_transactions_count;
  } catch (err) {
    console.error("Failed to load spending summary", err);
  }
}

async function loadSpendingRecords() {
  const tbody = document.getElementById('spending-table-body');
  if (!tbody) return;

  const params = new URLSearchParams({
    page: state.spending.page,
    per_page: state.spending.perPage,
    search: state.spending.search,
    start_date: state.spending.startDate,
    end_date: state.spending.endDate,
    min_amt: state.spending.minAmt,
    max_amt: state.spending.maxAmt,
    sort_by: state.spending.sortBy || 'time',
    sort_order: state.spending.sortOrder || 'desc',
    payment_methods: (state.spending.paymentMethods && state.spending.paymentMethods.length > 0) ? state.spending.paymentMethods.join(',') : '',
    categories: (state.spending.categories && state.spending.categories.length > 0) ? state.spending.categories.join(',') : ''
  });

  try {
    const res = await fetch(`/api/expenses?${params.toString()}`);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();

    if (data.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400 font-body">
            No expense records found.
          </td>
        </tr>
      `;
      renderSpendingPagination(0, 1, 1);
      return;
    }

    tbody.innerHTML = data.items.map(item => {
      let badgeColor = 'bg-slate-100 text-slate-700 border border-slate-200/60';
      switch (item.category) {
        case 'Stationery Items': badgeColor = 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'; break;
        case 'Paper': badgeColor = 'bg-amber-50 text-amber-800 border border-amber-200/60'; break;
        case 'Photo Sheets': badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'; break;
        case 'Spirals': badgeColor = 'bg-sky-50 text-sky-700 border border-sky-200/60'; break;
        case 'Service Charges': badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200/60'; break;
        case 'Toner / Ink': badgeColor = 'bg-rose-50 text-rose-700 border border-rose-200/60'; break;
        case 'EB Bill': badgeColor = 'bg-purple-50 text-purple-700 border border-purple-200/60'; break;
        case 'Shop Rent': badgeColor = 'bg-slate-100 text-slate-800 border border-slate-300/60'; break;
      }

      return `
        <tr class="hover:bg-slate-50/60 transition-colors">
          <td class="py-3.5 px-4 font-mono text-slate-500 font-medium">#${item.exp_number}</td>
          <td class="py-3.5 px-4 text-slate-900">${formatDateTime(item.expense_date)}</td>
          <td class="py-3.5 px-4 text-right font-headline font-bold text-rose-600">₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeColor}">${item.category}</span>
            <div class="text-[11px] text-slate-500 truncate max-w-[220px] mt-0.5" title="${item.description || item.payee || ''}">${item.description ? item.description : (item.payee ? '<span class="text-slate-400">Payee:</span> ' + item.payee : '-')}</div>
          </td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">${item.payment_method}</span>
          </td>
          <td class="py-3.5 px-4 text-right">
            <div class="inline-flex items-center gap-1">
              <button onclick="openEditExpense(${item.id})" title="Edit Expense" class="p-1 text-slate-400 hover:text-indigo-700 rounded"><span class="material-symbols-outlined text-[18px]">edit</span></button>
              <button onclick="confirmDeleteExpense(${item.id}, '${item.exp_number}')" title="Delete" class="p-1 text-slate-400 hover:text-red-600 rounded"><span class="material-symbols-outlined text-[18px]">delete</span></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderSpendingPagination(data.total_records, data.page, data.total_pages);
  } catch (err) {
    console.error("Failed to load expenses:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-500 font-medium">Failed to load expenses.</td></tr>`;
  }
}

function renderSpendingPagination(total, page, totalPages) {
  const container = document.getElementById('spending-pagination');
  if (!container) return;

  const startEntry = total === 0 ? 0 : (page - 1) * state.spending.perPage + 1;
  const endEntry = Math.min(page * state.spending.perPage, total);

  let pageButtons = '';
  for (let i = 1; i <= Math.min(5, totalPages); i++) {
    if (i === page) {
      pageButtons += `<button class="px-3 py-1 rounded-lg bg-indigo-700 text-white font-semibold text-[12px]">${i}</button>`;
    } else {
      pageButtons += `<button onclick="changeSpendingPage(${i})" class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px]">${i}</button>`;
    }
  }

  container.innerHTML = `
    <span class="text-[12px] text-slate-500">Showing <strong class="text-slate-700">${startEntry} - ${endEntry}</strong> of <strong class="text-slate-700">${total}</strong> entries</span>
    <div class="flex items-center gap-1">
      <button onclick="changeSpendingPage(${page - 1})" class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] disabled:opacity-40" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      ${pageButtons}
      <button onclick="changeSpendingPage(${page + 1})" class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] disabled:opacity-40" ${page >= totalPages ? 'disabled' : ''}>Next</button>
    </div>
  `;
}

function changeSpendingPage(newPage) {
  if (newPage < 1) return;
  state.spending.page = newPage;
  loadSpendingRecords();
}

async function handleSpendingSubmit(e) {
  e.preventDefault();
  const data = {
    expense_date: document.getElementById('exp-date').value,
    category: document.getElementById('exp-cat').value,
    description: document.getElementById('exp-desc').value,
    amount: parseFloat(document.getElementById('exp-amount').value) || 0,
    payment_method: document.getElementById('exp-pay-method').value,
    payee: document.getElementById('exp-payee').value
  };

  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to save expense");
    const result = await res.json();

    showToast(`Expense #${result.exp_number} recorded.`);
    closeModal('modal-add-spending');
    loadSpendingSummary();
    loadSpendingRecords();
  } catch (err) {
    showToast("Error recording expense", "error");
  }
}

async function confirmDeleteExpense(id, expCode) {
  if (!confirm(`Are you sure you want to move expense record ${expCode} to the Recycle Bin? All original details will be safely preserved.`)) return;

  try {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to move expense to Recycle Bin");
    const data = await res.json();
    showToast(data.message || `Expense ${expCode} moved to Recycle Bin.`);
    loadSpendingSummary();
    loadSpendingRecords();
    updateRecycleBadge();
  } catch (err) {
    showToast("Error moving expense to Recycle Bin", "error");
  }
}

async function openEditExpense(id) {
  try {
    const res = await fetch(`/api/expenses/${id}`);
    if (!res.ok) throw new Error("Could not fetch expense details");
    const item = await res.json();

    document.getElementById('edit-exp-id').value = item.id;
    const badge = document.getElementById('edit-exp-badge');
    if (badge) badge.textContent = `#${item.exp_number}`;

    document.getElementById('edit-exp-date').value = toDatetimeLocal(item.expense_date);
    document.getElementById('edit-exp-cat').value = item.category;
    document.getElementById('edit-exp-desc').value = item.description || '';
    document.getElementById('edit-exp-amount').value = item.amount;
    document.getElementById('edit-exp-pay-method').value = item.payment_method;
    document.getElementById('edit-exp-payee').value = item.payee || '';

    openModal('modal-edit-expense');
  } catch (err) {
    showToast("Error loading expense details", "error");
  }
}

async function handleEditExpenseSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-exp-id').value;
  const data = {
    expense_date: document.getElementById('edit-exp-date').value,
    category: document.getElementById('edit-exp-cat').value,
    description: document.getElementById('edit-exp-desc').value.trim(),
    amount: parseFloat(document.getElementById('edit-exp-amount').value) || 0,
    payment_method: document.getElementById('edit-exp-pay-method').value,
    payee: document.getElementById('edit-exp-payee').value.trim()
  };

  try {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to update expense");

    showToast(`Expense #${result.exp_number} updated!`);
    closeModal('modal-edit-expense');
    loadSpendingSummary();
    loadSpendingRecords();
  } catch (err) {
    showToast(err.message || "Error updating expense", "error");
  }
}

// Spending Filtering & Staging Helpers
function setupSpendingFilters() {
  const searchInput = document.getElementById('spending-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applySpendingFilters();
      }
    });
  }
}

// Preset helper: sets dates in input fields without fetching
function setSpendingDatePreset(preset) {
  const today = new Date();
  const formatYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let start = '';
  let end = formatYMD(today);

  if (preset === 'today') {
    start = end;
  } else if (preset === '7days' || preset === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    start = formatYMD(d);
  } else if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    start = formatYMD(d);
  } else if (preset === 'all') {
    start = '';
    end = '';
  }

  const sEl = document.getElementById('filter-exp-start-date');
  const eEl = document.getElementById('filter-exp-end-date');
  if (sEl) sEl.value = start;
  if (eEl) eEl.value = end;
  updateSpendingFilterTriggerLabels();
}

function clearSpendingTimeInputs() {
  const sEl = document.getElementById('filter-exp-start-date');
  const eEl = document.getElementById('filter-exp-end-date');
  if (sEl) sEl.value = '';
  if (eEl) eEl.value = '';
  updateSpendingFilterTriggerLabels();
}

function applySpendingTimeFilter() {
  applySpendingFilters();
}

function clearSpendingTimeFilter() {
  clearSpendingTimeInputs();
  applySpendingFilters();
}

// Amount presets helper: sets min/max in input fields without fetching
function setSpendingAmountRange(min, max) {
  const minEl = document.getElementById('filter-exp-min-amt');
  const maxEl = document.getElementById('filter-exp-max-amt');
  if (minEl) minEl.value = (min !== '' && min !== null && min !== undefined) ? min : '';
  if (maxEl) maxEl.value = (max !== '' && max !== null && max !== undefined) ? max : '';
  updateSpendingFilterTriggerLabels();
}

function clearSpendingAmountInputs() {
  const minEl = document.getElementById('filter-exp-min-amt');
  const maxEl = document.getElementById('filter-exp-max-amt');
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  updateSpendingFilterTriggerLabels();
}

function applySpendingAmountFilter() {
  applySpendingFilters();
}

function clearSpendingAmountFilter() {
  clearSpendingAmountInputs();
  applySpendingFilters();
}

// Payment method helpers (Cash, UPI, Card)
function selectAllSpendingPaymentModes(all) {
  ['filter-exp-pm-cash', 'filter-exp-pm-upi', 'filter-exp-pm-card'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = !!all;
  });
}

function applySpendingCategoryFilter() {
  applySpendingFilters();
}

function toggleSpendingSort(by) {
  let newOrder = 'desc';
  if (state.spending.sortBy === by) {
    newOrder = state.spending.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    newOrder = 'desc';
  }
  state.spending.sortBy = by;
  state.spending.sortOrder = newOrder;
  syncSpendingSortUI();
  state.spending.page = 1;
  loadSpendingRecords();
  const label = by === 'time'
    ? (newOrder === 'desc' ? 'Newest to Oldest' : 'Oldest to Newest')
    : (newOrder === 'desc' ? 'Highest to Lowest' : 'Lowest to Highest');
  showToast(`Sorted by ${label}`);
}

function syncSpendingSortUI() {
  const by = state.spending.sortBy || 'time';
  const order = state.spending.sortOrder || 'desc';

  // Table column headers sort indicators
  const colTime = document.getElementById('col-sort-spend-time');
  const colAmt = document.getElementById('col-sort-spend-amt');

  if (colTime) {
    if (by === 'time') {
      colTime.textContent = order === 'desc' ? 'arrow_downward' : 'arrow_upward';
      colTime.className = 'material-symbols-outlined text-[15px] text-indigo-600';
    } else {
      colTime.textContent = 'unfold_more';
      colTime.className = 'material-symbols-outlined text-[15px] text-slate-300';
    }
  }

  if (colAmt) {
    if (by === 'amount') {
      colAmt.textContent = order === 'desc' ? 'arrow_downward' : 'arrow_upward';
      colAmt.className = 'material-symbols-outlined text-[15px] text-indigo-600';
    } else {
      colAmt.textContent = 'unfold_more';
      colAmt.className = 'material-symbols-outlined text-[15px] text-slate-300';
    }
  }
}

// Master Apply for Spending
function applySpendingFilters() {
  // 1. Search
  const searchInput = document.getElementById('spending-search');
  state.spending.search = searchInput ? searchInput.value.trim() : '';

  // 2. Dates
  const startEl = document.getElementById('filter-exp-start-date');
  const endEl = document.getElementById('filter-exp-end-date');
  state.spending.startDate = startEl ? startEl.value : '';
  state.spending.endDate = endEl ? endEl.value : '';

  // 3. Amounts
  const minEl = document.getElementById('filter-exp-min-amt');
  const maxEl = document.getElementById('filter-exp-max-amt');
  state.spending.minAmt = minEl ? minEl.value : '';
  state.spending.maxAmt = maxEl ? maxEl.value : '';

  // 4. Payment Modes (Cash, UPI, Card)
  const payModes = [];
  ['Cash', 'UPI', 'Card'].forEach(pm => {
    const el = document.getElementById(`filter-exp-pm-${pm.toLowerCase()}`);
    if (el && el.checked) payModes.push(pm);
  });
  state.spending.paymentMethods = payModes.length > 0 ? payModes : ['Cash', 'UPI', 'Card'];

  // 5. Categories
  const checkboxes = document.querySelectorAll('#popover-spend-cat input[type="checkbox"]');
  const selected = [];
  checkboxes.forEach(cb => {
    if (cb.checked) selected.push(cb.value);
  });
  state.spending.categories = selected.length > 0 ? selected : ['Stationery Items', 'Paper', 'Photo Sheets', 'Spirals', 'Service Charges', 'Toner / Ink', 'EB Bill', 'Shop Rent'];

  // Close open popovers
  ['popover-spend-time', 'popover-spend-amt', 'popover-spend-pay', 'popover-spend-cat'].forEach(id => {
    const p = document.getElementById(id);
    if (p && !p.classList.contains('hidden')) p.classList.add('hidden');
  });

  // Update button badge labels
  updateSpendingFilterTriggerLabels();

  state.spending.page = 1;
  syncSpendingSortUI();
  loadSpendingRecords();
  showToast("Spending filters applied");
}

function updateSpendingFilterTriggerLabels() {
  const timeLabel = document.getElementById('spending-time-btn-label');
  if (timeLabel) {
    const sEl = document.getElementById('filter-exp-start-date');
    const eEl = document.getElementById('filter-exp-end-date');
    const s = sEl ? sEl.value : '';
    const e = eEl ? eEl.value : '';
    if (s && e && s === e) timeLabel.textContent = 'Time: Today';
    else if (s && e) timeLabel.textContent = `Time: ${s} to ${e}`;
    else if (s) timeLabel.textContent = `Time: From ${s}`;
    else if (e) timeLabel.textContent = `Time: Up to ${e}`;
    else timeLabel.textContent = 'Time Period';
  }

  const amtLabel = document.getElementById('spending-amt-btn-label');
  if (amtLabel) {
    const minEl = document.getElementById('filter-exp-min-amt');
    const maxEl = document.getElementById('filter-exp-max-amt');
    const min = minEl ? minEl.value : '';
    const max = maxEl ? maxEl.value : '';
    if (min && max) amtLabel.textContent = `₹${min} - ₹${max}`;
    else if (min) amtLabel.textContent = `≥ ₹${min}`;
    else if (max) amtLabel.textContent = `≤ ₹${max}`;
    else amtLabel.textContent = 'Amount Range';
  }

  const payLabel = document.getElementById('spending-pay-btn-label');
  if (payLabel) {
    const pms = [];
    ['Cash', 'UPI', 'Card'].forEach(pm => {
      const el = document.getElementById(`filter-exp-pm-${pm.toLowerCase()}`);
      if (el && el.checked) pms.push(pm);
    });
    if (pms.length === 3) payLabel.textContent = 'Payment: All';
    else if (pms.length === 0) payLabel.textContent = 'Payment: None';
    else payLabel.textContent = `Payment: ${pms.join(', ')}`;
  }

  const catLabel = document.getElementById('spending-cat-btn-label');
  if (catLabel) {
    const cbs = document.querySelectorAll('#popover-spend-cat input[type="checkbox"]');
    const checked = Array.from(cbs).filter(c => c.checked);
    if (checked.length === cbs.length) catLabel.textContent = 'Categories: All';
    else if (checked.length === 0) catLabel.textContent = 'Categories: None';
    else if (checked.length === 1) catLabel.textContent = `Category: ${checked[0].value}`;
    else catLabel.textContent = `Categories: ${checked.length}/${cbs.length}`;
  }
}

function resetSpendingFilters() {
  state.spending = {
    page: 1,
    perPage: 10,
    search: '',
    categories: ['Stationery Items', 'Paper', 'Photo Sheets', 'Spirals', 'Service Charges', 'Toner / Ink', 'EB Bill', 'Shop Rent'],
    minAmt: '',
    maxAmt: '',
    startDate: '',
    endDate: '',
    paymentMethods: ['Cash', 'UPI', 'Card'],
    sortBy: 'time',
    sortOrder: 'desc'
  };

  const searchInput = document.getElementById('spending-search');
  if (searchInput) searchInput.value = '';
  const startEl = document.getElementById('filter-exp-start-date');
  if (startEl) startEl.value = '';
  const endEl = document.getElementById('filter-exp-end-date');
  if (endEl) endEl.value = '';
  const minEl = document.getElementById('filter-exp-min-amt');
  if (minEl) minEl.value = '';
  const maxEl = document.getElementById('filter-exp-max-amt');
  if (maxEl) maxEl.value = '';

  selectAllSpendingPaymentModes(true);

  const checkboxes = document.querySelectorAll('#popover-spend-cat input[type="checkbox"]');
  checkboxes.forEach(cb => { cb.checked = true; });

  updateSpendingFilterTriggerLabels();
  syncSpendingSortUI();
  loadSpendingRecords();
  showToast("Spending filters reset");
}

// =========================================================================
// 6. INCOME ANALYSIS & REPORTING ENGINE
// =========================================================================
function getAnalysisDefaultDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${d}`
  };
}

function initAnalysisDateInputs() {
  const startEl = document.getElementById('analysis-start-date');
  const endEl = document.getElementById('analysis-end-date');
  if (!startEl || !endEl) return;
  const def = getAnalysisDefaultDates();
  if (!startEl.value) startEl.value = state.analysis.startDate || def.start;
  if (!endEl.value) endEl.value = state.analysis.endDate || def.end;
  state.analysis.startDate = startEl.value;
  state.analysis.endDate = endEl.value;
}

async function loadAnalysisData() {
  initAnalysisDateInputs();
  const startEl = document.getElementById('analysis-start-date');
  const endEl = document.getElementById('analysis-end-date');
  const start = (startEl && startEl.value) ? startEl.value : state.analysis.startDate;
  const end = (endEl && endEl.value) ? endEl.value : state.analysis.endDate;

  const params = new URLSearchParams({
    preset: (start || end) ? 'custom' : 'month',
    start_date: start || '',
    end_date: end || '',
    trajectory_mode: state.analysis.trajectoryMode,
    streams: state.analysis.streams.join(',')
  });

  try {
    const res = await fetch(`/api/analysis?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load analysis");
    const data = await res.json();

    // 1. Update Top 4 KPI Cards
    const profitEl = document.getElementById('kpi-profit');
    const profitPctEl = document.getElementById('kpi-profit-pct');
    const profitVal = Math.round(data.kpis.total_profit);
    if (profitEl) {
      if (profitVal < 0) {
        profitEl.textContent = `-₹${Math.abs(profitVal).toLocaleString('en-IN')}`;
        profitEl.classList.remove('text-slate-900', 'text-emerald-600');
        profitEl.classList.add('text-rose-600');
      } else {
        profitEl.textContent = `₹${profitVal.toLocaleString('en-IN')}`;
        profitEl.classList.remove('text-rose-600');
        profitEl.classList.add('text-slate-900');
      }
    }
    if (profitPctEl) {
      const pctVal = data.kpis.profit_pct;
      profitPctEl.textContent = `${pctVal > 0 ? '+' : ''}${pctVal}%`;
      if (profitVal < 0 || pctVal < 0) {
        profitPctEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200';
      } else {
        profitPctEl.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
      }
    }

    const spendEl = document.getElementById('kpi-spend');
    const spendPctEl = document.getElementById('kpi-spend-pct');
    if (spendEl) spendEl.textContent = `₹${Math.round(data.kpis.total_spend).toLocaleString('en-IN')}`;
    if (spendPctEl) spendPctEl.textContent = `${data.kpis.spend_pct > 0 ? '+' : ''}${data.kpis.spend_pct}%`;

    const revEl = document.getElementById('kpi-rev');
    const revPctEl = document.getElementById('kpi-rev-pct');
    if (revEl) revEl.textContent = `₹${Math.round(data.kpis.total_revenue).toLocaleString('en-IN')}`;
    if (revPctEl) revPctEl.textContent = `${data.kpis.rev_pct > 0 ? '+' : ''}${data.kpis.rev_pct}%`;

    const custEl = document.getElementById('kpi-customers');
    if (custEl) custEl.textContent = data.kpis.total_people.toLocaleString('en-IN');

    // Update active period badge in toolbar
    const periodTextEl = document.getElementById('analysis-period-text');
    if (periodTextEl && data.period) {
      if (data.period.start && data.period.end) {
        periodTextEl.textContent = `${data.period.start} to ${data.period.end}`;
      } else {
        periodTextEl.textContent = 'Current Period';
      }
    }

    // Sync trajectory dropdown & store raw trajectory
    state.analysis.rawTrajectory = data.trajectory;
    const trajModeSelect = document.getElementById('trajectory-mode-select');
    if (trajModeSelect) trajModeSelect.value = state.analysis.trajectoryMode;

    // Update selectable metric pill badges with totals
    updateChartMetricPillsUI(data.trajectory.totals || data.kpis);

    // 2. Render Trajectory Multi-Line Spline Chart (SVG)
    renderTrajectoryChart(data.trajectory);

    // 3. Render Stream Yield Donut Chart (SVG)
    renderDonutChart(data.stream_yield, data.kpis.total_revenue, data.kpis.total_people);

    // 4. Render Spending Breakdown Charts (Pie Chart & Bar Chart)
    renderSpendingCharts(data.spending_breakdown, data.spending_summary, data.kpis.total_spend);

    // 5. Update Operational Velocity Cards
    updateVelocityUI(data.velocity);

    // 6. Spool Activity Telemetry & Annual Heatmap
    if (data.spool_activity) {
      updateSpoolActivityUI(data.spool_activity);
    } else {
      loadSpoolActivity(state.analysis.spoolYear || '2026');
    }

  } catch (err) {
    console.error("Failed to load analysis:", err);
  }
}

// --- Operational Velocity Period Controls (Daily, Weekly, Monthly) ---
function setVelocityPeriod(period) {
  if (!['daily', 'weekly', 'monthly'].includes(period)) return;
  state.analysis.velocityPeriod = period;

  // Update button active styling
  ['daily', 'weekly', 'monthly'].forEach(p => {
    const btn = document.getElementById(`vel-period-${p}`);
    if (btn) {
      if (p === period) {
        btn.className = 'vel-period-btn px-3 py-1 rounded-lg transition-all text-white bg-slate-900 shadow-xs font-semibold cursor-pointer';
      } else {
        btn.className = 'vel-period-btn px-3 py-1 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-medium cursor-pointer';
      }
    }
  });

  if (state.analysis.rawVelocity) {
    updateVelocityUI(state.analysis.rawVelocity);
  }
}
window.setVelocityPeriod = setVelocityPeriod;

function updateVelocityUI(velocityData) {
  if (!velocityData) return;
  state.analysis.rawVelocity = velocityData;
  const period = state.analysis.velocityPeriod || 'daily';

  // Ensure button styling matches current active period
  ['daily', 'weekly', 'monthly'].forEach(p => {
    const btn = document.getElementById(`vel-period-${p}`);
    if (btn) {
      if (p === period) {
        btn.className = 'vel-period-btn px-3 py-1 rounded-lg transition-all text-white bg-slate-900 shadow-xs font-semibold cursor-pointer';
      } else {
        btn.className = 'vel-period-btn px-3 py-1 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-medium cursor-pointer';
      }
    }
  });

  // Extract metrics for the selected period
  const currentMetrics = (velocityData[period]) ? velocityData[period] : velocityData;
  const unitLabel = period === 'daily' ? 'day' : (period === 'weekly' ? 'week' : 'month');

  // 1. Avg Customers
  const custEl = document.getElementById('vel-avg-cust');
  if (custEl) {
    custEl.innerHTML = `${currentMetrics.avg_customers} <span class="text-[11px] font-normal text-slate-500">/ ${unitLabel}</span>`;
  }

  // 2. Avg Revenue
  const revEl = document.getElementById('vel-avg-rev');
  if (revEl) {
    revEl.innerHTML = `₹${Math.round(currentMetrics.avg_revenue).toLocaleString('en-IN')} <span class="text-[11px] font-normal text-slate-500">/ ${unitLabel}</span>`;
  }

  // 3. Avg Spending
  const spendEl = document.getElementById('vel-avg-spend');
  if (spendEl) {
    spendEl.innerHTML = `₹${Math.round(currentMetrics.avg_spending).toLocaleString('en-IN')} <span class="text-[11px] font-normal text-slate-500">/ ${unitLabel}</span>`;
  }
  const spendBurnEl = document.getElementById('vel-sub-spend-text');
  if (spendBurnEl) {
    spendBurnEl.textContent = `${period.charAt(0).toUpperCase() + period.slice(1)} burn rate`;
  }

  // 4. Avg Profit (with accurate negative formatting)
  const avgProfitVal = Math.round(currentMetrics.avg_profit);
  const formattedAvgProfit = avgProfitVal < 0 
    ? `-₹${Math.abs(avgProfitVal).toLocaleString('en-IN')}` 
    : `₹${avgProfitVal.toLocaleString('en-IN')}`;
  const velAvgProfEl = document.getElementById('vel-avg-profit');
  if (velAvgProfEl) {
    velAvgProfEl.className = `text-[20px] font-headline font-extrabold mt-1 ${avgProfitVal < 0 ? 'text-rose-600' : 'text-emerald-600'}`;
    velAvgProfEl.innerHTML = `${formattedAvgProfit} <span class="text-[11px] font-normal text-slate-500">/ ${unitLabel}</span>`;
  }
  const marginEl = document.getElementById('vel-margin-pct');
  if (marginEl) {
    const isNeg = avgProfitVal < 0;
    marginEl.className = `text-[10px] font-mono mt-1 flex items-center gap-0.5 ${isNeg ? 'text-rose-600' : 'text-emerald-600'}`;
    marginEl.innerHTML = `<span class="material-symbols-outlined text-[12px]">${isNeg ? 'arrow_downward' : 'arrow_upward'}</span> ${currentMetrics.profit_margin_pct}% margin`;
  }

  // 5. Avg Spend / Cust
  const custSpendEl = document.getElementById('vel-avg-cust-spend');
  if (custSpendEl) {
    custSpendEl.innerHTML = `₹${(currentMetrics.avg_spend_per_customer || 0).toFixed(2)} <span class="text-[11px] font-normal text-slate-500">/ visit</span>`;
  }
}
window.updateVelocityUI = updateVelocityUI;



function applyAnalysisFilters() {
  const startEl = document.getElementById('analysis-start-date');
  const endEl = document.getElementById('analysis-end-date');
  const start = startEl ? startEl.value : '';
  const end = endEl ? endEl.value : '';

  if (start && end && start > end) {
    showToast("Starting date cannot be later than ending date", "error");
    return;
  }

  state.analysis.startDate = start;
  state.analysis.endDate = end;
  state.analysis.preset = (start || end) ? 'custom' : 'month';

  // Always include all streams (stream filter removed from UI)
  state.analysis.streams = ['Xerox Services', 'Product Sales', 'Combo Services'];

  loadAnalysisData();
  showToast("Analysis filters applied");
}

function resetAnalysisFilters() {
  const def = getAnalysisDefaultDates();
  state.analysis.startDate = def.start;
  state.analysis.endDate = def.end;
  state.analysis.preset = 'custom';
  state.analysis.streams = ['Xerox Services', 'Product Sales', 'Combo Services'];

  const s = document.getElementById('analysis-start-date');
  const e = document.getElementById('analysis-end-date');
  if (s) s.value = def.start;
  if (e) e.value = def.end;

  // Always include all streams (stream filter removed from UI)
  state.analysis.streams = ['Xerox Services', 'Product Sales', 'Combo Services'];

  loadAnalysisData();
  showToast("Analysis filters reset");
}

// --- Selectable Metrics Chart System (Reference Style) ---
const CHART_METRIC_CONFIG = {
  profit: {
    key: 'profit',
    label: 'Total Profit',
    color: '#10B981', // Emerald
    borderClass: 'border-emerald-200',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    dotClass: 'bg-emerald-500',
    unit: 'currency',
    format: (v) => v < 0 ? `-₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}` : `₹${Math.round(v).toLocaleString('en-IN')}`
  },
  spend: {
    key: 'spend',
    label: 'Total Spending',
    color: '#EF4444', // Red/Rose
    borderClass: 'border-rose-200',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-800',
    dotClass: 'bg-rose-500',
    unit: 'currency',
    format: (v) => `₹${Math.round(v).toLocaleString('en-IN')}`
  },
  revenue: {
    key: 'revenue',
    label: 'Total Revenue',
    color: '#3B82F6', // Blue
    borderClass: 'border-blue-200',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-800',
    dotClass: 'bg-blue-500',
    unit: 'currency',
    format: (v) => `₹${Math.round(v).toLocaleString('en-IN')}`
  },
  people: {
    key: 'people',
    label: 'Total People',
    color: '#8B5CF6', // Purple
    borderClass: 'border-purple-200',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-800',
    dotClass: 'bg-purple-500',
    unit: 'count',
    format: (v) => `${Math.round(v).toLocaleString('en-IN')} cust.`
  }
};

function onTrajectoryModeChange(mode) {
  state.analysis.trajectoryMode = mode;
  loadAnalysisData();
}

function setTrajectoryMode(btn, mode) {
  state.analysis.trajectoryMode = mode;
  const select = document.getElementById('trajectory-mode-select');
  if (select) select.value = mode;
  loadAnalysisData();
}

function toggleChartMetric(metric) {
  if (!CHART_METRIC_CONFIG[metric]) return;
  const list = state.analysis.activeChartMetrics;
  const idx = list.indexOf(metric);
  if (idx >= 0) {
    if (list.length === 1) {
      showToast("At least one metric must remain visible", "info");
      return;
    }
    list.splice(idx, 1);
  } else {
    list.push(metric);
  }
  updateChartMetricPillsUI();
  if (state.analysis.rawTrajectory) {
    renderTrajectoryChart(state.analysis.rawTrajectory);
  }
}

function updateChartMetricPillsUI(totals) {
  if (totals) {
    const setVal = (id, str) => {
      const el = document.getElementById(id);
      if (el) el.textContent = str;
    };
    if (totals.profit !== undefined) setVal('pill-val-profit', `(${CHART_METRIC_CONFIG.profit.format(totals.profit)})`);
    if (totals.spend !== undefined) setVal('pill-val-spend', `(${CHART_METRIC_CONFIG.spend.format(totals.spend)})`);
    if (totals.revenue !== undefined) setVal('pill-val-revenue', `(${CHART_METRIC_CONFIG.revenue.format(totals.revenue)})`);
    if (totals.people !== undefined) setVal('pill-val-people', `(${Math.round(totals.people)})`);
  }

  // Update visual state of all pills
  Object.keys(CHART_METRIC_CONFIG).forEach(m => {
    const pill = document.getElementById(`pill-metric-${m}`);
    if (!pill) return;
    const cfg = CHART_METRIC_CONFIG[m];
    const isActive = state.analysis.activeChartMetrics.includes(m);
    if (isActive) {
      pill.className = `chart-metric-pill transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer select-none shadow-2xs ${cfg.borderClass} ${cfg.bgClass} ${cfg.textClass}`;
    } else {
      pill.className = `chart-metric-pill transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer select-none border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-60`;
    }
  });
}

/**
 * Catmull-Rom to Cubic Bézier spline generator for buttery smooth curves
 */
function getSplinePath(pts) {
  if (!pts || pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;

  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function getAreaPath(pts, yBase) {
  if (!pts || pts.length < 2) return '';
  const curve = getSplinePath(pts);
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${curve} L ${last.x.toFixed(1)},${yBase.toFixed(1)} L ${first.x.toFixed(1)},${yBase.toFixed(1)} Z`;
}

function renderTrajectoryChart(trajectory) {
  const container = document.getElementById('trajectory-svg-canvas');
  if (!container || !trajectory) return;

  const points = trajectory.points || [];
  const count = points.length;
  if (count === 0) {
    container.innerHTML = `<text x="480" y="125" text-anchor="middle" class="text-[12px] font-headline font-medium fill-slate-400">No trajectory records for selected dates</text>`;
    return;
  }

  // Active metrics
  let active = state.analysis.activeChartMetrics.filter(m => CHART_METRIC_CONFIG[m]);
  if (active.length === 0) active = ['profit', 'spend', 'revenue'];

  const currMetrics = active.filter(m => CHART_METRIC_CONFIG[m].unit === 'currency');
  const countMetrics = active.filter(m => CHART_METRIC_CONFIG[m].unit === 'count');
  const isDualAxis = (currMetrics.length > 0 && countMetrics.length > 0);

  const W = 960;
  const H = 250;
  const topPad = 26;
  const bottomPad = 195;
  const leftPad = 52;
  const rightPad = isDualAxis ? 52 : 36;
  const chartW = W - leftPad - rightPad;
  const chartH = bottomPad - topPad;

  const getX = (idx) => leftPad + (count === 1 ? chartW / 2 : (idx / (count - 1)) * chartW);

  // Currency Y Scale (supports negative values for profit)
  let minCurr = 0;
  let maxCurr = 1000;
  if (currMetrics.length > 0) {
    minCurr = Math.min(0, ...points.map(p => Math.min(...currMetrics.map(m => p[m] !== undefined ? p[m] : 0))));
    maxCurr = Math.max(1000, ...points.map(p => Math.max(...currMetrics.map(m => p[m] !== undefined ? p[m] : 0))));
    if (minCurr < 0) minCurr = minCurr * 1.15;
    maxCurr = maxCurr * 1.15;
  }
  const currRange = Math.max(1, maxCurr - minCurr);
  const getYCurrency = (val) => bottomPad - (((val - minCurr) / currRange) * chartH);
  const yZeroCurr = Math.round(getYCurrency(0));

  // Count Y Scale
  let maxCount = 10;
  if (countMetrics.length > 0) {
    maxCount = Math.max(5, ...points.map(p => Math.max(...countMetrics.map(m => p[m] !== undefined ? p[m] : 0)))) * 1.25;
  }
  const getYCount = (val) => bottomPad - ((val / maxCount) * chartH);

  // Map coordinate points for each active metric
  const metricCoords = {};
  active.forEach(m => {
    const isCurrency = CHART_METRIC_CONFIG[m].unit === 'currency';
    metricCoords[m] = points.map((p, idx) => ({
      x: getX(idx),
      y: isCurrency ? getYCurrency(p[m] || 0) : getYCount(p[m] || 0),
      val: p[m] || 0,
      label: p.label,
      bucket: p.bucket
    }));
  });

  // SVG Defs with linear gradients for active metrics (clean pastel fills on white)
  let defs = '';
  active.forEach(m => {
    const cfg = CHART_METRIC_CONFIG[m];
    defs += `
      <linearGradient id="chartGrad_${m}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${cfg.color}" stop-opacity="0.18"></stop>
        <stop offset="85%" stop-color="${cfg.color}" stop-opacity="0.03"></stop>
        <stop offset="100%" stop-color="${cfg.color}" stop-opacity="0.00"></stop>
      </linearGradient>
    `;
  });

  // Background Grid Lines and Y-Axis Labels
  let gridLinesSvg = '';
  if (currMetrics.length > 0) {
    const stepsCount = 4;
    for (let i = 0; i <= stepsCount; i++) {
      const frac = i / stepsCount;
      const val = minCurr + frac * currRange;
      const y = Math.round(bottomPad - frac * chartH);
      const isZero = Math.abs(val) < (currRange * 0.04);
      const isNegative = val < -0.1;
      const labelText = Math.abs(val) >= 1000
        ? `${val < 0 ? '-' : ''}₹${(Math.abs(val) / 1000).toFixed(1).replace('.0', '')}k`
        : `${val < 0 ? '-' : ''}₹${Math.round(Math.abs(val))}`;

      gridLinesSvg += `
        <line x1="${leftPad}" x2="${W - rightPad}" y1="${y}" y2="${y}"
              stroke="${isZero ? '#94a3b8' : '#f1f5f9'}"
              stroke-width="${isZero ? '1.5' : '1'}"
              stroke-dasharray="${isZero ? '0' : '3 3'}"></line>
        <text x="${leftPad - 8}" y="${y + 3.5}" text-anchor="end" class="text-[10px] font-mono select-none" fill="${isZero ? '#334155' : isNegative ? '#ef4444' : '#64748b'}">${labelText}</text>
      `;

      // If dual axis, add count scale on right
      if (isDualAxis) {
        const countVal = Math.round(frac * maxCount);
        gridLinesSvg += `
          <text x="${W - rightPad + 8}" y="${y + 3.5}" text-anchor="start" class="text-[9.5px] font-mono select-none" fill="#64748b">${countVal}</text>
        `;
      }
    }
  } else {
    // Only count metrics active
    const stepsCount = 4;
    for (let i = 0; i <= stepsCount; i++) {
      const frac = i / stepsCount;
      const val = Math.round(frac * maxCount);
      const y = Math.round(bottomPad - frac * chartH);
      gridLinesSvg += `
        <line x1="${leftPad}" x2="${W - rightPad}" y1="${y}" y2="${y}" stroke="${i === 0 ? '#94a3b8' : '#f1f5f9'}" stroke-dasharray="${i === 0 ? '0' : '3 3'}" stroke-width="${i === 0 ? '1.5' : '1'}"></line>
        <text x="${leftPad - 8}" y="${y + 3.5}" text-anchor="end" class="text-[10px] font-mono select-none" fill="#64748b">${val}</text>
      `;
    }
  }

  // X-Axis Date / Month Labels (Every single month from Jan to Dec clearly visible)
  let xLabelsSvg = '';
  const isMonthlyOrFew = count <= 14;
  const labelStep = isMonthlyOrFew ? 1 : (count > 31 ? Math.ceil(count / 14) : (count > 16 ? 2 : 1));

  points.forEach((p, idx) => {
    if (idx % labelStep === 0 || idx === count - 1) {
      const x = Math.round(getX(idx));
      
      let mainLabel = p.label;
      let subLabel = '';

      // Check for monthly format ("Jan 2026", "2026-01", etc.)
      const monthMatch = p.label.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
      if (monthMatch) {
        mainLabel = monthMatch[1].slice(0, 3); // Clean 3-letter month: Jan, Feb, Mar...
        subLabel = monthMatch[2]; // 2026
      } else if (p.label.startsWith('Wk ') && p.label.includes('(')) {
        const wkMatch = p.label.match(/^(Wk \d+)\s*\((.*?)\)$/);
        if (wkMatch) {
          mainLabel = wkMatch[1];
          subLabel = wkMatch[2];
        }
      }

      // Vertical tick mark & clean bold label
      xLabelsSvg += `
        <line x1="${x}" x2="${x}" y1="${bottomPad}" y2="${bottomPad + 4}" stroke="#cbd5e1" stroke-width="1.5"></line>
        <text x="${x}" y="${bottomPad + 18}" text-anchor="middle" class="text-[12px] font-headline font-bold select-none fill-slate-800 tracking-tight">${mainLabel}</text>
      `;

      if (subLabel) {
        xLabelsSvg += `
          <text x="${x}" y="${bottomPad + 31}" text-anchor="middle" class="text-[9.5px] font-mono font-medium select-none fill-slate-400">${subLabel}</text>
        `;
      }
    }
  });

  // Render Area Fills and Spline Paths for active metrics
  let areasSvg = '';
  let linesSvg = '';
  let dotsSvg = '';

  active.forEach(m => {
    const pts = metricCoords[m];
    const cfg = CHART_METRIC_CONFIG[m];
    const isCurrency = cfg.unit === 'currency';
    const yBase = isCurrency ? yZeroCurr : bottomPad;

    const areaPath = getAreaPath(pts, yBase);
    const splinePath = getSplinePath(pts);

    areasSvg += `<path d="${areaPath}" fill="url(#chartGrad_${m})" class="transition-opacity duration-300"></path>`;
    linesSvg += `<path d="${splinePath}" fill="none" stroke="${cfg.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-all duration-300"></path>`;

    // Dots on data points with pure white borders
    pts.forEach((pt, idx) => {
      dotsSvg += `
        <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4" fill="${cfg.color}" stroke="#ffffff" stroke-width="2.2"
                class="chart-data-dot cursor-pointer transition-transform hover:scale-150"
                data-metric="${m}" data-idx="${idx}">
          <title>${cfg.label} (${pt.label}): ${cfg.format(pt.val)}</title>
        </circle>
      `;
    });
  });

  container.innerHTML = `
    <defs>${defs}</defs>
    <g class="chart-grid">${gridLinesSvg}</g>
    <g class="chart-x-labels">${xLabelsSvg}</g>
    <g class="chart-areas">${areasSvg}</g>
    <g class="chart-lines">${linesSvg}</g>
    <g class="chart-dots">${dotsSvg}</g>
    <g id="chart-crosshair-group" class="pointer-events-none hidden">
      <line id="chart-crosshair-line" x1="0" x2="0" y1="${topPad}" y2="${bottomPad}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 3"></line>
    </g>
  `;

  // Update peak day info text
  const peakTextEl = document.getElementById('chart-peak-info');
  if (peakTextEl && trajectory.peak_day) {
    peakTextEl.innerHTML = `Peak: <strong class="text-slate-800">${trajectory.peak_day} (₹${Math.round(trajectory.peak_amount || 0).toLocaleString('en-IN')})</strong>`;
  }

  // Setup interactive crosshair & tooltip
  attachTrajectoryHoverEvents(points, metricCoords, active, leftPad, rightPad, W, chartW);
}

/**
 * Interactive crosshair and floating glassmorphic tooltip for the trajectory chart
 */
function attachTrajectoryHoverEvents(points, metricCoords, activeMetrics, leftPad, rightPad, totalW, chartW) {
  const wrap = document.getElementById('trajectory-canvas-wrap');
  const tooltip = document.getElementById('chart-hover-tooltip');
  const crosshairGroup = document.getElementById('chart-crosshair-group');
  const crosshairLine = document.getElementById('chart-crosshair-line');
  if (!wrap || !tooltip || points.length === 0) return;

  wrap.onmousemove = (e) => {
    const rect = wrap.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const count = points.length;
    if (count <= 0) return;

    // Find nearest point index based on mouseX
    const relativeX = mouseX * (totalW / rect.width);
    let nearestIdx = Math.round(((relativeX - leftPad) / chartW) * (count - 1));
    nearestIdx = Math.max(0, Math.min(count - 1, nearestIdx));

    const p = points[nearestIdx];
    const ptX = leftPad + (count === 1 ? chartW / 2 : (nearestIdx / (count - 1)) * chartW);
    const pixelX = (ptX / totalW) * rect.width;

    // Show crosshair
    if (crosshairGroup && crosshairLine) {
      crosshairGroup.classList.remove('hidden');
      crosshairLine.setAttribute('x1', ptX.toFixed(1));
      crosshairLine.setAttribute('x2', ptX.toFixed(1));
    }

    // Build tooltip HTML
    let itemsHtml = '';
    activeMetrics.forEach(m => {
      const cfg = CHART_METRIC_CONFIG[m];
      const val = p[m] !== undefined ? p[m] : 0;
      const isNeg = (m === 'profit' && val < 0);
      itemsHtml += `
        <div class="flex items-center justify-between gap-3 text-[11px] py-0.5">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full shrink-0" style="background:${cfg.color}"></span>
            <span class="text-slate-300 font-medium">${cfg.label}:</span>
          </div>
          <span class="font-mono font-bold ${isNeg ? 'text-rose-400' : 'text-white'}">${cfg.format(val)}</span>
        </div>
      `;
    });

    tooltip.innerHTML = `
      <div class="font-headline font-bold text-[11.5px] text-white border-b border-slate-700/80 pb-1 mb-1 flex items-center justify-between gap-2">
        <span>${p.label}</span>
        <span class="text-[9.5px] font-mono text-slate-400 font-normal">${p.bucket || ''}</span>
      </div>
      <div class="space-y-0.5">${itemsHtml}</div>
    `;

    // Position tooltip
    tooltip.classList.remove('hidden');
    const clampedPixelX = Math.max(90, Math.min(rect.width - 90, pixelX));
    tooltip.style.left = `${clampedPixelX}px`;
    tooltip.style.top = `60px`;
  };

  wrap.onmouseleave = () => {
    if (tooltip) tooltip.classList.add('hidden');
    if (crosshairGroup) crosshairGroup.classList.add('hidden');
  };
}

/**
 * Helper to generate SVG path for a donut arc segment (M ... A ... L ... A ... Z)
 */
function describeDonutArc(cx, cy, rIn, rOut, startAngle, endAngle) {
  // If full circle (360 degrees or near full)
  if (endAngle - startAngle >= 2 * Math.PI - 0.001) {
    return [
      `M ${cx} ${(cy - rOut).toFixed(2)}`,
      `A ${rOut} ${rOut} 0 1 0 ${cx} ${(cy + rOut).toFixed(2)}`,
      `A ${rOut} ${rOut} 0 1 0 ${cx} ${(cy - rOut).toFixed(2)}`,
      `M ${cx} ${(cy - rIn).toFixed(2)}`,
      `A ${rIn} ${rIn} 0 1 1 ${cx} ${(cy + rIn).toFixed(2)}`,
      `A ${rIn} ${rIn} 0 1 1 ${cx} ${(cy - rIn).toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  const x1Out = cx + rOut * Math.cos(startAngle);
  const y1Out = cy + rOut * Math.sin(startAngle);
  const x2Out = cx + rOut * Math.cos(endAngle);
  const y2Out = cy + rOut * Math.sin(endAngle);

  const x1In = cx + rIn * Math.cos(endAngle);
  const y1In = cy + rIn * Math.sin(endAngle);
  const x2In = cx + rIn * Math.cos(startAngle);
  const y2In = cy + rIn * Math.sin(startAngle);

  const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

  return [
    `M ${x1Out.toFixed(2)} ${y1Out.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2Out.toFixed(2)} ${y2Out.toFixed(2)}`,
    `L ${x1In.toFixed(2)} ${y1In.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${largeArc} 0 ${x2In.toFixed(2)} ${y2In.toFixed(2)}`,
    'Z'
  ].join(' ');
}

/**
 * Format amounts cleanly for callout lines ($84K style: e.g. ₹84K, ₹25K, ₹17.3K)
 */
function formatCalloutAmount(val) {
  if (val == null || isNaN(val) || val === 0) return '₹0';
  const roundVal = Math.round(val);
  if (roundVal >= 10000000) return `₹${(roundVal / 10000000).toFixed(2).replace(/\\.00$/, '')}Cr`;
  if (roundVal >= 1000) return `₹${(roundVal / 1000).toFixed(1).replace(/\\.0$/, '')}K`;
  return `₹${roundVal.toLocaleString('en-IN')}`;
}

/**
 * Format total amount in the center dark badge ($183.6K style)
 */
function formatCalloutCenter(val) {
  if (val == null || isNaN(val) || val === 0) return '₹0';
  const roundVal = Math.round(val);
  if (roundVal >= 10000000) return `₹${(roundVal / 10000000).toFixed(1)}Cr`;
  if (roundVal >= 1000) return `₹${(roundVal / 1000).toFixed(1).replace(/\\.0$/, '')}K`;
  return `₹${roundVal.toLocaleString('en-IN')}`;
}

/**
 * Renders an elegant Callout Donut Chart matching the reference design:
 * - Center dark badge (#0f172a) with bold white total amount and category subtitle
 * - Donut ring with vibrant colored slices
 * - Exploded / popped-out primary slice with soft drop shadow
 * - Angled elbow leader lines connecting slices to bold colored amounts and clean labels
 * - Balanced quadrant distribution preventing crowded lines or collisions
 */
function renderCalloutDonutSVG(svgEl, items, totalValue, centerTitle, filterId, emptyLabel) {
  if (!svgEl) return;

  const cx = 290;
  const cy = 170;
  const rIn = 66;
  const rOut = 112;

  const defs = `
    <defs>
      <filter id="${filterId}" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="3" dy="6" stdDeviation="5" flood-color="#0f172a" flood-opacity="0.32" />
      </filter>
    </defs>
  `;

  const activeItems = (items || []).filter(it => it.amount > 0);
  activeItems.sort((a, b) => b.amount - a.amount);

  if (activeItems.length === 0 || totalValue <= 0) {
    svgEl.innerHTML = defs + `
      <circle cx="${cx}" cy="${cy}" r="88" stroke="#f1f5f9" stroke-width="36" fill="none" />
      <circle cx="${cx}" cy="${cy}" r="62" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
      <text x="${cx}" y="166" text-anchor="middle" fill="#ffffff" font-size="22px" font-weight="800" font-family="'Plus Jakarta Sans', sans-serif">₹0</text>
      <text x="${cx}" y="182" text-anchor="middle" fill="#94a3b8" font-size="8.5px" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif" letter-spacing="0.08em">${emptyLabel || 'NO DATA'}</text>
    `;
    return;
  }

  const sum = activeItems.reduce((acc, it) => acc + it.amount, 0) || totalValue || 1;

  if (activeItems.length === 1) {
    const it = activeItems[0];
    const pathD = describeDonutArc(cx, cy, rIn, rOut, 0, 2 * Math.PI);
    const amtStr = formatCalloutAmount(it.amount);
    const targetY = cy;
    const endX = 556;
    const elbowX = 435;
    const attachX = cx + rOut;
    const attachY = cy;
    svgEl.innerHTML = defs + `
      <path d="${pathD}" fill="${it.color}" />
      <path d="M ${attachX} ${attachY} L ${elbowX} ${targetY} L ${endX} ${targetY}" stroke="${it.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <text x="${endX}" y="${targetY - 6}" text-anchor="end" fill="${it.color}" font-size="15px" font-weight="800" font-family="'Plus Jakarta Sans', sans-serif">${amtStr}</text>
      <text x="${endX}" y="${targetY + 16}" text-anchor="end" fill="#334155" font-size="12px" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif">${it.name} <tspan fill="#64748b" font-weight="500">(100%)</tspan></text>
      <circle cx="${cx}" cy="${cy}" r="62" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
      <text x="${cx}" y="166" text-anchor="middle" fill="#ffffff" font-size="22px" font-weight="800" font-family="'Plus Jakarta Sans', sans-serif">${formatCalloutCenter(totalValue)}</text>
      <text x="${cx}" y="182" text-anchor="middle" fill="#94a3b8" font-size="8.5px" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif" letter-spacing="0.08em">${centerTitle}</text>
    `;
    return;
  }

  // Partition activeItems into Right and Left to balance visual weight and avoid clustering
  const rightItems = [];
  const leftItems = [];
  let rSum = 0, lSum = 0;

  activeItems.forEach((it, idx) => {
    if (idx === 0) {
      rightItems.push(it);
      rSum += it.amount;
    } else if (rSum <= lSum && rightItems.length < Math.ceil(activeItems.length / 2)) {
      rightItems.push(it);
      rSum += it.amount;
    } else if (leftItems.length < Math.ceil(activeItems.length / 2)) {
      leftItems.push(it);
      lSum += it.amount;
    } else {
      rightItems.push(it);
      rSum += it.amount;
    }
  });

  // Order Right: sandwich the largest primary item in the center of the right half
  const maxRight = rightItems[0];
  const nonMaxRight = rightItems.slice(1).sort((a, b) => a.amount - b.amount);
  const rightOrdered = [];
  if (nonMaxRight.length > 0) rightOrdered.push(nonMaxRight[0]);
  rightOrdered.push(maxRight);
  for (let i = 1; i < nonMaxRight.length; i++) rightOrdered.push(nonMaxRight[i]);

  // Order Left: progressing clockwise around the left half (bottom-left to top-left)
  leftItems.sort((a, b) => b.amount - a.amount);
  const leftClockwise = [...leftItems];

  const fullClockwise = [...rightOrdered, ...leftClockwise];

  // Start angle centers the right slices around angle 0 (directly to the right)
  const rightAngleSpan = (rSum / sum) * 2 * Math.PI;
  let curAngle = -rightAngleSpan / 2;

  const slices = fullClockwise.map((it) => {
    const sweep = (it.amount / sum) * 2 * Math.PI;
    const start = curAngle;
    const end = curAngle + sweep;
    const mid = (start + end) / 2;
    curAngle = end;

    const isLargest = (it === activeItems[0]);
    const offset = isLargest ? 9 : 0;
    const rad = isLargest ? rOut + 8 : rOut;
    const dx = Math.cos(mid) * offset;
    const dy = Math.sin(mid) * offset;

    const pathD = describeDonutArc(cx + dx, cy + dy, rIn, rad, start, end);
    const attachX = (cx + dx) + rad * Math.cos(mid);
    const attachY = (cy + dy) + rad * Math.sin(mid);

    const stubX = attachX + Math.cos(mid) * 12;
    const stubY = attachY + Math.sin(mid) * 12;

    const isRight = rightOrdered.includes(it);

    return { ...it, start, end, mid, isLargest, pathD, attachX, attachY, stubX, stubY, isRight };
  });

  // Sort slices on each side top-to-bottom for clean parallel leader lines
  const rightSlices = slices.filter(s => s.isRight).sort((a, b) => a.attachY - b.attachY);
  const leftSlices = slices.filter(s => !s.isRight).sort((a, b) => a.attachY - b.attachY);

  // Slices SVG (render non-largest first, then exploded largest on top)
  let slicesHtml = '';
  slices.filter(s => !s.isLargest).forEach(s => {
    slicesHtml += `
      <path d="${s.pathD}" fill="${s.color}" class="transition-all hover:opacity-90 cursor-pointer">
        <title>${s.name}: ₹${Math.round(s.amount).toLocaleString('en-IN')} (${Math.round((s.amount / sum) * 100)}%)</title>
      </path>
    `;
  });
  slices.filter(s => s.isLargest).forEach(s => {
    slicesHtml += `
      <path d="${s.pathD}" fill="${s.color}" filter="url(#${filterId})" class="transition-all hover:opacity-95 cursor-pointer">
        <title>${s.name} (Primary): ₹${Math.round(s.amount).toLocaleString('en-IN')} (${Math.round((s.amount / sum) * 100)}%)</title>
      </path>
    `;
  });

  // Callout leader lines & labels
  let calloutsHtml = '';

  // Left callouts
  const leftCount = leftSlices.length;
  if (leftCount > 0) {
    const step = leftCount === 1 ? 0 : Math.min(65, 220 / (leftCount - 1));
    const startY = leftCount === 1 ? cy : cy - ((leftCount - 1) * step) / 2;
    leftSlices.forEach((it, i) => {
      const targetY = startY + i * step;
      const endX = 24;
      const elbowX = 145;
      const amtStr = formatCalloutAmount(it.amount);
      const pctStr = (Math.round((it.amount / sum) * 1000) / 10).toFixed(1).replace(/\.0$/, '');
      calloutsHtml += `
        <g class="cursor-pointer group">
          <title>${it.name}: ₹${Math.round(it.amount).toLocaleString('en-IN')} (${pctStr}%)</title>
          <path d="M ${it.attachX.toFixed(1)} ${it.attachY.toFixed(1)} L ${it.stubX.toFixed(1)} ${it.stubY.toFixed(1)} L ${elbowX} ${targetY.toFixed(1)} L ${endX} ${targetY.toFixed(1)}"
                stroke="${it.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.95" />
          <text x="${endX}" y="${(targetY - 6).toFixed(1)}" text-anchor="start" fill="${it.color}" font-size="15px" font-weight="800" font-family="'Plus Jakarta Sans', sans-serif">${amtStr}</text>
          <text x="${endX}" y="${(targetY + 16).toFixed(1)}" text-anchor="start" fill="#334155" font-size="12px" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif">${it.name} <tspan fill="#64748b" font-weight="500">(${pctStr}%)</tspan></text>
        </g>
      `;
    });
  }

  // Right callouts
  const rightCount = rightSlices.length;
  if (rightCount > 0) {
    const step = rightCount === 1 ? 0 : Math.min(65, 220 / (rightCount - 1));
    const startY = rightCount === 1 ? cy : cy - ((rightCount - 1) * step) / 2;
    rightSlices.forEach((it, i) => {
      const targetY = startY + i * step;
      const endX = 556;
      const elbowX = 435;
      const amtStr = formatCalloutAmount(it.amount);
      const pctStr = (Math.round((it.amount / sum) * 1000) / 10).toFixed(1).replace(/\.0$/, '');
      calloutsHtml += `
        <g class="cursor-pointer group">
          <title>${it.name}: ₹${Math.round(it.amount).toLocaleString('en-IN')} (${pctStr}%)</title>
          <path d="M ${it.attachX.toFixed(1)} ${it.attachY.toFixed(1)} L ${it.stubX.toFixed(1)} ${it.stubY.toFixed(1)} L ${elbowX} ${targetY.toFixed(1)} L ${endX} ${targetY.toFixed(1)}"
                stroke="${it.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.95" />
          <text x="${endX}" y="${(targetY - 6).toFixed(1)}" text-anchor="end" fill="${it.color}" font-size="15px" font-weight="800" font-family="'Plus Jakarta Sans', sans-serif">${amtStr}</text>
          <text x="${endX}" y="${(targetY + 16).toFixed(1)}" text-anchor="end" fill="#334155" font-size="12px" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif">${it.name} <tspan fill="#64748b" font-weight="500">(${pctStr}%)</tspan></text>
        </g>
      `;
    });
  }

  // Center Dark Navy Badge
  const centerAmtStr = formatCalloutCenter(totalValue);
  const centerFontSize = centerAmtStr.length > 8 ? '18px' : '22px';
  const centerBadgeHtml = `
    <circle cx="${cx}" cy="${cy}" r="62" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="${cx}" y="166" text-anchor="middle" fill="#ffffff" font-size="${centerFontSize}" font-weight="800" font-family="'Plus Jakarta Sans', sans-serif">${centerAmtStr}</text>
    <text x="${cx}" y="182" text-anchor="middle" fill="#94a3b8" font-size="8.5px" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif" letter-spacing="0.08em">${centerTitle}</text>
  `;

  svgEl.innerHTML = defs + slicesHtml + calloutsHtml + centerBadgeHtml;
}

/**
 * Render Revenue by Product Donut Chart using the reference callout design
 */
function renderDonutChart(streamYield, totalRev, totalPeople) {
  const xerox = streamYield['Xerox Services'] || { amount: 0, customers: 0, pct: 0 };
  const prod = streamYield['Product Sales'] || { amount: 0, customers: 0, pct: 0 };
  const combo = streamYield['Combo Services'] || { amount: 0, customers: 0, pct: 0 };

  const items = [
    { name: 'Xerox Services', amount: xerox.amount || 0, pct: xerox.pct || 0, color: '#4338CA', customers: xerox.customers || 0 },
    { name: 'Combo Bundles', amount: combo.amount || 0, pct: combo.pct || 0, color: '#F59E0B', customers: combo.customers || 0 },
    { name: 'Product Sales', amount: prod.amount || 0, pct: prod.pct || 0, color: '#059669', customers: prod.customers || 0 }
  ];

  const svgEl = document.getElementById('donut-svg-ring');
  renderCalloutDonutSVG(svgEl, items, totalRev, 'GROSS REVENUE', 'rev-pie-shadow', 'NO REVENUE');
}

/**
 * Render Spending Breakdown: Only Pie Chart with Reference Callout Design
 */
function renderSpendingCharts(breakdown, summary, totalSpend) {
  renderSpendingPieChart(breakdown, summary, totalSpend);
}

function renderSpendingPieChart(breakdown, summary, totalSpend) {
  const svgEl = document.getElementById('spending-pie-ring');
  if (!svgEl) return;

  const items = (breakdown || []).map(cat => ({
    name: cat.category,
    amount: cat.amount || 0,
    pct: cat.pct || 0,
    color: cat.color || '#6366F1',
    count: cat.count || 0
  }));

  renderCalloutDonutSVG(svgEl, items, totalSpend, 'TOTAL SPEND', 'spend-pie-shadow', 'NO SPEND');
}

// Deprecated bar chart handlers retained as no-ops to protect any stale event bindings
function setSpendingChartMode() {}
function slideSpendingBar() {}
function onSpendingBarSlider() {}
function renderSpendingBarChart() {}

function formatSpoolDate(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return dateStr || '—';
  const parts = dateStr.split('-');
  const y = parts[0];
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m] || ''} ${d}, ${y}`;
}

function updateSpoolActivityUI(data) {
  if (!data) return;
  state.analysis.spoolData = data;
  state.analysis.spoolYear = String(data.year);

  // 1. Populate Year dropdown options
  const selectEl = document.getElementById('spool-year-select');
  if (selectEl && data.available_years) {
    selectEl.innerHTML = data.available_years.map(y => `
      <option value="${y}" class="bg-white text-slate-800" ${String(y) === String(data.year) ? 'selected' : ''}>${y}</option>
    `).join('');
  }

  // 2. Update KPI Stat Cards
  const totalJobsEl = document.getElementById('spool-stat-total-jobs');
  if (totalJobsEl) totalJobsEl.textContent = data.summary.total_jobs.toLocaleString('en-IN');

  const activeDaysEl = document.getElementById('spool-stat-active-days');
  if (activeDaysEl) activeDaysEl.textContent = `${data.summary.active_days} days`;

  const peakDayEl = document.getElementById('spool-stat-peak-day');
  if (peakDayEl) {
    peakDayEl.textContent = data.summary.peak_day !== 'N/A' ? formatSpoolDate(data.summary.peak_day) : '—';
  }
  const peakCountEl = document.getElementById('spool-stat-peak-count');
  if (peakCountEl) {
    peakCountEl.textContent = `${data.summary.peak_day_count} jobs peak day`;
  }

  const busiestMonthEl = document.getElementById('spool-stat-busiest-month');
  if (busiestMonthEl) {
    busiestMonthEl.textContent = data.summary.busiest_month;
  }

  // 3. Render Calendar Heatmap for Selected Year
  renderHeatmap(data.heatmap_data, data.year);
}

async function loadSpoolActivity(year) {
  const targetYear = year || state.analysis.spoolYear || '2026';
  state.analysis.spoolYear = String(targetYear);

  try {
    const res = await fetch(`/api/spool/activity?year=${targetYear}`);
    if (!res.ok) throw new Error("Failed to load spool activity");
    const data = await res.json();
    updateSpoolActivityUI(data);
  } catch (err) {
    console.error("Spool activity error:", err);
  }
}

function onSpoolYearChange(newYear) {
  if (!newYear) return;
  state.analysis.spoolYear = String(newYear);
  loadSpoolActivity(newYear);
  showToast(`Switched Spool Activity to ${newYear}`);
}

function renderHeatmap(heatmapData, targetYear) {
  const container = document.getElementById('analysis-heatmap-grid');
  if (!container) return;
  container.innerHTML = '';

  const monthsContainer = document.getElementById('analysis-heatmap-months');
  if (monthsContainer) monthsContainer.innerHTML = '';

  // Clean GitHub-style light mode green palette for white theme
  const greenColors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  const yr = parseInt(targetYear || state.analysis.spoolYear || '2026', 10);

  // Find start Sunday (day 0) on or before Jan 1 of targetYear
  const jan1 = new Date(yr, 0, 1);
  const startDay = new Date(yr, 0, 1 - jan1.getDay());

  // End on or after Dec 31 (up to Saturday)
  const dec31 = new Date(yr, 11, 31);
  const endDay = new Date(yr, 11, 31 + (6 - dec31.getDay()));
  const totalWeeks = Math.max(52, Math.min(54, Math.round((endDay - startDay) / (7 * 24 * 60 * 60 * 1000))));

  const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let lastLabeledMonth = -1;

  // Build calendar week columns for target year
  for (let w = 0; w < totalWeeks; w++) {
    // 1. Column for the month label (exact same column width w-[11px] so months align with weeks)
    if (monthsContainer) {
      const monthCol = document.createElement('div');
      monthCol.className = 'w-[11px] h-4 relative shrink-0';

      // Check if a new month starts in this week
      let monthToLabel = -1;
      for (let d = 0; d < 7; d++) {
        const curDate = new Date(startDay);
        curDate.setDate(curDate.getDate() + (w * 7) + d);
        if (curDate.getFullYear() === yr) {
          const m = curDate.getMonth();
          if (m !== lastLabeledMonth) {
            monthToLabel = m;
            lastLabeledMonth = m;
            break;
          }
        }
      }

      if (monthToLabel !== -1) {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'absolute left-0 top-0 text-[10px] font-mono font-medium text-slate-500 pointer-events-none select-none';
        labelSpan.textContent = monthShorts[monthToLabel];
        monthCol.appendChild(labelSpan);
      }
      monthsContainer.appendChild(monthCol);
    }

    // 2. Column for the activity cells
    const col = document.createElement('div');
    col.className = 'flex flex-col gap-[3px] shrink-0';

    for (let d = 0; d < 7; d++) {
      const curDate = new Date(startDay);
      curDate.setDate(curDate.getDate() + (w * 7) + d);

      const y = curDate.getFullYear();
      const m = curDate.getMonth();
      const dateNum = curDate.getDate();

      if (y !== yr) {
        // Outside target calendar year: invisible placeholder cell
        const spacer = document.createElement('div');
        spacer.className = 'w-[11px] h-[11px] opacity-0 pointer-events-none';
        col.appendChild(spacer);
        continue;
      }

      const mm = String(m + 1).padStart(2, '0');
      const dd = String(dateNum).padStart(2, '0');
      const dateStr = `${y}-${mm}-${dd}`;

      const entry = heatmapData ? heatmapData[dateStr] : null;
      const jobsCount = (typeof entry === 'object' && entry !== null) ? (entry.count || 0) : (entry || 0);
      const amount = (typeof entry === 'object' && entry !== null) ? (entry.amount || 0) : 0;

      let colorIdx = 0;
      if (jobsCount > 15) colorIdx = 4;
      else if (jobsCount > 8) colorIdx = 3;
      else if (jobsCount > 3) colorIdx = 2;
      else if (jobsCount > 0) colorIdx = 1;

      const cell = document.createElement('div');
      cell.className = `w-[11px] h-[11px] rounded-[2px] ${colorIdx === 0 ? 'border border-slate-200/60' : ''} transition-all hover:scale-125 cursor-pointer relative`;
      cell.style.backgroundColor = greenColors[colorIdx];
      cell.title = `${dateStr}: ${jobsCount} ${jobsCount === 1 ? 'activity' : 'activities'} recorded${
        amount > 0 ? ' (₹' + amount.toLocaleString('en-IN') + ')' : ''
      }`;

      col.appendChild(cell);
    }

    container.appendChild(col);
  }
}

function exportFiscalCSV() {
  window.location.href = '/api/export/csv';
  showToast("Downloading complete fiscal telemetry CSV...");
}

// =========================================================================
// 7. SETTINGS & PRODUCTS CATALOG MANAGEMENT
// =========================================================================
async function loadProductsCatalog() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      state.products = await res.json();
      renderCatalogTable();
      renderProductsDropdown();
      const badge = document.getElementById('catalog-count-badge');
      if (badge) badge.textContent = `${state.products.length} Products & Services`;
    }
  } catch (err) {
    console.error("Failed to load catalog:", err);
  }
}

function renderCatalogTable(filterText = null) {
  const tbody = document.getElementById('catalog-table-body');
  if (!tbody) return;

  const query = (filterText !== null ? filterText : (state.catalogSearch || '')).trim().toLowerCase();
  const allowedCats = state.catalogCategories || ['Xerox Services', 'Product Sales'];

  let items = state.products.filter(p => {
    const matchesQuery = !query ||
      p.product_code.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query);
    const matchesCat = allowedCats.includes(p.category);
    return matchesQuery && matchesCat;
  });

  // Apply Catalog Sorting
  const sort = state.catalogSort || 'default';
  if (sort === 'price_asc') {
    items.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    items.sort((a, b) => b.price - a.price);
  } else if (sort === 'name_asc') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'name_desc') {
    items.sort((a, b) => b.name.localeCompare(a.name));
  }

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-400 font-body text-[12px]">
          No products found matching the selected filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(p => {
    const catClass = p.category === 'Xerox Services' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                     (p.category === 'Product Sales' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100');
    return `
      <tr class="hover:bg-slate-50/70 transition-colors">
        <td class="py-3 px-4 font-mono font-bold text-indigo-700">
          <span class="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">${p.product_code}</span>
        </td>
        <td class="py-3 px-4 font-medium text-slate-900">${p.name}</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${catClass}">${p.category}</span>
        </td>
        <td class="py-3 px-4 text-right font-headline font-bold text-slate-900">
          ₹${p.price.toFixed(2)}
        </td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-1">
            <button onclick="openEditProduct(${p.id})" title="Edit product" class="p-1.5 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onclick="deleteProductItem(${p.id}, '${p.product_code}', '${p.name.replace(/'/g, "\\'")}')" title="Delete product" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterCatalogTable(val) {
  // Staged input typing - updates table on Enter or Apply button
}

function toggleCatalogPriceSort() {
  const current = state.catalogSort;
  const next = (current === 'price_asc') ? 'price_desc' : 'price_asc';
  state.catalogSort = next;
  syncCatalogSortUI();
  renderCatalogTable();
  const label = next === 'price_asc' ? 'Price: Lowest to Highest' : 'Price: Highest to Lowest';
  showToast(`Sorted by ${label}`);
}

function toggleCatalogNameSort() {
  const current = state.catalogSort;
  const next = (current === 'name_asc') ? 'name_desc' : 'name_asc';
  state.catalogSort = next;
  syncCatalogSortUI();
  renderCatalogTable();
  const label = next === 'name_asc' ? 'Name: A to Z' : 'Name: Z to A';
  showToast(`Sorted by ${label}`);
}

function applyCatalogFilters() {
  const searchInput = document.getElementById('catalog-search');
  state.catalogSearch = searchInput ? searchInput.value.trim() : '';

  const cats = [];
  ['xerox', 'product'].forEach(key => {
    const cb = document.getElementById(`cat-filter-${key}`);
    if (cb && cb.checked) cats.push(cb.value);
  });
  state.catalogCategories = cats.length > 0 ? cats : ['Xerox Services', 'Product Sales'];

  const pop = document.getElementById('popover-catalog-cat');
  if (pop && !pop.classList.contains('hidden')) pop.classList.add('hidden');

  const catBtnLabel = document.getElementById('catalog-cat-btn-label');
  if (catBtnLabel) {
    if (state.catalogCategories.length === 2) catBtnLabel.textContent = 'Categories: All';
    else catBtnLabel.textContent = `Categories (${state.catalogCategories.length})`;
  }

  syncCatalogSortUI();
  renderCatalogTable();
  showToast("Catalog filters applied");
}

function resetCatalogFilters() {
  state.catalogSearch = '';
  state.catalogSort = 'default';
  state.catalogCategories = ['Xerox Services', 'Product Sales'];

  const searchInput = document.getElementById('catalog-search');
  if (searchInput) searchInput.value = '';

  ['xerox', 'product'].forEach(key => {
    const cb = document.getElementById(`cat-filter-${key}`);
    if (cb) cb.checked = true;
  });

  const catBtnLabel = document.getElementById('catalog-cat-btn-label');
  if (catBtnLabel) catBtnLabel.textContent = 'Categories: All';

  syncCatalogSortUI();
  renderCatalogTable();
  showToast("Catalog filters reset");
}

function syncCatalogSortUI() {
  const s = state.catalogSort || 'default';

  const colPrice = document.getElementById('col-sort-cat-price');
  const colName = document.getElementById('col-sort-cat-name');

  if (colPrice) {
    if (s === 'price_asc') {
      colPrice.textContent = 'arrow_upward';
      colPrice.className = 'material-symbols-outlined text-[15px] text-indigo-600';
    } else if (s === 'price_desc') {
      colPrice.textContent = 'arrow_downward';
      colPrice.className = 'material-symbols-outlined text-[15px] text-indigo-600';
    } else {
      colPrice.textContent = 'unfold_more';
      colPrice.className = 'material-symbols-outlined text-[15px] text-slate-300';
    }
  }

  if (colName) {
    if (s === 'name_asc') {
      colName.textContent = 'arrow_upward';
      colName.className = 'material-symbols-outlined text-[15px] text-indigo-600';
    } else if (s === 'name_desc') {
      colName.textContent = 'arrow_downward';
      colName.className = 'material-symbols-outlined text-[15px] text-indigo-600';
    } else {
      colName.textContent = 'unfold_more';
      colName.className = 'material-symbols-outlined text-[15px] text-slate-300';
    }
  }
}

async function handleNewProductSubmit(e) {
  e.preventDefault();
  const codeInput = document.getElementById('new-prod-code');
  const nameInput = document.getElementById('new-prod-name');
  const priceInput = document.getElementById('new-prod-price');
  const catInput = document.getElementById('new-prod-category');

  const product_code = codeInput.value.trim().toUpperCase();
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value) || 0;
  const category = catInput.value;

  if (!product_code || !name) {
    showToast("Product ID and Product Name are required", "error");
    return;
  }

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_code, name, price, category })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to add product", "error");
      return;
    }

    showToast(`Product [${product_code}] ${name} added!`);
    codeInput.value = '';
    nameInput.value = '';
    priceInput.value = '';
    loadProductsCatalog();
  } catch (err) {
    showToast("Network error while adding product", "error");
  }
}

async function deleteProductItem(id, code, name) {
  if (!confirm(`Are you sure you want to delete ${code} - ${name}?`)) return;
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Delete failed");
    showToast(`Deleted product ${code}`);
    loadProductsCatalog();
  } catch (err) {
    showToast("Error deleting product", "error");
  }
}

async function openEditProduct(id) {
  try {
    let p = state.products.find(item => item.id === id);
    if (!p) {
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) p = await res.json();
    }
    if (!p) throw new Error("Product not found");

    document.getElementById('edit-prod-id').value = p.id;
    document.getElementById('edit-prod-code').value = p.product_code;
    document.getElementById('edit-prod-name').value = p.name;
    document.getElementById('edit-prod-category').value = p.category || 'Xerox Services';
    document.getElementById('edit-prod-price').value = p.price;

    openModal('modal-edit-product');
  } catch (err) {
    showToast("Error opening product for edit", "error");
  }
}

async function handleEditProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-prod-id').value;
  const product_code = document.getElementById('edit-prod-code').value.trim().toUpperCase();
  const name = document.getElementById('edit-prod-name').value.trim();
  const price = parseFloat(document.getElementById('edit-prod-price').value) || 0;
  const category = document.getElementById('edit-prod-category').value;

  if (!product_code || !name) {
    showToast("Product ID and Product Name are required", "error");
    return;
  }

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_code, name, price, category })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to update product", "error");
      return;
    }

    showToast(`Product [${product_code}] updated!`);
    closeModal('modal-edit-product');
    loadProductsCatalog();
  } catch (err) {
    showToast("Network error while updating product", "error");
  }
}

async function loadSettingsPage() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const s = await res.json();
      const nameEl = document.getElementById('page-set-shop-name');
      const tagEl = document.getElementById('page-set-shop-tagline');
      const addrEl = document.getElementById('page-set-shop-addr');
      const phoneEl = document.getElementById('page-set-shop-phone');
      const prefixEl = document.getElementById('page-set-bill-prefix');
      const gstEl = document.getElementById('page-set-gst-number');
      const xeroxEl = document.getElementById('page-set-xerox-rate');
      const bindEl = document.getElementById('page-set-binding-rate');

      if (nameEl) nameEl.value = s.shop_name || '';
      if (tagEl) tagEl.value = s.tagline || '';
      if (addrEl) addrEl.value = s.address || '';
      if (phoneEl) phoneEl.value = s.phone || '';
      if (prefixEl) prefixEl.value = s.bill_prefix || 'BL';
      if (gstEl) gstEl.value = s.gst_number || '';
      if (xeroxEl) xeroxEl.value = s.default_xerox_rate || 1.5;
      if (bindEl) bindEl.value = s.default_binding_rate || 60;
    }
  } catch (err) {
    console.error("Could not load settings:", err);
  }
}

async function handleSettingsPageSubmit(e) {
  e.preventDefault();
  const payload = {
    shop_name: document.getElementById('page-set-shop-name')?.value.trim() || '',
    tagline: document.getElementById('page-set-shop-tagline')?.value.trim() || '',
    address: document.getElementById('page-set-shop-addr')?.value.trim() || '',
    phone: document.getElementById('page-set-shop-phone')?.value.trim() || '',
    bill_prefix: document.getElementById('page-set-bill-prefix')?.value.trim() || 'BL',
    gst_number: document.getElementById('page-set-gst-number')?.value.trim() || ''
  };

  const xeroxEl = document.getElementById('page-set-xerox-rate');
  if (xeroxEl) payload.default_xerox_rate = parseFloat(xeroxEl.value) || 1.5;
  const bindEl = document.getElementById('page-set-binding-rate');
  if (bindEl) payload.default_binding_rate = parseFloat(bindEl.value) || 60;

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to save settings");
    showToast("Shop settings saved successfully!");
    await loadShopSettings();
  } catch (err) {
    showToast("Error updating shop settings", "error");
  }
}

async function loadSettingsIntoModal() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const s = await res.json();
    const nameEl = document.getElementById('set-shop-name');
    const tagEl = document.getElementById('set-shop-tagline');
    const addrEl = document.getElementById('set-shop-addr');
    const phoneEl = document.getElementById('set-shop-phone');
    const prefixEl = document.getElementById('set-bill-prefix');
    const gstEl = document.getElementById('set-gst-number');
    const xeroxEl = document.getElementById('set-xerox-rate');
    const bindEl = document.getElementById('set-binding-rate');

    if (nameEl) nameEl.value = s.shop_name || '';
    if (tagEl) tagEl.value = s.tagline || '';
    if (addrEl) addrEl.value = s.address || '';
    if (phoneEl) phoneEl.value = s.phone || '';
    if (prefixEl) prefixEl.value = s.bill_prefix || 'BL';
    if (gstEl) gstEl.value = s.gst_number || '';
    if (xeroxEl) xeroxEl.value = s.default_xerox_rate || 1.5;
    if (bindEl) bindEl.value = s.default_binding_rate || 50;
  } catch (e) {
    console.error("Could not load settings", e);
  }
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const data = {
    shop_name: document.getElementById('set-shop-name')?.value || '',
    tagline: document.getElementById('set-shop-tagline')?.value || '',
    address: document.getElementById('set-shop-addr')?.value || '',
    phone: document.getElementById('set-shop-phone')?.value || '',
    bill_prefix: document.getElementById('set-bill-prefix')?.value || 'BL',
    gst_number: document.getElementById('set-gst-number')?.value || ''
  };

  const xeroxEl = document.getElementById('set-xerox-rate');
  if (xeroxEl) data.default_xerox_rate = parseFloat(xeroxEl.value) || 1.5;
  const bindEl = document.getElementById('set-binding-rate');
  if (bindEl) data.default_binding_rate = parseFloat(bindEl.value) || 50;

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to save settings");
    showToast("Shop settings updated!");
    closeModal('modal-settings');
    await loadShopSettings();
    fetchNextBillNumber();
  } catch (err) {
    showToast("Error updating settings", "error");
  }
}

// =========================================================================
// 8. INITIALIZATION ON DOM READY
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupIncomeFilters();
  setupSpendingFilters();
  syncIncomeSortUI();
  syncSpendingSortUI();
  syncCatalogSortUI();
  loadShopSettings();
  loadTodaySummary();
  loadIncomeRecords();
  loadProductsForBilling();
  updateRecycleBadge();
});

// =========================================================================
// 9. RECYCLE BIN CLIENT LOGIC
// =========================================================================

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function updateRecycleBadge() {
  try {
    const res = await fetch('/api/recycle-bin/summary');
    if (!res.ok) return;
    const data = await res.json();
    updateRecycleBadgeCounts(data.total_count || 0);

    const incEl = document.getElementById('recycle-count-income');
    if (incEl) incEl.textContent = data.income_count || 0;

    const expEl = document.getElementById('recycle-count-spending');
    if (expEl) expEl.textContent = data.spending_count || 0;
  } catch (err) {
    console.error("Error updating recycle bin badge:", err);
  }
}

function updateRecycleBadgeCounts(total) {
  const badge = document.getElementById('nav-recycle-badge');
  if (!badge) return;
  if (total > 0) {
    badge.textContent = total;
    badge.classList.remove('hidden');
  } else {
    badge.textContent = '0';
    badge.classList.add('hidden');
  }
}

function switchRecycleCategory(cat) {
  if (cat !== 'income' && cat !== 'expense') cat = 'income';
  state.recycle.category = cat;
  state.recycle.page = 1;

  const incomeTab = document.getElementById('recycle-tab-income');
  const spendingTab = document.getElementById('recycle-tab-spending');
  const incomeDot = document.getElementById('recycle-income-active-dot');
  const spendingDot = document.getElementById('recycle-spending-active-dot');
  const catBadge = document.getElementById('recycle-category-badge');
  const emptyLabel = document.getElementById('recycle-empty-label');

  if (cat === 'income') {
    if (incomeTab) {
      incomeTab.className = "cursor-pointer bg-white p-5 rounded-2xl border-2 border-indigo-600 shadow-sm transition-all hover:shadow-md flex items-center justify-between ring-2 ring-indigo-50";
    }
    if (spendingTab) {
      spendingTab.className = "cursor-pointer bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm transition-all hover:border-slate-300 hover:shadow-md flex items-center justify-between";
    }
    if (incomeDot) incomeDot.classList.remove('hidden');
    if (spendingDot) spendingDot.classList.add('hidden');
    if (catBadge) {
      catBadge.textContent = "Income Billing Trash";
      catBadge.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-100 text-indigo-800";
    }
    if (emptyLabel) emptyLabel.textContent = "Income Billing";
  } else {
    if (incomeTab) {
      incomeTab.className = "cursor-pointer bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm transition-all hover:border-slate-300 hover:shadow-md flex items-center justify-between";
    }
    if (spendingTab) {
      spendingTab.className = "cursor-pointer bg-white p-5 rounded-2xl border-2 border-rose-600 shadow-sm transition-all hover:shadow-md flex items-center justify-between ring-2 ring-rose-50";
    }
    if (incomeDot) incomeDot.classList.add('hidden');
    if (spendingDot) spendingDot.classList.remove('hidden');
    if (catBadge) {
      catBadge.textContent = "Spending Details Trash";
      catBadge.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800";
    }
    if (emptyLabel) emptyLabel.textContent = "Spending Details";
  }

  loadRecycleBinRecords();
}

async function loadRecycleBinRecords() {
  const tableBody = document.getElementById('recycle-table-body');
  const emptyState = document.getElementById('recycle-empty-state');
  const paginationEl = document.getElementById('recycle-pagination');
  const countLabel = document.getElementById('recycle-table-count-label');
  const headRow = document.getElementById('recycle-table-head-row');

  // Configure appropriate table headers for the active tab
  if (headRow) {
    if (state.recycle.category === 'income') {
      headRow.innerHTML = `
        <th class="py-3 px-4">Deletion ID</th>
        <th class="py-3 px-4">Deleted At</th>
        <th class="py-3 px-4">Tx Code</th>
        <th class="py-3 px-4">Original Date</th>
        <th class="py-3 px-4">Customer</th>
        <th class="py-3 px-4">Category</th>
        <th class="py-3 px-4 text-right">Amount (₹)</th>
        <th class="py-3 px-4">Payment</th>
        <th class="py-3 px-4 text-right">Actions</th>
      `;
    } else {
      headRow.innerHTML = `
        <th class="py-3 px-4">Deletion ID</th>
        <th class="py-3 px-4">Deleted At</th>
        <th class="py-3 px-4">Expense Code</th>
        <th class="py-3 px-4">Original Date</th>
        <th class="py-3 px-4">Payee</th>
        <th class="py-3 px-4">Category</th>
        <th class="py-3 px-4 text-right">Amount (₹)</th>
        <th class="py-3 px-4">Payment</th>
        <th class="py-3 px-4 text-right">Actions</th>
      `;
    }
  }

  try {
    const params = new URLSearchParams({
      type: state.recycle.category,
      search: state.recycle.search || '',
      page: state.recycle.page,
      per_page: state.recycle.perPage
    });

    const res = await fetch(`/api/recycle-bin?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load recycle records");
    const data = await res.json();

    // Sync tab counters
    if (data.counts) {
      const incEl = document.getElementById('recycle-count-income');
      if (incEl) incEl.textContent = data.counts.income || 0;
      const expEl = document.getElementById('recycle-count-spending');
      if (expEl) expEl.textContent = data.counts.spending || 0;
      updateRecycleBadgeCounts(data.counts.total || 0);
    }

    if (countLabel) {
      countLabel.textContent = `Showing ${data.total_records} deleted record${data.total_records === 1 ? '' : 's'} (Page ${data.page} of ${data.total_pages})`;
    }

    if (!data.items || data.items.length === 0) {
      if (tableBody) tableBody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    if (tableBody) {
      tableBody.innerHTML = data.items.map(item => {
        const pmClass = item.payment_method === 'Cash'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : (item.payment_method === 'UPI' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200');

        return `
          <tr class="hover:bg-slate-50/80 transition-colors">
            <td class="py-3 px-4">
              <span class="inline-flex items-center gap-1 font-mono font-bold text-amber-800 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                <span class="material-symbols-outlined text-[13px]">delete</span>
                <span>${escapeHtml(item.deletion_id)}</span>
              </span>
            </td>
            <td class="py-3 px-4">
              <span class="font-mono text-slate-600 text-[11px]">${escapeHtml(item.deleted_at)}</span>
            </td>
            <td class="py-3 px-4 font-mono font-semibold text-slate-800">
              ${escapeHtml(item.record_identifier)}
            </td>
            <td class="py-3 px-4 text-slate-500 font-mono text-[11px]">
              ${escapeHtml(item.original_date || '-')}
            </td>
            <td class="py-3 px-4 text-slate-700 font-medium">
              ${escapeHtml(item.customer_or_payee || '-')}
            </td>
            <td class="py-3 px-4">
              <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                ${escapeHtml(item.category || '-')}
              </span>
            </td>
            <td class="py-3 px-4 text-right font-headline font-bold text-slate-900">
              ₹${Number(item.amount).toFixed(2)}
            </td>
            <td class="py-3 px-4">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${pmClass}">
                ${escapeHtml(item.payment_method || 'Cash')}
              </span>
            </td>
            <td class="py-3 px-4 text-right">
              <div class="inline-flex items-center gap-1">
                <button onclick="openRecycleDetails(${item.id})" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Preserved Original Data">
                  <span class="material-symbols-outlined text-[17px]">visibility</span>
                </button>
                <button onclick="restoreDeletedRecord(${item.id}, '${escapeHtml(item.record_identifier)}', '${escapeHtml(item.deletion_id)}')" class="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Restore to Active Records">
                  <span class="material-symbols-outlined text-[17px]">restore</span>
                </button>
                <button onclick="permanentDeleteRecycleRecord(${item.id}, '${escapeHtml(item.record_identifier)}', '${escapeHtml(item.deletion_id)}')" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Permanently">
                  <span class="material-symbols-outlined text-[17px]">delete_forever</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    renderRecyclePagination(data.total_records, data.page, data.total_pages);
  } catch (err) {
    console.error("Error loading recycle bin records:", err);
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-rose-500">Error loading deleted records.</td></tr>`;
  }
}

function renderRecyclePagination(total, page, totalPages) {
  const container = document.getElementById('recycle-pagination');
  if (!container) return;

  if (total === 0) {
    container.innerHTML = '';
    return;
  }

  const startEntry = (page - 1) * state.recycle.perPage + 1;
  const endEntry = Math.min(page * state.recycle.perPage, total);

  let pageButtons = '';
  for (let i = 1; i <= Math.min(5, totalPages); i++) {
    if (i === page) {
      pageButtons += `<button class="px-3 py-1 rounded-lg bg-indigo-700 text-white font-semibold text-[12px]">${i}</button>`;
    } else {
      pageButtons += `<button onclick="changeRecyclePage(${i})" class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px]">${i}</button>`;
    }
  }

  container.innerHTML = `
    <span class="text-[12px] text-slate-500">Showing <strong class="text-slate-700">${startEntry} - ${endEntry}</strong> of <strong class="text-slate-700">${total}</strong> deleted entries</span>
    <div class="flex items-center gap-1">
      <button onclick="changeRecyclePage(${page - 1})" class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] disabled:opacity-40" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      ${pageButtons}
      <button onclick="changeRecyclePage(${page + 1})" class="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[12px] disabled:opacity-40" ${page >= totalPages ? 'disabled' : ''}>Next</button>
    </div>
  `;
}

function changeRecyclePage(newPage) {
  if (newPage < 1) return;
  state.recycle.page = newPage;
  loadRecycleBinRecords();
}

function handleRecycleSearchKeyup(e) {
  if (e.key === 'Enter') {
    applyRecycleSearch();
  }
}

function applyRecycleSearch() {
  const input = document.getElementById('recycle-search-input');
  state.recycle.search = input ? input.value.trim() : '';
  state.recycle.page = 1;
  loadRecycleBinRecords();
}

function resetRecycleSearch() {
  const input = document.getElementById('recycle-search-input');
  if (input) input.value = '';
  state.recycle.search = '';
  state.recycle.page = 1;
  loadRecycleBinRecords();
}

async function openRecycleDetails(id) {
  try {
    const res = await fetch(`/api/recycle-bin/${id}`);
    if (!res.ok) throw new Error("Could not fetch deleted record details");
    const item = await res.json();

    const subtitleEl = document.getElementById('recycle-modal-subtitle');
    if (subtitleEl) subtitleEl.textContent = `${item.record_identifier} • Preserved Snapshot`;

    const delIdEl = document.getElementById('recycle-detail-del-id');
    if (delIdEl) delIdEl.textContent = item.deletion_id;

    const delAtEl = document.getElementById('recycle-detail-deleted-at');
    if (delAtEl) delAtEl.textContent = item.deleted_at;

    const typeEl = document.getElementById('recycle-detail-type');
    if (typeEl) {
      typeEl.textContent = item.record_type === 'income' ? 'Income Billing' : 'Spending Details';
      typeEl.className = item.record_type === 'income'
        ? 'px-2 py-0.5 rounded font-bold text-[10px] bg-indigo-100 text-indigo-900 uppercase'
        : 'px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-900 uppercase';
    }

    const identEl = document.getElementById('recycle-detail-ident');
    if (identEl) identEl.textContent = item.record_identifier;

    const dateEl = document.getElementById('recycle-detail-date');
    if (dateEl) dateEl.textContent = item.original_date || '-';

    const amtEl = document.getElementById('recycle-detail-amount');
    if (amtEl) amtEl.textContent = `₹${Number(item.amount).toFixed(2)}`;

    const partyEl = document.getElementById('recycle-detail-party');
    if (partyEl) partyEl.textContent = item.customer_or_payee || (item.record_type === 'income' ? 'Walk-in Customer' : 'Counter Expense');

    const catEl = document.getElementById('recycle-detail-category');
    if (catEl) catEl.textContent = item.category || '-';

    const pmEl = document.getElementById('recycle-detail-paymethod');
    if (pmEl) pmEl.textContent = item.payment_method || 'Cash';

    const descEl = document.getElementById('recycle-detail-desc');
    if (descEl) descEl.textContent = item.description || 'No description recorded';

    // Handle bill line items if available
    const billItemsContainer = document.getElementById('recycle-bill-items-container');
    const billNumberBadge = document.getElementById('recycle-bill-number-badge');
    const billItemsList = document.getElementById('recycle-bill-items-list');

    const billDetails = item.record_data ? item.record_data.bill_details : null;
    if (billDetails && billDetails.items && billDetails.items.length > 0) {
      if (billNumberBadge) billNumberBadge.textContent = billDetails.bill_number || item.record_data.bill_number || '';
      if (billItemsList) {
        billItemsList.innerHTML = billDetails.items.map(bit => `
          <tr class="hover:bg-slate-50">
            <td class="p-2 font-body text-slate-800">${escapeHtml(bit.item_name || bit.product_code || 'Service')}</td>
            <td class="p-2 text-center">${bit.quantity}</td>
            <td class="p-2 text-right">₹${Number(bit.rate).toFixed(2)}</td>
            <td class="p-2 text-right font-bold text-slate-900">₹${Number(bit.line_total).toFixed(2)}</td>
          </tr>
        `).join('');
      }
      if (billItemsContainer) billItemsContainer.classList.remove('hidden');
    } else {
      if (billItemsContainer) billItemsContainer.classList.add('hidden');
    }

    // Handle notes
    const notesContainer = document.getElementById('recycle-notes-container');
    const notesEl = document.getElementById('recycle-detail-notes');
    const notes = item.record_data ? item.record_data.notes : null;
    if (notes && notes.trim()) {
      if (notesEl) notesEl.textContent = notes;
      if (notesContainer) notesContainer.classList.remove('hidden');
    } else {
      if (notesContainer) notesContainer.classList.add('hidden');
    }

    // Attach button actions
    const restoreBtn = document.getElementById('recycle-modal-restore-btn');
    if (restoreBtn) {
      restoreBtn.onclick = () => restoreDeletedRecord(item.id, item.record_identifier, item.deletion_id, true);
    }

    const deleteBtn = document.getElementById('recycle-modal-delete-btn');
    if (deleteBtn) {
      deleteBtn.onclick = () => permanentDeleteRecycleRecord(item.id, item.record_identifier, item.deletion_id, true);
    }

    openModal('modal-recycle-details');
  } catch (err) {
    showToast("Error opening deleted record details", "error");
  }
}

async function restoreDeletedRecord(id, code, delId, fromModal = false) {
  if (!confirm(`Restore record ${code} (Deletion ID: ${delId}) back to active records?`)) return;

  try {
    const res = await fetch(`/api/recycle-bin/${id}/restore`, { method: 'POST' });
    if (!res.ok) throw new Error("Failed to restore record");
    const data = await res.json();
    showToast(data.message || `Record ${code} successfully restored.`);

    if (fromModal) closeModal('modal-recycle-details');

    loadRecycleBinRecords();
    updateRecycleBadge();

    // Refresh active data screens
    loadTodaySummary();
    loadIncomeRecords();
    loadSpendingSummary();
    loadSpendingRecords();
  } catch (err) {
    showToast("Error restoring record", "error");
  }
}

async function permanentDeleteRecycleRecord(id, code, delId, fromModal = false) {
  if (!confirm(`Permanently delete ${code} (${delId}) from the Recycle Bin?\n\nWARNING: This action cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/recycle-bin/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to permanently delete record");
    const data = await res.json();
    showToast(data.message || `Record ${code} permanently deleted.`);

    if (fromModal) closeModal('modal-recycle-details');

    loadRecycleBinRecords();
    updateRecycleBadge();
  } catch (err) {
    showToast("Error permanently deleting record", "error");
  }
}

async function confirmEmptyRecycleBin() {
  const catLabel = state.recycle.category === 'income' ? 'Income Billing' : 'Spending Details';
  if (!confirm(`Are you sure you want to permanently delete all records in ${catLabel} from the Recycle Bin?\n\nWARNING: This action cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/recycle-bin/empty?type=${state.recycle.category}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to empty Recycle Bin");
    const data = await res.json();
    showToast(data.message || `Recycle Bin emptied for ${catLabel}.`);

    loadRecycleBinRecords();
    updateRecycleBadge();
  } catch (err) {
    showToast("Error emptying Recycle Bin", "error");
  }
}

function refreshRecycleBin() {
  loadRecycleBinRecords();
  updateRecycleBadge();
  showToast("Recycle Bin refreshed.");
}
