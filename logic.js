// ==============================================================================
// FILE: logic.js (The Application Brain)
// YASH MARKETING - ENTERPRISE OS FRONTEND LOGIC (v13.2.0 - UNCOMPRESSED)
// ==============================================================================

// ⚠️ IMPORTANT: Replace this URL with your exact Google Apps Script Web App URL
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

// Default to showing all unaccepted orders first (Fix for late-night orders)
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
        } 
        else if (portalEmpId && portalEmpId.trim() !== "") {
            document.getElementById('loginEmpId').value = portalEmpId;
            document.getElementById('loginPass').value = "SSO_BYPASS";
            
            const btn = document.getElementById('loginBtn');
            btn.innerText = "AUTHENTICATING SSO...";
            
            fetch(API_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ 
                    action: 'login', 
                    employeeId: portalEmpId, 
                    password: 'SSO_BYPASS' 
                }) 
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
                document.getElementById('loginError').innerText = "Network error during SSO login. Please login manually.";
                document.getElementById('loginError').classList.remove('hidden');
                btn.innerText = "INITIALIZE SYSTEM";
            });
        }
    }
    
    // Start Global TAT Timer Tick
    setInterval(updateTatTimers, 1000);
});

// GLOBAL TAT TIMER ENGINE
function updateTatTimers() {
    let timers = document.querySelectorAll('.tat-timer');
    
    for (let i = 0; i < timers.length; i++) {
        let el = timers[i];
        let targetString = el.getAttribute('data-target');
        let target = parseInt(targetString, 10);
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
        body: JSON.stringify({
            action: 'getTrackingData', 
            orderId: trackId
        }) 
    })
    .then(res => res.json())
    .then(data => {
        let loader = document.getElementById('trackingLoader');
        loader.style.display = 'none';
        
        if (data.status === 'success') {
            let html = '';
            const customerStages = [
                "Order Placed", 
                "Confirmed & Processing", 
                "Packed & Ready", 
                "Invoiced", 
                "Dispatched", 
                "Out for Delivery", 
                "Delivered Successfully"
            ];
            
            let stageCalc = data.data.completedStages / 1.5;
            let mappedStage = Math.floor(stageCalc);
            
            if (mappedStage > 6) {
                mappedStage = 6;
            }
            
            for (let idx = 0; idx < customerStages.length; idx++) {
                let stageName = customerStages[idx];
                let isCompleted = false;
                
                if (idx <= mappedStage) {
                    isCompleted = true;
                }
                
                let isActive = false;
                if (idx === mappedStage) {
                    isActive = true;
                }
                
                let color = 'bg-slate-700';
                if (isCompleted) {
                    color = 'bg-emerald-500 shadow-[0_0_10px_#10b981]';
                }
                
                let textColor = 'text-slate-500';
                if (isCompleted) {
                    textColor = 'text-white';
                }
                
                let icon = "";
                if (isCompleted) {
                    icon = '✓';
                } else if (isActive && idx !== 6) {
                    icon = '⏳';
                }
                
                let borderClass = 'border-slate-800 bg-[#131C31]';
                if (isCompleted) {
                    borderClass = 'border-emerald-500/30 bg-emerald-900/10';
                }
                
                html += `
                    <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div class="flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#0B1121] ${color} text-white font-black text-xs z-10 shrink-0">
                            ${icon}
                        </div>
                        <div class="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border ${borderClass} shadow">
                            <h3 class="font-bold text-sm ${textColor}">
                                ${stageName}
                            </h3>
                        </div>
                    </div>
                `;
            }
            
            let timeline = document.getElementById('trackingTimeline');
            timeline.innerHTML = html;
            timeline.classList.remove('hidden');
            
        } else {
            let trackingError = document.getElementById('trackingError');
            
            if (data.message) {
                trackingError.innerText = data.message;
            } else {
                trackingError.innerText = "Invalid Tracking ID";
            }
            
            trackingError.classList.remove('hidden');
        }
    })
    .catch(err => {
        let loader = document.getElementById('trackingLoader');
        loader.style.display = 'none';
        
        let trackingError = document.getElementById('trackingError');
        trackingError.innerText = "Network error while fetching tracking data.";
        trackingError.classList.remove('hidden');
    });
}

// CMD+K SEARCH LOGIC
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { 
        e.preventDefault(); 
        openSearch(); 
    }
    if (e.key === 'Escape') {
        closeSearch();
        closeHandover();
    }
});

function openSearch() { 
    let modal = document.getElementById('searchModal');
    modal.classList.remove('hidden'); 
    
    let input = document.getElementById('searchInput');
    input.focus(); 
}

function closeSearch() { 
    let modal = document.getElementById('searchModal');
    modal.classList.add('hidden'); 
    
    let input = document.getElementById('searchInput');
    input.value = ''; 
    
    let resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = `
        <div class="p-8 text-center text-slate-500 font-bold">
            Start typing to search main database...
        </div>
    `; 
}

function performSearch() {
    const input = document.getElementById('searchInput');
    const query = input.value.toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    
    if (query.length < 2) { 
        resultsDiv.innerHTML = `
            <div class="p-8 text-center text-slate-500 font-bold">
                Type at least 2 characters...
            </div>
        `; 
        return; 
    }
    
    let matches = [];
    
    for (let i = 0; i < window.appData.rawArray.length; i++) {
        let o = window.appData.rawArray[i];
        
        let matchFound = false;
        
        if (o.orderId && o.orderId.toLowerCase().includes(query)) {
            matchFound = true;
        } else if (o.shopName && o.shopName.toLowerCase().includes(query)) {
            matchFound = true;
        } else if (o.phone && o.phone.includes(query)) {
            matchFound = true;
        }
        
        if (matchFound) {
            matches.push(o);
        }
        
        if (matches.length >= 10) {
            break;
        }
    }

    if (matches.length === 0) { 
        resultsDiv.innerHTML = `
            <p class="text-pink-500 font-bold p-4 text-center">
                No matching orders found.
            </p>
        `; 
        return; 
    }
    
    let htmlOutput = "";

    for (let i = 0; i < matches.length; i++) {
        let o = matches[i];
        let badge = "";
        
        if (o.isVIP) {
            badge = '<span class="bg-red-500 text-white text-[9px] px-1 rounded animate-pulse ml-2">VIP</span>';
        }
        
        htmlOutput += `
        <div 
            onclick="closeSearch(); openModal('${o.orderId}')" 
            class="p-3 border-b border-slate-800 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors rounded-lg mb-1"
        >
            <div>
                <div class="font-black text-white text-sm flex items-center">
                    ${o.orderId} ${badge}
                </div>
                <div class="text-xs text-indigo-400 font-bold">
                    ${o.shopName}
                </div>
            </div>
            <div class="text-right">
                <div class="text-[10px] bg-indigo-900/50 border border-indigo-500/30 px-2 py-1 rounded text-indigo-300 font-black mb-1">
                    Stage ${o.completedStages}/10
                </div>
                <div class="text-[9px] text-emerald-400 font-black uppercase">
                    ${o.paymentMode}
                </div>
            </div>
        </div>
        `;
    }
    
    resultsDiv.innerHTML = htmlOutput;
}

// SHIFT HANDOVER LOGIC
function openHandover() {
    let modal = document.getElementById('handoverModal');
    modal.classList.remove('hidden');
    
    fetchHandoverNotes();
}

function closeHandover() {
    let modal = document.getElementById('handoverModal');
    modal.classList.add('hidden');
    
    let input = document.getElementById('handoverNoteInput');
    input.value = '';
}

async function saveHandover() {
    let input = document.getElementById('handoverNoteInput');
    let note = input.value.trim();
    
    if (note === "") {
        alert("Please write a note before submitting.");
        return;
    }
    
    let btn = document.getElementById('btnSaveHandover');
    btn.innerText = "Saving..."; 
    btn.disabled = true;

    try {
        let payload = { 
            action: 'saveHandover', 
            staffName: currentUserName, 
            note: note 
        };
        
        let res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        let data = await res.json();
        
        if (data.status === 'success') {
            let noteInput = document.getElementById('handoverNoteInput');
            noteInput.value = '';
            
            fetchHandoverNotes();
        } else {
            let errorMsg = "Unknown error";
            if (data.message) {
                errorMsg = data.message;
            }
            alert("Failed to save note: " + errorMsg);
        }
    } catch (e) {
        alert("Network error. Could not save note.");
    }
    
    btn.innerText = "Submit Handover Note"; 
    btn.disabled = false;
}

async function fetchHandoverNotes() {
    let historyDiv = document.getElementById('handoverHistory');
    historyDiv.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">Loading recent notes...</div>';
    
    try {
        let payload = { 
            action: 'getHandover' 
        };
        
        let res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        let data = await res.json();
        
        if (data.status === 'success' && data.data.length > 0) {
            let htmlOutput = "";
            
            for (let i = 0; i < data.data.length; i++) {
                let n = data.data[i];
                
                let dateObj = new Date(n.time);
                let dateString = dateObj.toLocaleString('en-GB');
                
                htmlOutput += `
                    <div class="bg-[#0B1121] p-3 rounded-lg border border-slate-800">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-xs font-black text-indigo-400">${n.staff}</span>
                            <span class="text-[9px] text-slate-500 font-mono tracking-widest">${dateString}</span>
                        </div>
                        <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">${n.note}</p>
                    </div>
                `;
            }
            
            historyDiv.innerHTML = htmlOutput;
        } else {
            historyDiv.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">No recent shift notes found.</div>';
        }
    } catch (e) {
        historyDiv.innerHTML = '<div class="text-center text-pink-500 text-xs py-4">Error loading history.</div>';
    }
}

// DATE PARSERS & HELPERS
function parseCustomDate(dateStr) {
    if (!dateStr) {
        return new Date();
    }
    
    let d = new Date(dateStr);
    
    if (!isNaN(d)) {
        return d;
    }
    
    let parts = String(dateStr).split(' ');
    
    if (parts.length >= 1) {
        let dateParts = parts[0].split(/[\/\-]/);
        
        if (dateParts.length === 3) {
            let day = parseInt(dateParts[0], 10);
            let month = parseInt(dateParts[1], 10) - 1;
            let year = parseInt(dateParts[2], 10);
            
            if (year < 100) {
                year += 2000;
            }
            
            let hours = 0;
            let mins = 0;
            let secs = 0;
            
            if (parts.length >= 2) {
                let timeParts = parts[1].split(':');
                
                if (timeParts[0]) {
                    hours = parseInt(timeParts[0], 10) || 0;
                }
                
                if (timeParts[1]) {
                    mins = parseInt(timeParts[1], 10) || 0;
                }
                
                if (timeParts[2]) {
                    secs = parseInt(timeParts[2], 10) || 0;
                }
            }
            return new Date(year, month, day, hours, mins, secs);
        }
    }
    return new Date();
}

function formatExactDate(dateString) {
    if (!dateString) {
        return "";
    }
    
    const d = parseCustomDate(dateString);
    
    let day = String(d.getDate()).padStart(2, '0');
    let month = String(d.getMonth() + 1).padStart(2, '0');
    let year = d.getFullYear();
    
    let hours = d.getHours(); 
    
    let ampm = 'AM';
    if (hours >= 12) {
        ampm = 'PM';
    }
    
    hours = hours % 12; 
    
    if (hours === 0) {
        hours = 12;
    }
    
    let mins = String(d.getMinutes()).padStart(2, '0');
    
    return `Received: ${day}/${month}/${year} ${hours}:${mins} ${ampm}`;
}

function getTimeAgoUI(dateString) {
    if (!dateString) {
        return { 
            text: "", 
            color: "text-slate-400", 
            isSLAWarning: false 
        };
    }
    
    const orderDate = parseCustomDate(dateString);
    const nowTime = new Date().getTime();
    const orderTime = orderDate.getTime();
    
    const diffInMs = nowTime - orderTime;
    
    if (diffInMs < 0) {
        return { 
            text: "Just now", 
            color: "text-emerald-400", 
            isSLAWarning: false 
        };
    }
    
    const msInHour = 1000 * 60 * 60;
    const msInMin = 1000 * 60;
    
    const diffInHrs = Math.floor(diffInMs / msInHour);
    
    const remainderMs = diffInMs % msInHour;
    const diffInMins = Math.floor(remainderMs / msInMin);
    
    let color = 'text-emerald-400';
    let isSLAWarning = false;
    
    if (diffInHrs >= 48) {
        color = 'text-pink-500';
    } else if (diffInHrs >= 46) { 
        color = 'text-yellow-400'; 
        isSLAWarning = true; 
    } else if (diffInHrs >= 4) {
        color = 'text-orange-400';
    }

    if (diffInHrs > 48) {
        let days = Math.floor(diffInHrs / 24);
        return { 
            text: `${days}d ago`, 
            color: color, 
            isSLAWarning: isSLAWarning 
        };
    }
    
    if (diffInHrs > 0) {
        return { 
            text: `${diffInHrs}h ${diffInMins}m ago`, 
            color: color, 
            isSLAWarning: isSLAWarning 
        };
    }
    
    if (diffInMins > 0) {
        return { 
            text: `${diffInMins}m ago`, 
            color: color, 
            isSLAWarning: isSLAWarning 
        };
    }
    
    return { 
        text: `Just now`, 
        color: color, 
        isSLAWarning: isSLAWarning 
    };
}

function makeDirectDriveLink(url) {
    let match = url.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

// =======================================================
// MANUAL LOGIN SYSTEM 
// =======================================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('loginBtn');
    const error = document.getElementById('loginError');
    
    btn.innerText = "AUTHENTICATING...";
    error.classList.add('hidden'); 
    
    try {
        let empIdInput = document.getElementById('loginEmpId');
        let passInput = document.getElementById('loginPass');
        
        const payload = { 
            action: 'login', 
            employeeId: empIdInput.value, 
            password: passInput.value 
        };
        
        const res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload) 
        });
        
        const textResponse = await res.text();
        let data;
        
        try {
            data = JSON.parse(textResponse);
        } catch (parseErr) {
            throw new Error("Server blocked connection. Did you Authorize the Apps Script?");
        }
        
        if (data.status === 'success' || data.success === true) {
            let uName = data.username;
            if (data.user && data.user.name) {
                uName = data.user.name;
            }
            
            let uRole = 'Staff';
            if (data.user && data.user.role) {
                uRole = data.user.role;
            } else if (data.role) {
                uRole = data.role;
            }
            
            localStorage.setItem('yash_user', uName); 
            localStorage.setItem('yash_role', uRole);
            
            showDashboard(uName, uRole);
        } else { 
            let errorMsg = "Invalid Employee ID or Password.";
            if (data.message) {
                errorMsg = data.message;
            }
            error.innerText = errorMsg; 
            error.classList.remove('hidden'); 
            btn.innerText = "INITIALIZE SYSTEM"; 
        }
    } catch (err) { 
        let errorMsg = "Network Error.";
        if (err.message) {
            errorMsg = err.message;
        }
        error.innerText = errorMsg; 
        error.classList.remove('hidden'); 
        btn.innerText = "INITIALIZE SYSTEM"; 
    }
});

function showDashboard(name, role) {
    if (role) {
        currentUserRole = role; 
    } else {
        currentUserRole = 'Staff';
    }
    
    currentUserName = name;
    
    let loginScreen = document.getElementById('loginScreen');
    loginScreen.classList.add('hidden');
    
    let dashboardScreen = document.getElementById('dashboardScreen');
    dashboardScreen.classList.remove('hidden');
    
    let userNameDisplay = document.getElementById('userName');
    userNameDisplay.innerText = name.toUpperCase();
    
    fetchOrders(false);
    
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => { 
        fetchOrders(true); 
    }, 30000); 
}

function logout() { 
    localStorage.clear(); 
    location.reload(); 
}

function showNotification(title, message) {
    const area = document.getElementById('notificationArea');
    const toast = document.createElement('div');
    
    toast.className = "bg-[#131C31] text-white px-5 py-3 rounded-xl shadow-[0_10px_40px_rgba(79,70,229,0.4)] border border-indigo-500 flex items-center gap-4 toast-enter pointer-events-auto mb-2";
    
    let htmlOutput = `
        <span class="text-2xl animate-bounce">⚡</span>
        <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-indigo-400">${title}</p>
            <p class="text-sm font-bold text-white mt-0.5">${message}</p>
        </div>
    `;
    
    toast.innerHTML = htmlOutput;
    area.appendChild(toast);
    
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transition = 'opacity 0.3s ease'; 
        
        setTimeout(() => {
            toast.remove();
        }, 300); 
        
    }, 5000); 
}

// FETCH ORDERS
async function fetchOrders(isSilent = false) {
    const grid = document.getElementById('orderGrid');
    
    if (isSilent === false && window.appData.rawArray.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <div class="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                <p class="text-indigo-400 font-bold tracking-widest uppercase text-sm">
                    Syncing with Mainframe...
                </p>
            </div>
        `;
    }
    
    try {
        let payload = { 
            action: 'getOrders', 
            staffName: currentUserName 
        };
        
        const res = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        
        const response = await res.json();
        
        if (response.status === 'success') {
            if (response.settings) {
                window.appSettings = response.settings;
            }
            
            if (response.backendEarnings !== undefined && response.backendEarnings > 0) {
                let bBadge = document.getElementById('backendEarningsBadge');
                bBadge.innerText = `💰 Earned Today: ₹${response.backendEarnings}`;
                bBadge.classList.remove('hidden');
            }

            window.appData.rawArray = response.data;
            window.appData.orders = {}; 
            
            for (let i = 0; i < response.data.length; i++) {
                let o = response.data[i];
                window.appData.orders[o.orderId] = o; 
            }
            
            applyDateFilter(); 
            
            let modal = document.getElementById('orderModal');
            let isModalHidden = modal.classList.contains('hidden');
            
            if (currentActiveOrder && !isModalHidden) {
                openModal(currentActiveOrder.orderId); 
            }
        }
    } catch (err) { 
        console.log("Background sync error: ", err); 
    }
}

function setDateRange(range, btnElement) {
    activeDateRange = range;
    
    if (btnElement) {
        let buttons = document.querySelectorAll('.date-filter-btn');
        
        for (let i = 0; i < buttons.length; i++) {
            let btn = buttons[i];
            btn.classList.remove('active-filter', 'bg-[#4F46E5]', 'text-white', 'border-indigo-500');
        }
        
        btnElement.classList.add('active-filter');
    }
    
    applyDateFilter();
}

function applyDateFilter() {
    let now = new Date(); 
    now.setHours(0,0,0,0);

    let today = new Date(now);
    
    let yesterday = new Date(now); 
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dayOfWeek = now.getDay();
    let adjustment = 1;
    if (dayOfWeek === 0) {
        adjustment = -6;
    }
    
    let diffToMonday = now.getDate() - dayOfWeek + adjustment;
    
    let startOfThisWeek = new Date(now); 
    startOfThisWeek.setDate(diffToMonday);
    
    let startOfLastWeek = new Date(startOfThisWeek); 
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    let endOfLastWeek = new Date(startOfThisWeek); 
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
    
    let startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    if (activeDateRange === 'split') {
        filteredData = [];
        for (let i = 0; i < window.appData.rawArray.length; i++) {
            let o = window.appData.rawArray[i];
            let idString = String(o.orderId).toUpperCase();
            
            if (idString.includes('SPLIT')) {
                filteredData.push(o);
            }
        }
    } else if (activeDateRange === 'all') {
        filteredData = window.appData.rawArray;
    } else {
        filteredData = [];
        
        for (let i = 0; i < window.appData.rawArray.length; i++) {
            let o = window.appData.rawArray[i];
            
            let d = parseCustomDate(o.date); 
            d.setHours(0,0,0,0);
            
            let dTime = d.getTime();
            let keep = true;
            
            if (activeDateRange === 'today') {
                if (dTime !== today.getTime()) {
                    keep = false;
                }
            } else if (activeDateRange === 'yesterday') {
                if (dTime !== yesterday.getTime()) {
                    keep = false;
                }
            } else if (activeDateRange === 'thisWeek') {
                if (d < startOfThisWeek || d > now) {
                    keep = false;
                }
            } else if (activeDateRange === 'lastWeek') {
                if (d < startOfLastWeek || d > endOfLastWeek) {
                    keep = false;
                }
            } else if (activeDateRange === 'thisMonth') {
                if (d < startOfThisMonth || d > now) {
                    keep = false;
                }
            } else if (activeDateRange === 'lastMonth') {
                if (d < startOfLastMonth || d > endOfLastMonth) {
                    keep = false;
                }
            }
            
            if (keep) {
                filteredData.push(o);
            }
        }
    }
    
    renderMdoDashboard(); 
    renderPipeline();
}

// MDO WAR ROOM DASHBOARD
function renderMdoDashboard() {
    let userNameStr = "";
    let localUser = localStorage.getItem('yash_user');
    
    if (localUser) {
        userNameStr = localUser;
    }
    
    let isOwner = false;
    let roleLower = currentUserRole.toLowerCase();
    
    if (roleLower === 'admin' || roleLower === 'owner') {
        isOwner = true;
    }
    
    let nameLower = userNameStr.toLowerCase();
    if (nameLower.includes('yash')) {
        isOwner = true;
    }
    
    const mdoDiv = document.getElementById('mdoCommandCenter');
    
    if (isOwner === false) { 
        mdoDiv.classList.add('hidden'); 
        return; 
    }
    
    mdoDiv.classList.remove('hidden');

    let totalVolume = 0; 
    let totalCompleted = 0; 
    let slaBreaches = 0; 
    let totalOrderValue = 0;
    
    let shopStats = {}; 
    let skuStats = {}; 
    let staffScores = {}; 
    let cityStats = {};
    let brandStats = {}; 
    
    let stageStuck = [];
    for (let i = 0; i < 10; i++) {
        stageStuck.push(0);
    }
    
    const nowTime = new Date().getTime();

    for (let i = 0; i < filteredData.length; i++) {
        let o = filteredData[i];
        
        let orderVal = 0;
        if (o.totalValue) {
            orderVal = o.totalValue;
        }
        
        totalOrderValue += orderVal;

        if (o.isFullyCompleted) {
            totalCompleted++;
        } else { 
            let currentStage = o.completedStages;
            stageStuck[currentStage]++; 
            
            let dObj = parseCustomDate(o.date);
            let dTime = dObj.getTime();
            
            let diff = nowTime - dTime;
            let targetDiff = 48 * 60 * 60 * 1000;
            
            if (diff > targetDiff) {
                slaBreaches++;
            }
        }

        if (!shopStats[o.shopName]) {
            shopStats[o.shopName] = { 
                items: 0, 
                value: 0, 
                area: o.area 
            };
        }
        
        shopStats[o.shopName].value += orderVal; 

        for (let j = 0; j < o.items.length; j++) {
            let item = o.items[j];
            
            let qty = 1;
            if (item.qty) {
                qty = parseInt(item.qty, 10);
            }
            
            let itemVal = 0;
            if (item.totalValue) {
                itemVal = parseFloat(item.totalValue);
            }
            
            totalVolume += qty; 
            shopStats[o.shopName].items += qty;
            
            let cleanName = "Unknown";
            if (item.name) {
                cleanName = item.name.trim();
            }
            
            if (!skuStats[cleanName]) {
                skuStats[cleanName] = { 
                    qty: 0, 
                    value: 0 
                };
            }
            
            skuStats[cleanName].qty += qty;
            skuStats[cleanName].value += itemVal;
            
            let brandName = "Unknown";
            if (item.brand && item.brand.trim() !== "") {
                brandName = item.brand.trim();
            }
            
            if (!brandStats[brandName]) {
                brandStats[brandName] = 0;
            }
            
            brandStats[brandName] += itemVal; 
        }

        if (o.lastUpdatedBy && o.lastUpdatedBy !== "System") {
            let staff = o.lastUpdatedBy;
            if (!staffScores[staff]) {
                staffScores[staff] = 0;
            }
            staffScores[staff] += 1;
        }
        
        let city = "Unmapped Dealer";
        if (o.area && o.area !== "Unknown Area" && o.area !== "") {
            city = o.area;
        }
        
        if (!cityStats[city]) {
            cityStats[city] = { 
                orders: 0, 
                value: 0 
            };
        }
        
        cityStats[city].orders += 1;
        cityStats[city].value += orderVal;
    }

    let sortedShops = Object.entries(shopStats).sort((a,b) => {
        return b[1].value - a[1].value;
    });
    
    let sortedSKUs = Object.entries(skuStats).sort((a,b) => {
        return b[1].qty - a[1].qty;
    });
    let topSKUs = sortedSKUs.slice(0, 5);
    
    let sortedStaff = Object.entries(staffScores).sort((a,b) => {
        return b[1] - a[1];
    });
    let topStaff = sortedStaff.slice(0, 3);
    
    let sortedCities = Object.entries(cityStats).sort((a,b) => {
        return b[1].value - a[1].value;
    });
    let topCities = sortedCities.slice(0, 5);

    let topShopVolume = 1;
    if (sortedShops.length > 0) {
        topShopVolume = sortedShops[0][1].value;
    }
    
    let maxStuck = 0;
    for (let i = 0; i < stageStuck.length; i++) {
        if (stageStuck[i] > maxStuck) {
            maxStuck = stageStuck[i];
        }
    }
    
    let maxStuckIndex = -1;
    for (let i = 0; i < stageStuck.length; i++) {
        if (stageStuck[i] === maxStuck) {
            maxStuckIndex = i;
            break;
        }
    }
    
    let frictionIndex = "Smooth Pipeline";
    if (maxStuck > 0 && maxStuckIndex !== -1) {
        let fullName = STAGE_NAMES[maxStuckIndex];
        let parts = fullName.split(' (');
        frictionIndex = parts[0];
    }
    
    let completionRate = 100;
    if (filteredData.length > 0) {
        completionRate = (totalCompleted / filteredData.length) * 100;
    }
    
    let baseScore = completionRate; 
    let penalty = 0;
    if (filteredData.length > 0) {
        penalty = (slaBreaches / filteredData.length) * 50;
    }
    
    let calcScore = baseScore - penalty;
    let healthScore = Math.round(calcScore);
    
    if (healthScore < 0) {
        healthScore = 0;
    }
    if (healthScore > 100) {
        healthScore = 100;
    }
    
    if (filteredData.length === 0) {
        healthScore = 0; 
    }
    
    let healthColor = 'text-pink-500';
    if (healthScore >= 80) {
        healthColor = 'text-emerald-400';
    } else if (healthScore >= 50) {
        healthColor = 'text-orange-400';
    }
    
    let breachBorderClass = 'border-t-slate-700';
    let breachBgClass = '';
    let breachIcon = '✅';
    let breachTextColor = 'text-slate-400';
    let breachNumColor = 'text-white';
    
    if (slaBreaches > 0) {
        breachBorderClass = 'border-t-pink-500';
        breachBgClass = 'bg-pink-500/5';
        breachIcon = '<span class="animate-pulse">⚠️</span>';
        breachTextColor = 'text-pink-400';
        breachNumColor = 'text-pink-500';
    }

    let mdoHtml = `
        <div class="flex justify-between items-center bg-[#0B1121] border border-slate-800 p-4 rounded-2xl mb-4 shadow-lg">
            <div>
                <h2 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 tracking-widest uppercase">
                    🔴 LIVE WAR ROOM
                </h2>
            </div>
            <div class="text-right">
                <div class="text-3xl font-black ${healthColor} drop-shadow-[0_0_10px_currentColor]">
                    ${healthScore}%
                </div>
                <div class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Pipeline Health
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div class="glass-panel p-4 rounded-2xl border-t-4 border-t-indigo-500 hover-card">
                <div class="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
                    Total Volume & Value
                </div>
                <div class="flex items-end gap-2 mt-2">
                    <span class="text-2xl font-black text-white">${totalVolume} U</span>
                    <span class="text-xs text-indigo-400 font-bold mb-1 pb-1">₹${totalOrderValue.toLocaleString()}</span>
                </div>
            </div>
            
            <div class="glass-panel p-4 rounded-2xl border-t-4 border-t-emerald-500 hover-card">
                <div class="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
                    Delivery Success
                </div>
                <span class="text-2xl font-black text-emerald-400 mt-2 block">
                    ${Math.round(completionRate)}%
                </span>
                <div class="text-[9px] text-slate-500 mt-1 font-semibold">
                    ${totalCompleted} out of ${filteredData.length} Delivered
                </div>
            </div>
            
            <div class="glass-panel p-4 rounded-2xl border-t-4 ${breachBorderClass} ${breachBgClass} hover-card">
                <div class="text-[10px] ${breachTextColor} uppercase font-black tracking-widest mb-1 flex items-center gap-2">
                    ${breachIcon} SLA Breaches
                </div>
                <span class="text-2xl font-black ${breachNumColor} mt-2 block">
                    ${slaBreaches}
                </span>
                <div class="text-[9px] text-slate-500 mt-1 font-semibold">
                    Orders pending > 48h
                </div>
            </div>
            
            <div class="glass-panel p-4 rounded-2xl border-t-4 border-t-orange-500 hover-card">
                <div class="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
                    Core Bottleneck
                </div>
                <div class="text-sm font-black text-orange-400 truncate mt-2 leading-tight">
                    ${frictionIndex}
                </div>
                <div class="inline-block mt-2 bg-orange-500/10 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded">
                    ${maxStuck} Stuck Here
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div class="glass-panel p-5 rounded-2xl lg:col-span-1">
                <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="text-yellow-400">🔥</span> Hot Movers
                </h3>
                <div class="space-y-3">
    `;
    
    if (topSKUs.length > 0) {
        for (let i = 0; i < topSKUs.length; i++) {
            let sku = topSKUs[i];
            mdoHtml += `
                <div class="bg-[#0B1121] p-2.5 rounded-lg border border-slate-800">
                    <div class="text-xs font-bold text-slate-300 truncate mb-1">
                        ${i+1}. ${sku[0]}
                    </div>
                    <div class="flex justify-between items-end">
                        <span class="text-sm font-black text-yellow-400">
                            ${sku[1].qty} <span class="text-[9px] text-slate-500">QTY</span>
                        </span>
                        <span class="text-xs font-black text-emerald-400">
                            ₹${sku[1].value.toLocaleString()}
                        </span>
                    </div>
                </div>
            `;
        }
    } else {
        mdoHtml += `<p class="text-slate-500 text-sm italic">No SKU data.</p>`;
    }
    
    mdoHtml += `
                </div>
            </div>
            
            <div class="glass-panel p-5 rounded-2xl lg:col-span-1">
                <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="text-emerald-400">👑</span> VIP Dealers
                </h3>
                <div class="space-y-3 max-h-60 overflow-y-auto hide-scrollbar pr-2">
    `;
    
    if (sortedShops.length > 0) {
        let displayShops = sortedShops.slice(0, 6);
        for (let i = 0; i < displayShops.length; i++) {
            let v = displayShops[i];
            
            let widthPercent = 0;
            if (topShopVolume > 0) {
                widthPercent = (v[1].value / topShopVolume) * 100;
            }
            
            mdoHtml += `
                <div class="relative w-full bg-[#0B1121] rounded-lg p-2.5 overflow-hidden border border-slate-800 group">
                    <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-900/40 to-transparent" style="width: ${widthPercent}%"></div>
                    <div class="relative z-10">
                        <div class="text-xs font-bold text-slate-200 truncate group-hover:text-white">
                            ${v[0]}
                        </div>
                        <div class="text-[9px] text-slate-400 uppercase tracking-widest mb-1">
                            📍 ${v[1].area}
                        </div>
                        <div class="text-sm font-black text-emerald-400">
                            ₹${v[1].value.toLocaleString()}
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        mdoHtml += `<p class="text-slate-500 text-sm italic">No dealer data.</p>`;
    }
    
    mdoHtml += `
                </div>
            </div>
            
            <div class="glass-panel p-5 rounded-2xl lg:col-span-1">
                <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="text-blue-400">📍</span> Area Heatmap
                </h3>
                <div class="space-y-3">
    `;
    
    if (topCities.length > 0) {
        for (let i = 0; i < topCities.length; i++) {
            let city = topCities[i];
            mdoHtml += `
                <div class="bg-[#0B1121] p-2.5 rounded-lg border border-slate-800">
                    <div class="text-xs font-bold text-slate-300 truncate mb-1">
                        #${i+1} ${city[0]}
                    </div>
                    <div class="flex justify-between items-end">
                        <span class="text-sm font-black text-blue-400">
                            ${city[1].orders} <span class="text-[9px] text-slate-500">ORD</span>
                        </span>
                        <span class="text-xs font-black text-emerald-400">
                            ₹${city[1].value.toLocaleString()}
                        </span>
                    </div>
                </div>
            `;
        }
    } else {
        mdoHtml += `<p class="text-slate-500 text-sm italic">No area data.</p>`;
    }
    
    mdoHtml += `
                </div>
            </div>
            
            <div class="glass-panel p-5 rounded-2xl lg:col-span-1 flex flex-col">
                <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex justify-between items-center">
                    <span class="flex items-center gap-2">
                        <span class="text-purple-400">📊</span> Brand Matrix (Value)
                    </span>
                </h3>
                <div class="flex-1 w-full h-40 relative flex justify-center items-center">
                    <canvas id="brandPieChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    mdoDiv.innerHTML = mdoHtml;
    
    setTimeout(() => { 
        let canvasElement = document.getElementById('brandPieChart');
        
        if (canvasElement) {
            if (brandChartInstance) {
                brandChartInstance.destroy();
            }
            
            let allKeys = Object.keys(brandStats);
            let labels = [];
            for (let i = 0; i < allKeys.length; i++) {
                let k = allKeys[i];
                if (brandStats[k] > 0) {
                    labels.push(k);
                }
            }
            
            let allVals = Object.values(brandStats);
            let dataVals = [];
            for (let i = 0; i < allVals.length; i++) {
                let v = allVals[i];
                if (v > 0) {
                    dataVals.push(v);
                }
            }
            
            let totalMatrixValue = 0;
            for (let i = 0; i < dataVals.length; i++) {
                totalMatrixValue += dataVals[i];
            }
            
            if (labels.length === 0) { 
                labels.push("No Data"); 
                dataVals.push(1); 
            }

            let ctx = canvasElement.getContext('2d');
            
            brandChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataVals,
                        backgroundColor: [
                            '#ef4444', 
                            '#ec4899', 
                            '#f59e0b', 
                            '#3b82f6', 
                            '#10b981', 
                            '#a855f7', 
                            '#06b6d4', 
                            '#64748b'
                        ],
                        borderWidth: 0, 
                        hoverOffset: 5
                    }]
                },
                options: {
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'right', 
                            labels: { 
                                color: '#94a3b8', 
                                font: { size: 10 }, 
                                boxWidth: 10 
                            } 
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = "";
                                    if (context.label) {
                                        label = context.label;
                                    }
                                    
                                    let val = 0;
                                    if (context.raw) {
                                        val = context.raw;
                                    }
                                    
                                    let percent = 0;
                                    if (totalMatrixValue > 0) {
                                        percent = Math.round((val / totalMatrixValue) * 100);
                                    }
                                    
                                    return `${label}: ₹${val.toLocaleString()} (${percent}%)`;
                                }
                            },
                            backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                            titleFont: { size: 11 }, 
                            bodyFont: { size: 13, weight: 'bold' },
                            padding: 10, 
                            borderColor: '#6366F1', 
                            borderWidth: 1
                        }
                    }
                }
            });
        }
    }, 100);
}

// PIPELINE & ORDER GRID
function setStageFilter(stageIndex) { 
    activeStageFilter = stageIndex; 
    renderPipeline(); 
}

async function executeUnblock(orderId) {
    let confirmAction = confirm("Warning: You are bypassing the system Credit Lock for this dealer. Proceed?");
    if (confirmAction === false) {
        return;
    }
    
    try {
        let payload = { 
            action: 'unblockOrder', 
            orderId: orderId 
        };
        
        let res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        let data = await res.json();
        
        if (data.status === 'success') {
            showNotification("OVERRIDE SUCCESS", "Order Unlocked.");
            fetchOrders(true);
        } else {
            alert("Failed to unblock order.");
        }
    } catch (e) { 
        alert("Network error."); 
    }
}

function renderPipeline() {
    const grid = document.getElementById('orderGrid');
    const filterBar = document.getElementById('stageFilterBar');
    
    let pendingOrders = [];
    for (let i = 0; i < filteredData.length; i++) {
        let o = filteredData[i];
        if (o.isFullyCompleted === false) {
            pendingOrders.push(o);
        }
    }
    
    let stageCounts = [];
    for (let i = 0; i < 10; i++) {
        stageCounts.push(0);
    }
    
    let shopPendingCount = {};
    
    for (let i = 0; i < pendingOrders.length; i++) {
        let o = pendingOrders[i];
        
        let sIndex = o.completedStages;
        if (sIndex < 10) { 
            stageCounts[sIndex]++; 
        }
        
        if (sIndex < 4) { 
            let sName = o.shopName;
            if (!shopPendingCount[sName]) {
                shopPendingCount[sName] = 0;
            }
            shopPendingCount[sName] += 1; 
        }
    }

    let filterOverviewClass = 'bg-[#131C31] border-slate-800 hover:bg-slate-800';
    let filterOverviewTextClass = 'text-slate-500';
    let filterOverviewCountLabelClass = 'text-slate-600';
    let filterOverviewCountClass = 'bg-[#0B1121] text-slate-400';
    
    if (activeStageFilter === null) {
        filterOverviewClass = 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]';
        filterOverviewTextClass = 'text-indigo-200';
        filterOverviewCountLabelClass = 'text-indigo-200';
        filterOverviewCountClass = 'bg-white text-indigo-900';
    }

    let filterHtml = `
        <div 
            onclick="setStageFilter(null)" 
            class="snap-start cursor-pointer ${filterOverviewClass} flex flex-col justify-between p-3 rounded-xl border min-w-[120px] shrink-0 transition-all"
        >
            <span class="${filterOverviewTextClass} text-[9px] font-black uppercase tracking-widest mb-1">
                Overview
            </span>
            <span class="text-white text-sm font-black mb-2">
                All Pending
            </span>
            <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-700/50">
                <span class="text-[10px] ${filterOverviewCountLabelClass} font-bold">
                    COUNT
                </span>
                <span class="${filterOverviewCountClass} px-2 py-0.5 rounded text-xs font-black">
                    ${pendingOrders.length}
                </span>
            </div>
        </div>
    `;
    
    for (let idx = 0; idx < STAGE_NAMES.length; idx++) {
        let name = STAGE_NAMES[idx];
        
        let isActive = false;
        if (activeStageFilter === idx) {
            isActive = true;
        }
        
        let orderCount = stageCounts[idx];
        
        let filterName = name;
        let parts = name.split(' (');
        if (parts.length > 0) {
            filterName = parts[0];
        }
        
        if (idx === 7) { 
            filterName = "Delivery Comms";
        }
        
        let boxClass = 'bg-[#131C31] border-slate-800 hover:bg-slate-800';
        let stepTextClass = 'text-slate-500';
        let titleClass = 'text-slate-400';
        let stuckLabelClass = 'text-slate-600';
        let countBoxClass = 'bg-[#0B1121] text-slate-600';
        
        if (isActive) {
            boxClass = 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]';
            stepTextClass = 'text-indigo-200';
            titleClass = 'text-white';
            stuckLabelClass = 'text-indigo-200';
            countBoxClass = 'bg-indigo-900 text-indigo-300';
        }
        
        if (orderCount > 0) {
            if (isActive) {
                countBoxClass = 'bg-white text-indigo-900';
            } else {
                countBoxClass = 'bg-pink-500/20 text-pink-400 border border-pink-500/20';
            }
        }
        
        filterHtml += `
            <div 
                onclick="setStageFilter(${idx})" 
                class="snap-start cursor-pointer ${boxClass} flex flex-col justify-between p-3 rounded-xl border min-w-[130px] shrink-0 transition-all"
            >
                <span class="${stepTextClass} text-[9px] font-black uppercase tracking-widest mb-1">
                    Step ${idx+1}
                </span>
                <span class="${titleClass} text-xs font-bold mb-2 leading-tight">
                    ${filterName}
                </span>
                <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-700/50">
                    <span class="text-[10px] ${stuckLabelClass} font-bold">
                        STUCK
                    </span>
                    <span class="${countBoxClass} px-2 py-0.5 rounded text-xs font-black">
                        ${orderCount}
                    </span>
                </div>
            </div>
        `;
    }
    
    filterBar.innerHTML = filterHtml;

    let displayOrders = [];
    
    if (activeStageFilter !== null) {
        for (let i = 0; i < pendingOrders.length; i++) {
            let o = pendingOrders[i];
            if (o.completedStages === activeStageFilter) {
                displayOrders.push(o);
            }
        }
    } else {
        displayOrders = pendingOrders;
    }
    
    grid.innerHTML = '';
    
    if (displayOrders.length === 0) { 
        grid.innerHTML = `
            <div class="col-span-full bg-[#131C31] border border-slate-800 p-10 rounded-2xl text-center">
                <div class="text-4xl mb-3">🍃</div>
                <p class="text-slate-400 text-lg font-bold">Inbox Zero for this view.</p>
            </div>
        `; 
        return; 
    }

    let userNameStr = "";
    let localUser = localStorage.getItem('yash_user');
    if (localUser) {
        userNameStr = localUser;
    }
    
    let isOwner = false;
    let roleLower = currentUserRole.toLowerCase();
    
    if (roleLower === 'admin' || roleLower === 'owner') {
        isOwner = true;
    }
    
    let nameLower = userNameStr.toLowerCase();
    if (nameLower.includes('yash')) {
        isOwner = true;
    }

    for (let i = 0; i < displayOrders.length; i++) {
        let order = displayOrders[i];
        
        let completionRatio = order.completedStages / 10;
        const progress = completionRatio * 100; 
        
        let isCod = false;
        if (order.paymentMode) {
            let pStr = order.paymentMode.toUpperCase();
            if (pStr.includes('COD')) {
                isCod = true;
            }
        }
        
        let nextStepName = "Fully Completed";
        
        if (order.completedStages < 10) { 
            if (order.completedStages === 7) { 
                if (isCod) {
                    nextStepName = "Call 2";
                } else {
                    nextStepName = "WhatsApp 2";
                }
            } else {
                let fullStageName = STAGE_NAMES[order.completedStages];
                let sParts = fullStageName.split(' (');
                nextStepName = sParts[0];
            }
        }
        
        let orderDateObj = parseCustomDate(order.date);
        let exactDateStr = formatExactDate(order.date);
        let timeData = getTimeAgoUI(order.date);
        
        let orderItemsCount = 0;
        for (let j = 0; j < order.items.length; j++) {
            let item = order.items[j];
            let q = 1;
            if (item.qty) {
                q = parseInt(item.qty, 10);
            }
            orderItemsCount += q;
        }
        
        let splitBadge = "";
        let idString = String(order.orderId).toUpperCase();
        
        if (idString.includes('SPLIT')) {
            splitBadge = `
                <span class="bg-purple-900/30 text-[9px] px-2 py-1 rounded text-purple-400 font-bold border border-purple-500/30 shrink-0">
                    ✂️ SPLIT
                </span>
            `;
        }
        
        let lockOverlay = "";
        let clickAction = `onclick="openModal('${order.orderId}')"`;
        let cursorStyle = "cursor-pointer";
        
        let vipClass = "bg-[#131C31] hover:border-indigo-500 border-slate-800";
        if (order.isVIP) {
            vipClass = "vip-corridor bg-[#131C31]";
        }
        
        // FEATURE: UI Lock Down for Credit Breaches
        if (order.creditLocked && !order.ceoOverride) {
            
            let unlockBtn = "";
            if (isOwner) {
                unlockBtn = `<button onclick="event.stopPropagation(); executeUnblock('${order.orderId}')" class="mt-3 w-full bg-red-600 hover:bg-red-500 text-white text-[10px] py-1.5 rounded font-black uppercase tracking-widest transition-all">🔓 CEO Override: Unblock</button>`;
            } else {
                unlockBtn = `<p class="mt-2 text-[9px] text-pink-400 font-bold uppercase">Contact Yash Sir to Unblock</p>`;
            }
            
            lockOverlay = `
                <div class="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 text-center rounded-2xl border-2 border-red-500">
                    <span class="text-3xl mb-1">🛑</span>
                    <span class="text-white font-black text-xs tracking-widest uppercase">SYSTEM LOCK</span>
                    <span class="text-red-400 font-bold text-[10px] mt-1 uppercase tracking-wider">${order.lockReason}</span>
                    ${unlockBtn}
                </div>
            `;
            clickAction = ""; 
            cursorStyle = "cursor-not-allowed";
            vipClass = "bg-red-900/10 border-red-500/50";
        }
        
        let vipBadge = "";
        if (order.isVIP) {
            vipBadge = `
                <span class="bg-red-500 text-white text-[9px] px-2 py-1 rounded font-black uppercase shadow-[0_0_10px_red] animate-pulse shrink-0">
                    🔥 VIP
                </span>
            `;
        }
        
        let slaBadge = "";
        if (timeData.isSLAWarning) {
            slaBadge = `
                <span class="text-[9px] bg-yellow-500/20 text-yellow-400 font-black border border-yellow-500 px-2 py-1 rounded animate-pulse tracking-widest shrink-0">
                    ⏳ NEAR BREACH
                </span>
            `;
        }
        
        let tatBadge = "";
        let isBefore6PM = false;
        
        let h = orderDateObj.getHours();
        if (h < 18) {
            isBefore6PM = true;
        }
        
        if (isBefore6PM && order.completedStages < 6) { 
            let msInHour = 60 * 60 * 1000;
            let targetTime = orderDateObj.getTime() + msInHour;
            
            tatBadge = `<span class="tat-timer bg-orange-900/30 text-orange-400 text-[10px] px-2 py-1 rounded font-black border border-orange-500/30 shrink-0 animate-pulse" data-target="${targetTime}">⏳ TAT: Calc...</span>`;
        }
        
        let mergeBadge = "";
        let isEarlyStage = false;
        if (order.completedStages < 4) {
            isEarlyStage = true;
        }
        
        let hasMultiPending = false;
        if (shopPendingCount[order.shopName] > 1) {
            hasMultiPending = true;
        }
        
        let isNotLocked = false;
        if (!order.creditLocked) {
            isNotLocked = true;
        }
        
        if (isEarlyStage && hasMultiPending && isNotLocked) {
            mergeBadge = `
                <span class="text-[9px] bg-blue-500/20 text-blue-400 font-black border border-blue-500 px-2 py-1 rounded tracking-widest shrink-0" title="Pack this together with another pending order!">
                    🔗 MERGE AVAIL
                </span>
            `;
        }
        
        let paymentBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (isCod) {
            paymentBadgeClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        }
        
        let pModeDisplay = 'N/A';
        if (order.paymentMode) {
            pModeDisplay = order.paymentMode;
        }
        
        let tValDisplay = '0';
        if (order.totalValue) {
            tValDisplay = order.totalValue;
        }

        let orderArea = "";
        if (order.area) {
            orderArea = order.area;
        }

        grid.innerHTML += `
            <div 
                ${clickAction} 
                class="${vipClass} rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group hover-card ${cursorStyle} border"
            >
                ${lockOverlay}
                <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full transition-transform group-hover:scale-125"></div>
                
                <div class="mb-4 relative z-10">
                    <div class="flex justify-between items-start mb-1.5">
                        <h3 class="font-black text-sm text-white tracking-wider">${order.orderId}</h3>
                        <div class="flex flex-col gap-1 items-end">
                            <div class="flex gap-1">
                                ${vipBadge}
                                ${splitBadge}
                            </div>
                        </div>
                    </div>
                    
                    <p class="text-indigo-300 font-bold text-xs leading-tight text-wrap-custom mb-3">
                        ${order.shopName} <span class="text-slate-500 font-normal">(${orderArea})</span>
                    </p>
                    
                    <div class="flex gap-1 items-center flex-wrap mb-3">
                        <span class="bg-[#0B1121] text-[9px] px-2 py-1 rounded text-slate-400 font-mono tracking-widest border border-slate-800">
                            ${exactDateStr}
                        </span>
                        <span class="bg-[#0B1121] ${timeData.color} text-[9px] px-2 py-1 rounded font-black tracking-widest border border-slate-800">
                            ⏱️ ${timeData.text}
                        </span>
                        ${tatBadge}
                        ${slaBadge} 
                        ${mergeBadge}
                    </div>
                    
                    <div class="mt-3 flex flex-wrap gap-2 items-center">
                        <span class="text-[9px] font-black px-2 py-1 rounded tracking-widest uppercase border ${paymentBadgeClass}">
                            ${pModeDisplay}
                        </span>
                        <span class="text-[10px] font-black text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/20">
                            ₹${tValDisplay}
                        </span>
                        <span class="text-[10px] font-black text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                            Qty: ${orderItemsCount}
                        </span>
                    </div>
                </div>
                
                <div>
                    <div class="bg-[#0B1121] p-2.5 rounded-lg mb-3 border border-slate-800 flex justify-between items-center group-hover:border-indigo-500/30 transition-colors">
                        <span class="text-[9px] text-slate-500 uppercase font-black tracking-widest">
                            Next Action:
                        </span>
                        <span class="text-[10px] text-emerald-400 font-black bg-emerald-900/20 px-2 py-1 rounded truncate max-w-[55%] border border-emerald-500/10">
                            ${nextStepName}
                        </span>
                    </div>
                    
                    <div class="flex justify-between text-[9px] text-slate-500 mb-1.5 font-black uppercase tracking-widest">
                        <span>Pipeline Progress</span>
                        <span class="text-indigo-400">${order.completedStages}/10</span>
                    </div>
                    
                    <div class="w-full bg-[#0B1121] rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div class="bg-gradient-to-r from-indigo-600 to-purple-500 h-1.5 rounded-full relative" style="width: ${progress}%">
                            <div class="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// 1-CLICK MERGE EXECUTION
async function executeMerge(primaryOrderId, shopName) {
    let msg = `Combine all pending items for ${shopName} into this order?`;
    let confirmVal = confirm(msg);
    
    if (confirmVal === false) {
        return;
    }
    
    let targetBtn = event.currentTarget;
    targetBtn.innerText = "Merging Pipelines...";
    targetBtn.disabled = true;
    targetBtn.classList.add('animate-pulse');
    
    try {
        let payload = {
            action: 'mergeOrders',
            primaryOrderId: primaryOrderId,
            shopName: shopName
        };
        
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (data.status === 'success') {
            showNotification("MERGE COMPLETE", "Orders have been physically combined in the database.");
            closeModal();
            fetchOrders(true);
        } else {
            let errorMsg = "Merge Failed";
            if (data.message) {
                errorMsg = data.message;
            }
            alert(errorMsg);
            targetBtn.innerText = "Merge Failed";
        }
    } catch(e) {
        alert("Network error during merge execution.");
        targetBtn.innerText = "Retry Merge";
        targetBtn.disabled = false;
    }
}

function openModal(orderId) {
    const order = window.appData.orders[orderId];
    
    if (!order) {
        return;
    }
    
    currentActiveOrder = order; 
    queuedFiles = []; 
    
    let modalIdDisplay = document.getElementById('modalOrderId');
    modalIdDisplay.innerText = order.orderId;
    
    let modalShopName = document.getElementById('modalShopName');
    modalShopName.innerText = order.shopName;
    
    let badge = document.getElementById('modalVipBadge');
    if (order.isVIP) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
    
    let orderDateObj = parseCustomDate(order.date);
    let exactDateStr = formatExactDate(order.date); 
    let timeData = getTimeAgoUI(order.date);
    
    let recDateDisplay = document.getElementById('modalReceiptDate');
    recDateDisplay.innerText = exactDateStr;
    
    let timeDisplay = document.getElementById('modalTimeElapsed');
    timeDisplay.innerText = `⏱️ ${timeData.text}`;
    timeDisplay.className = `text-[10px] bg-slate-800 px-2 py-1 rounded ${timeData.color} font-black tracking-widest border border-slate-700`;

    let tatBadgeEl = document.getElementById('modalTatTimer');
    
    let isBefore6PM = false;
    let hr = orderDateObj.getHours();
    
    if (hr < 18) {
        isBefore6PM = true;
    }
    
    if (isBefore6PM && order.completedStages < 6) { 
        let targetTime = orderDateObj.getTime() + (60 * 60 * 1000); 
        tatBadgeEl.setAttribute('data-target', targetTime);
        tatBadgeEl.className = "tat-timer text-[10px] bg-orange-900/30 text-orange-400 px-2 py-1 rounded font-black tracking-widest border border-orange-500/30 animate-pulse inline-block";
        tatBadgeEl.innerText = "⏳ TAT: Calc...";
    } else {
        tatBadgeEl.className = "hidden";
    }

    let isCod = false;
    if (order.paymentMode) {
        let pUpper = order.paymentMode.toUpperCase();
        if (pUpper.includes('COD')) {
            isCod = true;
        }
    }
    
    let payBadge = document.getElementById('modalPaymentMode'); 
    
    if (order.paymentMode) {
        payBadge.innerText = order.paymentMode;
    } else {
        payBadge.innerText = 'N/A';
    }
    
    if (isCod) {
        payBadge.className = `text-[10px] px-2 py-1 rounded font-black tracking-widest uppercase border bg-orange-500/10 text-orange-400 border-orange-500/20`;
    } else {
        payBadge.className = `text-[10px] px-2 py-1 rounded font-black tracking-widest uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
    }
    
    let valDisplay = document.getElementById('modalTotalValue');
    
    let tVal = '0';
    if (order.totalValue) {
        tVal = order.totalValue;
    }
    valDisplay.innerText = `Amount: ₹${tVal}`;
    
    const container = document.getElementById('stagesContainer'); 
    container.innerHTML = '';
    
    let itemsHtml = `
        <div class="mb-6 bg-[#131C31] border border-slate-700 rounded-xl p-4 shadow-inner">
            <h3 class="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                <span class="text-indigo-400 text-lg">📦</span> Order Manifest
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 hide-scrollbar">
    `;
    
    if (order.items && order.items.length > 0) {
        for (let i = 0; i < order.items.length; i++) {
            let item = order.items[i];
            let imgTag = "";
            
            if (item.image && item.image !== "") {
                imgTag = `
                    <img 
                        src="${item.image}" 
                        class="w-12 h-12 object-contain rounded bg-white p-1 shrink-0 shadow-sm"
                    >
                `;
            } else {
                imgTag = `
                    <div class="w-12 h-12 bg-slate-800 rounded flex items-center justify-center text-[9px] text-slate-500 shrink-0 font-mono border border-slate-700">
                        No Img
                    </div>
                `;
            }
            
            let iName = "";
            if (item.name) {
                iName = item.name;
            }
            
            let iQty = "";
            if (item.qty) {
                iQty = item.qty;
            }
            
            itemsHtml += `
                <div class="flex items-start gap-3 bg-[#0B1121] p-2.5 rounded-lg border border-slate-800">
                    ${imgTag}
                    <div class="flex-1 min-w-0">
                        <p class="text-xs text-slate-300 font-bold leading-tight text-wrap-custom">
                            ${iName}
                        </p>
                        <div class="mt-2 flex items-center gap-2">
                            <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Qty:
                            </span>
                            <span class="text-xs font-black text-indigo-400 bg-indigo-900/30 border border-indigo-500/20 px-2 py-0.5 rounded shadow-inner">
                                ${iQty}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        itemsHtml += `
            <p class="text-sm text-slate-600 italic px-2">
                No SKU data found for this order.
            </p>
        `; 
    }
    
    itemsHtml += `
            </div>
        </div>
    `; 
    
    container.innerHTML += itemsHtml;

    let mergeActionHtml = "";
    
    let pendingCount = 0;
    for (let i = 0; i < filteredData.length; i++) {
        let fd = filteredData[i];
        if (fd.shopName === order.shopName) {
            if (fd.completedStages < 4) {
                pendingCount++;
            }
        }
    }

    if (order.completedStages < 4 && pendingCount > 1) {
        let amountToMerge = pendingCount - 1;
        mergeActionHtml = `
            <button 
                onclick="executeMerge('${order.orderId}', '${order.shopName}')" 
                class="w-full mt-2 mb-4 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-black py-3 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 uppercase tracking-widest border border-blue-500/50"
            >
                🔗 1-Click Merge: Combine ${amountToMerge} other pending order(s) into this one
            </button>
        `;
    }

    container.innerHTML += mergeActionHtml;

    let stagesListHtml = '<div class="space-y-4">';
    
    let needsShare = false;
    let lastCompletedStage = order.completedStages;
    let stagesRequiringShare = [2, 4, 5, 6, 9];
    
    let isStageReqShare = false;
    for (let i = 0; i < stagesRequiringShare.length; i++) {
        if (stagesRequiringShare[i] === lastCompletedStage) {
            isStageReqShare = true;
            break;
        }
    }
    
    if (isStageReqShare) {
        let lsKey = 'shared_' + order.orderId + '_' + lastCompletedStage;
        let lsVal = localStorage.getItem(lsKey);
        
        if (lsVal !== 'true') {
            needsShare = true;
        }
    }
    
    for (let i = 0; i < 10; i++) { 

        const stageNum = i + 1; 
        
        let isCompleted = false;
        if (i < order.completedStages) {
            isCompleted = true;
        }
        
        let isActive = false;
        if (i === order.completedStages) {
            isActive = true;
        }
        
        let isLocked = false;
        if (i > order.completedStages) {
            isLocked = true;
        }
        
        let displayStageName = STAGE_NAMES[i];
        if (stageNum === 8) { 
            if (isCod) {
                displayStageName = "Call 2 (Out-for-delivery)";
            } else {
                displayStageName = "WhatsApp 2 (Out-for-delivery)";
            }
        }
        
        let uiHtml = '';
        
        if (isCompleted) {
            let cellData = "";
            if (order.stageUrls) {
                if (order.stageUrls[i]) {
                    cellData = order.stageUrls[i];
                }
            }
            
            let timestampDisplay = "";
            let timeTakenDisplay = "";
            let thisEpoch = null;
            
            let previousEpoch = parseCustomDate(order.date).getTime(); 
            
            if (i > 0) {
                if (order.stageUrls) {
                    if (order.stageUrls[i-1]) {
                        let prevStr = order.stageUrls[i-1];
                        let prevMatch = prevStr.match(/TIME:\s*(\d+)/);
                        if (prevMatch) {
                            previousEpoch = parseInt(prevMatch[1], 10);
                        }
                    }
                }
            }

            if (cellData && cellData.includes("TIME:")) {
                let match = cellData.match(/TIME:\s*(\d+)/);
                if (match) {
                    thisEpoch = parseInt(match[1], 10);
                    let d = new Date(thisEpoch);
                    
                    let opts = {
                        hour: '2-digit', 
                        minute:'2-digit'
                    };
                    let timeStr = d.toLocaleTimeString('en-US', opts);
                    
                    timestampDisplay = `<span class="text-[9px] text-emerald-300 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50">At: ${timeStr}</span>`;
                    
                    let diffRaw = thisEpoch - previousEpoch;
                    let diffMins = Math.round(diffRaw / 60000);
                    
                    if (diffMins >= 0) {
                        timeTakenDisplay = `<span class="text-[9px] text-slate-400 font-mono bg-[#0B1121] px-2 py-0.5 rounded border border-slate-700/50">Took: ${diffMins}m</span>`;
                    }
                    
                    cellData = cellData.replace(/\|\|\s*TIME:\s*\d+/, '');
                    cellData = cellData.trim();
                }
            }

            let actionStr = "";
            let urlData = cellData;
            
            if (cellData && cellData.includes("||")) {
                let parts = cellData.split("||");
                let partZero = parts[0].trim();
                
                actionStr = partZero.replace(/^\[|\]$/g, '');
                
                if (parts[1]) {
                    urlData = parts[1];
                } else {
                    urlData = "";
                }
            }

            let fileUrls = [];
            if (urlData) {
                fileUrls = urlData.split(',');
            }
            
            let hasFiles = false; 
            let previewHtml = `<div class="flex flex-col gap-2 mt-3">`;
            
            if (actionStr && actionStr !== "Completed") {
                previewHtml += `
                    <div class="bg-indigo-900/30 border border-indigo-500/30 p-2.5 rounded-lg mb-2 text-indigo-300 text-xs font-bold leading-relaxed whitespace-pre-wrap shadow-inner">
                        📋 ${actionStr}
                    </div>
                `;
            }
            
            for (let fIndex = 0; fIndex < fileUrls.length; fIndex++) {
                let rawUrl = fileUrls[fIndex];
                let url = rawUrl.trim();
                
                if (url.includes("http")) {
                    hasFiles = true;
                    
                    let isAudio = false;
                    let urlLower = url.toLowerCase();
                    if (urlLower.includes("audio")) {
                        isAudio = true;
                    }
                    
                    if (stageNum === 10 || stageNum === 8 || isAudio) { 
                        previewHtml += `
                            <audio controls src="${url}" class="h-10 w-full outline-none bg-slate-800 rounded border border-slate-700"></audio>
                        `; 
                    } else { 
                        let displayIndex = fIndex + 1;
                        previewHtml += `
                            <a 
                                href="${url}" 
                                target="_blank" 
                                class="bg-[#0B1121] hover:bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs font-bold text-indigo-400 flex items-center justify-between transition shadow-sm"
                            >
                                <span>🖼️ View Uploaded Proof ${displayIndex}</span>
                                <span class="text-slate-500 text-lg">→</span>
                            </a>
                        `; 
                    }
                }
            }
            
            let stageReqShare = false;
            for (let rIndex = 0; rIndex < stagesRequiringShare.length; rIndex++) {
                if (stagesRequiringShare[rIndex] === stageNum) {
                    stageReqShare = true;
                    break;
                }
            }
            
            if (hasFiles && stageReqShare) {
                let lsKey = 'shared_' + order.orderId + '_' + stageNum;
                let lsVal = localStorage.getItem(lsKey);
                
                let isShared = false;
                if (lsVal === 'true') {
                    isShared = true;
                }
                
                let btnClass = "bg-[#25D366] text-white border-[#25D366] animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_rgba(37,211,102,0.5)]";
                if (isShared) {
                    btnClass = "bg-[#128C7E]/40 text-white border-[#128C7E]/50";
                }
                
                let btnText = "📤 Share to Group (MANDATORY)";
                let iconDisplay = "📤";
                
                if (isShared) {
                    btnText = "✓ Shared to WhatsApp";
                    iconDisplay = "✓";
                }
                
                previewHtml += `
                    <button 
                        onclick="shareToGroup(${stageNum}, '${urlData}')" 
                        class="mt-2 w-full ${btnClass} text-[10px] font-black py-3 rounded-lg shadow transition-colors flex items-center justify-center gap-2 uppercase tracking-widest border"
                    >
                        <span>${iconDisplay}</span> ${btnText}
                    </button>
                `;
            }
            
            previewHtml += `</div>`;
            
            uiHtml = `
                <div class="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 hover:bg-emerald-900/20 transition">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-emerald-400 text-sm font-black block mb-1.5">
                                ${stageNum}. ${displayStageName}
                            </span>
                            <div class="flex items-center gap-2">
                                ${timestampDisplay}
                                ${timeTakenDisplay}
                            </div>
                        </div>
                        <span class="bg-emerald-950 text-emerald-500 font-black text-[9px] px-2 py-1 rounded shadow-inner uppercase tracking-widest shrink-0 ml-2">
                            ✔ DONE
                        </span>
                    </div>
                    ${previewHtml}
                </div>
            `;
        } 
        else if (isLocked) {
            uiHtml = `
                <div class="bg-slate-800/20 border border-slate-800 rounded-xl p-4 flex justify-between items-center grayscale opacity-50">
                    <span class="text-slate-500 text-sm font-bold">
                        ${stageNum}. ${displayStageName}
                    </span>
                    <span class="text-slate-600 text-[9px] font-mono tracking-widest bg-slate-900 px-2 py-1 rounded">
                        🔒 LOCKED
                    </span>
                </div>
            `;
        }
        else if (isActive) {
            let inputHtml = '';
            
            if (stageNum === 1) {
                inputHtml = `
                    <button 
                        onclick="submitStage(${stageNum})" 
                        id="submitBtn_${stageNum}" 
                        class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg"
                    >
                        Accept Task & Begin Process
                    </button>
                `;
            } 
            else if (stageNum === 2) {
                inputHtml = `
                    <button 
                        onclick="generateTallyCSV('${order.orderId}')" 
                        class="w-full mt-4 mb-2 bg-[#EAB308] hover:bg-[#CA8A04] text-black font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                        <span>📊</span> Export Sales Order for Tally (CSV)
                    </button>
                    
                    <p class="text-[10px] font-black text-slate-400 mt-4 mb-2 uppercase tracking-widest flex items-center gap-2">
                        <span class="text-indigo-400">⚡</span> Upload Balance Check Proof (Required)
                    </p>
                    
                    <input 
                        type="file" 
                        accept="image/*" 
                        class="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-black file:bg-indigo-600 file:text-white bg-[#0B1121] p-1.5 rounded-xl border border-slate-700 cursor-pointer transition-colors hover:border-indigo-500" 
                        onchange="handleFileSelection(this, ${stageNum})"
                    >
                    
                    <div 
                        id="previewBox_${stageNum}" 
                        class="flex flex-wrap gap-2 mt-3 hidden bg-[#0B1121] p-2 rounded-lg border border-slate-700"
                    ></div>
                    
                    <div 
                        class="flex items-center justify-between mt-2 bg-emerald-900/10 rounded px-2 border border-emerald-500/10 hidden" 
                        id="fileStatusContainer_${stageNum}"
                    >
                        <p id="fileStatusText_${stageNum}" class="text-[10px] font-black text-emerald-400 py-2 hidden"></p>
                        <button 
                            id="clearFilesBtn_${stageNum}" 
                            onclick="clearQueuedFiles(${stageNum})" 
                            class="text-[10px] font-bold text-pink-400 hidden px-2 py-1 bg-pink-900/30 rounded border border-pink-500/30"
                        >
                            Clear
                        </button>
                    </div>
                    
                    <button 
                        onclick="submitStage(${stageNum})" 
                        id="submitBtn_${stageNum}" 
                        class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg"
                    >
                        Confirm Check & Execute
                    </button>
                `;
            }
            else if (stageNum === 7) { 
                inputHtml += `
                    <div class="bg-[#0B1121] border border-slate-700 p-4 rounded-xl mt-4 mb-4 shadow-inner">
                        <p class="text-[10px] text-slate-400 mb-3 uppercase font-black tracking-widest flex items-center gap-2">
                            <span class="text-indigo-400 text-base">🚚</span> Logistics Tracking Engine
                        </p>
                        
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                            1. Who took the order?
                        </label>
                        <select id="runnerSelect" class="w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-3 font-bold text-sm focus:border-indigo-400" onchange="if(this.value==='Others'){document.getElementById('runnerOther').classList.remove('hidden')}else{document.getElementById('runnerOther').classList.add('hidden')}">
                            <option value="" disabled selected>Select Delivery Person...</option>
                            <option value="Vishal Gunjal">Vishal Gunjal</option>
                            <option value="Preetam Bogawat">Preetam Bogawat</option>
                            <option value="Raghav Korekar">Raghav Korekar</option>
                            <option value="Yash Barlota">Yash Barlota</option>
                            <option value="Rickshaw wala">Rickshaw wala</option>
                            <option value="Others">Others (Type Below)</option>
                        </select>
                        <input 
                            type="text" 
                            id="runnerOther" 
                            placeholder="Enter person's name..." 
                            class="hidden w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-4 font-bold text-sm"
                        >

                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                            2. Which Transport?
                        </label>
                        <select id="transportSelect" class="w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-3 font-bold text-sm focus:border-indigo-400" onchange="if(this.value==='Others'){document.getElementById('transportOther').classList.remove('hidden')}else{document.getElementById('transportOther').classList.add('hidden')}">
                            <option value="" disabled selected>Select Transport Partner...</option>
                            <option value="Local">Local</option>
                            <option value="Adhunik Transport">Adhunik Transport</option>
                            <option value="Ambika Transport">Ambika Transport</option>
                            <option value="Blue Express">Blue Express</option>
                            <option value="Others">Others (Type Below)</option>
                        </select>
                        <input 
                            type="text" 
                            id="transportOther" 
                            placeholder="Enter transport name..." 
                            class="hidden w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-4 font-bold text-sm"
                        >
                        
                        <button 
                            onclick="submitStage(${stageNum})" 
                            id="submitBtn_${stageNum}" 
                            class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg"
                        >
                            Allocate Logistics & Proceed
                        </button>
                    </div>
                `;
            }
            else if (stageNum === 3 || stageNum === 8) { 
                let msgTemplate = "";
                
                if (stageNum === 3) {
                    if (window.appSettings.waMsgStage3) {
                        msgTemplate = window.appSettings.waMsgStage3;
                    }
                } else {
                    if (isCod) {
                        if (window.appSettings.waMsgStage7COD) {
                            msgTemplate = window.appSettings.waMsgStage7COD;
                        }
                    } else {
                        if (window.appSettings.waMsgStage7Prepaid) {
                            msgTemplate = window.appSettings.waMsgStage7Prepaid;
                        }
                    }
                }
                
                let finalMsg = msgTemplate;
                
                if (order.shopName) {
                    finalMsg = finalMsg.replace(/{{shop}}/g, order.shopName);
                }
                if (order.orderId) {
                    finalMsg = finalMsg.replace(/{{orderId}}/g, order.orderId);
                }
                if (order.paymentMode) {
                    finalMsg = finalMsg.replace(/{{paymentMode}}/g, order.paymentMode);
                }
                if (order.totalValue !== undefined) {
                    finalMsg = finalMsg.replace(/{{amount}}/g, order.totalValue);
                }
                
                let waUrl = `https://wa.me/?text=${encodeURIComponent(finalMsg)}`;
                if (order.phone) {
                    waUrl = `https://wa.me/${order.phone}?text=${encodeURIComponent(finalMsg)}`;
                }

                inputHtml += `
                    <div class="mt-4 mb-4">
                        <p class="text-[10px] text-slate-400 mb-2 uppercase tracking-widest">
                            Step 1: Communication
                        </p>
                        
                        <a 
                            href="${waUrl}" 
                            target="_blank" 
                            class="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg transition-all active:scale-95 mb-3"
                        >
                            Send WhatsApp Message
                        </a>
                        
                        <label class="flex items-center gap-3 cursor-pointer bg-pink-500/10 border border-pink-500/30 p-3 rounded-xl hover:bg-pink-500/20 transition-colors">
                            <input 
                                type="checkbox" 
                                id="noResponse_${stageNum}" 
                                class="w-5 h-5 rounded border-slate-600 bg-slate-800 text-pink-500 cursor-pointer shrink-0"
                            >
                            <span class="text-[11px] text-pink-400 font-black uppercase tracking-widest text-wrap-custom">
                                Dealer Didn't Respond / Ignore
                            </span>
                        </label>
                    </div>
                `;
                
                if (stageNum === 8 && isCod) { 
                    inputHtml += `
                        <div class="bg-indigo-900/20 p-3 rounded-xl border border-indigo-500/30 mb-4">
                            <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <span class="text-indigo-400">🎤</span> Upload Call Recording (Mandatory for COD)
                            </p>
                            
                            <input 
                                type="file" 
                                accept="audio/*" 
                                class="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-black file:bg-indigo-600 file:text-white bg-[#0B1121] p-1.5 rounded-xl border border-slate-700 cursor-pointer" 
                                onchange="handleFileSelection(this, ${stageNum})"
                            >
                            
                            <div 
                                id="previewBox_${stageNum}" 
                                class="flex flex-wrap gap-2 mt-3 hidden bg-[#0B1121] p-2 rounded-lg border border-slate-700"
                            ></div>
                            
                            <div 
                                class="flex items-center justify-between mt-2 bg-emerald-900/10 rounded px-2 border border-emerald-500/10 hidden" 
                                id="fileStatusContainer_${stageNum}"
                            >
                                <p id="fileStatusText_${stageNum}" class="text-[10px] font-black text-emerald-400 py-2 hidden"></p>
                                <button 
                                    id="clearFilesBtn_${stageNum}" 
                                    onclick="clearQueuedFiles(${stageNum})" 
                                    class="text-[10px] font-bold text-pink-400 hidden px-2 py-1 bg-pink-900/30 rounded border border-pink-500/30"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    `;
                }
                
                inputHtml += `
                    <p class="text-[10px] text-slate-400 mb-2 uppercase tracking-widest">
                        Step 2: Submit
                    </p>
                    <button 
                        id="submitBtn_${stageNum}" 
                        onclick="submitStage(${stageNum})" 
                        class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg"
                    >
                        Mark as Completed
                    </button>
                `;
            }
            else {
                if (stageNum === 4) {
                    inputHtml += `
                        <div class="bg-[#0B1121] border border-slate-700 p-3 rounded-xl mt-4 mb-4 shadow-inner">
                            <p class="text-[10px] text-slate-400 mb-3 uppercase font-black tracking-widest flex items-center gap-2">
                                <span class="text-indigo-400 text-base">☑</span> Confirm Available Stock
                            </p>
                            <div class="space-y-2 max-h-[400px] overflow-y-auto hide-scrollbar pr-1">
                    `;
                    
                    for (let itemIdx = 0; itemIdx < order.items.length; itemIdx++) {
                        let itemObj = order.items[itemIdx];
                        
                        let displayItemName = "";
                        if (itemObj.name) {
                            displayItemName = itemObj.name;
                        }
                        
                        let displayItemQty = "";
                        if (itemObj.qty) {
                            displayItemQty = itemObj.qty;
                        }
                        
                        inputHtml += `
                            <div class="flex items-center justify-between bg-[#131C31] p-2.5 rounded-lg border border-slate-800">
                                <label class="flex items-start gap-2.5 text-xs font-bold text-white cursor-pointer w-2/3 text-wrap-custom">
                                    <input 
                                        type="checkbox" 
                                        id="chk_item_${itemIdx}" 
                                        checked 
                                        class="mt-0.5 rounded border-slate-600 bg-slate-800 text-indigo-500 w-4 h-4 cursor-pointer shrink-0"
                                    >
                                    <span class="leading-tight">${displayItemName}</span>
                                </label>
                                <div class="flex flex-col items-end">
                                    <span class="text-[8px] text-slate-500 mb-1 uppercase font-black tracking-widest">
                                        Dispatch Qty
                                    </span>
                                    <input 
                                        type="number" 
                                        id="qty_item_${itemIdx}" 
                                        value="${displayItemQty}" 
                                        max="${displayItemQty}" 
                                        min="0" 
                                        class="w-16 bg-[#0B1121] text-white text-xs font-black p-1.5 rounded border border-slate-600 text-center outline-none"
                                    >
                                </div>
                            </div>
                        `;
                    }
                    
                    inputHtml += `
                            </div>
                            <p class="text-[9px] text-orange-400 mt-3 font-bold leading-tight bg-orange-900/10 p-2 rounded border border-orange-500/20">
                                * Unchecked items or reduced quantities will automatically create a new SPLIT-ORDER for pending items.
                            </p>
                        </div>
                    `;
                }

                if (stageNum === 5) {
                    inputHtml += `
                        <button 
                            onclick="generateShippingLabel('${order.orderId}')" 
                            class="w-full mt-4 mb-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                        >
                            🖨️ Print Dynamic A6 Shipping Label
                        </button>
                    `;
                }

                if (stageNum === 10) { 
                    inputHtml += `
                        <p class="text-[10px] font-black text-slate-400 mt-4 mb-2 uppercase tracking-widest flex items-center gap-2">
                            <span class="text-indigo-400">🎤</span> Record Audio / Call (Optional)
                        </p>
                        <input 
                            type="file" 
                            accept="audio/*" 
                            class="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-black file:bg-indigo-600 file:text-white bg-[#0B1121] p-1.5 rounded-xl border border-slate-700 cursor-pointer" 
                            onchange="handleFileSelection(this, ${stageNum})"
                        >
                    `;
                } else {
                    inputHtml += `
                        <p class="text-[10px] font-black text-slate-400 mt-4 mb-2 uppercase tracking-widest flex items-center gap-2">
                            <span class="text-indigo-400">⚡</span> Upload Proof (Required)
                        </p>
                        <div class="flex gap-2 w-full">
                            <label class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-center py-3 rounded-xl cursor-pointer text-xs font-bold transition shadow-inner">
                                📸 Live Camera
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment" 
                                    class="hidden" 
                                    onchange="handleFileSelection(this, ${stageNum})"
                                >
                            </label>
                            
                            <label class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-center py-3 rounded-xl cursor-pointer text-xs font-bold transition shadow-inner">
                                🖼️ Multi Gallery
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple 
                                    class="hidden" 
                                    onchange="handleFileSelection(this, ${stageNum})"
                                >
                            </label>
                        </div>
                    `;
                }

                inputHtml += `
                    <div 
                        id="previewBox_${stageNum}" 
                        class="flex flex-wrap gap-2 mt-3 hidden bg-[#0B1121] p-2 rounded-lg border border-slate-700"
                    ></div>
                    
                    <div 
                        class="flex items-center justify-between mt-2 bg-emerald-900/10 rounded px-2 border border-emerald-500/10 hidden" 
                        id="fileStatusContainer_${stageNum}"
                    >
                        <p id="fileStatusText_${stageNum}" class="text-[10px] font-black text-emerald-400 py-2 hidden"></p>
                        <button 
                            id="clearFilesBtn_${stageNum}" 
                            onclick="clearQueuedFiles(${stageNum})" 
                            class="text-[10px] font-bold text-pink-400 hidden px-2 py-1 bg-pink-900/30 rounded border border-pink-500/30"
                        >
                            Clear Files
                        </button>
                    </div>
                `;

                if (stageNum === 10) { 
                    inputHtml += `
                        <div class="mt-4">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                Customer Rating
                            </label>
                            <input 
                                type="number" 
                                id="ratingInput" 
                                min="1" 
                                max="5" 
                                placeholder="Enter Score (1-5)" 
                                class="w-full bg-[#0B1121] border border-slate-700 rounded-xl p-3 text-white outline-none font-bold text-lg text-center shadow-inner"
                            >
                        </div>
                    `;
                }
                
                inputHtml += `
                    <button 
                        id="submitBtn_${stageNum}" 
                        onclick="submitStage(${stageNum})" 
                        class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg"
                    >
                        Execute & Proceed
                    </button>
                `;
            }
            
            if (needsShare) {
                uiHtml = `
                    <div class="bg-orange-900/10 border-2 border-orange-500/30 rounded-xl p-5 relative overflow-hidden mt-4">
                        <div class="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-white font-black text-lg text-opacity-50">
                                ${stageNum}. ${displayStageName}
                            </span>
                            <span class="bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded tracking-widest uppercase">
                                🔒 LOCKED
                            </span>
                        </div>
                        <p class="text-xs text-orange-400 font-bold mt-3">
                            ⚠️ Action Required: Upar scroll karein aur agla step unlock karne ke liye flashing green "Share to Group" button daba kar update share karein.
                        </p>
                    </div>
                `;
            } else {
                uiHtml = `
                    <div class="bg-[#131C31] border-2 border-indigo-500 rounded-xl p-5 shadow-[0_0_30px_rgba(79,70,229,0.15)] relative overflow-hidden transform scale-[1.02]">
                        <div class="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 shadow-[0_0_15px_#4f46e5]"></div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-white font-black text-lg">
                                ${stageNum}. ${displayStageName}
                            </span>
                            <span class="bg-indigo-500 text-white text-[9px] font-black px-2 py-1 rounded animate-pulse tracking-widest uppercase">
                                ACTION REQUIRED
                            </span>
                        </div>
                        <div id="actionArea_${stageNum}">
                            ${inputHtml}
                        </div>
                        <p id="status_${stageNum}" class="text-xs font-bold mt-3 hidden text-center"></p>
                    </div>
                `;
            }
        }

        stagesListHtml += uiHtml;
    }
    
    stagesListHtml += '</div>'; 
    container.innerHTML += stagesListHtml;
    
    let modalObj = document.getElementById('orderModal');
    modalObj.classList.remove('hidden');
}

function closeModal() { 
    let modalObj = document.getElementById('orderModal');
    modalObj.classList.add('hidden'); 
    
    fetchOrders(true); 
}

function handleFileSelection(inputElement, stageNum) {
    let inputArr = Array.from(inputElement.files);
    
    for (let i = 0; i < inputArr.length; i++) {
        queuedFiles.push(inputArr[i]);
    }
    
    const statusLabel = document.getElementById(`fileStatusText_${stageNum}`);
    const clearBtn = document.getElementById(`clearFilesBtn_${stageNum}`);
    const container = document.getElementById(`fileStatusContainer_${stageNum}`);
    const previewBox = document.getElementById(`previewBox_${stageNum}`);
    
    if (queuedFiles.length > 0) {
        statusLabel.innerText = `✓ ${queuedFiles.length} File(s) Ready`; 
        statusLabel.classList.remove('hidden'); 
        
        if (clearBtn) {
            clearBtn.classList.remove('hidden'); 
        }
        
        if (container) {
            container.classList.remove('hidden');
        }
        
        if (previewBox) {
            previewBox.innerHTML = ''; 
            previewBox.classList.remove('hidden');
            
            for (let i = 0; i < queuedFiles.length; i++) {
                let file = queuedFiles[i];
                let fType = file.type;
                
                if (fType.startsWith('audio/')) {
                    previewBox.innerHTML += `
                        <div class="w-12 h-12 bg-indigo-900/50 flex flex-col items-center justify-center rounded border border-indigo-500 text-[8px] text-indigo-300 font-bold p-1 overflow-hidden shadow-inner">
                            🎤<br/>Audio
                        </div>
                    `; 
                } else { 
                    let readerObj = new FileReader(); 
                    readerObj.onload = function(e) { 
                        previewBox.innerHTML += `
                            <img src="${e.target.result}" class="w-12 h-12 object-cover rounded border border-slate-600 shadow-sm">
                        `; 
                    }; 
                    readerObj.readAsDataURL(file); 
                }
            }
        }
    }
}

function clearQueuedFiles(stageNum) {
    queuedFiles = [];
    
    let txtLabel = document.getElementById(`fileStatusText_${stageNum}`);
    if (txtLabel) {
        txtLabel.classList.add('hidden'); 
    }
    
    let clrBtn = document.getElementById(`clearFilesBtn_${stageNum}`);
    if (clrBtn) {
        clrBtn.classList.add('hidden'); 
    }
    
    let cont = document.getElementById(`fileStatusContainer_${stageNum}`);
    if (cont) {
        cont.classList.add('hidden');
    }
    
    let pBox = document.getElementById(`previewBox_${stageNum}`);
    if (pBox) { 
        pBox.innerHTML = ''; 
        pBox.classList.add('hidden'); 
    }
}

window.shareToGroup = function(stageNum, fileUrlsString) {
    let currentId = currentActiveOrder.orderId; 
    let shopNameStr = currentActiveOrder.shopName; 
    let stageDisplay = STAGE_NAMES[stageNum - 1]; 
    
    let linkParts = fileUrlsString.split(',');
    let linkArr = [];
    
    for (let i = 0; i < linkParts.length; i++) {
        let p = linkParts[i].trim();
        linkArr.push(makeDirectDriveLink(p));
    }
    
    let finalLinks = linkArr.join('\n');
    let msg = `*Order Update Alert*\n\n*Order ID:* ${currentId}\n*Dealer:* ${shopNameStr}\n*Stage Update:* ${stageDisplay}\n\n*Attached Files/Proof:*\n${finalLinks}`;
    
    let wUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(wUrl, '_blank');
    
    let lsKey = 'shared_' + currentId + '_' + stageNum;
    localStorage.setItem(lsKey, 'true');
    
    setTimeout(() => { 
        openModal(currentId); 
    }, 1000);
}

function generateEODReport() {
    if (!window.appData) {
        alert("No data available to generate report.");
        return;
    }
    if (!window.appData.rawArray) {
        alert("No data available to generate report.");
        return;
    }
    if (window.appData.rawArray.length === 0) {
        alert("No data available to generate report.");
        return;
    }
    
    let today = new Date();
    today.setHours(0,0,0,0);
    
    let todayOrders = [];
    
    for (let i = 0; i < window.appData.rawArray.length; i++) {
        let o = window.appData.rawArray[i];
        let d = parseCustomDate(o.date);
        d.setHours(0,0,0,0);
        
        if (d.getTime() === today.getTime()) {
            todayOrders.push(o);
        }
    }
    
    let totalReceived = todayOrders.length;
    let totalValue = 0;
    
    for (let i = 0; i < todayOrders.length; i++) {
        let val = 0;
        if (todayOrders[i].totalValue) {
            val = todayOrders[i].totalValue;
        }
        totalValue += val;
    }
    
    let totalCompleted = 0;
    for (let i = 0; i < todayOrders.length; i++) {
        if (todayOrders[i].isFullyCompleted === true) {
            totalCompleted++;
        }
    }
    
    let totalDispatched = 0;
    for (let i = 0; i < todayOrders.length; i++) {
        let o = todayOrders[i];
        if (o.completedStages >= 6 && o.isFullyCompleted === false) {
            totalDispatched++;
        }
    }
    
    let pending = totalReceived - totalCompleted - totalDispatched;
    
    let dObj = new Date();
    let reportDate = dObj.toLocaleDateString('en-GB');
    
    let staffName = 'ADMIN';
    if (currentUserName) {
        staffName = currentUserName.toUpperCase();
    }
    
    let msg = `*📊 DAILY EOD REPORT - YASH MARKETING*\n\n*📅 Date:* ${reportDate}\n*🧑‍💼 Staff:* ${staffName}\n\n`;
    msg += `*📦 Orders Received Today:* ${totalReceived}\n`;
    msg += `*💰 Total Value:* ₹${totalValue.toLocaleString()}\n`;
    msg += `*✅ Orders Delivered/Final:* ${totalCompleted}\n`;
    msg += `*🚚 Orders Dispatched:* ${totalDispatched}\n`;
    msg += `*⏳ Pending Orders:* ${pending}\n\n`;
    msg += `_System Generated via MDO OS_`;
    
    let wUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(wUrl, '_blank');
}

function generateTallyCSV(orderId) {
    let order = window.appData.orders[orderId];
    if (!order) {
        return;
    }
    
    let csvContent = "\uFEFFDate,Voucher Type,Voucher Number,Party Name,Item Name,Quantity,Rate,Amount\n";
    
    let dObj = parseCustomDate(order.date);
    let formattedDate = dObj.toLocaleDateString('en-GB'); 
    
    for (let i = 0; i < order.items.length; i++) {
        let item = order.items[i];
        let iName = "";
        if (item.name) {
            iName = item.name;
        }
        
        let iQty = "0";
        if (item.qty) {
            iQty = item.qty;
        }
        
        csvContent += `${formattedDate},Sales Order,${order.orderId},"${order.shopName}","${iName}",${iQty},0,0\n`; 
    }
    
    let opts = { 
        type: 'text/csv;charset=utf-8;' 
    };
    let blob = new Blob([csvContent], opts);
    let link = document.createElement("a");
    
    link.href = URL.createObjectURL(blob);
    link.download = `Tally_SO_${order.orderId}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification("Tally SO Exported", `Ensure file is CLOSED before importing in Tally.`);
}

function compressImage(file) {
    return new Promise((resolve) => {
        let reader = new FileReader(); 
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            let img = new Image(); 
            img.src = event.target.result;
            
            img.onload = () => {
                let canvas = document.createElement('canvas'); 
                let MAX_WIDTH = 500; 
                let scale = 1;
                
                if (img.width > MAX_WIDTH) {
                    scale = MAX_WIDTH / img.width;
                }
                
                canvas.width = img.width * scale; 
                canvas.height = img.height * scale;
                
                let ctx = canvas.getContext('2d'); 
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                let baseStr = canvas.toDataURL('image/jpeg', 0.45);
                let splitArr = baseStr.split(',');
                let payload = splitArr[1];
                
                resolve({ 
                    name: file.name, 
                    mimeType: 'image/jpeg', 
                    base64: payload
                });
            };
        };
    });
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader(); 
        reader.readAsDataURL(file);
        
        reader.onload = () => {
            let res = reader.result;
            let splitArr = res.split(',');
            let payload = splitArr[1];
            
            resolve({ 
                name: file.name, 
                mimeType: file.type, 
                base64: payload
            });
        };
        
        reader.onerror = (error) => {
            reject(error);
        };
    });
}

async function submitStage(stageNum) {
    let btnId = `submitBtn_${stageNum}`;
    let btn = document.getElementById(btnId); 
    
    let statusId = `status_${stageNum}`;
    let statusLabel = document.getElementById(statusId);
    
    let isCod = false;
    if (currentActiveOrder.paymentMode) {
        let pm = currentActiveOrder.paymentMode.toUpperCase();
        if (pm.includes('COD')) {
            isCod = true;
        }
    }

    let payload = { 
        action: 'updateStage', 
        orderId: currentActiveOrder.orderId, 
        stage: stageNum, 
        files: [], 
        isNoResponse: false, 
        isWhatsAppOnly: false, 
        partialStock: null, 
        staffName: currentUserName 
    };
    
    let noRespId = `noResponse_${stageNum}`;
    let noRespCheckbox = document.getElementById(noRespId);
    
    if (noRespCheckbox) {
        if (noRespCheckbox.checked) {
            payload.isNoResponse = true; 
        }
    }
    
    if (stageNum === 7) {
        let runnerSelect = document.getElementById('runnerSelect');
        let runner = runnerSelect.value;
        
        if (runner === "Others") {
            let runnerOther = document.getElementById('runnerOther');
            runner = runnerOther.value;
        }
        
        let transSelect = document.getElementById('transportSelect');
        let transport = transSelect.value;
        
        if (transport === "Others") {
            let transOther = document.getElementById('transportOther');
            transport = transOther.value;
        }

        if (!runner || !transport) {
            alert("Accountability requires data! Select both a Delivery Person and a Transport partner.");
            if (btn) { 
                btn.disabled = false; 
                btn.innerText = "Allocate Logistics & Proceed"; 
            }
            return;
        }
        
        payload.actionText = `Runner: ${runner} | Transport: ${transport}`;
    }
    
    if (stageNum !== 1) {
        let fileRequired = true;
        
        if (payload.isNoResponse === true) {
            fileRequired = false;
        }
        if (stageNum === 10) {
            fileRequired = false;
        }
        if (stageNum === 7) {
            fileRequired = false;
        }
        if (stageNum === 3) {
            fileRequired = false;
        }
        if (stageNum === 8 && isCod === false) {
            fileRequired = false;
        }

        if (fileRequired && queuedFiles.length === 0) {
            if (stageNum === 8 && isCod) {
                alert("For COD Orders, Call Recording is MANDATORY."); 
            } else {
                alert("A file proof (Screenshot/Photo) is mandatory."); 
            }
            return; 
        }
        
        if (!fileRequired && queuedFiles.length === 0) {
            if (stageNum === 3 || stageNum === 8) {
                payload.isWhatsAppOnly = true; 
            }
        }
        
        if (btn) { 
            btn.innerText = "Processing & Transmitting..."; 
            btn.disabled = true; 
        }
        
        for (let i = 0; i < queuedFiles.length; i++) {
            let f = queuedFiles[i];
            
            if (f.type.startsWith('image/')) {
                let compObj = await compressImage(f);
                payload.files.push(compObj); 
            } else {
                let baseObj = await getBase64(f);
                payload.files.push(baseObj); 
            }
        }
        
        if (stageNum === 10) { 
            let rInput = document.getElementById('ratingInput');
            let ratingVal = rInput.value;
            
            if (!ratingVal || ratingVal === "") { 
                alert("Customer Rating is mandatory."); 
                
                if (btn) { 
                    btn.disabled = false; 
                    btn.innerText = "Execute & Proceed"; 
                } 
                return; 
            }
            
            payload.rating = ratingVal;
        }

        if (stageNum === 4) {
            let processed = []; 
            let short = [];
            
            for (let idx = 0; idx < currentActiveOrder.items.length; idx++) {
                let item = currentActiveOrder.items[idx];
                
                let chkId = `chk_item_${idx}`;
                let chk = document.getElementById(chkId); 
                
                let qtyId = `qty_item_${idx}`;
                let qtyInput = document.getElementById(qtyId);
                
                if (chk && qtyInput) {
                    let isChecked = chk.checked; 
                    let userQty = parseInt(qtyInput.value, 10) || 0; 
                    
                    let origQty = 1;
                    if (item.qty) {
                        origQty = parseInt(item.qty, 10);
                    }
                    
                    if (isChecked && userQty > 0) { 
                        processed.push({
                            name: item.name, 
                            qty: userQty
                        }); 
                        
                        if (userQty < origQty) {
                            let diff = origQty - userQty;
                            short.push({
                                name: item.name, 
                                qty: diff
                            }); 
                        }
                    } else {
                        short.push({
                            name: item.name, 
                            qty: origQty
                        }); 
                    }
                }
            }
            
            if (processed.length === 0) { 
                alert("You must dispatch at least one item."); 
                
                if (btn) { 
                    btn.disabled = false; 
                    btn.innerText = "Execute & Proceed"; 
                } 
                return; 
            }
            
            if (short.length > 0) {
                payload.partialStock = { 
                    processedItems: processed, 
                    shortItems: short 
                }; 
            }
        }
    } else {
        if (btn) { 
            btn.innerText = "Locking Process..."; 
            btn.disabled = true; 
        }
    }
    
    if (statusLabel) { 
        statusLabel.innerText = "📡 Uplinking Data..."; 
        statusLabel.className = "text-[10px] font-black tracking-widest mt-3 text-indigo-400 block animate-pulse text-center uppercase"; 
        statusLabel.classList.remove('hidden'); 
    }

    try {
        let reqOpts = { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        };
        
        const res = await fetch(API_URL, reqOpts);
        const data = await res.json();
        
        if (data.status === 'success') { 
            if (btn) {
                btn.innerText = "Transmission Successful ✓"; 
            }
            
            queuedFiles = []; 
            
            if (data.splitOrderId) { 
                alert(`✂️ SPLIT ORDER CREATED!\nNew ID: ${data.splitOrderId}`); 
                showNotification("SPLIT ORDER CREATED", `New ID: ${data.splitOrderId}`); 
            }
            
            fetchOrders(true); 
            closeModal();
            
        } else {
            let errorMsg = "Unknown error";
            if (data.message) {
                errorMsg = data.message;
            }
            throw new Error(errorMsg); 
        }
    } catch (err) {
        if (statusLabel) { 
            statusLabel.innerText = "❌ Sync Failed. Network Drop."; 
            statusLabel.className = "text-[10px] font-black mt-3 text-pink-500 block text-center uppercase"; 
        }
        
        if (btn) { 
            btn.innerText = "Retry Transmission (Tap Again)"; 
            btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500'); 
            btn.classList.add('bg-pink-600', 'hover:bg-pink-500'); 
            btn.disabled = false; 
        }
    }
}
