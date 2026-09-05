// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('track');
    const portalEmpId = urlParams.get('empId');

    if (trackId) {
        // DEALER TRACKING VIEW
        document.getElementById('mainAppWrapper').classList.add('hidden');
        document.getElementById('trackingScreen').classList.remove('hidden');
        document.getElementById('displayTrackId').innerText = trackId;
        
        runTrackerMode(trackId);
    } else {
        // STAFF OS VIEW
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
        document.getElementById('trackingLoader').style.display = 'none';
        if(data.status === 'success') {
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
            
            let mappedStage = Math.min(Math.floor(data.data.completedStages / 1.5), 6); 
            
            customerStages.forEach((stageName, idx) => {
                let isCompleted = idx <= mappedStage;
                let isActive = idx === mappedStage;
                let color = isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-700';
                let textColor = isCompleted ? 'text-white' : 'text-slate-500';
                
                let icon = isCompleted ? '✓' : (isActive && idx !== 6 ? '⏳' : '');
                
                html += `
                    <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div class="flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#0B1121] ${color} text-white font-black text-xs z-10 shrink-0">
                            ${icon}
                        </div>
                        <div class="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border ${isCompleted ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-slate-800 bg-[#131C31]'} shadow">
                            <h3 class="font-bold text-sm ${textColor}">
                                ${stageName}
                            </h3>
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('trackingTimeline').innerHTML = html;
            document.getElementById('trackingTimeline').classList.remove('hidden');
        } else {
            document.getElementById('trackingError').innerText = data.message || "Invalid Tracking ID";
            document.getElementById('trackingError').classList.remove('hidden');
        }
    })
    .catch(err => {
        document.getElementById('trackingLoader').style.display = 'none';
        document.getElementById('trackingError').innerText = "Network error while fetching tracking data.";
        document.getElementById('trackingError').classList.remove('hidden');
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
    }
});

function openSearch() { 
    document.getElementById('searchModal').classList.remove('hidden'); 
    document.getElementById('searchInput').focus(); 
}

function closeSearch() { 
    document.getElementById('searchModal').classList.add('hidden'); 
    document.getElementById('searchInput').value = ''; 
    document.getElementById('searchResults').innerHTML = `<div class="p-8 text-center text-slate-500 font-bold">Start typing to search main database...</div>`; 
}

function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    
    if (query.length < 2) { 
        resultsDiv.innerHTML = `<div class="p-8 text-center text-slate-500 font-bold">Type at least 2 characters...</div>`; 
        return; 
    }
    
    const matches = window.appData.rawArray.filter(o => 
        (o.orderId && o.orderId.toLowerCase().includes(query)) || 
        (o.shopName && o.shopName.toLowerCase().includes(query)) || 
        (o.phone && o.phone.includes(query))
    ).slice(0, 10);

    if (matches.length === 0) { 
        resultsDiv.innerHTML = `<p class="text-pink-500 font-bold p-4 text-center">No matching orders found.</p>`; 
        return; 
    }

    resultsDiv.innerHTML = matches.map(o => {
        let badge = o.isVIP ? `<span class="bg-red-500 text-white text-[9px] px-1 rounded animate-pulse ml-2">VIP</span>` : "";
        return `
        <div onclick="closeSearch(); openModal('${o.orderId}')" class="p-3 border-b border-slate-800 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors rounded-lg mb-1">
            <div>
                <div class="font-black text-white text-sm flex items-center">${o.orderId} ${badge}</div>
                <div class="text-xs text-indigo-400 font-bold">${o.shopName}</div>
            </div>
            <div class="text-right">
                <div class="text-[10px] bg-indigo-900/50 border border-indigo-500/30 px-2 py-1 rounded text-indigo-300 font-black mb-1">Stage ${o.completedStages}/9</div>
                <div class="text-[9px] text-emerald-400 font-black uppercase">${o.paymentMode}</div>
            </div>
        </div>`;
    }).join('');
}

function openHandover() {
    document.getElementById('handoverModal').classList.remove('hidden');
    fetchHandoverNotes();
}

function closeHandover() {
    document.getElementById('handoverModal').classList.add('hidden');
    document.getElementById('handoverNoteInput').value = '';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const error = document.getElementById('loginError');
    btn.innerText = "AUTHENTICATING...";
    error.classList.add('hidden'); 
    
    try {
        // Master Key API call
        const data = await gasRequest({ 
            action: 'login', 
            employeeId: document.getElementById('loginEmpId').value, 
            password: document.getElementById('loginPass').value 
        });
        
        if (data.status === 'success' || data.success === true) {
            const uName = data.user?.name || data.username;
            const uRole = data.user?.role || data.role || 'Staff';
            
            localStorage.setItem('yash_user', uName); 
            localStorage.setItem('yash_role', uRole);
            showDashboard(uName, uRole);
        } else { 
            error.innerText = data.message || "Invalid Employee ID or Password."; 
            error.classList.remove('hidden'); 
            btn.innerText = "INITIALIZE SYSTEM"; 
        }
    } catch (err) { 
        error.innerText = err.message || "Network Error."; 
        error.classList.remove('hidden'); 
        btn.innerText = "INITIALIZE SYSTEM"; 
    }
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
        if (document.getElementById('orderModal').classList.contains('hidden') &&
            document.getElementById('searchModal').classList.contains('hidden') &&
            document.getElementById('handoverModal').classList.contains('hidden')) {
            fetchOrders(true); 
        }
    }, 30000); 
}

function logout() { 
    localStorage.clear(); 
    location.reload(); 
}

function setDateRange(range, btnElement) {
    activeDateRange = range;
    if (btnElement) {
        document.querySelectorAll('.date-filter-btn').forEach(btn => {
            btn.classList.remove('active-filter', 'bg-[#4F46E5]', 'text-white', 'border-indigo-500');
        });
        btnElement.classList.add('active-filter');
    }
    applyDateFilter();
}

function applyDateFilter() {
    let now = new Date(); 
    now.setHours(0,0,0,0);

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

    if (activeDateRange === 'split') {
        filteredData = window.appData.rawArray.filter(o => String(o.orderId).toUpperCase().includes('SPLIT'));
    } else if (activeDateRange === 'all') {
        filteredData = window.appData.rawArray;
    } else {
        filteredData = window.appData.rawArray.filter(o => {
            let d = parseCustomDate(o.date); 
            d.setHours(0,0,0,0);
            
            if (activeDateRange === 'today') return d.getTime() === today.getTime();
            if (activeDateRange === 'yesterday') return d.getTime() === yesterday.getTime();
            if (activeDateRange === 'thisWeek') return d >= startOfThisWeek && d <= now;
            if (activeDateRange === 'lastWeek') return d >= startOfLastWeek && d <= endOfLastWeek;
            if (activeDateRange === 'thisMonth') return d >= startOfThisMonth && d <= now;
            if (activeDateRange === 'lastMonth') return d >= startOfLastMonth && d <= endOfLastMonth;
            
            return true;
        });
    }
    renderMdoDashboard(); 
    renderPipeline();
}
