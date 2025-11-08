/* ===========================
   Simple Offline Expense Tracker
   Single-file demo: localStorage per-user
   Features: signup/login, add/edit/delete, search/filter,
   category pie (pure JS), budget alert, download CSV, print
   =========================== */

/* ---------- Utilities ---------- */
const qs = sel => document.querySelector(sel);
const gid = id => document.getElementById(id);

function uid() { return Date.now() + Math.floor(Math.random()*999); }

/* ---------- LocalStorage Keys ---------- */
const LS_USERS = 'et_users';  // stores { username: { password } }
const LS_CUR = 'et_currentUser';  // current logged username
// per-user transactions stored in 'et_tx_<username>'
// FIX: Added backticks to template literals
function lsKeyTx(user){ return `et_tx_${user}`; }
function lsKeyBudget(user){ return `et_budget_${user}`; }

/* ---------- AUTH LOGIC ---------- */
function getUsers(){ return JSON.parse(localStorage.getItem(LS_USERS) || '{}'); }
function saveUsers(obj){ localStorage.setItem(LS_USERS, JSON.stringify(obj)); }

function signup(username, pass){
  if(!username || !pass) { alert('Enter username & password'); return false; }
  username = username.trim();
  const users = getUsers();
  if(users[username]){ alert('User exists — choose another username'); return false; }
  users[username] = { password: pass };
  saveUsers(users);
  localStorage.setItem(LS_CUR, username);
  // initialize empty tx list
  localStorage.setItem(lsKeyTx(username), JSON.stringify([]));
  renderAuthState();
  return true;
}

function login(username, pass){
  const users = getUsers();
  if(!users[username] || users[username].password !== pass){ alert('Invalid credentials'); return false; }
  localStorage.setItem(LS_CUR, username);
  renderAuthState();
  return true;
}

function logout(){
  localStorage.removeItem(LS_CUR);
  renderAuthState();
}

/* ---------- Data Helpers ---------- */
function loadTransactions(){
  const user = localStorage.getItem(LS_CUR);
  if(!user) return [];
  return JSON.parse(localStorage.getItem(lsKeyTx(user)) || '[]');
}
function getBudget(){
  const user = localStorage.getItem(LS_CUR);
  if(!user) return null;
  const b = localStorage.getItem(lsKeyBudget(user));
  return b ? Number(b) : null;
}
function setBudget(val){
  const user = localStorage.getItem(LS_CUR);
  if(!user) return;
  if(val === null){ localStorage.removeItem(lsKeyBudget(user)); return; }
  localStorage.setItem(lsKeyBudget(user), String(val));
}

/* ---------- UI Rendering ---------- */
function renderAuthState(){
  const cur = localStorage.getItem(LS_CUR);
  const signupView = gid('signup-view');
  const loginView = gid('login-view');
  const userPanel = gid('user-panel');
  const curUserLabel = gid('cur-user');

  if(cur){
    signupView.style.display = 'none';
    loginView.style.display = 'none';
    userPanel.style.display = 'block';
    curUserLabel.innerText = cur;
    gid('budget-card').style.display = 'block';
    gid('report-card').style.display = 'block';
    gid('auth-forms').style.display = 'none';
    // load transactions dashboard
    initApp();
  } else {
    signupView.style.display = 'block';
    loginView.style.display = 'none';
    userPanel.style.display = 'none';
    gid('budget-card').style.display = 'none';
    gid('report-card').style.display = 'none';
    gid('auth-forms').style.display = 'block';
    clearMainUI();
  }
}

/* ---------- Initialize / Clear ---------- */
function clearMainUI(){
  gid('ui-balance').innerText = '₹0';
  gid('ui-income').innerText = '₹0';
  gid('ui-expense').innerText = '₹0';
  gid('txn-list').innerHTML = '';
  gid('tx-count').innerText = '0 items';
  gid('pie-legend').innerHTML = '';
  gid('top-cat').innerText = '—';
  gid('budget-info').style.display = 'none';
  gid('filter-cat').innerHTML = '<option value="">All categories</option>';
}

/* ---------- App Core ---------- */
let editId = null; // for editing

function initApp(){
  // load everything
  refreshFilterOptions();
  renderTransactions();
  gid('search').value = '';
  gid('filter-cat').value = '';
}

/* Build filter category options from transactions */
function refreshFilterOptions(){
  const tx = loadTransactions();
  const cats = new Set(tx.map(t => t.category || 'Other'));
  const sel = gid('filter-cat');
  sel.innerHTML = '<option value="">All categories</option>';
  Array.from(cats).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.innerText = c;
    sel.appendChild(opt);
  });
}

/* Render transactions list + summaries + chart */
function renderTransactions(){
  const tx = loadTransactions();
  const list = gid('txn-list');
  list.innerHTML = '';
  if(!tx || tx.length === 0){
    gid('tx-count').innerText = '0 items';
    updateSummaries([]);
    drawPie([], []);
    return;
  }

  // apply current search & filter
  const q = gid('search').value.trim().toLowerCase();
  const fcat = gid('filter-cat').value;
  const filtered = tx.filter(t => {
    const text = (t.text || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    const matchQ = !q || text.includes(q) || cat.includes(q) || String(t.amount).includes(q);
    const matchCat = !fcat || t.category === fcat;
    return matchQ && matchCat;
  });

  filtered.forEach(t => {
    const li = document.createElement('li'); li.className = 'txn';
    const left = document.createElement('div'); left.className='left';
    const chip = document.createElement('div'); chip.className='chip'; chip.innerText = t.category || 'Other';
    // FIX: Added backticks to the innerHTML assignment
    const txt = document.createElement('div'); txt.innerHTML = `<div style="font-weight:600;">${t.text}</div><div class="muted" style="font-size:12px;">${t.date || ''}</div>`;
    left.appendChild(chip); left.appendChild(txt);

    const right = document.createElement('div'); right.style.display='flex'; right.style.alignItems='center';
    const amt = document.createElement('div'); amt.className = 'amount ' + (t.amount>=0 ? 'plus' : 'minus'); amt.innerText = (t.amount>=0?'+':'-') + '₹' + Math.abs(Number(t.amount));
    const actions = document.createElement('div'); actions.className = 'tx-actions';
    const btnEdit = document.createElement('button'); btnEdit.className='small-btn'; btnEdit.innerText='Edit';
    btnEdit.onclick = ()=> startEdit(t.id);
    const btnDel = document.createElement('button'); btnDel.className='small-btn danger'; btnDel.innerText='Del';
    btnDel.onclick = ()=> { if(confirm('Delete this transaction?')) removeTransaction(t.id); };
    actions.appendChild(btnEdit); actions.appendChild(btnDel);
    right.appendChild(amt); right.appendChild(actions);

    li.appendChild(left); li.appendChild(right);
    list.appendChild(li);
  });

  gid('tx-count').innerText = filtered.length + ' items';
  updateSummaries(tx);
  refreshFilterOptions();
  const catData = aggregateByCategory(tx);
  drawPie(catData.labels, catData.data);
}

/* Add transaction */
function addTransaction(){
  const txt = gid('inp-text').value.trim();
  const cat = gid('inp-category').value;
  const am = gid('inp-amount').value;
  const date = gid('inp-date').value.trim();
  if(!txt || am === ''){ alert('Enter description and amount'); return; }
  const amt = Number(am);
  const tx = loadTransactions();
  const obj = { id: uid(), text: txt, category: cat, amount: amt, date: (date || new Date().toISOString().slice(0,10)) };
  tx.unshift(obj);
  saveTransactions(tx);
  clearForm();
  renderTransactions();
  checkBudgetAndNotify();
}

/* Start editing */
function startEdit(id){
  const tx = loadTransactions();
  const item = tx.find(t=>t.id===id);
  if(!item) return;
  editId = id;
  gid('inp-text').value = item.text;
  gid('inp-category').value = item.category || 'Other';
  gid('inp-amount').value = item.amount;
  gid('inp-date').value = item.date || '';
  gid('add-txn').style.display='none';
  gid('update-txn').style.display='inline-block';
  gid('cancel-edit').style.display='inline-block';
}

/* Update transaction */
function updateTransaction(){
  if(!editId) return;
  const tx = loadTransactions();
  const idx = tx.findIndex(t=>t.id===editId);
  if(idx<0) return;
  tx[idx].text = gid('inp-text').value.trim();
  tx[idx].category = gid('inp-category').value;
  tx[idx].amount = Number(gid('inp-amount').value);
  tx[idx].date = gid('inp-date').value || new Date().toISOString().slice(0,10);
  saveTransactions(tx);
  editId = null;
  clearForm();
  gid('add-txn').style.display='inline-block';
  gid('update-txn').style.display='none';
  gid('cancel-edit').style.display='none';
  renderTransactions();
  checkBudgetAndNotify();
}

/* Cancel edit */
function cancelEdit(){
  editId = null; clearForm();
  gid('add-txn').style.display='inline-block';
  gid('update-txn').style.display='none';
  gid('cancel-edit').style.display='none';
}

/* Remove */
function removeTransaction(id){
  let tx = loadTransactions();
  tx = tx.filter(t => t.id !== id);
  saveTransactions(tx);
  renderTransactions();
}

/* Clear form */
function clearForm(){
  gid('inp-text').value=''; gid('inp-amount').value=''; gid('inp-date').value=''; gid('inp-category').value='Food';
}

/* ---------- Summaries ---------- */
function updateSummaries(allTx){
  const tx = allTx || loadTransactions();
  const amounts = tx.map(t => Number(t.amount) || 0);
  const income = amounts.filter(a=>a>0).reduce((s,a)=>s+a,0);
  const expense = amounts.filter(a=>a<0).reduce((s,a)=>s+Math.abs(a),0);
  const balance = income - expense;
  gid('ui-income').innerText = '₹' + income.toFixed(2);
  gid('ui-expense').innerText = '₹' + expense.toFixed(2);
  gid('ui-balance').innerText = '₹' + balance.toFixed(2);
}

/* ---------- Category Aggregation & Pie ---------- */
function aggregateByCategory(tx){
  // FIX: Changed 'cons' to 'const'
  const map = {};
  tx.forEach(t => {
    const cat = t.category || 'Other';
    const val = Math.abs(Number(t.amount) || 0);
    map[cat] = (map[cat] || 0) + val;
  });
  const labels = Object.keys(map);
  const data = labels.map(l => map[l]);
  return { labels, data };
}

/* Draw pie using pure canvas (no libs) */
function drawPie(labels, data){
  const c = gid('pieCanvas');
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  if(!labels || labels.length===0){ // empty state
    ctx.fillStyle = '#f3f6f8'; ctx.fillRect(0,0,c.width,c.height);
    gid('pie-legend').innerHTML = '<div class="muted">No data to show</div>';
    gid('top-cat').innerText = '—';
    return;
  }
  // colors (repeating)
  const colors = ['#4dc9f6','#f67019','#f53794','#537bc4','#acc236','#166a8f','#8a2be2','#ffb86b'];
  const total = data.reduce((s,v)=>s+v,0) || 1;
  let start = -0.5 * Math.PI;
  const cx = c.width/2; const cy = c.height/2; const r = Math.min(cx, cy) - 10;

  labels.forEach((val, i) => {
    const slice = (data[i]/total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    start += slice;
  });

  // legend
  const legend = gid('pie-legend');
  legend.innerHTML = '';
  labels.forEach((lab, i) => {
    const pct = ((data[i]/total)*100).toFixed(1);
    const row = document.createElement('div');
    row.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><div style="width:14px;height:14px;background:${colors[i%colors.length]};border-radius:4px"></div><div>${lab} — ${pct}%</div></div>`;
    legend.appendChild(row);
  });

  // top category
  let maxIdx = 0;
  data.forEach((v,i)=>{ if(v> data[maxIdx]) maxIdx = i; });
  // FIX: Added backticks to the innerText assignment
  gid('top-cat').innerText = `${labels[maxIdx]} — ₹${data[maxIdx].toFixed(2)}`;
}

/* ---------- Budget Handling ---------- */
function checkBudgetAndNotify(){
  const b = getBudget();
  if(b === null){ gid('budget-info').style.display='none'; return; }
  const tx = loadTransactions();
  const expense = tx.filter(t=>t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0);
  if(expense > b){
    gid('budget-info').style.display='block';
    // FIX: Added backticks to the innerText assignment
    gid('budget-info').innerText = `⚠ Budget exceeded by ₹${(expense - b).toFixed(2)}`;
    gid('budget-info').style.background = '#fff1f2';
    gid('budget-info').style.color = '#7f1d1d';
    gid('budget-info').style.border = '1px solid #fee2e2';
    // lightweight alert (no spam):
    // only show alert popup if user just crossed (optional)
  } else {
    gid('budget-info').style.display='block';
    // FIX: Added backticks to the innerText assignment
    gid('budget-info').innerText = `✅ Remaining budget: ₹${(b - expense).toFixed(2)}`;
    gid('budget-info').style.background = '#ecfdf5';
    gid('budget-info').style.color = '#064e3b';
    gid('budget-info').style.border = '1px solid #d1fae5';
  }
  // FIX: Added backticks to the innerText assignment
  gid('budget-status').innerText = `Budget: ₹${b}`;
}

/* ---------- CSV / Print ---------- */
function downloadCSV(){
  const tx = loadTransactions();
  if(!tx || tx.length===0){ alert('No transactions'); return; }
  let csv = 'Date,Category,Description,Amount\n';
  tx.slice().reverse().forEach(t => {
    // FIX: Added backticks to template literal
    csv += `${t.date || ''},"${t.category}","${t.text}",${t.amount}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  // FIX: Added backticks to the download filename
  link.download = `expense_report_${(new Date()).toISOString().slice(0,10)}.csv`;
  link.click();
}

function printReport(){
  const tx = loadTransactions();
  const w = window.open('', '_blank', 'width=800,height=600');
  const totals = (()=>{ const inc = tx.filter(t=>t.amount>0).reduce((s,a)=>s+a.amount,0); const exp = tx.filter(t=>t.amount<0).reduce((s,a)=>s+Math.abs(a.amount),0); return {inc,exp,balance: inc - exp}; })();
  // FIX: Added backticks to the map function's return value
  const rows = tx.map(t => `<tr><td>${t.date||''}</td><td>${t.category}</td><td>${t.text}</td><td style="text-align:right;">${t.amount}</td></tr>`).join('');
  w.document.write(`
    <html><head><title>Expense Report</title>
    <style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ddd;padding:6px}</style>
    </head><body>
    <h2>Expense Report</h2>
    <p>Date: ${new Date().toLocaleString()}</p>
    <p>Income: ₹${totals.inc.toFixed(2)} &nbsp;&nbsp; Expense: ₹${totals.exp.toFixed(2)} &nbsp;&nbsp; Balance: ₹${totals.balance.toFixed(2)}</p>
    <table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>
  `);
}

/* ---------- Search & Filter Listeners ---------- */
gid('search').addEventListener('input', ()=> renderTransactions());
gid('filter-cat').addEventListener('change', ()=> renderTransactions());

/* ---------- Buttons & Events ---------- */
gid('to-login').addEventListener('click', ()=> { gid('signup-view').style.display='none'; gid('login-view').style.display='block'; });
gid('to-signup').addEventListener('click', ()=> { gid('signup-view').style.display='block'; gid('login-view').style.display='none'; });

gid('btn-signup').addEventListener('click', ()=> {
  const u = gid('su-username').value.trim();
  const p = gid('su-pass').value;
  if(signup(u,p)){ alert('Signed up and logged in'); initApp(); }
});
gid('btn-login').addEventListener('click', ()=> {
  const u = gid('li-username').value.trim();
  const p = gid('li-pass').value;
  if(login(u,p)){ alert('Logged in'); initApp(); }
});
gid('btn-logout').addEventListener('click', ()=> { logout(); alert('Logged out'); });

gid('add-txn').addEventListener('click', addTransaction);
gid('update-txn').addEventListener('click', updateTransaction);
gid('cancel-edit').addEventListener('click', cancelEdit);

gid('set-budget').addEventListener('click', ()=> {
  const v = Number(gid('budget-input').value);
  if(!v || v<=0) { alert('Enter valid budget'); return; }
  setBudget(v); checkBudgetAndNotify();
});
gid('clear-budget').addEventListener('click', ()=> { if(confirm('Clear budget?')) { setBudget(null); gid('budget-status').innerText='No budget set'; gid('budget-info').style.display='none'; } });

gid('download-csv').addEventListener('click', downloadCSV);
gid('print-report').addEventListener('click', printReport);

/* ---------- Helper to show categories in add form also sync filter options ---------- */
function ensureCategoryInOptions(cat){
  // add to filter and add-select if not present
  const s1 = gid('filter-cat');
  const exists1 = Array.from(s1.options).some(o => o.value === cat);
  if(!exists1){
    const o1 = document.createElement('option'); o1.value=cat; o1.innerText=cat; s1.appendChild(o1);
  }
  const s2 = gid('inp-category');
  const exists2 = Array.from(s2.options).some(o => o.value === cat);
  if(!exists2){
    const o2 = document.createElement('option'); o2.value=cat; o2.innerText=cat; s2.appendChild(o2);
  }
}

/* ---------- Aggregate + draw on load ---------- */
window.addEventListener('load', ()=>{
  renderAuthState();
  // when user exists and has budget, show status
  const cur = localStorage.getItem(LS_CUR);
  if(cur){
    gid('budget-input').value = getBudget() || '';
    checkBudgetAndNotify();
  }
});

/* ---------- Keep UI updated when storage changes (helpful if multiple tabs) ---------- */
window.addEventListener('storage', function(e){
  if(e.key && e.key.startsWith('et_tx_')) renderTransactions();
});

/* ---------- When transactions change, ensure categories updated and budget checked ---------- */
function saveTransactionsAndRefresh(arr){
  const cur = localStorage.getItem(LS_CUR);
  if(!cur) return;
  localStorage.setItem(lsKeyTx(cur), JSON.stringify(arr));
  // ensure categories exist in select
  const cats = new Set(arr.map(t => t.category || 'Other'));
  cats.forEach(c => ensureCategoryInOptions(c));
  renderTransactions();
  checkBudgetAndNotify();
}

/* Replace saveTransactions usage with saveTransactionsAndRefresh for live update */
saveTransactions = function(arr){ saveTransactionsAndRefresh(arr); };

/* End of script */