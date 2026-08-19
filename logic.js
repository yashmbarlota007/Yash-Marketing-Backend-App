// ==============================================================================
// FILE: logic.js (The Application Brain)
// YASH MARKETING - ENTERPRISE OS FRONTEND LOGIC (v14.0.0 - FULL SCALE PRODUCTION)
// ==============================================================================

// ⚠️ Ensure this matches your active Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbxsLEppTamDqnfJMv38gGBiWiT2shKNq844rpCnftlE8KfUm9k8jP7cqnBmNIPkImcKUQ/exec"; 

const STAGE_NAMES = [
    "Order Received", 
    "Balance Check", 
    "WhatsApp 1 (Confirmation)", 
    "Processed (Stock)", 
    "Invoiced", 
    "Dispatched", 
    "Logistics Allocation", 
    "Delivery Comms (Call/WA)", 
    "Delivered", 
    "Final Call (Rating)"
];

window.appData = { 
    rawArray: [], 
    orders: {} 
};

window.appSettings = {};

let filteredData = [];
let currentActiveOrder = null;
let activeStageFilter = 0; 
let activeDateRange = 'all'; 
let autoRefreshInterval = null;
let queuedFiles = []; 
let currentUserRole = 'Staff';
let currentUserName = ''; 
let brandChartInstance = null; 

// =======================================================
// PERSISTENT SESSION & ROUTING LOGIC
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('track');
    const portalEmpId = urlParams.get('empId');

    if (trackId) {
        document.getElementById('mainAppWrapper').classList.add('hidden');
        document.getElementById('trackingScreen').classList.remove('hidden');
        document.getElementById('displayTrackId').innerText = trackId;
        runTrackerMode(trackId);
    } else {
        const savedUser = localStorage.getItem('yash_user');
        const savedRole = localStorage.getItem('yash_role');
        
        if (savedUser && savedUser.trim() !== "") {
            showDashboard(savedUser, savedRole);
        } else if (portalEmpId && portalEmpId.trim() !== "") {
            document.getElementById('loginEmpId').value = portalEmpId;
            document.getElementById('loginPass').value = "SSO_BYPASS";
            const btn = document.getElementById('loginBtn');
            btn.innerText = "AUTHENTICATING SSO...";
            
            fetch(API_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'login', employeeId: portalEmpId, password: 'SSO_BYPASS' }) 
            })
            .then(res => res.text())
            .then(text => JSON.parse(text))
            .then(data => {
                if (data.status === 'success' || data.success === true) {
                    const uName = data.user?.name || data.username;
                    const uRole = data.user?.role || data.role || 'Staff';
                    localStorage.setItem('yash_user', uName);
                    localStorage.setItem('yash_role', uRole);
                    showDashboard(uName, uRole);
                } else {
                    document.getElementById('loginError').innerText = "SSO Failed: " + (data.message || "Invalid Access");
                    document.getElementById('loginError').classList.remove('hidden');
                    btn.innerText = "INITIALIZE SYSTEM";
                }
            })
            .catch(err => {
                document.getElementById('loginError').innerText = "Network error during SSO login.";
                document.getElementById('loginError').classList.remove('hidden');
                btn.innerText = "INITIALIZE SYSTEM";
            });
        }
    }
    
    setInterval(updateTatTimers, 1000);
});

// GLOBAL TAT TIMER ENGINE
function updateTatTimers() {
    let timers = document.querySelectorAll('.tat-timer');
    for (let i = 0; i < timers.length; i++) {
        let el = timers[i];
        let target = parseInt(el.getAttribute('data-target'), 10);
        let now = new Date().getTime();
        let diff = target - now;
        
        if (diff > 0) {
            let mins = Math.floor(diff / 60000);
            let secs = Math.floor((diff % 60000) / 1000);
            el.innerText = `⏳ TAT: ${mins}m ${secs}s`;
            el.className = "tat-timer bg-orange-900/30 text-orange-400 text-[10px] px-2 py-1 rounded font-black border border-orange-500/30 shrink-0 animate-pulse";
        } else {
            let minsOver = Math.abs(Math.floor(diff / 60000));
            el.innerText = `🚨 LATE: ${minsOver}m OVER`;
            el.className = "tat-timer bg-red-600 text-white text-[10px] px-2 py-1 rounded font-black border border-red-800 shrink-0 animate-bounce";
        }
    }
}

// TRACKER FETCH LOGIC
function runTrackerMode(trackId) {
    fetch(API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'getTrackingData', orderId: trackId }) 
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('trackingLoader').style.display = 'none';
        if (data.status === 'success') {
            let html = '';
            const customerStages = ["Order Placed", "Confirmed & Processing", "Packed & Ready", "Invoiced", "Dispatched", "Out for Delivery", "Delivered Successfully"];
            let mappedStage = Math.min(Math.floor(data.data.completedStages / 1.5), 6);
            
            for (let idx = 0; idx < customerStages.length; idx++) {
                let stageName = customerStages[idx];
                let isCompleted = idx <= mappedStage;
                let isActive = idx === mappedStage;
                let color = isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-700';
                let textColor = isCompleted ? 'text-white' : 'text-slate-500';
                let icon = isCompleted ? '✓' : (isActive && idx !== 6 ? '⏳' : '');
                let borderClass = isCompleted ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-slate-800 bg-[#131C31]';
                
                html += `
                    <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div class="flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#0B1121] ${color} text-white font-black text-xs z-10 shrink-0">${icon}</div>
                        <div class="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border ${borderClass} shadow">
                            <h3 class="font-bold text-sm ${textColor}">${stageName}</h3>
                        </div>
                    </div>
                `;
            }
            document.getElementById('trackingTimeline').innerHTML = html;
            document.getElementById('trackingTimeline').classList.remove('hidden');
        } else {
            let trackingError = document.getElementById('trackingError');
            trackingError.innerText = data.message || "Invalid Tracking ID";
            trackingError.classList.remove('hidden');
        }
    })
    .catch(err => {
        document.getElementById('trackingLoader').style.display = 'none';
        let trackingError = document.getElementById('trackingError');
        trackingError.innerText = "Network error while fetching tracking data.";
        trackingError.classList.remove('hidden');
    });
}

// CMD+K SEARCH LOGIC
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') { closeSearch(); closeHandover(); }
});

function openSearch() { document.getElementById('searchModal').classList.remove('hidden'); document.getElementById('searchInput').focus(); }
function closeSearch() { document.getElementById('searchModal').classList.add('hidden'); document.getElementById('searchInput').value = ''; document.getElementById('searchResults').innerHTML = `<div class="p-8 text-center text-slate-500 font-bold">Start typing to search main database...</div>`; }

function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    if (query.length < 2) { resultsDiv.innerHTML = `<div class="p-8 text-center text-slate-500 font-bold">Type at least 2 characters...</div>`; return; }
    
    let matches = [];
    for (let i = 0; i < window.appData.rawArray.length; i++) {
        let o = window.appData.rawArray[i];
        if ((o.orderId && o.orderId.toLowerCase().includes(query)) || (o.shopName && o.shopName.toLowerCase().includes(query)) || (o.phone && o.phone.includes(query))) {
            matches.push(o);
        }
        if (matches.length >= 10) break;
    }

    if (matches.length === 0) { resultsDiv.innerHTML = `<p class="text-pink-500 font-bold p-4 text-center">No matching orders found.</p>`; return; }
    
    resultsDiv.innerHTML = matches.map(o => `
        <div onclick="closeSearch(); openModal('${o.orderId}')" class="p-3 border-b border-slate-800 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors rounded-lg mb-1">
            <div>
                <div class="font-black text-white text-sm flex items-center">${o.orderId} ${o.isVIP ? '<span class="bg-red-500 text-white text-[9px] px-1 rounded animate-pulse ml-2">VIP</span>' : ''}</div>
                <div class="text-xs text-indigo-400 font-bold">${o.shopName}</div>
            </div>
            <div class="text-right">
                <div class="text-[10px] bg-indigo-900/50 border border-indigo-500/30 px-2 py-1 rounded text-indigo-300 font-black mb-1">Stage ${o.completedStages}/10</div>
                <div class="text-[9px] text-emerald-400 font-black uppercase">${o.paymentMode}</div>
            </div>
        </div>
    `).join('');
}

// SHIFT HANDOVER LOGIC
function openHandover() { document.getElementById('handoverModal').classList.remove('hidden'); fetchHandoverNotes(); }
function closeHandover() { document.getElementById('handoverModal').classList.add('hidden'); document.getElementById('handoverNoteInput').value = ''; }

async function saveHandover() {
    let note = document.getElementById('handoverNoteInput').value.trim();
    if (!note) return alert("Please write a note before submitting.");
    let btn = document.getElementById('btnSaveHandover'); btn.innerText = "Saving..."; btn.disabled = true;

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveHandover', staffName: currentUserName, note }) });
        let data = await res.json();
        if (data.status === 'success') { document.getElementById('handoverNoteInput').value = ''; fetchHandoverNotes(); }
        else alert("Failed to save note: " + data.message);
    } catch(e) { alert("Network error."); }
    btn.innerText = "Submit Handover Note"; btn.disabled = false;
}

async function fetchHandoverNotes() {
    let historyDiv = document.getElementById('handoverHistory');
    historyDiv.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">Loading recent notes...</div>';
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getHandover' }) });
        let data = await res.json();
        if (data.status === 'success' && data.data.length > 0) {
            historyDiv.innerHTML = data.data.map(n => `
                <div class="bg-[#0B1121] p-3 rounded-lg border border-slate-800">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xs font-black text-indigo-400">${n.staff}</span>
                        <span class="text-[9px] text-slate-500 font-mono tracking-widest">${new Date(n.time).toLocaleString('en-GB')}</span>
                    </div>
                    <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">${n.note}</p>
                </div>
            `).join('');
        } else { historyDiv.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">No recent shift notes found.</div>'; }
    } catch(e) { historyDiv.innerHTML = '<div class="text-center text-pink-500 text-xs py-4">Error loading history.</div>'; }
}

// DATE PARSERS & HELPERS
function parseCustomDate(dateStr) {
    if (!dateStr) return new Date();
    let d = new Date(dateStr); if (!isNaN(d)) return d;
    let parts = String(dateStr).split(' '), dateParts = parts[0].split(/[\/\-]/);
    if (dateParts.length === 3) {
        let day = parseInt(dateParts[0], 10), month = parseInt(dateParts[1], 10) - 1, year = parseInt(dateParts[2], 10);
        if (year < 100) year += 2000;
        let h = parts[1] ? parseInt(parts[1].split(':')[0], 10) || 0 : 0;
        let m = parts[1] ? parseInt(parts[1].split(':')[1], 10) || 0 : 0;
        return new Date(year, month, day, h, m);
    }
    return new Date();
}

function formatExactDate(dateString) {
    if (!dateString) return "";
    const d = parseCustomDate(dateString);
    let day = String(d.getDate()).padStart(2, '0'), month = String(d.getMonth() + 1).padStart(2, '0'), year = d.getFullYear();
    let hours = d.getHours(), ampm = hours >= 12 ? 'PM' : 'AM'; hours = hours % 12 || 12;
    return `Received: ${day}/${month}/${year} ${hours}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

function getTimeAgoUI(dateString) {
    if (!dateString) return { text: "", color: "text-slate-400", isSLAWarning: false };
    const diffInMs = new Date() - parseCustomDate(dateString);
    if (diffInMs < 0) return { text: "Just now", color: "text-emerald-400", isSLAWarning: false };
    const diffInHrs = Math.floor(diffInMs / 3600000), diffInMins = Math.floor((diffInMs % 3600000) / 60000);
    let color = 'text-emerald-400', isSLAWarning = false;
    if (diffInHrs >= 48) color = 'text-pink-500';
    else if (diffInHrs >= 46) { color = 'text-yellow-400'; isSLAWarning = true; }
    else if (diffInHrs >= 4) color = 'text-orange-400';
    if (diffInHrs > 48) return { text: `${Math.floor(diffInHrs/24)}d ago`, color, isSLAWarning };
    if (diffInHrs > 0) return { text: `${diffInHrs}h ${diffInMins}m ago`, color, isSLAWarning };
    if (diffInMins > 0) return { text: `${diffInMins}m ago`, color, isSLAWarning };
    return { text: `Just now`, color, isSLAWarning };
}

function makeDirectDriveLink(url) {
    let match = url.match(/\/d\/(.*?)\//);
    return match && match[1] ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
}

// LOGIN SYSTEM
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn'), error = document.getElementById('loginError');
    btn.innerText = "AUTHENTICATING..."; error.classList.add('hidden'); 
    try {
        let payload = { action: 'login', employeeId: document.getElementById('loginEmpId').value, password: document.getElementById('loginPass').value };
        const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.status === 'success' || data.success === true) {
            let uName = data.user?.name || data.username, uRole = data.user?.role || data.role || 'Staff';
            localStorage.setItem('yash_user', uName); localStorage.setItem('yash_role', uRole);
            showDashboard(uName, uRole);
        } else { error.innerText = data.message || "Invalid Login."; error.classList.remove('hidden'); btn.innerText = "INITIALIZE SYSTEM"; }
    } catch (err) { error.innerText = err.message || "Network Error."; error.classList.remove('hidden'); btn.innerText = "INITIALIZE SYSTEM"; }
});

function showDashboard(name, role) {
    currentUserRole = role || 'Staff'; currentUserName = name;
    document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('dashboardScreen').classList.remove('hidden');
    document.getElementById('userName').innerText = name.toUpperCase();
    fetchOrders(false);
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => fetchOrders(true), 30000); 
}

function logout() { localStorage.clear(); location.reload(); }

function showNotification(title, message) {
    const area = document.getElementById('notificationArea'), toast = document.createElement('div');
    toast.className = "bg-[#131C31] text-white px-5 py-3 rounded-xl shadow-2xl border border-indigo-500 flex items-center gap-4 toast-enter pointer-events-auto mb-2";
    toast.innerHTML = `<span class="text-2xl">⚡</span><div><p class="text-[10px] font-black uppercase tracking-widest text-indigo-400">${title}</p><p class="text-sm font-bold text-white mt-0.5">${message}</p></div>`;
    area.appendChild(toast); setTimeout(() => toast.remove(), 5000); 
}

// FETCH ORDERS
async function fetchOrders(isSilent = false) {
    const grid = document.getElementById('orderGrid');
    if (!isSilent && window.appData.rawArray.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center"><div class="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div><p class="text-indigo-400 font-bold tracking-widest uppercase text-sm">Syncing with Mainframe...</p></div>`;
    }
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getOrders', staffName: currentUserName }) });
        const response = await res.json();
        
        if (response.status === 'success') {
            if (response.settings) window.appSettings = response.settings;
            if (response.backendEarnings > 0) {
                let bBadge = document.getElementById('backendEarningsBadge');
                bBadge.innerText = `💰 Earned Today: ₹${response.backendEarnings}`;
                bBadge.classList.remove('hidden');
            }
            window.appData.rawArray = response.data; window.appData.orders = {}; 
            response.data.forEach(o => window.appData.orders[o.orderId] = o);
            applyDateFilter(); 
            if (currentActiveOrder && !document.getElementById('orderModal').classList.contains('hidden')) openModal(currentActiveOrder.orderId); 
        } else {
            grid.innerHTML = `<div class="col-span-full p-10 text-pink-500 font-black text-center text-lg border border-pink-500 rounded-xl bg-pink-900/20">BACKEND ERROR: ${response.message}</div>`;
        }
    } catch (err) { 
        grid.innerHTML = `<div class="col-span-full p-10 text-pink-500 font-black text-center text-lg border border-pink-500 rounded-xl bg-pink-900/20">NETWORK ERROR: ${err.message}</div>`;
    }
}

function setDateRange(range, btnElement) {
    activeDateRange = range;
    if (btnElement) {
        document.querySelectorAll('.date-filter-btn').forEach(btn => btn.classList.remove('active-filter', 'bg-[#4F46E5]', 'text-white', 'border-indigo-500'));
        btnElement.classList.add('active-filter');
    }
    applyDateFilter();
}

function applyDateFilter() {
    let now = new Date(); now.setHours(0,0,0,0);
    let today = new Date(now), yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    let startOfThisWeek = new Date(now); startOfThisWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    let startOfLastWeek = new Date(startOfThisWeek); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    let endOfLastWeek = new Date(startOfThisWeek); endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
    let startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1), endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    if (activeDateRange === 'split') filteredData = window.appData.rawArray.filter(o => String(o.orderId).toUpperCase().includes('SPLIT'));
    else if (activeDateRange === 'all') filteredData = window.appData.rawArray;
    else {
        filteredData = window.appData.rawArray.filter(o => {
            let d = parseCustomDate(o.date); d.setHours(0,0,0,0);
            if (activeDateRange === 'today') return d.getTime() === today.getTime();
            if (activeDateRange === 'yesterday') return d.getTime() === yesterday.getTime();
            if (activeDateRange === 'thisWeek') return d >= startOfThisWeek && d <= now;
            if (activeDateRange === 'lastWeek') return d >= startOfLastWeek && d <= endOfLastWeek;
            if (activeDateRange === 'thisMonth') return d >= startOfThisMonth && d <= now;
            if (activeDateRange === 'lastMonth') return d >= startOfLastMonth && d <= endOfLastMonth;
            return true;
        });
    }
    renderMdoDashboard(); renderPipeline();
}

// MDO WAR ROOM DASHBOARD
function renderMdoDashboard() {
    let isOwner = currentUserRole.toLowerCase().includes('admin') || currentUserRole.toLowerCase().includes('owner') || currentUserName.toLowerCase().includes('yash');
    let mdoDiv = document.getElementById('mdoCommandCenter');
    if (!isOwner) { mdoDiv.classList.add('hidden'); return; }
    mdoDiv.classList.remove('hidden');

    let totalVolume = 0, totalCompleted = 0, slaBreaches = 0, totalOrderValue = 0;
    let shopStats = {}, skuStats = {}, cityStats = {}, brandStats = {}, stageStuck = Array(10).fill(0);
    let nowTime = new Date().getTime();

    filteredData.forEach(o => {
        totalOrderValue += (o.totalValue || 0);
        if (o.isFullyCompleted) totalCompleted++;
        else { stageStuck[o.completedStages]++; if ((nowTime - parseCustomDate(o.date).getTime()) > 172800000) slaBreaches++; }

        if (!shopStats[o.shopName]) shopStats[o.shopName] = { value: 0, area: o.area };
        shopStats[o.shopName].value += (o.totalValue || 0); 

        o.items.forEach(i => {
            let q = parseInt(i.qty || 1), v = parseFloat(i.totalValue || 0);
            totalVolume += q;
            if (!skuStats[i.name]) skuStats[i.name] = { qty: 0, value: 0 }; skuStats[i.name].qty += q; skuStats[i.name].value += v;
            let b = i.brand || "Other"; brandStats[b] = (brandStats[b] || 0) + v; 
        });

        let city = (o.area && o.area !== "Unknown Area" && o.area !== "") ? o.area : "Unmapped Dealer";
        if (!cityStats[city]) cityStats[city] = { orders: 0, value: 0 }; cityStats[city].orders++; cityStats[city].value += (o.totalValue || 0);
    });

    let sortedShops = Object.entries(shopStats).sort((a,b) => b[1].value - a[1].value);
    let sortedSKUs = Object.entries(skuStats).sort((a,b) => b[1].qty - a[1].qty).slice(0, 5); 
    let sortedCities = Object.entries(cityStats).sort((a,b) => b[1].value - a[1].value).slice(0, 5);
    let topShopVol = sortedShops.length ? sortedShops[0][1].value : 1;
    let maxStuck = Math.max(...stageStuck);
    let frictionIdx = maxStuck > 0 ? STAGE_NAMES[stageStuck.indexOf(maxStuck)].split(' (')[0] : "Smooth Pipeline";
    let compRate = filteredData.length ? Math.round((totalCompleted / filteredData.length) * 100) : 100;
    let healthScore = Math.max(0, Math.min(100, Math.round(compRate - (filteredData.length ? (slaBreaches/filteredData.length)*50 : 0))));
    if (!filteredData.length) healthScore = 0;

    mdoDiv.innerHTML = `
        <div class="flex justify-between items-center bg-[#0B1121] border border-slate-800 p-4 rounded-2xl mb-4 shadow-lg">
            <h2 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 tracking-widest uppercase">🔴 LIVE WAR ROOM</h2>
            <div class="text-right"><div class="text-3xl font-black ${healthScore>=80?'text-emerald-400':(healthScore>=50?'text-orange-400':'text-pink-500')}">${healthScore}%</div><div class="text-[10px] text-slate-400 uppercase font-bold">Pipeline Health</div></div>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div class="glass-panel p-4 rounded-2xl border-t-4 border-t-indigo-500"><div class="text-[10px] text-slate-400 uppercase font-black">Volume & Value</div><div class="flex items-end gap-2 mt-2"><span class="text-2xl font-black text-white">${totalVolume} U</span><span class="text-xs text-indigo-400 font-bold">₹${totalOrderValue.toLocaleString()}</span></div></div>
            <div class="glass-panel p-4 rounded-2xl border-t-4 border-t-emerald-500"><div class="text-[10px] text-slate-400 uppercase font-black">Success Rate</div><span class="text-2xl font-black text-emerald-400 mt-2 block">${compRate}%</span></div>
            <div class="glass-panel p-4 rounded-2xl border-t-4 ${slaBreaches>0?'border-t-pink-500 bg-pink-500/5':'border-t-slate-700'}"><div class="text-[10px] ${slaBreaches>0?'text-pink-400':'text-slate-400'} uppercase font-black">SLA Breaches</div><span class="text-2xl font-black ${slaBreaches>0?'text-pink-500':'text-white'} mt-2 block">${slaBreaches}</span></div>
            <div class="glass-panel p-4 rounded-2xl border-t-4 border-t-orange-500"><div class="text-[10px] text-slate-400 uppercase font-black">Bottleneck</div><div class="text-sm font-black text-orange-400 mt-2 truncate">${frictionIdx}</div></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div class="glass-panel p-5 rounded-2xl lg:col-span-1"><h3 class="text-xs font-black text-white uppercase mb-4">🔥 Hot Movers</h3><div class="space-y-3">${sortedSKUs.length?sortedSKUs.map((s,i)=>`<div class="bg-[#0B1121] p-2.5 rounded-lg border border-slate-800"><div class="text-xs font-bold text-slate-300 truncate mb-1">${i+1}. ${s[0]}</div><div class="flex justify-between items-end"><span class="text-sm font-black text-yellow-400">${s[1].qty} QTY</span><span class="text-xs font-black text-emerald-400">₹${s[1].value.toLocaleString()}</span></div></div>`).join(''):'<p class="text-slate-500 text-sm">No data.</p>'}</div></div>
            <div class="glass-panel p-5 rounded-2xl lg:col-span-1"><h3 class="text-xs font-black text-white uppercase mb-4">👑 VIP Dealers</h3><div class="space-y-3 max-h-60 overflow-y-auto hide-scrollbar">${sortedShops.length?sortedShops.slice(0,6).map(v=>`<div class="relative w-full bg-[#0B1121] rounded-lg p-2.5 overflow-hidden border border-slate-800"><div class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-900/40 to-transparent" style="width:${(v[1].value/topShopVol)*100}%"></div><div class="relative z-10"><div class="text-xs font-bold text-slate-200 truncate">${v[0]}</div><div class="text-[9px] text-slate-400 uppercase">📍 ${v[1].area}</div><div class="text-sm font-black text-emerald-400">₹${v[1].value.toLocaleString()}</div></div></div>`).join(''):'<p class="text-slate-500 text-sm">No data.</p>'}</div></div>
            <div class="glass-panel p-5 rounded-2xl lg:col-span-1"><h3 class="text-xs font-black text-white uppercase mb-4">📍 Area Heatmap</h3><div class="space-y-3">${sortedCities.length?sortedCities.map((c,i)=>`<div class="bg-[#0B1121] p-2.5 rounded-lg border border-slate-800"><div class="text-xs font-bold text-slate-300 truncate mb-1">#${i+1} ${c[0]}</div><div class="flex justify-between items-end"><span class="text-sm font-black text-blue-400">${c[1].orders} ORD</span><span class="text-xs font-black text-emerald-400">₹${c[1].value.toLocaleString()}</span></div></div>`).join(''):'<p class="text-slate-500 text-sm">No data.</p>'}</div></div>
            <div class="glass-panel p-5 rounded-2xl lg:col-span-1 flex flex-col"><h3 class="text-xs font-black text-white uppercase mb-4">📊 Brand Matrix</h3><div class="flex-1 w-full h-40 relative flex justify-center items-center"><canvas id="brandPieChart"></canvas></div></div>
        </div>`;

    setTimeout(() => {
        let ctx = document.getElementById('brandPieChart');
        if (ctx && window.Chart) {
            if (brandChartInstance) brandChartInstance.destroy();
            let keys = Object.keys(brandStats).filter(k => brandStats[k] > 0), vals = Object.values(brandStats).filter(v => v > 0);
            brandChartInstance = new Chart(ctx.getContext('2d'), {
                type: 'doughnut', data: { labels: keys.length ? keys : ["No Data"], datasets: [{ data: vals.length ? vals : [1], backgroundColor: ['#ef4444', '#ec4899', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#06b6d4', '#64748b'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 } } } }
            });
        }
    }, 100);
}

// PIPELINE & ORDER GRID
function setStageFilter(idx) { activeStageFilter = idx; renderPipeline(); }

async function executeUnblock(orderId) {
    if (!confirm("Bypass Credit Lock for this dealer?")) return;
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'unblockOrder', orderId }) });
        let data = await res.json();
        if (data.status === 'success') { showNotification("SUCCESS", "Order Unlocked."); fetchOrders(true); } else alert("Failed.");
    } catch(e) { alert("Network error."); }
}

function renderPipeline() {
    const grid = document.getElementById('orderGrid'), filterBar = document.getElementById('stageFilterBar');
    let pending = filteredData.filter(o => !o.isFullyCompleted), counts = Array(10).fill(0), shopCount = {};
    pending.forEach(o => { if(o.completedStages < 10) counts[o.completedStages]++; if(o.completedStages < 4) shopCount[o.shopName] = (shopCount[o.shopName] || 0) + 1; });

    let fHtml = `<div onclick="setStageFilter(null)" class="cursor-pointer ${activeStageFilter===null?'bg-indigo-600 text-white shadow-lg':'bg-[#131C31] text-slate-400'} p-3 rounded-xl border border-slate-800 min-w-[120px] shrink-0 transition-all"><span class="text-[9px] uppercase font-black">Overview</span><div class="text-sm font-black mt-1">All Pending (${pending.length})</div></div>`;
    STAGE_NAMES.forEach((n, idx) => {
        let active = activeStageFilter === idx;
        fHtml += `<div onclick="setStageFilter(${idx})" class="cursor-pointer ${active?'bg-indigo-600 text-white shadow-lg':'bg-[#131C31] text-slate-400'} p-3 rounded-xl border border-slate-800 min-w-[130px] shrink-0 transition-all"><span class="text-[9px] uppercase font-black">Step ${idx+1}</span><div class="text-xs font-bold mt-1">${n.split(' (')[0]} (${counts[idx]})</div></div>`;
    });
    filterBar.innerHTML = fHtml;

    let display = activeStageFilter !== null ? pending.filter(o => o.completedStages === activeStageFilter) : pending;
    grid.innerHTML = '';
    if (display.length === 0) { grid.innerHTML = `<div class="col-span-full bg-[#131C31] border border-slate-800 p-10 rounded-2xl text-center"><div class="text-4xl mb-3">🍃</div><p class="text-slate-400 text-lg font-bold">Inbox Zero for this view.</p></div>`; return; }

    let isOwner = currentUserRole.toLowerCase().includes('admin') || currentUserRole.toLowerCase().includes('owner') || currentUserName.toLowerCase().includes('yash');

    display.forEach(o => {
        let itemsCount = o.items.reduce((s,i)=>s+parseInt(i.qty||1),0);
        let lockOverlay = o.creditLocked && !o.ceoOverride ? `<div class="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center p-4 text-center rounded-2xl border-2 border-red-500"><span class="text-3xl mb-1">🛑</span><span class="text-white font-black text-xs">SYSTEM LOCK</span><span class="text-red-400 font-bold text-[10px] mt-1">${o.lockReason}</span>${isOwner?`<button onclick="event.stopPropagation(); executeUnblock('${o.orderId}')" class="mt-3 w-full bg-red-600 text-white text-[10px] py-1.5 rounded font-black uppercase">🔓 Unlock</button>`:'<p class="text-[9px] text-pink-400 mt-2 font-bold">Locked by Credit Dept</p>'}</div>` : '';
        let isCod = o.paymentMode && o.paymentMode.toUpperCase().includes('COD');
        
        grid.innerHTML += `
            <div ${!o.creditLocked||o.ceoOverride?`onclick="openModal('${o.orderId}')"`:''} class="${o.isVIP?'vip-corridor':'border-slate-800'} bg-[#131C31] rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden hover-card cursor-pointer border">
                ${lockOverlay}
                <div class="mb-4">
                    <div class="flex justify-between items-start mb-1.5"><h3 class="font-black text-sm text-white">${o.orderId}</h3>${o.isVIP?'<span class="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">VIP</span>':''}</div>
                    <p class="text-indigo-300 font-bold text-xs mb-3">${o.shopName} <span class="text-slate-500 font-normal">(${o.area})</span></p>
                    <div class="flex gap-2 items-center flex-wrap"><span class="text-[9px] font-black px-2 py-0.5 rounded uppercase ${isCod?'bg-orange-500/10 text-orange-400':'bg-emerald-500/10 text-emerald-400'}">${o.paymentMode}</span><span class="text-[10px] font-black text-yellow-400">₹${o.totalValue}</span><span class="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded">Qty: ${itemsCount}</span></div>
                </div>
                <div>
                    <div class="bg-[#0B1121] p-2 rounded mb-2 text-[10px] text-emerald-400 font-black">Next: ${STAGE_NAMES[o.completedStages]?.split(' (')[0]||'Done'}</div>
                    <div class="w-full bg-[#0B1121] rounded-full h-1.5"><div class="bg-indigo-600 h-1.5 rounded-full" style="width: ${(o.completedStages/10)*100}%"></div></div>
                </div>
            </div>`;
    });
}

// 1-CLICK MERGE
async function executeMerge(primaryOrderId, shopName) {
    if (!confirm(`Combine all pending items for ${shopName} into this order?`)) return;
    let btn = event.currentTarget; btn.innerText = "Merging..."; btn.disabled = true;
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'mergeOrders', primaryOrderId, shopName }) });
        let data = await res.json();
        if (data.status === 'success') { showNotification("MERGE COMPLETE", "Orders combined."); closeModal(); fetchOrders(true); } else alert(data.message);
    } catch(e) { alert("Network error."); }
}

function openModal(orderId) {
    const order = window.appData.orders[orderId]; if (!order) return;
    currentActiveOrder = order; queuedFiles = [];
    document.getElementById('modalOrderId').innerText = order.orderId;
    document.getElementById('modalShopName').innerText = order.shopName;
    document.getElementById('modalPaymentMode').innerText = order.paymentMode;
    document.getElementById('modalTotalValue').innerText = `Amount: ₹${order.totalValue}`;
    order.isVIP ? document.getElementById('modalVipBadge').classList.remove('hidden') : document.getElementById('modalVipBadge').classList.add('hidden');
    
    let container = document.getElementById('stagesContainer'); container.innerHTML = '';
    
    let itemsHtml = `<div class="mb-6 bg-[#131C31] p-4 rounded-xl border border-slate-700"><h3 class="text-xs font-black text-white uppercase mb-3">📦 Manifest</h3><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">`;
    order.items.forEach(i => {
        itemsHtml += `<div class="flex items-center gap-3 bg-[#0B1121] p-2 rounded border border-slate-800">${i.image?`<img src="${i.image}" class="w-10 h-10 object-contain bg-white rounded p-1">`:`<div class="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-[8px] text-slate-500 font-mono">No Img</div>`}<div class="flex-1"><p class="text-xs text-slate-300 font-bold">${i.name}</p><span class="text-[10px] text-indigo-400 font-black">Qty: ${i.qty}</span></div></div>`;
    });
    container.innerHTML += itemsHtml + `</div></div>`;

    let pendingCount = filteredData.filter(o => o.shopName === order.shopName && o.completedStages < 4).length;
    if (order.completedStages < 4 && pendingCount > 1) {
        container.innerHTML += `<button onclick="executeMerge('${order.orderId}', '${order.shopName}')" class="w-full mb-4 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-black py-3 rounded-xl text-xs uppercase border border-blue-500/50">🔗 1-Click Merge: Combine ${pendingCount - 1} other order(s)</button>`;
    }

    let stagesHtml = '<div class="space-y-4">';
    let isCod = order.paymentMode && order.paymentMode.toUpperCase().includes('COD');

    STAGE_NAMES.forEach((n, idx) => {
        let sNum = idx + 1, isComp = idx < order.completedStages, isAct = idx === order.completedStages;
        let displayName = sNum === 8 ? (isCod ? "Call 2 (Out-for-delivery)" : "WhatsApp 2 (Out-for-delivery)") : n;

        if (isComp) stagesHtml += `<div class="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 flex justify-between items-center"><span class="text-emerald-400 text-sm font-black">${sNum}. ${displayName}</span><span class="text-[9px] text-emerald-500 font-black">✔ DONE</span></div>`;
        else if (isAct) {
            stagesHtml += `<div class="bg-[#131C31] border-2 border-indigo-500 rounded-xl p-5"><span class="text-white text-base font-black">${sNum}. ${displayName}</span>`;
            if (sNum === 1) stagesHtml += `<button onclick="submitStage(1)" id="submitBtn_1" class="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl">Accept Task</button>`;
            else if (sNum === 2) stagesHtml += `<button onclick="submitStage(2)" id="submitBtn_2" class="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl">Verify & Proceed</button>`;
            else if (sNum === 7) stagesHtml += `<div class="mt-3 space-y-2"><select id="runnerSelect" class="w-full bg-[#0B1121] border border-slate-700 p-2 text-white rounded"><option value="" disabled selected>Delivery Person...</option><option value="Vishal Gunjal">Vishal Gunjal</option><option value="Preetam Bogawat">Preetam Bogawat</option><option value="Yash Barlota">Yash Barlota</option></select><select id="transportSelect" class="w-full bg-[#0B1121] border border-slate-700 p-2 text-white rounded"><option value="" disabled selected>Transport...</option><option value="Local">Local</option><option value="Adhunik">Adhunik</option></select><button onclick="submitStage(7)" id="submitBtn_7" class="w-full bg-indigo-600 text-white font-black py-3.5 rounded-xl">Allocate Logistics</button></div>`;
            else stagesHtml += `<div class="mt-3"><input type="file" accept="image/*" class="w-full text-xs text-slate-300 file:bg-indigo-600 file:text-white p-2 bg-[#0B1121] rounded border border-slate-700 mb-3" onchange="handleFileSelection(this, ${sNum})"><button onclick="submitStage(${sNum})" id="submitBtn_${sNum}" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl">Complete Step</button></div>`;
            stagesHtml += `</div>`;
        } else stagesHtml += `<div class="bg-slate-800/20 border border-slate-800 rounded-xl p-4 flex justify-between items-center opacity-50"><span class="text-slate-500 text-sm">${sNum}. ${displayName}</span><span class="text-xs">🔒</span></div>`;
    });
    container.innerHTML += stagesHtml + '</div>';
    document.getElementById('orderModal').classList.remove('hidden');
}

function closeModal() { document.getElementById('orderModal').classList.add('hidden'); fetchOrders(true); }
function handleFileSelection(input, sNum) { queuedFiles = Array.from(input.files); }

async function submitStage(sNum) {
    let btn = document.getElementById(`submitBtn_${sNum}`); if (btn) { btn.innerText = "Processing..."; btn.disabled = true; }
    let payload = { action: 'updateStage', orderId: currentActiveOrder.orderId, stage: sNum, files: [], staffName: currentUserName };
    
    if (sNum === 7) {
        let r = document.getElementById('runnerSelect').value, t = document.getElementById('transportSelect').value;
        if (!r || !t) { alert("Select runner and transport."); if(btn){btn.disabled=false;btn.innerText="Allocate Logistics";} return; }
        payload.actionText = `Runner: ${r} | Transport: ${t}`;
    }
    if (sNum !== 1 && sNum !== 2 && sNum !== 7 && queuedFiles.length) {
        let f = queuedFiles[0];
        payload.files.push({ name: f.name, mimeType: f.type, base64: await getBase64(f) });
    }
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        let data = await res.json();
        if (data.status === 'success') { fetchOrders(true); closeModal(); } else { alert("Error: " + data.message); if(btn){btn.disabled=false;btn.innerText="Retry";} }
    } catch(e) { alert("Network error."); if(btn){btn.disabled=false;btn.innerText="Retry";} }
}

function getBase64(file) {
    return new Promise((resolve) => {
        let r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.readAsDataURL(file);
    });
}
