const API_URL = "https://script.google.com/macros/s/AKfycbzQ7W09dn_1gyNSq_PCPrKLX6ApgB52Ob2_1BnmRe5SdYTMNyc8kRwudr80pe2QFCQZCg/exec"; 
    
    // Trimmed to 9 Stages for Max Efficiency
    const STAGE_NAMES = [
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
                    
                    let icon = "";
                    if (isCompleted) {
                        icon = '✓';
                    } else if (isActive && idx !== 6) {
                        icon = '⏳';
                    }
                    
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

    // =======================================================
    // CMD+K SEARCH LOGIC
    // =======================================================
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
        document.getElementById('searchResults').innerHTML = `
            <div class="p-8 text-center text-slate-500 font-bold">
                Start typing to search main database...
            </div>
        `; 
    }

    function performSearch() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const resultsDiv = document.getElementById('searchResults');
        
        if (query.length < 2) { 
            resultsDiv.innerHTML = `
                <div class="p-8 text-center text-slate-500 font-bold">
                    Type at least 2 characters...
                </div>
            `; 
            return; 
        }
        
        const matches = window.appData.rawArray.filter(o => 
            (o.orderId && o.orderId.toLowerCase().includes(query)) || 
            (o.shopName && o.shopName.toLowerCase().includes(query)) || 
            (o.phone && o.phone.includes(query))
        ).slice(0, 10);

        if (matches.length === 0) { 
            resultsDiv.innerHTML = `
                <p class="text-pink-500 font-bold p-4 text-center">
                    No matching orders found.
                </p>
            `; 
            return; 
        }

        resultsDiv.innerHTML = matches.map(o => {
            let badge = "";
            if (o.isVIP) {
                badge = `
                    <span class="bg-red-500 text-white text-[9px] px-1 rounded animate-pulse ml-2">
                        VIP
                    </span>
                `;
            }
            return `
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
                        Stage ${o.completedStages}/9
                    </div>
                    <div class="text-[9px] text-emerald-400 font-black uppercase">
                        ${o.paymentMode}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // =======================================================
    // SHIFT HANDOVER LOGIC
    // =======================================================
    function openHandover() {
        document.getElementById('handoverModal').classList.remove('hidden');
        fetchHandoverNotes();
    }

    function closeHandover() {
        document.getElementById('handoverModal').classList.add('hidden');
        document.getElementById('handoverNoteInput').value = '';
    }

    async function saveHandover() {
        let note = document.getElementById('handoverNoteInput').value.trim();
        if(!note) {
            return alert("Please write a note before submitting.");
        }
        
        let btn = document.getElementById('btnSaveHandover');
        btn.innerText = "Saving..."; 
        btn.disabled = true;

        try {
            let res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'saveHandover', 
                    staffName: currentUserName, 
                    note: note 
                })
            });
            let data = await res.json();
            if(data.status === 'success') {
                document.getElementById('handoverNoteInput').value = '';
                fetchHandoverNotes();
            } else {
                alert("Failed to save note.");
            }
        } catch(e) {
            alert("Network error.");
        }
        
        btn.innerText = "Submit Handover Note"; 
        btn.disabled = false;
    }

    async function fetchHandoverNotes() {
        let historyDiv = document.getElementById('handoverHistory');
        historyDiv.innerHTML = `
            <div class="text-center text-slate-500 text-xs py-4">
                Loading notes...
            </div>
        `;
        
        try {
            let res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getHandover' })
            });
            let data = await res.json();
            
            if(data.status === 'success' && data.data.length > 0) {
                historyDiv.innerHTML = data.data.map(n => `
                    <div class="bg-[#0B1121] p-3 rounded-lg border border-slate-800">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-xs font-black text-indigo-400">
                                ${n.staff}
                            </span>
                            <span class="text-[9px] text-slate-500 font-mono">
                                ${new Date(n.time).toLocaleString('en-GB')}
                            </span>
                        </div>
                        <p class="text-sm text-slate-300 leading-relaxed">
                            ${n.note}
                        </p>
                    </div>
                `).join('');
            } else {
                historyDiv.innerHTML = `
                    <div class="text-center text-slate-500 text-xs py-4">
                        No recent shift notes found.
                    </div>
                `;
            }
        } catch(e) {
            historyDiv.innerHTML = `
                <div class="text-center text-pink-500 text-xs py-4">
                    Error loading notes.
                </div>
            `;
        }
    }

    // =======================================================
    // DATE PARSERS & HELPERS
    // =======================================================
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
                let day = parseInt(dateParts[0]);
                let month = parseInt(dateParts[1]) - 1;
                let year = parseInt(dateParts[2]);
                
                if (year < 100) {
                    year += 2000;
                }
                
                let hours = 0, mins = 0, secs = 0;
                if (parts.length >= 2) {
                    let timeParts = parts[1].split(':');
                    hours = parseInt(timeParts[0]) || 0; 
                    mins = parseInt(timeParts[1]) || 0; 
                    secs = parseInt(timeParts[2]) || 0;
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
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        let hours = d.getHours(); 
        const ampm = hours >= 12 ? 'PM' : 'AM'; 
        
        hours = hours % 12; 
        hours = hours ? hours : 12; 
        
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `Received: ${day}/${month}/${year} ${hours}:${mins} ${ampm}`;
    }

    function getTimeAgoUI(dateString) {
        if (!dateString) {
            return { text: "", color: "text-slate-400", isSLAWarning: false };
        }
        
        const orderDate = parseCustomDate(dateString);
        const diffInMs = new Date() - orderDate;
        
        if (diffInMs < 0) {
            return { text: "Just now", color: "text-emerald-400", isSLAWarning: false };
        }
        
        const diffInHrs = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInMins = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        
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
            return { text: `${Math.floor(diffInHrs/24)}d ago`, color, isSLAWarning };
        }
        if (diffInHrs > 0) {
            return { text: `${diffInHrs}h ${diffInMins}m ago`, color, isSLAWarning };
        }
        if (diffInMins > 0) {
            return { text: `${diffInMins}m ago`, color, isSLAWarning };
        }
        return { text: `Just now`, color, isSLAWarning };
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
            const payload = { 
                action: 'login', 
                employeeId: document.getElementById('loginEmpId').value, 
                password: document.getElementById('loginPass').value 
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
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
        
        // Paused refresh while a user is working inside a modal to stop session kicks
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

    function showNotification(title, message) {
        const area = document.getElementById('notificationArea');
        const toast = document.createElement('div');
        
        toast.className = "bg-[#131C31] text-white px-5 py-3 rounded-xl shadow-[0_10px_40px_rgba(79,70,229,0.4)] border border-indigo-500 flex items-center gap-4 toast-enter pointer-events-auto mb-2";
        toast.innerHTML = `
            <span class="text-2xl animate-bounce">⚡</span>
            <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-indigo-400">${title}</p>
                <p class="text-sm font-bold text-white mt-0.5">${message}</p>
            </div>
        `;
        
        area.appendChild(toast);
        
        setTimeout(() => { 
            toast.style.opacity = '0'; 
            toast.style.transition = 'opacity 0.3s ease'; 
            setTimeout(() => toast.remove(), 300); 
        }, 5000); 
    }

    // =======================================================
    // FETCH ORDERS & FILTER LOGIC
    // =======================================================
    async function fetchOrders(isSilent = false) {
        const grid = document.getElementById('orderGrid');
        
        if (!isSilent && window.appData.rawArray.length === 0) {
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
            const res = await fetch(API_URL, { 
                method: 'POST', 
                body: JSON.stringify({ action: 'getOrders', staffName: currentUserName }) 
            });
            
            const response = await res.json();
            
            if (response.status === 'success') {
                if(response.settings) {
                    window.appSettings = response.settings;
                }
                
                if(response.backendEarnings !== undefined && response.backendEarnings > 0) {
                    let bBadge = document.getElementById('backendEarningsBadge');
                    bBadge.innerText = `💰 Earned Today: ₹${response.backendEarnings}`;
                    bBadge.classList.remove('hidden');
                }

                window.appData.rawArray = response.data;
                window.appData.orders = {}; 
                
                response.data.forEach(o => { 
                    window.appData.orders[o.orderId] = o; 
                });
                
                applyDateFilter(); 
            }
        } catch (err) { 
            console.log("Background sync error: ", err); 
        }
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

    // =======================================================
    // MDO WAR ROOM DASHBOARD
    // =======================================================
    function renderMdoDashboard() {
        const userName = localStorage.getItem('yash_user') || "";
        const isOwner = currentUserRole.toLowerCase() === 'admin' || currentUserRole.toLowerCase() === 'owner' || userName.toLowerCase().includes('yash');
        const mdoDiv = document.getElementById('mdoCommandCenter');
        
        if (!isOwner) { 
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
        let stageStuck = Array(9).fill(0);
        const nowTime = new Date().getTime();

        filteredData.forEach(o => {
            totalOrderValue += (o.totalValue || 0);

            if (o.completedStages >= 9 || o.isFullyCompleted) {
                totalCompleted++;
            } else { 
                if (o.completedStages < 9) {
                    stageStuck[o.completedStages]++; 
                }
                if ((nowTime - parseCustomDate(o.date).getTime()) > (48 * 60 * 60 * 1000)) {
                    slaBreaches++;
                }
            }

            if(!shopStats[o.shopName]) {
                shopStats[o.shopName] = { items: 0, value: 0, area: o.area };
            }
            shopStats[o.shopName].value += (o.totalValue || 0); 

            o.items.forEach(i => {
                let qty = parseInt(i.qty || 1); 
                let itemVal = parseFloat(i.totalValue || 0);
                
                totalVolume += qty; 
                shopStats[o.shopName].items += qty;
                
                let cleanName = i.name ? i.name.trim() : "Unknown"; 
                if(!skuStats[cleanName]) {
                    skuStats[cleanName] = { qty: 0, value: 0 }; 
                }
                skuStats[cleanName].qty += qty;
                skuStats[cleanName].value += itemVal;
                
                let brandName = i.brand && i.brand.trim() !== "" ? i.brand.trim() : "Unknown";
                if(!brandStats[brandName]) {
                    brandStats[brandName] = 0;
                }
                brandStats[brandName] += itemVal; 
            });

            if (o.lastUpdatedBy && o.lastUpdatedBy !== "System") {
                staffScores[o.lastUpdatedBy] = (staffScores[o.lastUpdatedBy] || 0) + 1;
            }
            
            let city = (o.area && o.area !== "Unknown Area" && o.area !== "") ? o.area : "Unmapped Dealer";
            
            if(!cityStats[city]) {
                cityStats[city] = { orders: 0, value: 0 };
            }
            cityStats[city].orders += 1;
            cityStats[city].value += (o.totalValue || 0);
        });

        let sortedShops = Object.entries(shopStats).sort((a,b) => b[1].value - a[1].value);
        let sortedSKUs = Object.entries(skuStats).sort((a,b) => b[1].qty - a[1].qty).slice(0, 5); 
        let sortedStaff = Object.entries(staffScores).sort((a,b) => b[1] - a[1]).slice(0, 5);
        let sortedCities = Object.entries(cityStats).sort((a,b) => b[1].value - a[1].value).slice(0, 5);
        
        // DESCENDING SORT FOR BRAND MATRIX
        let sortedBrands = Object.entries(brandStats).sort((a,b) => b[1] - a[1]);

        let topShopVolume = sortedShops.length > 0 ? sortedShops[0][1].value : 1;
        let maxStuck = Math.max(...stageStuck);
        let frictionIndex = maxStuck > 0 ? STAGE_NAMES[stageStuck.indexOf(maxStuck)].split(' (')[0] : "Smooth Pipeline";
        
        let completionRate = filteredData.length > 0 ? (totalCompleted / filteredData.length) * 100 : 100;
        let baseScore = completionRate; 
        let penalty = (filteredData.length > 0) ? ((slaBreaches / filteredData.length) * 50) : 0; 
        let healthScore = Math.max(0, Math.min(100, Math.round(baseScore - penalty)));
        
        if (filteredData.length === 0) {
            healthScore = 0; 
        }
        
        let healthColor = healthScore >= 80 ? 'text-emerald-400' : (healthScore >= 50 ? 'text-orange-400' : 'text-pink-500');

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
                
                <div class="glass-panel p-4 rounded-2xl border-t-4 ${slaBreaches > 0 ? 'border-t-pink-500 bg-pink-500/5' : 'border-t-slate-700'} hover-card">
                    <div class="text-[10px] ${slaBreaches > 0 ? 'text-pink-400' : 'text-slate-400'} uppercase font-black tracking-widest mb-1 flex items-center gap-2">
                        ${slaBreaches > 0 ? '<span class="animate-pulse">⚠️</span>' : '✅'} SLA Breaches
                    </div>
                    <span class="text-2xl font-black ${slaBreaches > 0 ? 'text-pink-500' : 'text-white'} mt-2 block">
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
            
            <!-- NEW ROW FOR GRID DATA -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div class="glass-panel p-5 rounded-2xl lg:col-span-1">
                    <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span class="text-yellow-400">🔥</span> Hot Movers
                    </h3>
                    <div class="space-y-3">
                        ${sortedSKUs.length > 0 ? sortedSKUs.map((sku, i) => `
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
                        `).join('') : `<p class="text-slate-500 text-sm italic">No SKU data.</p>`}
                    </div>
                </div>
                
                <div class="glass-panel p-5 rounded-2xl lg:col-span-1">
                    <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span class="text-amber-400">🏆</span> Leaderboard
                    </h3>
                    <div class="space-y-3">
                        ${sortedStaff.length > 0 ? sortedStaff.map((staff, i) => `
                            <div class="flex justify-between items-center bg-[#0B1121] p-2.5 rounded-lg border border-slate-800">
                                <span class="text-xs font-bold text-slate-300">#${i+1} ${staff[0]}</span>
                                <span class="text-xs font-black text-emerald-400">${staff[1] * 10} Pts</span>
                            </div>
                        `).join('') : `<p class="text-slate-500 text-sm italic">No staff data.</p>`}
                    </div>
                </div>

                <div class="glass-panel p-5 rounded-2xl lg:col-span-1">
                    <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span class="text-emerald-400">👑</span> VIP Dealers
                    </h3>
                    <div class="space-y-3 max-h-60 overflow-y-auto hide-scrollbar pr-2">
                        ${sortedShops.length > 0 ? sortedShops.slice(0, 5).map((v, i) => `
                            <div class="relative w-full bg-[#0B1121] rounded-lg p-2.5 overflow-hidden border border-slate-800 group">
                                <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-900/40 to-transparent" style="width: ${(v[1].value / topShopVolume) * 100}%"></div>
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
                        `).join('') : `<p class="text-slate-500 text-sm italic">No dealer data.</p>`}
                    </div>
                </div>
                
                <div class="glass-panel p-5 rounded-2xl lg:col-span-1">
                    <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span class="text-blue-400">📍</span> Area Heatmap
                    </h3>
                    <div class="space-y-3">
                        ${sortedCities.length > 0 ? sortedCities.map((city, i) => `
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
                        `).join('') : `<p class="text-slate-500 text-sm italic">No area data.</p>`}
                    </div>
                </div>
                
                <div class="glass-panel p-5 rounded-2xl lg:col-span-1 flex flex-col">
                    <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex justify-between items-center">
                        <span class="flex items-center gap-2">
                            <span class="text-purple-400">📊</span> Brand Matrix
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
            const ctx = document.getElementById('brandPieChart');
            if (ctx) {
                if (brandChartInstance) {
                    brandChartInstance.destroy();
                }
                
                const labels = sortedBrands.filter(b => b[1] > 0).map(b => b[0]);
                const dataVals = sortedBrands.filter(b => b[1] > 0).map(b => b[1]);
                const totalMatrixValue = dataVals.reduce((a, b) => a + b, 0);
                
                if (labels.length === 0) { 
                    labels.push("No Data"); 
                    dataVals.push(1); 
                }

                brandChartInstance = new Chart(ctx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: dataVals,
                            backgroundColor: ['#ef4444', '#ec4899', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#06b6d4', '#64748b'],
                            borderWidth: 0, 
                            hoverOffset: 5
                        }]
                    },
                    options: {
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'bottom', 
                                labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 } 
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.label || '';
                                        let val = context.raw || 0;
                                        let percent = totalMatrixValue > 0 ? Math.round((val / totalMatrixValue) * 100) : 0;
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

    // =======================================================
    // PIPELINE & ORDER GRID
    // =======================================================
    function setStageFilter(stageIndex) { 
        activeStageFilter = stageIndex; 
        renderPipeline(); 
    }

    async function executeUnblock(orderId) {
        if (!confirm("Warning: You are bypassing the system Credit Lock for this dealer. Proceed?")) {
            return;
        }
        
        try {
            let res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'unblockOrder', 
                    orderId: orderId 
                })
            });
            
            let data = await res.json();
            
            if (data.status === 'success') {
                showNotification("OVERRIDE SUCCESS", "Order Unlocked.");
                fetchOrders(true);
            } else {
                alert("Failed to unblock order.");
            }
        } catch(e) { 
            alert("Network error."); 
        }
    }

    function renderPipeline() {
        const grid = document.getElementById('orderGrid');
        const filterBar = document.getElementById('stageFilterBar');
        
        let pendingOrders = filteredData.filter(o => !o.isFullyCompleted);
        let stageCounts = Array(9).fill(0); 
        
        let shopPendingCount = {};
        
        pendingOrders.forEach(o => { 
            if (o.completedStages < 9) {
                stageCounts[o.completedStages]++; 
            }
            if (o.completedStages < 3) { // 3 is now Stock Check
                shopPendingCount[o.shopName] = (shopPendingCount[o.shopName] || 0) + 1; 
            }
        });

        let filterHtml = `
            <div 
                onclick="setStageFilter(null)" 
                class="snap-start cursor-pointer ${activeStageFilter === null ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-[#131C31] border-slate-800 hover:bg-slate-800'} flex flex-col justify-between p-3 rounded-xl border min-w-[120px] shrink-0 transition-all"
            >
                <span class="${activeStageFilter === null ? 'text-indigo-200' : 'text-slate-500'} text-[9px] font-black uppercase tracking-widest mb-1">
                    Overview
                </span>
                <span class="text-white text-sm font-black mb-2">
                    All Pending
                </span>
                <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-700/50">
                    <span class="text-[10px] ${activeStageFilter === null ? 'text-indigo-200' : 'text-slate-600'} font-bold">
                        COUNT
                    </span>
                    <span class="${activeStageFilter === null ? 'bg-white text-indigo-900' : 'bg-[#0B1121] text-slate-400'} px-2 py-0.5 rounded text-xs font-black">
                        ${pendingOrders.length}
                    </span>
                </div>
            </div>
        `;
        
        STAGE_NAMES.forEach((name, idx) => {
            let isActive = activeStageFilter === idx; 
            let orderCount = stageCounts[idx];
            let filterName = name.split(' (')[0]; 
            
            if (idx === 6) { 
                filterName = "Delivery Comms";
            }
            
            filterHtml += `
                <div 
                    onclick="setStageFilter(${idx})" 
                    class="snap-start cursor-pointer ${isActive ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-[#131C31] border-slate-800 hover:bg-slate-800'} flex flex-col justify-between p-3 rounded-xl border min-w-[130px] shrink-0 transition-all"
                >
                    <span class="${isActive ? 'text-indigo-200' : 'text-slate-500'} text-[9px] font-black uppercase tracking-widest mb-1">
                        Step ${idx+1}
                    </span>
                    <span class="${isActive ? 'text-white' : 'text-slate-400'} text-xs font-bold mb-2 leading-tight">
                        ${filterName}
                    </span>
                    <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-700/50">
                        <span class="text-[10px] ${isActive ? 'text-indigo-200' : 'text-slate-600'} font-bold">
                            STUCK
                        </span>
                        <span class="${orderCount > 0 ? (isActive ? 'bg-white text-indigo-900' : 'bg-pink-500/20 text-pink-400 border border-pink-500/20') : (isActive ? 'bg-indigo-900 text-indigo-300' : 'bg-[#0B1121] text-slate-600')} px-2 py-0.5 rounded text-xs font-black">
                            ${orderCount}
                        </span>
                    </div>
                </div>
            `;
        });
        
        filterBar.innerHTML = filterHtml;

        let displayOrders = activeStageFilter !== null ? pendingOrders.filter(o => o.completedStages === activeStageFilter) : pendingOrders;
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

        const userName = localStorage.getItem('yash_user') || "";
        const isOwner = currentUserRole.toLowerCase() === 'admin' || currentUserRole.toLowerCase() === 'owner' || userName.toLowerCase().includes('yash');

        displayOrders.forEach(order => {
            const progress = (order.completedStages / 9) * 100; 
            let isCod = order.paymentMode && order.paymentMode.toUpperCase().includes('COD');
            let nextStepName = "Fully Completed";
            
            if (order.completedStages < 9) {
                if (order.completedStages === 6) { // Delivery Comms
                    nextStepName = isCod ? "Call 2" : "WhatsApp 2";
                } else {
                    nextStepName = STAGE_NAMES[order.completedStages].split(' (')[0];
                }
            }
            
            let orderDateObj = parseCustomDate(order.date);
            let exactDateStr = formatExactDate(order.date);
            let timeData = getTimeAgoUI(order.date);
            let orderItemsCount = order.items.reduce((sum, item) => sum + parseInt(item.qty || 1), 0);
            
            let splitBadge = "";
            if (String(order.orderId).toUpperCase().includes('SPLIT')) {
                splitBadge = `
                    <span class="bg-purple-900/30 text-[9px] px-2 py-1 rounded text-purple-400 font-bold border border-purple-500/30 shrink-0">
                        ✂️ SPLIT
                    </span>
                `;
            }
            
            let lockOverlay = ""; 
            let clickAction = `onclick="openModal('${order.orderId}')"`; 
            let cursorStyle = "cursor-pointer"; 
            let vipClass = order.isVIP ? "vip-corridor bg-[#131C31]" : "bg-[#131C31] hover:border-indigo-500 border-slate-800";
            
            if (order.creditLocked && !order.ceoOverride) {
                let unlockBtn = isOwner ? `
                    <button 
                        onclick="event.stopPropagation(); executeUnblock('${order.orderId}')" 
                        class="mt-3 w-full bg-red-600 hover:bg-red-500 text-white text-[10px] py-1.5 rounded font-black uppercase tracking-widest transition-all"
                    >
                        🔓 CEO Override: Unblock
                    </button>
                ` : `
                    <p class="mt-2 text-[9px] text-pink-400 font-bold uppercase">
                        Contact Yash Sir to Unblock
                    </p>
                `;
                
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
            let isBefore6PM = orderDateObj.getHours() < 18;
            
            if (isBefore6PM && order.completedStages < 5) { // Adjusted from 6 to 5
                let targetTime = orderDateObj.getTime() + (60 * 60 * 1000);
                tatBadge = `
                    <span 
                        class="tat-timer bg-orange-900/30 text-orange-400 text-[10px] px-2 py-1 rounded font-black border border-orange-500/30 shrink-0 animate-pulse" 
                        data-target="${targetTime}"
                    >
                        ⏳ TAT: Calc...
                    </span>
                `;
            }
            
            let mergeBadge = "";
                       let orderDateStr = parseCustomDate(order.date).toDateString();
            
            let pendingCount = filteredData.filter(o => 
                o.shopName === order.shopName && 
                parseCustomDate(o.date).toDateString() === orderDateStr && 
                o.completedStages < 3 && 
                !o.creditLocked &&
                !(o.stageUrls.some(url => url && url.includes("Merged into")))
            ).length;

            let isCurrentMerged = order.stageUrls.some(url => url && url.includes("Merged into"));

            if (order.completedStages < 3 && pendingCount > 1 && !order.creditLocked && !isCurrentMerged) {
                mergeBadge = `
                    <span 
                        class="text-[9px] bg-blue-500/20 text-blue-400 font-black border border-blue-500 px-2 py-1 rounded tracking-widest shrink-0" 
                        title="Pack this together with another pending order!"
                    >
                        🔗 MERGE AVAIL
                    </span>
                `;
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
                            <h3 class="font-black text-sm text-white tracking-wider">
                                ${order.orderId}
                            </h3>
                            <div class="flex flex-col gap-1 items-end">
                                <div class="flex gap-1">
                                    ${vipBadge}
                                    ${splitBadge}
                                </div>
                            </div>
                        </div>
                        
                        <p class="text-indigo-300 font-bold text-xs leading-tight text-wrap-custom mb-3">
                            ${order.shopName}
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
                            <span class="text-[9px] font-black px-2 py-1 rounded tracking-widest uppercase border ${isCod ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}">
                                ${order.paymentMode || 'N/A'}
                            </span>
                            <span class="text-[10px] font-black text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/20">
                                ₹${order.totalValue || '0'}
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
                            <span class="text-indigo-400">${order.completedStages}/9</span>
                        </div>
                        
                        <div class="w-full bg-[#0B1121] rounded-full h-1.5 overflow-hidden border border-slate-800">
                            <div class="bg-gradient-to-r from-indigo-600 to-purple-500 h-1.5 rounded-full relative" style="width: ${progress}%">
                                <div class="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
