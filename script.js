/* Pennywise Expense Tracker
   Front-end-only demo: authentication is browser-local, not production-secure. */
(() => {
  "use strict";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const STORAGE = { users:"pennywise_users_v1", session:"pennywise_session_v1", data:"pennywise_data_v1" };
  const categories = {
    expense: [
      ["Food & dining","🍜","#fff0df","#bd7a27"],["Transport","🚗","#e8f0ff","#4e7ee4"],["Shopping","🛍️","#f0eaff","#8a65d8"],
      ["Bills & utilities","⚡","#fff0ef","#d86d6d"],["Entertainment","🎬","#fce9f5","#c35a9c"],["Health","♡","#e5f8ef","#16966c"],
      ["Education","📚","#e4f7fa","#268ca0"],["Travel","✈️","#e7f0ff","#527dd1"],["Personal care","✦","#f6edff","#9268c9"],["Other","◈","#eef2f5","#728196"]
    ],
    income: [["Salary","↙","#e5f8ef","#15996e"],["Freelance","⌘","#e7f0ff","#4e7ee4"],["Business","▤","#f0eaff","#8a65d8"],["Investment","↗","#fff0df","#bd7a27"],["Gift","♡","#fce9f5","#c35a9c"],["Other income","＋","#eef2f5","#728196"]]
  };
  const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0);
  const shortMoney = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",notation:Math.abs(n)>=100000?"compact":"standard",maximumFractionDigits:Math.abs(n)>=100000?1:0}).format(Number(n)||0);
  const todayISO = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
  const parseJSON = (value, fallback) => {try{return value ? JSON.parse(value) : fallback}catch{return fallback}};
  const readUsers = () => parseJSON(localStorage.getItem(STORAGE.users),[]);
  let currentUser = null, currentData = {transactions:[],budgets:[]}, activeType="expense", editingId=null, charts={}, toastTimer;
  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateLabel = iso => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
  const monthKey = iso => (iso||"").slice(0,7);
  const getCategory = (name,type) => (categories[type]||[]).find(c=>c[0]===name)||[name,"◈","#eef2f5","#728196"];
  const loadData = () => {
    const all = parseJSON(localStorage.getItem(STORAGE.data),{});
    currentData = all[currentUser.email] || {transactions:[],budgets:[]};
    if(!Array.isArray(currentData.transactions)) currentData.transactions=[];
    if(!Array.isArray(currentData.budgets)) currentData.budgets=[];
  };
  const saveData = () => {
    const all=parseJSON(localStorage.getItem(STORAGE.data),{});
    all[currentUser.email]=currentData;
    localStorage.setItem(STORAGE.data,JSON.stringify(all));
  };
  const getUserName = () => (currentUser?.name||"there").trim().split(/\s+/)[0];
  const showToast = message => {const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2700)};
  const switchAuth = mode => {
    const register=mode==="register";
    $("#authTitle").textContent=register?"Create your account":"Welcome back";
    $("#authSubtitle").textContent=register?"A clearer view of your money starts here.":"Sign in to pick up where you left off.";
    $("#nameField").hidden=!register;$("#confirmField").hidden=!register;$("#forgotBtn").hidden=register;
    $("#fullName").required=register;$("#confirmPassword").required=register;
    $("#password").autocomplete=register?"new-password":"current-password";
    $("#authSubmit").innerHTML=register?'Create account <span>→</span>':'Sign in <span>→</span>';
    $("#authSwitch").innerHTML=register?'Already have an account? <button class="text-button" id="switchToLogin" type="button">Sign in</button>':'New to Pennywise? <button class="text-button" id="switchToRegister" type="button">Create an account</button>';
    $("#loginTab").classList.toggle("active",!register);$("#registerTab").classList.toggle("active",register);
    $("#authError").textContent="";
    const switchBtn=$("#switchToLogin")||$("#switchToRegister");
    switchBtn?.addEventListener("click",()=>switchAuth(register?"login":"register"));
  };
  const showAuth = () => {$("#appView").hidden=true;$("#authView").hidden=false;switchAuth("login")};
  const enterApp = user => {
    currentUser=user;localStorage.setItem(STORAGE.session,user.email);loadData();
    $("#authView").hidden=true;$("#appView").hidden=false;
    $("#sidebarName").textContent=user.name;$("#sidebarEmail").textContent=user.email;$("#userAvatar").textContent=(user.name[0]||"U").toUpperCase();
    $("#greetingName").textContent=getUserName();$("#profileName").value=user.name;$("#profileEmail").value=user.email;
    $("#todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    renderAll();navigate("dashboard");
  };
  $("#loginTab").addEventListener("click",()=>switchAuth("login"));
  $("#registerTab").addEventListener("click",()=>switchAuth("register"));
  $("#authForm").addEventListener("submit",e=>{
    e.preventDefault();const email=$("#email").value.trim().toLowerCase(),password=$("#password").value;
    const users=readUsers();let user;
    if(!$("#confirmField").hidden){
      const name=$("#fullName").value.trim(),confirm=$("#confirmPassword").value;
      if(name.length<2){$("#authError").textContent="Please enter your full name.";return}
      if(password.length<6){$("#authError").textContent="Use at least 6 characters for your password.";return}
      if(password!==confirm){$("#authError").textContent="The passwords do not match.";return}
      if(users.some(u=>u.email===email)){$("#authError").textContent="An account with this email already exists. Please sign in.";return}
      // For this offline demo only. Never store plain-text passwords in a real application.
      user={name,email,password};users.push(user);localStorage.setItem(STORAGE.users,JSON.stringify(users));
      showToast("Your account has been created.");enterApp(user);
    }else{
      user=users.find(u=>u.email===email&&u.password===password);
      if(!user){$("#authError").textContent="Email or password is incorrect.";return}
      showToast("Welcome back!");enterApp(user);
    }
  });
  $("#forgotBtn").addEventListener("click",()=>showToast("Demo mode: create a new local account if you need to restart."));
  $("#logoutBtn").addEventListener("click",()=>{localStorage.removeItem(STORAGE.session);currentUser=null;showAuth();showToast("You have signed out.")});

  const navigate = page => {
    $$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
    $$(".nav-link[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    const names={dashboard:"Overview",transactions:"Transactions",analytics:"Analytics",budgets:"Budgets",settings:"Settings"};
    $("#breadcrumbPage").textContent=names[page]||"Overview";$("#sidebar").classList.remove("open");
    if(page==="analytics")renderAnalytics();if(page==="budgets")renderBudgets();
    if(page==="transactions")renderTransactions();
  };
  $$(".nav-link[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
  $$("[data-goto]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goto)));
  $("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  document.addEventListener("click",e=>{if(window.innerWidth<=900 && $("#sidebar").classList.contains("open")&&!$("#sidebar").contains(e.target)&&!$("#mobileMenu").contains(e.target))$("#sidebar").classList.remove("open")});

  const periodRange = period => {
    const now=new Date(), y=now.getFullYear(),m=now.getMonth();
    if(period==="month")return {from:`${y}-${String(m+1).padStart(2,"0")}-01`,to:todayISO()};
    if(period==="lastMonth"){const d=new Date(y,m-1,1);return {from:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`,to:todayISO().replace(/.*/,`${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`)}}
    if(period==="year")return {from:`${y}-01-01`,to:todayISO()};
    return {from:"0000-01-01",to:"9999-12-31"};
  };
  const inRange = (tx,range) => tx.date>=range.from&&tx.date<=range.to;
  const getPeriodTransactions = period => {const range=periodRange(period);return currentData.transactions.filter(t=>inRange(t,range))};
  const sum = (items,type) => items.filter(t=>t.type===type).reduce((n,t)=>n+Number(t.amount),0);
  const expenseCategories = () => categories.expense.map(c=>c[0]);
  const incomeCategories = () => categories.income.map(c=>c[0]);
  const fillCategoryOptions = () => {
    $("#expenseCategory").innerHTML=(activeType==="expense"?categories.expense:categories.income).map(c=>`<option value="${escapeHTML(c[0])}">${escapeHTML(c[1])} ${escapeHTML(c[0])}</option>`).join("");
  };
  const destroyChart = key => {if(charts[key]){charts[key].destroy();delete charts[key]}};
  const chartColors=["#14b889","#5a8df2","#a17be8","#f0a34d","#e779a7","#47b7c7","#ed7b72","#7d9b70","#d1b34e","#8c9bb1"];
  const chartDefaults = () => {
    if(!window.Chart)return;
    Chart.defaults.font.family="'DM Sans', sans-serif";Chart.defaults.color="#91a0af";Chart.defaults.font.size=10;
    Chart.defaults.plugins.legend.display=false;Chart.defaults.plugins.tooltip.backgroundColor="#122b40";Chart.defaults.plugins.tooltip.padding=11;Chart.defaults.plugins.tooltip.cornerRadius=8;Chart.defaults.plugins.tooltip.titleFont={weight:"bold"};
  };
  const chartLabel = iso => new Date(`${iso}-15T12:00:00`).toLocaleDateString("en-IN",{month:"short",year:"2-digit"});
  const monthlySeries = items => {
    const now=new Date(), keys=[];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)}
    const labels=keys.map(k=>new Date(`${k}-15T12:00:00`).toLocaleDateString("en-IN",{month:"short"}));
    return {labels,income:keys.map(k=>items.filter(t=>t.type==="income"&&monthKey(t.date)===k).reduce((a,t)=>a+Number(t.amount),0)),expense:keys.map(k=>items.filter(t=>t.type==="expense"&&monthKey(t.date)===k).reduce((a,t)=>a+Number(t.amount),0))};
  };
  const chartOptions = (currency=true) => ({responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label||ctx.label}: ${money(ctx.parsed.y??ctx.parsed)}`}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{maxRotation:0,autoSkip:true}},y:{beginAtZero:true,grid:{color:"#eff3f6",drawTicks:false},border:{display:false,dash:[3,4],display:false},ticks:{padding:9,callback:v=>currency?shortMoney(v):v}}}});
  const renderOverviewChart = items => {
    destroyChart("overview");if(!window.Chart)return;
    const s=monthlySeries(items);
    charts.overview=new Chart($("#overviewChart"),{type:"bar",data:{labels:s.labels,datasets:[{label:"Income",data:s.income,backgroundColor:"#18b889",borderRadius:5,borderSkipped:false,barPercentage:.58,categoryPercentage:.64},{label:"Expenses",data:s.expense,backgroundColor:"#5c8df2",borderRadius:5,borderSkipped:false,barPercentage:.58,categoryPercentage:.64}]},options:{...chartOptions(),scales:{...chartOptions().scales,x:{...chartOptions().scales.x,grid:{display:false}},y:{...chartOptions().scales.y}}}});
  };
  const categoryTotals = items => {
    const map={};items.filter(t=>t.type==="expense").forEach(t=>map[t.category]=(map[t.category]||0)+Number(t.amount));
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  };
  const renderCategoryChart = items => {
    destroyChart("category");const totals=categoryTotals(items),total=totals.reduce((a,x)=>a+x[1],0);
    $("#donutTotal").textContent=shortMoney(total);
    $("#categoryLegend").innerHTML=totals.length?totals.slice(0,6).map(([name,value],i)=>`<div class="legend-item"><i class="legend-swatch" style="background:${chartColors[i%chartColors.length]}"></i><span class="legend-name">${escapeHTML(name)}</span><b class="legend-percent">${total?Math.round(value/total*100):0}%</b></div>`).join(""):'<p class="muted" style="font-size:11px">No expense categories yet.</p>';
    if(!window.Chart)return;
    charts.category=new Chart($("#categoryChart"),{type:"doughnut",data:{labels:totals.map(x=>x[0]),datasets:[{data:totals.map(x=>x[1]),backgroundColor:totals.map((_,i)=>chartColors[i%chartColors.length]),borderColor:"#fff",borderWidth:3,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"73%",plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${money(ctx.raw)}`}}}}});
  };
  const txIcon = tx => getCategory(tx.category,tx.type);
  const txRow = (tx,actions=false) => {const c=txIcon(tx);return `<tr><td><div class="transaction-name"><span class="transaction-icon" style="background:${c[2]};color:${c[3]}">${c[1]}</span><span class="tx-desc">${escapeHTML(tx.description)}${tx.note?`<small>${escapeHTML(tx.note)}</small>`:""}</span></div></td><td><span class="category-tag" style="background:${c[2]};color:${c[3]}">${escapeHTML(tx.category)}</span></td>${actions?`<td><span class="type-tag ${tx.type}">${tx.type==="income"?"Income":"Expense"}</span></td>`:""}<td>${dateLabel(tx.date)}</td><td class="align-right amount ${tx.type}">${tx.type==="income"?"+":"−"}${money(tx.amount)}</td>${actions?`<td><div class="row-actions"><button class="row-action edit-tx" data-id="${escapeHTML(tx.id)}" title="Edit transaction" aria-label="Edit transaction">✎</button><button class="row-action delete delete-tx" data-id="${escapeHTML(tx.id)}" title="Delete transaction" aria-label="Delete transaction">×</button></div></td>`:""}</tr>`};
  const renderRecent = items => {
    const sorted=[...items].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,6);
    $("#recentRows").innerHTML=sorted.map(t=>txRow(t)).join("");$("#recentEmpty").hidden=sorted.length>0;
  };
  const renderMiniBudgets = () => {
    const budgets=currentData.budgets.slice(0,3);
    if(!budgets.length){$("#budgetPreview").innerHTML='<div class="empty-state" style="padding:18px 10px"><span>◎</span><b>No budgets set</b><p>Create a monthly category limit to get started.</p><button class="subtle-link" data-goto="budgets">Set a budget →</button></div>';return}
    $("#budgetPreview").innerHTML=budgets.map(b=>{const spent=currentData.transactions.filter(t=>t.type==="expense"&&t.category===b.category&&monthKey(t.date)===todayISO().slice(0,7)).reduce((n,t)=>n+Number(t.amount),0),pct=b.limit?Math.min(100,spent/b.limit*100):0,c=getCategory(b.category,"expense");return `<div class="mini-budget"><div class="mini-budget-head"><b>${c[1]} ${escapeHTML(b.category)}</b><span>${Math.round(pct)}%</span></div><div class="progress-track"><span style="width:${pct}%;background:${pct>=100?"#e77979":pct>=80?"#f0a34d":"#13a879"}"></span></div><div class="mini-budget-foot"><span>${money(spent)} spent</span><span>of ${money(b.limit)}</span></div></div>`}).join("");
  };
  const renderDashboard = () => {
    const items=getPeriodTransactions($("#dashboardPeriod").value),income=sum(items,"income"),expenses=sum(items,"expense");
    $("#totalBalance").textContent=money(income-expenses);$("#totalIncome").textContent=money(income);$("#totalExpense").textContent=money(expenses);
    $("#savingsRate").textContent=income?`${Math.round((income-expenses)/income*100)}%`:"—";
    renderOverviewChart(items);renderCategoryChart(items);renderRecent(items);renderMiniBudgets();
  };
  $("#dashboardPeriod").addEventListener("change",renderDashboard);

  const renderTransactions = () => {
    const search=$("#searchTransactions").value.trim().toLowerCase(),type=$("#typeFilter").value,cat=$("#categoryFilter").value,sort=$("#sortFilter").value;
    let items=currentData.transactions.filter(t=>(type==="all"||t.type===type)&&(cat==="all"||t.category===cat)&&(!search||`${t.description} ${t.category} ${t.note||""}`.toLowerCase().includes(search)));
    items.sort((a,b)=>sort==="oldest"?a.date.localeCompare(b.date):sort==="highest"?b.amount-a.amount:sort==="lowest"?a.amount-b.amount:b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));
    $("#transactionRows").innerHTML=items.map(t=>txRow(t,true)).join("");$("#transactionEmpty").hidden=items.length>0;
    $("#transactionCount").textContent=`${items.length} transaction${items.length===1?"":"s"} shown`;
    $$(".edit-tx").forEach(b=>b.addEventListener("click",()=>openExpense(b.dataset.id)));
    $$(".delete-tx").forEach(b=>b.addEventListener("click",()=>deleteTransaction(b.dataset.id)));
  };
  ["searchTransactions","typeFilter","categoryFilter","sortFilter"].forEach(id=>$("#"+id).addEventListener(id==="searchTransactions"?"input":"change",renderTransactions));
  $("#clearFiltersBtn").addEventListener("click",()=>{$("#searchTransactions").value="";$("#typeFilter").value="all";$("#categoryFilter").value="all";$("#sortFilter").value="newest";renderTransactions()});
  const populateCategoryFilter = () => {
    const old=$("#categoryFilter").value, all=[...new Set(currentData.transactions.map(t=>t.category))].sort();
    $("#categoryFilter").innerHTML='<option value="all">All categories</option>'+all.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
    if(all.includes(old))$("#categoryFilter").value=old;
  };
  $("#exportBtn").addEventListener("click",()=>{
    const rows=[["Date","Description","Category","Type","Amount (INR)","Note"],...currentData.transactions.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,t.description,t.category,t.type,t.amount,t.note||""])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    downloadFile(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}),"pennywise-transactions.csv");showToast("CSV export is ready.");
  });
  const downloadFile = (blob,name) => {const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)};

  const renderAnalytics = () => {
    const items=getPeriodTransactions($("#analyticsPeriod").value),expenses=items.filter(t=>t.type==="expense"),total=expenses.reduce((a,t)=>a+Number(t.amount),0),totals=categoryTotals(items),top=totals[0];
    $("#avgExpense").textContent=money(expenses.length?total/expenses.length:0);$("#topCategory").textContent=top?top[0]:"—";$("#topCategoryAmount").textContent=top?money(top[1])+" spent":"No spending yet";$("#analyticsCount").textContent=items.length;
    const range=periodRange($("#analyticsPeriod").value),days=Math.max(1,Math.ceil((Math.min(new Date(`${range.to}T12:00:00`),new Date())-new Date(`${range.from}T12:00:00`))/86400000)+1);
    $("#dailyAverage").textContent=money(total/Math.min(days,3650));
    destroyChart("trend");destroyChart("bar");
    if(window.Chart){
      const byDate={};expenses.forEach(t=>byDate[t.date]=(byDate[t.date]||0)+Number(t.amount));
      let keys=Object.keys(byDate).sort();
      if($("#analyticsPeriod").value==="month"||$("#analyticsPeriod").value==="lastMonth"){
        const start=range.from,end=range.to;keys=[];const d=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`);while(d<=last){keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);d.setDate(d.getDate()+1)}
      }
      const labels=keys.length?keys.map(k=>new Date(`${k}T12:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short"})):["No data"];
      charts.trend=new Chart($("#trendChart"),{type:"line",data:{labels,datasets:[{label:"Expenses",data:keys.map(k=>byDate[k]||0),borderColor:"#5b8df1",backgroundColor:"rgba(91,141,241,.13)",fill:true,tension:.36,pointRadius:keys.length>20?0:3,pointHoverRadius:5,borderWidth:2}]},options:{...chartOptions(),scales:{...chartOptions().scales,x:{...chartOptions().scales.x,ticks:{maxTicksLimit:8,maxRotation:0}},y:chartOptions().scales.y}}});
      charts.bar=new Chart($("#barChart"),{type:"bar",data:{labels:totals.length?totals.map(x=>x[0]):["No expenses"],datasets:[{label:"Amount",data:totals.length?totals.map(x=>x[1]):[0],backgroundColor:totals.map((_,i)=>chartColors[i%chartColors.length]),borderRadius:6,borderSkipped:false}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{tooltip:{callbacks:{label:ctx=>money(ctx.raw)}}},scales:{x:{beginAtZero:true,grid:{color:"#eff3f6",drawTicks:false},border:{display:false},ticks:{callback:v=>shortMoney(v)}},y:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}}}}});
    }
    const income=sum(items,"income"),rate=income?Math.round((income-total)/income*100):null;
    const highest=totals[0],second=totals[1],daysWithSpend=new Set(expenses.map(t=>t.date)).size;
    const insights=[
      {icon:"✦",title:highest?`${highest[0]} leads your spending`:"Start with one transaction",text:highest?`You've spent ${money(highest[1])} on ${highest[0].toLowerCase()} in this period${total?` (${Math.round(highest[1]/total*100)}% of expenses)`:""}.`: "Add a few expenses to unlock useful category insights."},
      {icon:"◷",title:"Your daily pace",text:total?`Your average expense pace is ${money(total/Math.max(1,daysWithSpend))} per day with spending activity.`:"Your daily average will appear after you record expenses."},
      {icon:"↗",title:rate!==null?(rate>=20?"You're keeping money back":"Look for a little more breathing room"):"Track income to see your savings rate",text:rate!==null?`Your balance is ${rate}% of recorded income after expenses. ${rate<0?"Expenses currently exceed income in this period.":"Small, consistent savings can add up."}`:"Record income as well as expenses to understand your overall balance."},
      {icon:"◎",title:second?"A second spending area": "Set a budget that fits",text:second?`${second[0]} is next at ${money(second[1])}. A category limit may help you plan ahead.`:"Choose one category and set a realistic monthly limit to get started."},
      {icon:"▦",title:"Keep the picture complete",text:`You have ${items.length} transaction${items.length===1?"":"s"} in this period. Add small purchases too for a more accurate view.`},
      {icon:"♡",title:"Progress over perfection",text:"Use these charts as a guide, not a judgement. Review your spending regularly and adjust your plan as life changes."}
    ];
    $("#insightGrid").innerHTML=insights.map(i=>`<div class="insight-card"><span class="insight-icon">${i.icon}</span><b>${escapeHTML(i.title)}</b><p>${escapeHTML(i.text)}</p></div>`).join("");
  };
  $("#analyticsPeriod").addEventListener("change",renderAnalytics);

  const renderBudgets = () => {
    const month=todayISO().slice(0,7),spentByCategory={};
    currentData.transactions.filter(t=>t.type==="expense"&&monthKey(t.date)===month).forEach(t=>spentByCategory[t.category]=(spentByCategory[t.category]||0)+Number(t.amount));
    const limitTotal=currentData.budgets.reduce((n,b)=>n+Number(b.limit),0),spentTotal=currentData.budgets.reduce((n,b)=>n+(spentByCategory[b.category]||0),0),pct=limitTotal?Math.round(spentTotal/limitTotal*100):0;
    $("#budgetOverallPct").textContent=`${pct}%`;$("#budgetOverallBar").style.width=`${Math.min(100,pct)}%`;$("#budgetOverallText").textContent=`${money(spentTotal)} spent of ${money(limitTotal)} planned`;
    if(!currentData.budgets.length){$("#budgetGrid").innerHTML='<div class="budget-empty"><div class="insight-icon" style="margin:0 auto 12px">◎</div><b style="display:block;margin-bottom:7px">No budgets yet</b><p class="muted">Create a monthly budget for a category and track how close you are to your limit.</p><button class="primary-btn" id="emptyAddBudget">＋ Set your first budget</button></div>';$("#emptyAddBudget").addEventListener("click",openBudgetPrompt);return}
    $("#budgetGrid").innerHTML=currentData.budgets.map(b=>{const c=getCategory(b.category,"expense"),spent=spentByCategory[b.category]||0,pct=b.limit?spent/b.limit*100:0,over=pct>=100;return `<article class="budget-card"><div class="budget-card-top"><span class="budget-category-icon" style="background:${c[2]};color:${c[3]}">${c[1]}</span><div><b>${escapeHTML(b.category)}</b><small>Monthly limit</small></div><button class="row-action delete delete-budget" data-id="${escapeHTML(b.id)}" title="Remove budget" aria-label="Remove budget">×</button></div><div class="budget-amounts"><b>${money(spent)}</b><span>of ${money(b.limit)}</span></div><div class="progress-track"><span style="width:${Math.min(100,pct)}%;background:${over?"#e77979":pct>=80?"#f0a34d":"#13a879"}"></span></div><div class="budget-foot"><span>${over?`${money(spent-b.limit)} over budget`:money(b.limit-spent)+" remaining"}</span><b style="color:${over?"#df6868":pct>=80?"#d28a32":"#149b70"}">${Math.round(pct)}% used</b></div></article>`}).join("");
    $$(".delete-budget").forEach(b=>b.addEventListener("click",()=>{if(confirm("Remove this budget?")){currentData.budgets=currentData.budgets.filter(x=>x.id!==b.dataset.id);saveData();renderBudgets();renderMiniBudgets();showToast("Budget removed.")}}));
  };
  const openBudgetPrompt = () => {
    const existing=currentData.budgets.map(b=>b.category);
    const available=expenseCategories().filter(c=>!existing.includes(c));
    if(!available.length){showToast("You already have budgets for every expense category.");return}
    const category=prompt(`Choose a category by number:\n${available.map((c,i)=>`${i+1}. ${c}`).join("\n")}`);
    if(category===null)return;
    const n=Number(category),chosen=available[n-1]||(available.find(c=>c.toLowerCase()===category.trim().toLowerCase()));
    if(!chosen){showToast("Please choose a valid category.");return}
    const amount=prompt(`Monthly limit for ${chosen} (₹):`);
    if(amount===null)return;const limit=Number(amount);
    if(!Number.isFinite(limit)||limit<=0){showToast("Enter a budget greater than zero.");return}
    currentData.budgets.push({id:uid(),category:chosen,limit});saveData();renderBudgets();renderMiniBudgets();showToast("Monthly budget saved.");
  };
  $("#addBudgetBtn").addEventListener("click",openBudgetPrompt);

  const openExpense = id => {
    editingId=id||null;const tx=id?currentData.transactions.find(t=>t.id===id):null;
    activeType=tx?.type||"expense";
    $$(".type-option").forEach(b=>b.classList.toggle("active",b.dataset.type===activeType));
    fillCategoryOptions();
    $("#modalTitle").textContent=tx?"Edit transaction":"Add transaction";
    $("#expenseDescription").value=tx?.description||"";$("#expenseAmount").value=tx?.amount??"";
    $("#expenseCategory").value=tx?.category||$("#expenseCategory").options[0]?.value||"";
    $("#expenseDate").value=tx?.date||todayISO();$("#expenseNote").value=tx?.note||"";$("#expenseError").textContent="";
    $("#saveTransactionBtn").innerHTML=tx?"Save changes →":"Save transaction →";
    $("#expenseModal").hidden=false;document.body.style.overflow="hidden";setTimeout(()=>$("#expenseDescription").focus(),50);
  };
  const closeExpense = () => {$("#expenseModal").hidden=true;document.body.style.overflow="";editingId=null};
  $("#addExpenseBtn").addEventListener("click",()=>openExpense());$("#quickAddBtn").addEventListener("click",()=>openExpense());
  $$("[data-open-add]").forEach(b=>b.addEventListener("click",()=>openExpense()));
  $("#closeModal").addEventListener("click",closeExpense);$("#cancelModal").addEventListener("click",closeExpense);
  $("#expenseModal").addEventListener("click",e=>{if(e.target===$("#expenseModal"))closeExpense()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#expenseModal").hidden)closeExpense()});
  $$(".type-option").forEach(b=>b.addEventListener("click",()=>{activeType=b.dataset.type;$$(".type-option").forEach(x=>x.classList.toggle("active",x===b));const old=$("#expenseCategory").value;fillCategoryOptions();if([...$("#expenseCategory").options].some(o=>o.value===old))$("#expenseCategory").value=old}));
  $("#expenseForm").addEventListener("submit",e=>{
    e.preventDefault();const amount=Number($("#expenseAmount").value),description=$("#expenseDescription").value.trim(),date=$("#expenseDate").value;
    if(!description){$("#expenseError").textContent="Please enter a description.";return}
    if(!Number.isFinite(amount)||amount<=0){$("#expenseError").textContent="Enter an amount greater than zero.";return}
    if(!date||date>todayISO()){if(date>todayISO()){$("#expenseError").textContent="Please use today or an earlier date.";return}}
    const tx={id:editingId||uid(),description,amount:Math.round(amount*100)/100,category:$("#expenseCategory").value,type:activeType,date,note:$("#expenseNote").value.trim(),createdAt:editingId?(currentData.transactions.find(t=>t.id===editingId)?.createdAt||Date.now()):Date.now()};
    if(editingId)currentData.transactions=currentData.transactions.map(t=>t.id===editingId?tx:t);else currentData.transactions.push(tx);
    saveData();closeExpense();renderAll();showToast(editingId?"Transaction updated.":"Transaction saved.");
  });
  const deleteTransaction = id => {const tx=currentData.transactions.find(t=>t.id===id);if(!tx)return;if(!confirm(`Delete "${tx.description}"? This cannot be undone.`))return;currentData.transactions=currentData.transactions.filter(t=>t.id!==id);saveData();renderAll();showToast("Transaction deleted.")};

  const renderAll = () => {chartDefaults();populateCategoryFilter();renderDashboard();renderTransactions();if($("#page-analytics").classList.contains("active"))renderAnalytics();if($("#page-budgets").classList.contains("active"))renderBudgets()};
  $("#profileForm").addEventListener("submit",e=>{e.preventDefault();const name=$("#profileName").value.trim();if(name.length<2){showToast("Please enter a valid name.");return}const users=readUsers(),idx=users.findIndex(u=>u.email===currentUser.email);if(idx>=0){users[idx].name=name;localStorage.setItem(STORAGE.users,JSON.stringify(users));currentUser=users[idx]}$("#sidebarName").textContent=name;$("#userAvatar").textContent=name[0].toUpperCase();$("#greetingName").textContent=name.split(/\s+/)[0];$("#profileFeedback").textContent="Profile updated successfully.";showToast("Profile updated.")});
  $("#downloadDataBtn").addEventListener("click",()=>{downloadFile(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),profile:{name:currentUser.name,email:currentUser.email},...currentData},null,2)],{type:"application/json"}),"pennywise-data.json");showToast("Your data export is ready.")});
  $("#clearDataBtn").addEventListener("click",()=>{if(!confirm("Delete ALL transactions and budgets for this account from this browser? Your login will remain."))return;currentData={transactions:[],budgets:[]};saveData();renderAll();showToast("Financial data cleared.")});
  $("#dashboardPeriod").value="month";$("#analyticsPeriod").value="month";
  const session=localStorage.getItem(STORAGE.session),user=readUsers().find(u=>u.email===session);
  if(user)enterApp(user);else showAuth();
})();