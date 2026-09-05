<script>
    // =======================================================
    // 1-CLICK MERGE EXECUTION
    // =======================================================
    async function executeMerge(primaryOrderId, shopName, secondaryIds, targetBtn) {
        if (!confirm(`Combine all pending items for ${shopName} into this order?`)) {
            return;
        }
        
        targetBtn.innerText = "Merging Pipelines...";
        targetBtn.disabled = true;
        targetBtn.classList.add('animate-pulse');
        
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'mergeOrders', 
                    primaryOrderId: primaryOrderId, 
                    secondaryIds: secondaryIds, 
                    shopName: shopName 
                })
            });
            
            const data = await res.json();
            
            if (data.status === 'success') {
                showNotification("MERGE COMPLETE", "Orders have been physically combined in the database.");
                closeModal(); 
                fetchOrders(true);
            } else { 
                alert(data.message); 
                targetBtn.innerText = "Merge Failed"; 
            }
        } catch(e) { 
            alert("Network error during merge execution."); 
            targetBtn.innerText = "Retry Merge"; 
            targetBtn.disabled = false; 
        }
    }

    // =======================================================
    // ORDER MODAL & STAGE GENERATION
    // =======================================================
    function openModal(orderId) {
        const order = window.appData.orders[orderId];
        if (!order) {
            return;
        }
        
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
        
        if (isCod) {
            payBadge.className = `text-[10px] px-2 py-1 rounded font-black tracking-widest uppercase border bg-orange-500/10 text-orange-400 border-orange-500/20`;
        } else {
            payBadge.className = `text-[10px] px-2 py-1 rounded font-black tracking-widest uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
        }
        
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
                let imgTag = "";
                if (item.image) {
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
                
                itemsHtml += `
                    <div class="flex items-start gap-3 bg-[#0B1121] p-2.5 rounded-lg border border-slate-800">
                        ${imgTag}
                        <div class="flex-1 min-w-0">
                            <p class="text-xs text-slate-300 font-bold leading-tight text-wrap-custom">
                                ${item.name}
                            </p>
                            <div class="mt-2 flex items-center gap-2">
                                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    Qty:
                                </span>
                                <span class="text-xs font-black text-indigo-400 bg-indigo-900/30 border border-indigo-500/20 px-2 py-0.5 rounded shadow-inner">
                                    ${item.qty}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            });
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
        let orderDateStr = parseCustomDate(order.date).toDateString();
        
        // Check karein ki current order pehle se merge toh nahi ho chuka hai
        let isAlreadyMerged = order.stageUrls.some(url => url && url.includes("Merged into"));

        let secondaryOrders = filteredData.filter(o => 
            o.shopName === order.shopName && 
            parseCustomDate(o.date).toDateString() === orderDateStr && 
            o.completedStages < 3 && 
            o.orderId !== order.orderId &&
            !o.creditLocked &&
            !(o.stageUrls.some(url => url && url.includes("Merged into"))) // Pehle se merged orders ko list se bahar nikalein
        );

        // Agar order pehle se merged hai, toh usme Merge ka button dikhayenge hi nahi
        if (order.completedStages < 3 && secondaryOrders.length > 0 && !order.creditLocked && !isAlreadyMerged) {
            let secondaryIds = secondaryOrders.map(o => o.orderId).join(',');
            mergeActionHtml = `
                <button 
                    onclick="executeMerge('${order.orderId}', '${order.shopName}', '${secondaryIds}', this)" 
                    class="w-full mt-2 mb-4 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-black py-3 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 uppercase tracking-widest border border-blue-500/50"
                >
                    🔗 1-Click Merge: Combine ${secondaryOrders.length} other pending order(s) into this one
                </button>
            `;
        }

        
        container.innerHTML += mergeActionHtml;

        let stagesListHtml = '<div class="space-y-4">';
        let needsShare = false;
        let lastCompletedStage = order.completedStages;
        const stagesRequiringShare = [1, 3, 4, 5, 8]; 
        
        if (stagesRequiringShare.includes(lastCompletedStage)) { 
            if (localStorage.getItem('shared_' + order.orderId + '_' + lastCompletedStage) !== 'true') {
                needsShare = true;
            }
        }
        
        for (let i = 0; i < 9; i++) { 
            const stageNum = i + 1; 
            const isCompleted = i < order.completedStages; 
            const isActive = i === order.completedStages; 
            const isLocked = i > order.completedStages;
            
            let displayStageName = STAGE_NAMES[i]; 
            
            if (stageNum === 7) { 
                displayStageName = isCod ? "Call 2 (Out-for-delivery)" : "WhatsApp 2 (Out-for-delivery)";
            }
            
            let uiHtml = '';
            
            if (isCompleted) {
                let cellData = order.stageUrls ? order.stageUrls[i] : ""; 
                let timestampDisplay = ""; 
                let timeTakenDisplay = ""; 
                let thisEpoch = null; 
                let previousEpoch = parseCustomDate(order.date).getTime(); 
                
                                                   let staffName = "System";
                let staffMatch = cellData ? cellData.match(/STAFF:\s*(.+)/) : null;
                if (staffMatch) {
                    staffName = staffMatch[1].trim();
                    cellData = cellData.replace(/\|\|\s*STAFF:\s*.+/, '').trim();
                }

                if (i > 0 && order.stageUrls[i-1]) { 
                    let prevMatch = order.stageUrls[i-1].match(/TIME:\s*(\d+)/); 
                    if (prevMatch) {
                        previousEpoch = parseInt(prevMatch[1]); 
                    }
                }
                
                if (cellData && cellData.includes("TIME:")) {
                    let match = cellData.match(/TIME:\s*(\d+)/);
                    if (match) {
                        thisEpoch = parseInt(match[1]); 
                        let d = new Date(thisEpoch); 
                        
                        // Naya Date + Time Format Logic
                        let day = String(d.getDate()).padStart(2, '0');
                        let month = String(d.getMonth() + 1).padStart(2, '0');
                        let year = String(d.getFullYear()).slice(-2); // 2026 ko 26 banayega
                        let timeStr = d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
                        let dateTimeStr = `${day}/${month}/${year} ${timeStr}`;
                        
                        timestampDisplay = `
                            <span class="text-[9px] text-emerald-300 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50 shadow-sm">
                                📅 ${dateTimeStr}
                            </span>
                        `;
                        
                        // Time Taken Calculation
                        let diffMins = Math.max(0, Math.round((thisEpoch - previousEpoch) / 60000));
                        let timeFormatted = "";
                        
                        if (diffMins < 60) {
                            timeFormatted = `${diffMins} Mins`;
                        } else {
                            let hrs = Math.floor(diffMins / 60);
                            let mins = diffMins % 60;
                            timeFormatted = `${hrs} Hour ${mins} Mins`;
                        }
                        
                        timeTakenDisplay = `
                            <span class="text-[10px] text-orange-300 font-bold bg-orange-950/50 px-2 py-0.5 rounded border border-orange-800/50 ml-2 shadow-sm">
                                ⏱️ Took: ${timeFormatted}
                            </span>
                        `;

                        // Staff Name tracking
                        timeTakenDisplay += `
                            <span class="text-[10px] text-blue-200 font-black bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/50 ml-2 shadow-sm">
                                👤 By: ${staffName}
                            </span>
                        `;

                        cellData = cellData.replace(/\|\|\s*TIME:\s*\d+/, '').trim();
                    }
                }



                                                      let actionStr = "";
                let urlData = "";

                if (cellData && cellData.includes("||")) {
                    let parts = cellData.split("||");
                    
                    // Agar string ke pehle part me link (http) hai, toh use URL manenge
                    if (parts[0].includes("http")) {
                        urlData = parts[0].trim();
                    } else {
                        // Warna wo Action Text hai (Jaise "Merged into..." ya "Completed")
                        actionStr = parts[0].trim().replace(/^\[|\]$/g, '');
                        if (parts.length > 1 && parts[1].includes("http")) {
                            urlData = parts[1].trim();
                        }
                    }
                } else {
                    // Agar direct text ya direct link save ho gaya ho
                    if (cellData && !cellData.includes("http")) {
                        actionStr = cellData.trim().replace(/^\[|\]$/g, '');
                    } else {
                        urlData = cellData ? cellData.trim() : "";
                    }
                }

                let fileUrls = urlData ? urlData.split(',') : []; 
                let hasFiles = false; 
                let previewHtml = `<div class="flex flex-col gap-2 mt-3">`;
                
                if (actionStr && actionStr !== "Completed") {
                    previewHtml += `
                        <div class="bg-indigo-900/30 border border-indigo-500/30 p-2.5 rounded-lg mb-2 text-indigo-300 text-xs font-bold leading-relaxed whitespace-pre-wrap shadow-inner">
                            📋 ${actionStr}
                        </div>
                    `;
                }
                
                                  fileUrls.forEach((url, index) => {
                    url = url.trim();
                    if (url.includes("http")) {
                        hasFiles = true;
                        if (stageNum === 9 || stageNum === 7 || url.toLowerCase().includes("audio")) {
                            previewHtml += `
                                <audio controls src="${url}" class="h-10 w-full outline-none bg-slate-800 rounded border border-slate-700 mt-2"></audio>
                            `; 
                        } else { 
                            // Google Drive URL ko Image Thumbnail Preview me convert karein
                            let imgThumbnailUrl = url;
                            let driveMatch = url.match(/\/d\/(.*?)\//);
                            if (driveMatch && driveMatch[1]) {
                                // 800px width ka direct thumbnail generate karta hai
                                imgThumbnailUrl = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
                            }
                            
                            previewHtml += `
                                <div class="mt-2 bg-[#0B1121] rounded-lg border border-slate-700 overflow-hidden relative group shadow-sm">
                                    <p class="text-[10px] font-bold text-indigo-400 p-2 border-b border-slate-700 bg-slate-800/50">
                                        🖼️ Uploaded Proof ${index + 1}
                                    </p>
                                    <a href="${url}" target="_blank" class="block relative">
                                        <img src="${imgThumbnailUrl}" class="w-full h-auto max-h-48 object-contain bg-black/40">
                                        <div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span class="text-white text-xs font-black bg-indigo-600 px-3 py-1.5 rounded-full shadow-lg">
                                                🔍 Click to Enlarge
                                            </span>
                                        </div>
                                    </a>
                                </div>
                            `; 
                        }
                    }
                });

                
                if (hasFiles && stagesRequiringShare.includes(stageNum)) {
                    let isShared = localStorage.getItem('shared_' + order.orderId + '_' + stageNum) === 'true';
                    let btnClass = isShared ? "bg-[#128C7E]/40 text-white border-[#128C7E]/50" : "bg-[#25D366] text-white border-[#25D366] animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_rgba(37,211,102,0.5)]";
                    let btnText = isShared ? "✓ Shared to WhatsApp" : "📤 Share to Group (MANDATORY)";
                    
                    previewHtml += `
                        <button 
                            onclick="shareToGroup(${stageNum}, '${urlData}')" 
                            class="mt-2 w-full ${btnClass} text-[10px] font-black py-3 rounded-lg shadow transition-colors flex items-center justify-center gap-2 uppercase tracking-widest border"
                        >
                            <span>${isShared ? '✓' : '📤'}</span> ${btnText}
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
                                <div class="flex items-center gap-2 flex-wrap">
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
                
                if (stageNum === 1) { // Balance Check
inputHtml = `
    <button 
        onclick="generateTallyCSV('${order.orderId}')" 
        class="w-full mt-4 mb-2 bg-[#EAB308] hover:bg-[#CA8A04] text-black font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
    >
        <span>📊</span> Export Sales Order for Tally (CSV)
    </button>
    
    <p class="text-[10px] font-black text-slate-400 mt-4 mb-1.5 uppercase tracking-widest flex items-center gap-2">
        <span class="text-indigo-400">⚡</span> Upload Balance Check Proof (Required)
    </p>
    <p class="text-[9px] text-orange-400 mb-3 italic tracking-widest">Tip: Use "Multi Gallery" if app freezes on Live Camera.</p>
    
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
    
    <button 
        id="submitBtn_${stageNum}" 
        onclick="submitStage(${stageNum})" 
        class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-lg"
    >
        Confirm Check & Execute
    </button>
`;
}
                else if (stageNum === 6) { // Logistics
                    inputHtml += `
                        <div class="bg-[#0B1121] border border-slate-700 p-4 rounded-xl mt-4 mb-4 shadow-inner">
                            <p class="text-[10px] text-slate-400 mb-3 uppercase font-black tracking-widest flex items-center gap-2">
                                <span class="text-indigo-400 text-base">🚚</span> Logistics Tracking Engine
                            </p>
                            
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                1. Who took the order?
                            </label>
                            <select 
                                id="runnerSelect" 
                                class="w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-3 font-bold text-sm focus:border-indigo-400" 
                                onchange="if(this.value==='Others'){document.getElementById('runnerOther').classList.remove('hidden')}else{document.getElementById('runnerOther').classList.add('hidden')}"
                            >
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
                            <select 
                                id="transportSelect" 
                                class="w-full bg-[#131C31] border border-indigo-500/50 rounded-lg p-2.5 text-white outline-none mb-3 font-bold text-sm focus:border-indigo-400" 
                                onchange="if(this.value==='Others'){document.getElementById('transportOther').classList.remove('hidden')}else{document.getElementById('transportOther').classList.add('hidden')}"
                            >
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
                else if (stageNum === 2 || stageNum === 7) { // WA 1 and WA 2
                    let msgTemplate = "";
                    
                    if (stageNum === 2) {
                        msgTemplate = window.appSettings.waMsgStage3;
                    } else {
                        msgTemplate = isCod ? window.appSettings.waMsgStage7COD : window.appSettings.waMsgStage7Prepaid;
                    }
                    
                    let finalMsg = msgTemplate.replace(/{{shop}}/g, order.shopName).replace(/{{orderId}}/g, order.orderId).replace(/{{paymentMode}}/g, order.paymentMode).replace(/{{amount}}/g, order.totalValue);
                    let waUrl = order.phone ? `https://wa.me/${order.phone}?text=${encodeURIComponent(finalMsg)}` : `https://wa.me/?text=${encodeURIComponent(finalMsg)}`;

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
                    
                    if (stageNum === 7 && isCod) { // Delivery Comms COD
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
                    if (stageNum === 3) { // Processed Stock
                        inputHtml += `
                            <div class="bg-[#0B1121] border border-slate-700 p-4 rounded-xl mt-4 mb-4 shadow-inner">
                                <p class="text-sm text-slate-300 mb-4 uppercase font-black tracking-widest flex items-center gap-2">
                                    <span class="text-indigo-400 text-xl">☑</span> Confirm Available Stock
                                </p>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto hide-scrollbar p-2">
                        `;
                        
                        order.items.forEach((item, idx) => {
                            let imgTag = "";
                            if (item.image) {
                                imgTag = `<img src="${item.image}" class="w-16 h-16 object-contain rounded-lg bg-white p-1 shrink-0 shadow-sm border border-slate-600">`;
                            } else {
                                imgTag = `<div class="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-500 shrink-0 font-mono border border-slate-700">No Img</div>`;
                            }
                            inputHtml += `
                                    <div class="flex flex-col bg-[#1E293B] p-4 rounded-xl border-2 border-slate-700 hover:border-indigo-500 transition-all shadow-md">
                                        <div class="flex items-start gap-4">
                                            <input 
                                                type="checkbox" 
                                                id="chk_item_${idx}" 
                                                checked 
                                                class="w-6 h-6 rounded border-slate-600 bg-slate-800 text-indigo-500 mt-1 cursor-pointer shrink-0"
                                            >
                                            ${imgTag}
                                            <div class="flex-1 min-w-0">
                                                <h4 class="text-base font-black text-white leading-tight break-words">${item.name}</h4>
                                                <div class="mt-4 flex items-center justify-between bg-[#0B1121] p-2 rounded-lg border border-slate-800">
                                                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Process Qty:</span>
                                                    <input 
                                                        type="number" 
                                                        id="qty_item_${idx}" 
                                                        value="${item.qty}" 
                                                        max="${item.qty}" 
                                                        min="0" 
                                                        class="w-16 bg-[#131C31] text-indigo-400 text-lg font-black p-1.5 rounded-lg border border-indigo-500/30 text-center outline-none focus:border-indigo-400"
                                                    >
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                            `;
                        });
                        
                        inputHtml += `
                                </div>
                                <p class="text-[10px] text-orange-400 mt-4 font-bold leading-tight bg-orange-900/10 p-3 rounded-lg border border-orange-500/20 text-center uppercase tracking-widest">
                                    * Unchecked items or reduced quantities automatically create a new SPLIT-ORDER.
                                </p>
                            </div>
                        `;
                    }

                    if (stageNum === 4) { // Invoiced
                        inputHtml += `
                            <button 
                                onclick="generateShippingLabel('${order.orderId}')" 
                                class="w-full mt-4 mb-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                🖨️ Print Dynamic A6 Shipping Label
                            </button>
                        `;
                    }

                    if (stageNum === 9) { // Final Call / Rating
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
                            <p class="text-[10px] font-black text-slate-400 mt-4 mb-1.5 uppercase tracking-widest flex items-center gap-2">
                                <span class="text-indigo-400">⚡</span> Upload Proof (Required)
                            </p>
                            <p class="text-[9px] text-orange-400 mb-3 italic tracking-widest">Tip: Use "Multi Gallery" if app freezes on Live Camera.</p>
                        `;
                        
                        inputHtml += `
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

                    if (stageNum === 9) { // Rating Input
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
        
        document.getElementById('orderModal').classList.remove('hidden');
    }

    function closeModal() { 
        document.getElementById('orderModal').classList.add('hidden'); 
        fetchOrders(true); 
    }

    // =======================================================
    // FILE UPLOADS & MEDIA HANDLING
    // =======================================================
    function handleFileSelection(inputElement, stageNum) {
const newFiles = Array.from(inputElement.files);
const validFiles = [];
const MAX_SIZE = 6 * 1024 * 1024; // 6MB strict limit

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
    
    if (clearBtn) {
        clearBtn.classList.remove('hidden'); 
    }
    if (container) {
        container.classList.remove('hidden');
    }
    
    if (previewBox) {
        previewBox.innerHTML = ''; 
        previewBox.classList.remove('hidden');
        
        queuedFiles.forEach(file => {
            if (file.type.startsWith('audio/')) {
                previewBox.innerHTML += `
                    <div class="w-12 h-12 bg-indigo-900/50 flex flex-col items-center justify-center rounded border border-indigo-500 text-[8px] text-indigo-300 font-bold p-1 overflow-hidden shadow-inner">
                        🎤<br/>Audio
                    </div>
                `; 
            } else { 
                const reader = new FileReader(); 
                reader.onload = function(e) { 
                    previewBox.innerHTML += `
                        <img src="${e.target.result}" class="w-12 h-12 object-cover rounded border border-slate-600 shadow-sm">
                    `; 
                }; 
                reader.readAsDataURL(file); 
            }
        });
    }
}
}
    
    function clearQueuedFiles(stageNum) {
        queuedFiles = [];
        
        if (document.getElementById(`fileStatusText_${stageNum}`)) {
            document.getElementById(`fileStatusText_${stageNum}`).classList.add('hidden'); 
        }
        if (document.getElementById(`clearFilesBtn_${stageNum}`)) {
            document.getElementById(`clearFilesBtn_${stageNum}`).classList.add('hidden'); 
        }
        if (document.getElementById(`fileStatusContainer_${stageNum}`)) {
            document.getElementById(`fileStatusContainer_${stageNum}`).classList.add('hidden');
        }
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

    // =======================================================
    // REPORTS & EXPORTS
    // =======================================================
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
        let totalDispatched = todayOrders.filter(o => o.completedStages >= 5 && !o.isFullyCompleted).length; // 5 is now dispatched
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
        if (!order) {
            return;
        }
        
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

    // =======================================================
    // COMPRESSION & SUBMISSION
    // =======================================================
    function compressImage(file) {
return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
        // Instantly free up the memory pointer once the image is loaded
        URL.revokeObjectURL(objectUrl);

        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let scale = 1;

        if (img.width > MAX_WIDTH) {
            scale = MAX_WIDTH / img.width;
        }

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve({
            name: file.name,
            mimeType: 'image/jpeg',
            base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
        });
    };

    img.onerror = (error) => {
        URL.revokeObjectURL(objectUrl);
        reject(error);
    };

    img.src = objectUrl;
});
}


    function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader(); 
            reader.readAsDataURL(file);
            
            reader.onload = () => resolve({ 
                name: file.name, 
                mimeType: file.type, 
                base64: reader.result.split(',')[1] 
            });
            
            reader.onerror = error => reject(error);
        });
    }

    async function submitStage(stageNum) {
        const btn = document.getElementById(`submitBtn_${stageNum}`); 
        const statusLabel = document.getElementById(`status_${stageNum}`);
        
        let isCod = currentActiveOrder.paymentMode && currentActiveOrder.paymentMode.toUpperCase().includes('COD');

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
        
        const noRespCheckbox = document.getElementById(`noResponse_${stageNum}`);
        
        if (noRespCheckbox && noRespCheckbox.checked) {
            payload.isNoResponse = true; 
        }
        
        if (stageNum === 6) { // Logistics
            let runner = document.getElementById('runnerSelect').value;
            if (runner === "Others") {
                runner = document.getElementById('runnerOther').value;
            }
            
            let transport = document.getElementById('transportSelect').value;
            if (transport === "Others") {
                transport = document.getElementById('transportOther').value;
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
        
        let fileRequired = true;
        
        if (payload.isNoResponse || stageNum === 9 || stageNum === 6 || stageNum === 2 || (stageNum === 7 && !isCod)) {
            fileRequired = false; 
        }

        if (fileRequired && queuedFiles.length === 0) {
            if (stageNum === 7 && isCod) {
                alert("For COD Orders, Call Recording is MANDATORY."); 
            } else {
                alert("A file proof (Screenshot/Photo) is mandatory."); 
            }
            return; 
        }
        
        if (!fileRequired && queuedFiles.length === 0 && (stageNum === 2 || stageNum === 7)) {
            payload.isWhatsAppOnly = true; 
        }
        
        if (btn) { 
            btn.innerText = "Processing & Transmitting..."; 
            btn.disabled = true; 
        }
        
        for (let i = 0; i < queuedFiles.length; i++) {
            let f = queuedFiles[i];
            if (f.type.startsWith('image/')) {
                payload.files.push(await compressImage(f)); 
            } else {
                payload.files.push(await getBase64(f)); 
            }
        }
        
        if (stageNum === 9) { // Rating Stage
            const rating = document.getElementById('ratingInput').value;
            
            if (!rating) { 
                alert("Customer Rating is mandatory."); 
                
                if (btn) { 
                    btn.disabled = false; 
                    btn.innerText = "Execute & Proceed"; 
                } 
                return; 
            }
            payload.rating = rating;
        }

        if (stageNum === 3) { // Stock stage
            let processed = []; 
            let short = [];
            
            currentActiveOrder.items.forEach((item, idx) => {
                let chk = document.getElementById(`chk_item_${idx}`); 
                let qtyInput = document.getElementById(`qty_item_${idx}`);
                
                if (chk && qtyInput) {
                    let isChecked = chk.checked; 
                    let userQty = parseInt(qtyInput.value) || 0; 
                    let origQty = parseInt(item.qty);
                    
                    if (isChecked && userQty > 0) { 
                        processed.push({
                            name: item.name, 
                            qty: userQty
                        }); 
                        
                        if (userQty < origQty) {
                            short.push({
                                name: item.name, 
                                qty: origQty - userQty
                            }); 
                        }
                    } else {
                        short.push({
                            name: item.name, 
                            qty: origQty
                        }); 
                    }
                }
            });
            
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
        } else if (btn) { 
            btn.innerText = "Locking Process..."; 
            btn.disabled = true; 
        }
        
        if (statusLabel) { 
            statusLabel.innerText = "📡 Uplinking Data..."; 
            statusLabel.className = "text-[10px] font-black tracking-widest mt-3 text-indigo-400 block animate-pulse text-center uppercase"; 
            statusLabel.classList.remove('hidden'); 
        }

        try {
            const res = await fetch(API_URL, { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            });
            
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
                closeModal(); // Exits cleanly without interrupting UX workflow
            } else {
                throw new Error(data.message); 
            }
       } catch (err) {
    if (statusLabel) { 
        statusLabel.innerText = "❌ " + (err.message || "Sync Failed. Network Drop."); 
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
</script>
