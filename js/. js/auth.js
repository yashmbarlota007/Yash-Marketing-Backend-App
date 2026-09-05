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
    }
});

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
                
                html += `
                    <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div class="flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#0B1121] ${color} text-white font-black text-xs z-10 shrink-0">${icon}</div>
                        <div class="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border ${isCompleted ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-slate-800 bg-[#131C31]'} shadow">
                            <h3 class="font-bold text-sm ${textColor}">${stageName}</h3>
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
    }).catch(err => {
        document.getElementById('trackingLoader').style.display = 'none';
        document.getElementById('trackingError').innerText = "Network error while fetching tracking data.";
        document.getElementById('trackingError').classList.remove('hidden');
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

window.logout = function() { 
    localStorage.clear(); 
    location.reload(); 
}
