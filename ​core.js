const API_URL = "https://script.google.com/macros/s/AKfycbzQ7W09dn_1gyNSq_PCPrKLX6ApgB52Ob2_1BnmRe5SdYTMNyc8kRwudr80pe2QFCQZCg/exec"; 
const STAGE_NAMES = ["Balance Check", "WhatsApp 1 (Confirmation)", "Processed (Stock)", "Invoiced", "Dispatched", "Logistics Allocation", "Delivery Comms (Call/WA)", "Delivered", "Final Call (Rating)"];

window.appData = { rawArray: [], orders: {} };
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
            handleSSOLogin(portalEmpId);
        }
    }
    setInterval(updateTatTimers, 1000);
});

function handleSSOLogin(portalEmpId) {
    document.getElementById('loginEmpId').value = portalEmpId;
    document.getElementById('loginPass').value = "SSO_BYPASS";
    const btn = document.getElementById('loginBtn');
    btn.innerText = "AUTHENTICATING SSO...";
    
    fetch(API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', employeeId: portalEmpId, password: 'SSO_BYPASS' }) 
    })
    .then(res => res.text()).then(text => JSON.parse(text))
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
    }).catch(err => {
        document.getElementById('loginError').innerText = "Network error during SSO login.";
        document.getElementById('loginError').classList.remove('hidden');
        btn.innerText = "INITIALIZE SYSTEM";
    });
}

function updateTatTimers() {
    document.querySelectorAll('.tat-timer').forEach(el => {
        let target = parseInt(el.getAttribute('data-target'));
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
    });
}

function runTrackerMode(trackId) {
    fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getTrackingData', orderId: trackId }) })
    .then(res => res.json())
    .then(data => {
        document.getElementById('trackingLoader').style.display = 'none';
        if(data.status === 'success') {
            let html = '';
            const customerStages = ["Order Placed", "Confirmed & Processing", "Packed & Ready", "Invoiced", "Dispatched", "Out for Delivery", "Delivered Successfully"];
            let mappedStage = Math.min(Math.floor(data.data.completedStages / 1.5), 6); 
            
            customerStages.forEach((stageName, idx) => {
                let isCompleted = idx <= mappedStage;
                let isActive = idx === mappedStage;
                let color = isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-700';
                let textColor = isCompleted ? 'text-white' : 'text-slate-500';
                let icon = isCompleted ? '✓' : (isActive && idx !== 6 ? '⏳' : '');
                
                html += `<div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"><div class="flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#0B1121] ${color} text-white font-black text-xs z-10 shrink-0">${icon}</div><div class="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border ${isCompleted ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-slate-800 bg-[#131C31]'} shadow"><h3 class="font-bold text-sm ${textColor}">${stageName}</h3></div></div>`;
            });
            document.getElementById('trackingTimeline').innerHTML = html;
            document.getElementById('trackingTimeline').classList.remove('hidden');
        } else {
            document.getElementById('trackingError').innerText = data.message || "Invalid Tracking ID";
            document.getElementById('trackingError').classList.remove('hidden');
        }
    });
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const error = document.getElementById('loginError');
    btn.innerText = "AUTHENTICATING...";
    error.classList.add('hidden'); 
    
    try {
        const payload = { action: 'login', employeeId: document.getElementById('loginEmpId').value, password: document.getElementById('loginPass').value };
        const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const textResponse = await res.text();
        let data;
        try { data = JSON.parse(textResponse); } catch (parseErr) { throw new Error("Server blocked connection."); }
        
        if (data.status === 'success' || data.success === true) {
            const uName = data.user?.name || data.username;
            const uRole = data.user?.role || data.role || 'Staff';
            localStorage.setItem('yash_user', uName); 
            localStorage.setItem('yash_role', uRole);
            showDashboard(uName, uRole);
        } else { 
            error.innerText = data.message || "Invalid Employee ID or Password."; 
            error.classList.remove('hidden'); btn.innerText = "INITIALIZE SYSTEM"; 
        }
    } catch (err) { error.innerText = err.message || "Network Error."; error.classList.remove('hidden'); btn.innerText = "INITIALIZE SYSTEM"; }
});

function showDashboard(name, role) {
    currentUserRole = role || 'Staff'; 
    currentUserName = name;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    document.getElementById('userName').innerText = name.toUpperCase();
    
    fetchOrders(false);
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => { 
        if (document.getElementById('orderModal').classList.contains('hidden') && document.getElementById('searchModal').classList.contains('hidden') && document.getElementById('handoverModal').classList.contains('hidden')) {
            fetchOrders(true); 
        }
    }, 30000); 
}

function logout() { localStorage.clear(); location.reload(); }

function showNotification(title, message) {
    const area = document.getElementById('notificationArea');
    const toast = document.createElement('div');
    toast.className = "bg-[#131C31] text-white px-5 py-3 rounded-xl shadow-[0_10px_40px_rgba(79,70,229,0.4)] border border-indigo-500 flex items-center gap-4 toast-enter pointer-events-auto mb-2";
    toast.innerHTML = `<span class="text-2xl animate-bounce">⚡</span><div><p class="text-[10px] font-black uppercase tracking-widest text-indigo-400">${title}</p><p class="text-sm font-bold text-white mt-0.5">${message}</p></div>`;
    area.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 5000); 
}

async function fetchOrders(isSilent = false) {
    const grid = document.getElementById('orderGrid');
    if (!isSilent && window.appData.rawArray.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center"><div class="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div><p class="text-indigo-400 font-bold tracking-widest uppercase text-sm">Syncing with Mainframe...</p></div>`;
    }
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getOrders', staffName: currentUserName }) });
        const response = await res.json();
        if (response.status === 'success') {
            if(response.settings) window.appSettings = response.settings;
            if(response.backendEarnings !== undefined && response.backendEarnings > 0) {
                let bBadge = document.getElementById('backendEarningsBadge');
                bBadge.innerText = `💰 Earned Today: ₹${response.backendEarnings}`;
                bBadge.classList.remove('hidden');
            }
            window.appData.rawArray = response.data;
            window.appData.orders = {}; 
            response.data.forEach(o => { window.appData.orders[o.orderId] = o; });
            applyDateFilter(); 
        }
    } catch (err) { console.log("Background sync error: ", err); }
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
    let today = new Date(now);
    let yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    let dayOfWeek = now.getDay();
    let diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    let startOfThisWeek = new Date(now); startOfThisWeek.setDate(diffToMonday);
    let startOfLastWeek = new Date(startOfThisWeek); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    let endOfLastWeek = new Date(startOfThisWeek); endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
    let startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

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
    
    // In functions defined in actions.js
    if (typeof renderMdoDashboard === "function") renderMdoDashboard(); 
    if (typeof renderPipeline === "function") renderPipeline();
}

function parseCustomDate(dateStr) {
    if (!dateStr) return new Date();
    let d = new Date(dateStr);
    if (!isNaN(d)) return d;
    let parts = String(dateStr).split(' ');
    if (parts.length >= 1) {
        let dateParts = parts[0].split(/[\/\-]/);
        if (dateParts.length === 3) {
            let day = parseInt(dateParts[0]), month = parseInt(dateParts[1]) - 1, year = parseInt(dateParts[2]);
            if (year < 100) year += 2000;
            let hours = 0, mins = 0, secs = 0;
            if (parts.length >= 2) {
                let timeParts = parts[1].split(':');
                hours = parseInt(timeParts[0]) || 0; mins = parseInt(timeParts[1]) || 0; secs = parseInt(timeParts[2]) || 0;
            }
            return new Date(year, month, day, hours, mins, secs);
        }
    }
    return new Date();
}

function formatExactDate(dateString) {
    if (!dateString) return "";
    const d = parseCustomDate(dateString);
    const day = String(d.getDate()).padStart(2, '0'), month = String(d.getMonth() + 1).padStart(2, '0'), year = d.getFullYear();
    let hours = d.getHours(); const ampm = hours >= 12 ? 'PM' : 'AM'; hours = hours % 12; hours = hours ? hours : 12; 
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `Received: ${day}/${month}/${year} ${hours}:${mins} ${ampm}`;
}

function getTimeAgoUI(dateString) {
    if (!dateString) return { text: "", color: "text-slate-400", isSLAWarning: false };
    const orderDate = parseCustomDate(dateString), diffInMs = new Date() - orderDate;
    if (diffInMs < 0) return { text: "Just now", color: "text-emerald-400", isSLAWarning: false };
    const diffInHrs = Math.floor(diffInMs / (1000 * 60 * 60)), diffInMins = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
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
    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
    return url;
}
