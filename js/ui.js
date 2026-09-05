// js/ui.js

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

function setStageFilter(stageIndex) { 
    activeStageFilter = stageIndex; 
    renderPipeline(); 
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
        if (o.completedStages < 3) { 
            shopPendingCount[o.shopName] = (shopPendingCount[o.shopName] || 0) + 1; 
        }
    });

    let filterHtml = `
        <div 
            onclick="setStageFilter(null)" 
            class="snap-start cursor-pointer ${activeStageFilter === null ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-[#131C31] border-slate-800 hover:bg-slate-800'} flex flex-col justify-between p-3 rounded-xl border min-w-[120px] shrink-0 transition-all"
        >
            <span class="${activeStageFilter === null ? 'text-indigo-200' : 'text-slate-500'} text-[9px] font-black uppercase tracking-widest mb-1">Overview</span>
            <span class="text-white text-sm font-black mb-2">All Pending</span>
            <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-700/50">
                <span class="text-[10px] ${activeStageFilter === null ? 'text-indigo-200' : 'text-slate-600'} font-bold">COUNT</span>
                <span class="${activeStageFilter === null ? 'bg-white text-indigo-900' : 'bg-[#0B1121] text-slate-400'} px-2 py-0.5 rounded text-xs font-black">${pendingOrders.length}</span>
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
                <span class="${isActive ? 'text-indigo-200' : 'text-slate-500'} text-[9px] font-black uppercase tracking-widest mb-1">Step ${idx+1}</span>
                <span class="${isActive ? 'text-white' : 'text-slate-400'} text-xs font-bold mb-2 leading-tight">${filterName}</span>
                <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-700/50">
                    <span class="text-[10px] ${isActive ? 'text-indigo-200' : 'text-slate-600'} font-bold">STUCK</span>
                    <span class="${orderCount > 0 ? (isActive ? 'bg-white text-indigo-900' : 'bg-pink-500/20 text-pink-400 border border-pink-500/20') : (isActive ? 'bg-indigo-900 text-indigo-300' : 'bg-[#0B1121] text-slate-600')} px-2 py-0.5 rounded text-xs font-black">${orderCount}</span>
                </div>
            </div>
        `;
    });
    
    filterBar.innerHTML = filterHtml;

    let displayOrders = activeStageFilter !== null ? pendingOrders.filter(o => o.completedStages === activeStageFilter) : pendingOrders;
    
    if (displayOrders.length === 0) { 
        grid.innerHTML = `
            <div class="col-span-full bg-[#131C31] border border-slate-800 p-10 rounded-2xl text-center" id="empty-state">
                <div class="text-4xl mb-3">🍃</div>
                <p class="text-slate-400 text-lg font-bold">Inbox Zero for this view.</p>
            </div>
        `; 
        return; 
    }

    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const userName = localStorage.getItem('yash_user') || "";
    const isOwner = currentUserRole.toLowerCase() === 'admin' || currentUserRole.toLowerCase() === 'owner' || userName.toLowerCase().includes('yash');

    const currentIds = new Set();

    displayOrders.forEach(order => {
        const cardId = `order-card-${order.orderId}`;
        currentIds.add(cardId);

        const orderStateHash = btoa(encodeURIComponent(JSON.stringify(order) + activeStageFilter));
        let existingCard = document.getElementById(cardId);

        if (existingCard && existingCard.getAttribute('data-state-hash') === orderStateHash) {
            grid.appendChild(existingCard); 
            return; 
        }

        const progress = (order.completedStages / 9) * 100; 
        let isCod = order.paymentMode && order.paymentMode.toUpperCase().includes('COD');
        let nextStepName = "Fully Completed";
        
        if (order.completedStages < 9) {
            if (order.completedStages === 6) {
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
                >🔓 CEO Override: Unblock</button>
            ` : `
                <p class="mt-2 text-[9px] text-pink-400 font-bold uppercase">Contact Yash Sir to Unblock</p>
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
        
        let vipBadge = order.isVIP ? `<span class="bg-red-500 text-white text-[9px] px-2 py-1 rounded font-black uppercase shadow-[0_0_10px_red] animate-pulse shrink-0">🔥 VIP</span>` : "";
        let slaBadge = timeData.isSLAWarning ? `<span class="text-[9px] bg-yellow-500/20 text-yellow-400 font-black border border-yellow-500 px-2 py-1 rounded animate-pulse tracking-widest shrink-0">⏳ NEAR BREACH</span>` : "";
        let tatBadge = ""; 
        
        if (orderDateObj.getHours() < 18 && order.completedStages < 5) { 
            let targetTime = orderDateObj.getTime() + (60 * 60 * 1000);
            tatBadge = `<span class="tat-timer bg-orange-900/30 text-orange-400 text-[10px] px-2 py-1 rounded font-black border border-orange-500/30 shrink-0 animate-pulse" data-target="${targetTime}">⏳ TAT: Calc...</span>`;
        }
        
        let mergeBadge = "";
        let orderDateStr = parseCustomDate(order.date).toDateString();
        let pendingCount = filteredData.filter(o => o.shopName === order.shopName && parseCustomDate(o.date).toDateString() === orderDateStr && o.completedStages < 3 && !o.creditLocked && !(o.stageUrls.some(url => url && url.includes("Merged into")))).length;
        let isCurrentMerged = order.stageUrls.some(url => url && url.includes("Merged into"));

        if (order.completedStages < 3 && pendingCount > 1 && !order.creditLocked && !isCurrentMerged) {
            mergeBadge = `<span class="text-[9px] bg-blue-500/20 text-blue-400 font-black border border-blue-500 px-2 py-1 rounded tracking-widest shrink-0" title="Pack this together with another pending order!">🔗 MERGE AVAIL</span>`;
        }

        const fullCardHtml = `
            <div id="${cardId}" data-state-hash="${orderStateHash}" ${clickAction} class="${vipClass} rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group hover-card ${cursorStyle} border">
                ${lockOverlay}
                <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full transition-transform group-hover:scale-125"></div>
                <div class="mb-4 relative z-10">
                    <div class="flex justify-between items-start mb-1.5">
                        <h3 class="font-black text-sm text-white tracking-wider">${order.orderId}</h3>
                        <div class="flex gap-1">${vipBadge}${splitBadge}</div>
                    </div>
                    <p class="text-indigo-300 font-bold text-xs leading-tight text-wrap-custom mb-3">${order.shopName}</p>
                    <div class="flex gap-1 items-center flex-wrap mb-3">
                        <span class="bg-[#0B1121] text-[9px] px-2 py-1 rounded text-slate-400 font-mono tracking-widest border border-slate-800">${exactDateStr}</span>
                        <span class="bg-[#0B1121] ${timeData.color} text-[9px] px-2 py-1 rounded font-black tracking-widest border border-slate-800">⏱️ ${timeData.text}</span>
                        ${tatBadge}${slaBadge}${mergeBadge}
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2 items-center">
                        <span class="text-[9px] font-black px-2 py-1 rounded tracking-widest uppercase border ${isCod ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}">${order.paymentMode || 'N/A'}</span>
                        <span class="text-[10px] font-black text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/20">₹${order.totalValue || '0'}</span>
                        <span class="text-[10px] font-black text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700">Qty: ${orderItemsCount}</span>
                    </div>
                </div>
                <div>
                    <div class="bg-[#0B1121] p-2.5 rounded-lg mb-3 border border-slate-800 flex justify-between items-center group-hover:border-indigo-500/30 transition-colors">
                        <span class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Next Action:</span>
                        <span class="text-[10px] text-emerald-400 font-black bg-emerald-900/20 px-2 py-1 rounded truncate max-w-[55%] border border-emerald-500/10">${nextStepName}</span>
                    </div>
                    <div class="flex justify-between text-[9px] text-slate-500 mb-1.5 font-black uppercase tracking-widest">
                        <span>Pipeline Progress</span><span class="text-indigo-400">${order.completedStages}/9</span>
                    </div>
                    <div class="w-full bg-[#0B1121] rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div class="bg-gradient-to-r from-indigo-600 to-purple-500 h-1.5 rounded-full relative" style="width: ${progress}%">
                            <div class="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (existingCard) { existingCard.outerHTML = fullCardHtml; }
        else { grid.insertAdjacentHTML('beforeend', fullCardHtml); }
    });

    Array.from(grid.children).forEach(child => {
        if (child.id && child.id.startsWith('order-card-') && !currentIds.has(child.id)) {
            child.remove();
        }
    });
}

function openModal(orderId) {
    const order = window.appData.orders[orderId];
    if (!order) return;
    
    currentActiveOrder = order; 
    queuedFiles = []; 
    
    document.getElementById('modalOrderId').innerText = order.orderId;
    document.getElementById('modalShopName').innerText = order.shopName;
    
    if (order.isVIP) {
        document.getElementById('modalVipBadge').classList.remove('hidden'); 
    } else {
        document.getElementById('modalVipBadge').classList.add('hidden');
    }
    
    let orderDateObj = parseCustomDate(order.date); 
    let exactDateStr = formatExactDate(order.date); 
    let timeData = getTimeAgoUI(order.date);
    
    document.getElementById('modalReceiptDate').innerText = exactDateStr;
    document.getElementById('modalTimeElapsed').innerText = `⏱️ ${timeData.text}`;
    document.getElementById('modalTimeElapsed').className = `text-[10px] bg-slate-800 px-2 py-1 rounded ${timeData.color} font-black tracking-widest border border-slate-700`;

    let tatBadgeEl = document.getElementById('modalTatTimer'); 
    let isBefore6PM = orderDateObj.getHours() < 18;
    
    if (isBefore6PM && order.completedStages < 5) { 
        let targetTime = orderDateObj.getTime() + (60 * 60 * 1000); 
        tatBadgeEl.setAttribute('data-target', targetTime); 
        tatBadgeEl.className = "tat-timer text-[10px] bg-orange-900/30 text-orange-400 px-2 py-1 rounded font-black tracking-widest border border-orange-500/30 animate-pulse inline-block"; 
        tatBadgeEl.innerText = "⏳ TAT: Calc...";
    } else {
        tatBadgeEl.className = "hidden";
    }

    let isCod = order.paymentMode && order.paymentMode.toUpperCase().includes('COD'); 
    let payBadge = document.getElementById('modalPaymentMode'); 
    payBadge.innerText = order.paymentMode || 'N/A';
    payBadge.className = isCod ? `text-[10px] px-2 py-1 rounded font-black tracking-widest uppercase border bg-orange-500/10 text-orange-400 border-orange-500/20` : `text-[10px] px-2 py-1 rounded font-black tracking-widest uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
    
    document.getElementById('modalTotalValue').innerText = `Amount: ₹${order.totalValue || '0'}`;
    
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
        order.items.forEach(item => {
            let imgTag = item.image ? `<img src="${item.image}" class="w-12 h-12 object-contain rounded bg-white p-1 shrink-0 shadow-sm">` : `<div class="w-12 h-12 bg-slate-800 rounded flex items-center justify-center text-[9px] text-slate-500 shrink-0 font-mono border border-slate-700">No Img</div>`;
            itemsHtml += `
                <div class="flex items-start gap-3 bg-[#0B1121] p-2.5 rounded-lg border border-slate-800">
                    ${imgTag}
                    <div class="flex-1 min-w-0">
                        <p class="text-xs text-slate-300 font-bold leading-tight text-wrap-custom">${item.name}</p>
                        <div class="mt-2 flex items-center gap-2">
                            <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Qty:</span>
                            <span class="text-xs font-black text-indigo-400 bg-indigo-900/30 border border-indigo-500/20 px-2 py-0.5 rounded shadow-inner">${item.qty}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        itemsHtml += `<p class="text-sm text-slate-600 italic px-2">No SKU data found for this order.</p>`; 
    }
    itemsHtml += `</div></div>`; 
    container.innerHTML += itemsHtml;

    let mergeActionHtml = "";
    let orderDateStr = parseCustomDate(order.date).toDateString();
    let isAlreadyMerged = order.stageUrls.some(url => url && url.includes("Merged into"));
    let secondaryOrders = filteredData.filter(o => o.shopName === order.shopName && parseCustomDate(o.date).toDateString() === orderDateStr && o.completedStages < 3 && o.orderId !== order.orderId && !o.creditLocked && !(o.stageUrls.some(url => url && url.includes("Merged into"))));

    if (order.completedStages < 3 && secondaryOrders.length > 0 && !order.creditLocked && !isAlreadyMerged) {
        let secondaryIds = secondaryOrders.map(o => o.orderId).join(',');
        mergeActionHtml = `<button onclick="executeMerge('${order.orderId}', '${order.shopName}', '${secondaryIds}', this)" class="w-full mt-2 mb-4 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-black py-3 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 uppercase tracking-widest border border-blue-500/50">🔗 1-Click Merge: Combine ${secondaryOrders.length} other pending order(s) into this one</button>`;
    }
    container.innerHTML += mergeActionHtml;

    let stagesListHtml = '<div class="space-y-4">';
    let needsShare = false;
    let lastCompletedStage = order.completedStages;
    const stagesRequiringShare = [1, 3, 4, 5, 8]; 
    
    if (stagesRequiringShare.includes(lastCompletedStage) && localStorage.getItem('shared_' + order.orderId + '_' + lastCompletedStage) !== 'true') { 
        needsShare = true;
    }
    
    for (let i = 0; i < 9; i++) { 
        const stageNum = i + 1; 
        const isCompleted = i < order.completedStages; 
        const isActive = i === order.completedStages; 
        const isLocked = i > order.completedStages;
        let displayStageName = STAGE_NAMES[i]; 
        
        if (stageNum === 7) displayStageName = isCod ? "Call 2 (Out-for-delivery)" : "WhatsApp 2 (Out-for-delivery)";
        
        let uiHtml = '';
        
        if (isCompleted) {
            let cellData = order.stageUrls ? order.stageUrls[i] : ""; 
            let timestampDisplay = "", timeTakenDisplay = "", thisEpoch = null; 
            let previousEpoch = parseCustomDate(order.date).getTime(); 
            let staffName = "System";
            let staffMatch = cellData ? cellData.match(/STAFF:\s*(.+)/) : null;
            if (staffMatch) {
                staffName = staffMatch[1].trim();
                cellData = cellData.replace(/\|\|\s*STAFF:\s*.+/, '').trim();
            }

            if (i > 0 && order.stageUrls[i-1]) { 
                let prevMatch = order.stageUrls[i-1].match(/TIME:\s*(\d+)/); 
                if (prevMatch) previousEpoch = parseInt(prevMatch[1]); 
            }
            
            if (cellData && cellData.includes("TIME:")) {
                let match = cellData.match(/TIME:\s*(\d+)/);
                if (match) {
                    thisEpoch = parseInt(match[1]); 
                    let d = new Date(thisEpoch); 
                    let day = String(d.getDate()).padStart(2, '0');
                    let month = String(d.getMonth() + 1).padStart(2, '0');
                    let year = String(d.getFullYear()).slice(-2);
                    let timeStr = d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
                    
                    timestampDisplay = `<span class="text-[9px] text-emerald-300 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50 shadow-sm">📅 ${day}/${month}/${year} ${timeStr}</span>`;
                    
                    let diffMins = Math.max(0, Math.round((thisEpoch - previousEpoch) / 60000));
                    let timeFormatted = diffMins < 60 ? `${diffMins} Mins` : `${Math.floor(diffMins / 60)} Hour ${diffMins % 60} Mins`;
                    
                    timeTakenDisplay = `<span class="text-[10px] text-orange-300 font-bold bg-orange-950/50 px-2 py-0.5 rounded border border-orange-800/50 ml-2 shadow-sm">⏱️ Took: ${timeFormatted}</span>`;
                    timeTakenDisplay += `<span class="text-[10px] text-blue-200 font-black bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/50 ml-2 shadow-sm">👤 By: ${staffName}</span>`;
                    cellData = cellData.replace(/\|\|\s*TIME:\s*\d+/, '').trim();
                }
            }

            let actionStr = "", urlData = "";
            if (cellData && cellData.includes("||")) {
                let parts = cellData.split("||");
                if (parts[0].includes("http")) { urlData = parts[0].trim(); }
                else {
                    actionStr = parts[0].trim().replace(/^\[|\]$/g, '');
                    if (parts.length > 1 && parts[1].includes("http")) urlData = parts[1].trim();
                }
            } else {
                if (cellData && !cellData.includes("http")) actionStr = cellData.trim().replace(/^\[|\]$/g, '');
                else urlData = cellData ? cellData.trim() : "";
            }

            let fileUrls = urlData ? urlData.split(',') : []; 
            let hasFiles = false; 
            let previewHtml = `<div class="flex flex-col gap-2 mt-3">`;
            
            if (actionStr && actionStr !== "Completed") {
                previewHtml += `<div class="bg-indigo-900/30 border border-indigo-500/30 p-2.5 rounded-lg mb-2 text-indigo-300 text-xs font-bold leading-relaxed whitespace-pre-wrap shadow-inner">📋 ${actionStr}</div>`;
            }
            
            fileUrls.forEach((url, index) => {
                url = url.trim();
                if (url.includes("http")) {
                    hasFiles = true;
                    if (stageNum === 9 || stageNum === 7 || url.toLowerCase().includes("audio")) {
                        previewHtml += `<audio controls src="${url}" class="h-10 w-full outline-none bg-slate-800 rounded border border-slate-700 mt-2"></audio>`; 
                    } else { 
                        let imgThumbnailUrl = url;
                        let driveMatch = url.match(/\/d\/(.*?)\//);
                        if (driveMatch && driveMatch[1]) { imgThumbnailUrl = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`; }
                        previewHtml += `<div class="mt-2 bg-[#0B1121] rounded-lg border border-slate-700 overflow-hidden relative group shadow-sm"><p class="text-[10px] font-bold text-indigo-400 p-2 border-b border-slate-700 bg-slate-800/50">🖼️ Uploaded Proof ${index + 1}</p><a href="${url}" target="_blank" class="block relative"><img src="${imgThumbnailUrl}" class="w-full h-auto max-h-48 object-contain bg-black/40"><div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span class="text-white text-xs font-black bg-indigo-600 px-3 py-1.5 rounded-full shadow-lg">🔍 Click to Enlarge</span></div></a></div>`; 
                    }
                }
            });

            if (hasFiles && stagesRequiringShare.includes(stageNum)) {
                let isShared = localStorage.getItem('shared_' + order.orderId + '_' + stageNum) === 'true';
                let btnClass = isShared ? "bg-[#128C7E]/40 text-white border-[#128C7E]/50" : "bg-[#25D366] text-white border-[#25D366] animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_rgba(37,211,102,0.5)]";
                let btnText = isShared ? "✓ Shared to WhatsApp" : "📤 Share to Group (MANDATORY)";
                previewHtml += `<button onclick="shareToGroup(${stageNum}, '${urlData}')" class="mt-2 w-full ${btnClass} text-[10px] font-black py-3 rounded-lg shadow transition-colors flex items-center justify-center gap-2 uppercase tracking-widest border"><span>${isShared ? '✓' : '📤'}</span> ${btnText}</button>`;
            }
            previewHtml += `</div>`;
            
            uiHtml = `<div class="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 hover:bg-emerald-900/20 transition"><div class="flex justify-between items-start"><div><span class="text-emerald-400 text-sm font-black block mb-1.5">${stageNum}. ${displayStageName}</span><div class="flex items-center gap-2 flex-wrap">${timestampDisplay}${timeTakenDisplay}</div></div><span class="bg-emerald-950 text-emerald-500 font-black text-[9px] px-2 py-1 rounded shadow-inner uppercase tracking-widest shrink-0 ml-2">✔ DONE</span></div>${previewHtml}</div>`;
        } else if (isLocked) {
            uiHtml = `<div class="bg-slate-800/20 border border-slate-800 rounded-xl p-4 flex justify-between items-center grayscale opacity-50"><span class="text-slate-500 text-sm font-bold">${stageNum}. ${displayStageName}</span><span class="text-slate-600 text-[9px] font-mono tracking-widest bg-slate-900 px-2 py-1 rounded">🔒 LOCKED</span></div>`;
        } else if (isActive) {
            let inputHtml = '';
            if (stageNum === 1) { 
                inputHtml = `<button onclick="generateTallyCSV('${order.orderId}')" class="w-full mt-4 mb-2 bg-[#EAB308] hover:bg-[#CA8A04] text-black font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all active:scale-95 text-sm flex items-center justify-center gap-2"><span>📊</span> Export Sales Order for Tally (CSV)</button><p class="text-[10px] font-black text-slate-400 mt-4 mb-1.5 uppercase tracking-widest flex items-center gap-2"><span class="text-indigo-400">⚡</span> Upload Balance Check Proof (Required)</p><p class="text-[9px] text-orange-400 mb-3 italic tracking-widest">Tip: Use "Multi Gallery" if app freezes on Live Camera.</p><div class="flex gap-2 w-full"><label class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-center py-3 rounded-xl cursor-pointer text-xs font-bold transition shadow-inner">📸 Live Camera<input type="file" accept="image/*" capture="environment" class="hidden" onchange="handleFileSelection(this, ${stageNum})"></label><label class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-center py-3 rounded-xl cursor-pointer text-xs font-bold transition shadow-inner">🖼️ Multi Gallery<input type="file" accept="image/*" multiple class="hidden" onchange="handleFileSelection(this, ${stageNum})"></label></div><div id="previewBox_${stageNum}" class="flex flex-wrap gap-2 mt-3 hidden bg-[#0B1121] p-2 rounded-lg border border-slate-700"></div><div class="flex items-center justify-between mt-2 bg-emerald-900/10 rounded px-2 border border-emerald-500/10 hidden" id="fileStatusContainer_${stageNum}"><p id="fileStatusText_${stageNum}" class="text-[10px] font-black text-emerald-400 py-2 hidden"></p><button id="clearFilesBtn_${stageNum}" onclick="clearQueuedFiles(${stageNum})" class="text-[10px] font-bold text-pink-400 hidden px-2 py-1 bg-pink-900/30 rounded border border-pink-500/30">Clear Files</button></div><button id="submitBtn_${stageNum}" onclick="submitStage(${stageNum})" class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg">Confirm Check & Execute</button>`;
            } else if (stageNum === 6) { 
                inputHtml += `<div class="bg-[#0B1121] border border-slate-700 p-4 rounded-xl mt-4 mb-4 shadow-inner"><p class="text-[10px] text-slate-400 mb-3 uppercase font-black tracking-widest flex items-center gap-2"><span class="text-indigo-400 text-base">🚚</span> Logistics Tracking Engine</p><label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">1. Who took the order?</label><select id="runnerSelect" class="w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-3 font-bold text-sm focus:border-indigo-400" onchange="if(this.value==='Others'){document.getElementById('runnerOther').classList.remove('hidden')}else{document.getElementById('runnerOther').classList.add('hidden')}"><option value="" disabled selected>Select Delivery Person...</option><option value="Vishal Gunjal">Vishal Gunjal</option><option value="Preetam Bogawat">Preetam Bogawat</option><option value="Raghav Korekar">Raghav Korekar</option><option value="Yash Barlota">Yash Barlota</option><option value="Rickshaw wala">Rickshaw wala</option><option value="Others">Others (Type Below)</option></select><input type="text" id="runnerOther" placeholder="Enter person's name..." class="hidden w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-4 font-bold text-sm"><label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">2. Which Transport?</label><select id="transportSelect" class="w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-3 font-bold text-sm focus:border-indigo-400" onchange="if(this.value==='Others'){document.getElementById('transportOther').classList.remove('hidden')}else{document.getElementById('transportOther').classList.add('hidden')}"><option value="" disabled selected>Select Transport Partner...</option><option value="Local">Local</option><option value="Adhunik Transport">Adhunik Transport</option><option value="Ambika Transport">Ambika Transport</option><option value="Blue Express">Blue Express</option><option value="Others">Others (Type Below)</option></select><input type="text" id="transportOther" placeholder="Enter transport name..." class="hidden w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-4 font-bold text-sm"><button onclick="submitStage(${stageNum})" id="submitBtn_${stageNum}" class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg">Allocate Logistics & Proceed</button></div>`;
            } else if (stageNum === 2 || stageNum === 7) { 
                let msgTemplate = stageNum === 2 ? window.appSettings.waMsgStage3 : (isCod ? window.appSettings.waMsgStage7COD : window.appSettings.waMsgStage7Prepaid);
                let finalMsg = msgTemplate.replace(/{{shop}}/g, order.shopName).replace(/{{orderId}}/g, order.orderId).replace(/{{paymentMode}}/g, order.paymentMode).replace(/{{amount}}/g, order.totalValue);
                let waUrl = order.phone ? `https://wa.me/${order.phone}?text=${encodeURIComponent(finalMsg)}` : `https://wa.me/?text=${encodeURIComponent(finalMsg)}`;

                inputHtml += `<div class="mt-4 mb-4"><p class="text-[10px] text-slate-400 mb-2 uppercase tracking-widest">Step 1: Communication</p><a href="${waUrl}" target="_blank" class="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg transition-all active:scale-95 mb-3">Send WhatsApp Message</a><label class="flex items-center gap-3 cursor-pointer bg-pink-500/10 border border-pink-500/30 p-3 rounded-xl hover:bg-pink-500/20 transition-colors"><input type="checkbox" id="noResponse_${stageNum}" class="w-5 h-5 rounded border-slate-600 bg-slate-800 text-pink-500 cursor-pointer shrink-0"><span class="text-[11px] text-pink-400 font-black uppercase tracking-widest text-wrap-custom">Dealer Didn't Respond / Ignore</span></label></div>`;
                
                if (stageNum === 7 && isCod) { 
                    inputHtml += `<div class="bg-indigo-900/20 p-3 rounded-xl border border-indigo-500/30 mb-4"><p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2"><span class="text-indigo-400">🎤</span> Upload Call Recording (Mandatory for COD)</p><input type="file" accept="audio/*" class="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-black file:bg-indigo-600 file:text-white bg-[#0B1121] p-1.5 rounded-xl border border-slate-700 cursor-pointer" onchange="handleFileSelection(this, ${stageNum})"><div id="previewBox_${stageNum}" class="flex flex-wrap gap-2 mt-3 hidden bg-[#0B1121] p-2 rounded-lg border border-slate-700"></div><div class="flex items-center justify-between mt-2 bg-emerald-900/10 rounded px-2 border border-emerald-500/10 hidden" id="fileStatusContainer_${stageNum}"><p id="fileStatusText_${stageNum}" class="text-[10px] font-black text-emerald-400 py-2 hidden"></p><button id="clearFilesBtn_${stageNum}" onclick="clearQueuedFiles(${stageNum})" class="text-[10px] font-bold text-pink-400 hidden px-2 py-1 bg-pink-900/30 rounded border border-pink-500/30">Clear</button></div></div>`;
                }
                
                inputHtml += `<p class="text-[10px] text-slate-400 mb-2 uppercase tracking-widest">Step 2: Submit</p><button id="submitBtn_${stageNum}" onclick="submitStage(${stageNum})" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg">Mark as Completed</button>`;
            } else {
                if (stageNum === 3) { 
                    inputHtml += `<div class="bg-[#0B1121] border border-slate-700 p-4 rounded-xl mt-4 mb-4 shadow-inner"><p class="text-sm text-slate-300 mb-4 uppercase font-black tracking-widest flex items-center gap-2"><span class="text-indigo-400 text-xl">☑</span> Confirm Available Stock</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto hide-scrollbar p-2">`;
                    order.items.forEach((item, idx) => {
                        let imgTag = item.image ? `<img src="${item.image}" class="w-16 h-16 object-contain rounded-lg bg-white p-1 shrink-0 shadow-sm border border-slate-600">` : `<div class="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-500 shrink-0 font-mono border border-slate-700">No Img</div>`;
                        inputHtml += `<div class="flex flex-col bg-[#1E293B] p-4 rounded-xl border-2 border-slate-700 hover:border-indigo-500 transition-all shadow-md"><div class="flex items-start gap-4"><input type="checkbox" id="chk_item_${idx}" checked class="w-6 h-6 rounded border-slate-600 bg-slate-800 text-indigo-500 mt-1 cursor-pointer shrink-0">${imgTag}<div class="flex-1 min-w-0"><h4 class="text-base font-black text-white leading-tight break-words">${item.name}</h4><div class="mt-4 flex items-center justify-between bg-[#0B1121] p-2 rounded-lg border border-slate-800"><span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Process Qty:</span><input type="number" id="qty_item_${idx}" value="${item.qty}" max="${item.qty}" min="0" class="w-16 bg-[#131C31] text-indigo-400 text-lg font-black p-1.5 rounded-lg border border-indigo-500/30 text-center outline-none focus:border-indigo-400"></div></div></div></div>`;
                    });
                    inputHtml += `</div><p class="text-[10px] text-orange-400 mt-4 font-bold leading-tight bg-orange-900/10 p-3 rounded-lg border border-orange-500/20 text-center uppercase tracking-widest">* Unchecked items or reduced quantities automatically create a new SPLIT-ORDER.</p></div>`;
                }

                if (stageNum === 4) { 
                    inputHtml += `<button onclick="generateShippingLabel('${order.orderId}')" class="w-full mt-4 mb-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95 text-sm flex items-center justify-center gap-2">🖨️ Print Dynamic A6 Shipping Label</button>`;
                }

                if (stageNum === 9) { 
                    inputHtml += `<p class="text-[10px] font-black text-slate-400 mt-4 mb-2 uppercase tracking-widest flex items-center gap-2"><span class="text-indigo-400">🎤</span> Record Audio / Call (Optional)</p><input type="file" accept="audio/*" class="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-black file:bg-indigo-600 file:text-white bg-[#0B1121] p-1.5 rounded-xl border border-slate-700 cursor-pointer" onchange="handleFileSelection(this, ${stageNum})">`;
                } else {
                    inputHtml += `<p class="text-[10px] font-black text-slate-400 mt-4 mb-1.5 uppercase tracking-widest flex items-center gap-2"><span class="text-indigo-400">⚡</span> Upload Proof (Required)</p><p class="text-[9px] text-orange-400 mb-3 italic tracking-widest">Tip: Use "Multi Gallery" if app freezes on Live Camera.</p><div class="flex gap-2 w-full"><label class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-center py-3 rounded-xl cursor-pointer text-xs font-bold transition shadow-inner">📸 Live Camera<input type="file" accept="image/*" capture="environment" class="hidden" onchange="handleFileSelection(this, ${stageNum})"></label><label class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-center py-3 rounded-xl cursor-pointer text-xs font-bold transition shadow-inner">🖼️ Multi Gallery<input type="file" accept="image/*" multiple class="hidden" onchange="handleFileSelection(this, ${stageNum})"></label></div>`;
                }
                
                inputHtml += `<div id="previewBox_${stageNum}" class="flex flex-wrap gap-2 mt-3 hidden bg-[#0B1121] p-2 rounded-lg border border-slate-700"></div><div class="flex items-center justify-between mt-2 bg-emerald-900/10 rounded px-2 border border-emerald-500/10 hidden" id="fileStatusContainer_${stageNum}"><p id="fileStatusText_${stageNum}" class="text-[10px] font-black text-emerald-400 py-2 hidden"></p><button id="clearFilesBtn_${stageNum}" onclick="clearQueuedFiles(${stageNum})" class="text-[10px] font-bold text-pink-400 hidden px-2 py-1 bg-pink-900/30 rounded border border-pink-500/30">Clear Files</button></div>`;

                if (stageNum === 9) { 
                    inputHtml += `<div class="mt-4"><label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Customer Rating</label><input type="number" id="ratingInput" min="1" max="5" placeholder="Enter Score (1-5)" class="w-full bg-[#0B1121] border border-slate-700 rounded-xl p-3 text-white outline-none font-bold text-lg text-center shadow-inner"></div>`;
                }
                
                inputHtml += `<button id="submitBtn_${stageNum}" onclick="submitStage(${stageNum})" class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg">Execute & Proceed</button>`;
            }
            
            if (needsShare) {
                uiHtml = `<div class="bg-orange-900/10 border-2 border-orange-500/30 rounded-xl p-5 relative overflow-hidden mt-4"><div class="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div><div class="flex justify-between items-center mb-2"><span class="text-white font-black text-lg text-opacity-50">${stageNum}. ${displayStageName}</span><span class="bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded tracking-widest uppercase">🔒 LOCKED</span></div><p class="text-xs text-orange-400 font-bold mt-3">⚠️ Action Required: Upar scroll karein aur agla step unlock karne ke liye flashing green "Share to Group" button daba kar update share karein.</p></div>`;
            } else {
                uiHtml = `<div class="bg-[#131C31] border-2 border-indigo-500 rounded-xl p-5 shadow-[0_0_30px_rgba(79,70,229,0.15)] relative overflow-hidden transform scale-[1.02]"><div class="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 shadow-[0_0_15px_#4f46e5]"></div><div class="flex justify-between items-center mb-2"><span class="text-white font-black text-lg">${stageNum}. ${displayStageName}</span><span class="bg-indigo-500 text-white text-[9px] font-black px-2 py-1 rounded animate-pulse tracking-widest uppercase">ACTION REQUIRED</span></div><div id="actionArea_${stageNum}">${inputHtml}</div><p id="status_${stageNum}" class="text-xs font-bold mt-3 hidden text-center"></p></div>`;
            }
        }
        stagesListHtml += uiHtml;
    }
    stagesListHtml += '</div>'; 
    container.innerHTML += stagesListHtml;
    document.getElementById('orderModal').classList.remove('hidden');
}

function closeModal() { 
    document.getElementById('orderModal').classList.add('hidden'); 
    fetchOrders(true); 
}

function handleFileSelection(inputElement, stageNum) {
    const newFiles = Array.from(inputElement.files);
    const validFiles = [];
    const MAX_SIZE = 6 * 1024 * 1024; 

    for (let f of newFiles) {
        if (f.size > MAX_SIZE) {
            alert(`File "${f.name}" is too large (${(f.size/1024/1024).toFixed(1)}MB). Please keep audio recordings under 6MB.`);
        } else {
            validFiles.push(f);
        }
    }

    if (validFiles.length === 0) {
        inputElement.value = ''; 
        return;
    }

    queuedFiles = queuedFiles.concat(validFiles);
    
    const statusLabel = document.getElementById(`fileStatusText_${stageNum}`);
    const clearBtn = document.getElementById(`clearFilesBtn_${stageNum}`);
    const container = document.getElementById(`fileStatusContainer_${stageNum}`);
    const previewBox = document.getElementById(`previewBox_${stageNum}`);
    
    if (queuedFiles.length > 0) {
        statusLabel.innerText = `✓ ${queuedFiles.length} File(s) Ready`; 
        statusLabel.classList.remove('hidden'); 
        
        if (clearBtn) clearBtn.classList.remove('hidden'); 
        if (container) container.classList.remove('hidden');
        
        if (previewBox) {
            previewBox.innerHTML = ''; 
            previewBox.classList.remove('hidden');
            
            queuedFiles.forEach(file => {
                if (file.type.startsWith('audio/')) {
                    previewBox.innerHTML += `<div class="w-12 h-12 bg-indigo-900/50 flex flex-col items-center justify-center rounded border border-indigo-500 text-[8px] text-indigo-300 font-bold p-1 overflow-hidden shadow-inner">🎤<br/>Audio</div>`; 
                } else { 
                    const reader = new FileReader(); 
                    reader.onload = function(e) { 
                        previewBox.innerHTML += `<img src="${e.target.result}" class="w-12 h-12 object-cover rounded border border-slate-600 shadow-sm">`; 
                    }; 
                    reader.readAsDataURL(file); 
                }
            });
        }
    }
}

function clearQueuedFiles(stageNum) {
    queuedFiles = [];
    
    if (document.getElementById(`fileStatusText_${stageNum}`)) document.getElementById(`fileStatusText_${stageNum}`).classList.add('hidden'); 
    if (document.getElementById(`clearFilesBtn_${stageNum}`)) document.getElementById(`clearFilesBtn_${stageNum}`).classList.add('hidden'); 
    if (document.getElementById(`fileStatusContainer_${stageNum}`)) document.getElementById(`fileStatusContainer_${stageNum}`).classList.add('hidden');
    if (document.getElementById(`previewBox_${stageNum}`)) { 
        document.getElementById(`previewBox_${stageNum}`).innerHTML = ''; 
        document.getElementById(`previewBox_${stageNum}`).classList.add('hidden'); 
    }
}

window.shareToGroup = function(stageNum, fileUrlsString) {
    const orderId = currentActiveOrder.orderId; 
    const shop = currentActiveOrder.shopName; 
    const stageName = STAGE_NAMES[stageNum - 1]; 
    
    let links = fileUrlsString.split(',').map(u => makeDirectDriveLink(u.trim())).join('\n');
    let msg = `*Order Update Alert*\n\n*Order ID:* ${orderId}\n*Dealer:* ${shop}\n*Stage Update:* ${stageName}\n\n*Attached Files/Proof:*\n${links}`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    
    localStorage.setItem('shared_' + orderId + '_' + stageNum, 'true');
    setTimeout(() => { openModal(orderId); }, 1000);
}

function generateEODReport() {
    if (!window.appData || !window.appData.rawArray || window.appData.rawArray.length === 0) {
        alert("No data available to generate report.");
        return;
    }
    
    let today = new Date();
    today.setHours(0,0,0,0);
    
    let todayOrders = window.appData.rawArray.filter(o => {
        let d = parseCustomDate(o.date);
        d.setHours(0,0,0,0);
        return d.getTime() === today.getTime();
    });
    
    let totalReceived = todayOrders.length;
    let totalValue = todayOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
    let totalCompleted = todayOrders.filter(o => o.isFullyCompleted).length;
    let totalDispatched = todayOrders.filter(o => o.completedStages >= 5 && !o.isFullyCompleted).length; 
    let pending = totalReceived - totalCompleted - totalDispatched;
    
    let reportDate = new Date().toLocaleDateString('en-GB');
    let staffName = currentUserName ? currentUserName.toUpperCase() : 'ADMIN';
    
    let msg = `*📊 DAILY EOD REPORT - YASH MARKETING*\n\n*📅 Date:* ${reportDate}\n*🧑‍💼 Staff:* ${staffName}\n\n`;
    msg += `*📦 Orders Received Today:* ${totalReceived}\n`;
    msg += `*💰 Total Value:* ₹${totalValue.toLocaleString()}\n`;
    msg += `*✅ Orders Delivered/Final:* ${totalCompleted}\n`;
    msg += `*🚚 Orders Dispatched:* ${totalDispatched}\n`;
    msg += `*⏳ Pending Orders:* ${pending}\n\n`;
    msg += `_System Generated via MDO OS_`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

function generateTallyCSV(orderId) {
    const order = window.appData.orders[orderId];
    if (!order) return;
    
    let csvContent = "\uFEFFDate,Voucher Type,Voucher Number,Party Name,Item Name,Quantity,Rate,Amount\n";
    let formattedDate = parseCustomDate(order.date).toLocaleDateString('en-GB'); 
    
    order.items.forEach(item => { 
        csvContent += `${formattedDate},Sales Order,${order.orderId},"${order.shopName}","${item.name}",${item.qty},0,0\n`; 
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    
    link.href = URL.createObjectURL(blob);
    link.download = `Tally_SO_${order.orderId}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification("Tally SO Exported", `Ensure file is CLOSED before importing in Tally.`);
}
