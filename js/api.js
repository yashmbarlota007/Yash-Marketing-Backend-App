// js/api.js

async function fetchOrders(isSilent = false) {
    const grid = document.getElementById('orderGrid');
    
    // 1. Loading State Show Karega
    if (!isSilent && window.appData.rawArray.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 text-center" id="empty-state">
                <div class="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                <p class="text-indigo-400 font-bold tracking-widest uppercase text-sm">
                    Syncing with Mainframe...
                </p>
            </div>
        `;
    }
    
    try {
        // 2. Backend Call
      const res = await fetch(API_URL, { 
    method: 'POST', 
    redirect: 'follow', // <-- YEH LINE ADD KAREIN (Force redirect follow)
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'getOrders', staffName: currentUserName }) 
});
        
        // 3. Pehle Text ke form me check karenge taaki HTML error page na crash kare
        const textResponse = await res.text(); 
        let response;
        
        try {
            response = JSON.parse(textResponse);
        } catch (parseErr) {
            throw new Error("Backend Error: Google Apps Script ne JSON ke badle invalid data bheja hai. URL ya Permissions check karein.");
        }
        
        // 4. Data Success aane par processing
        if (response.status === 'success') {
            if(response.settings) {
                window.appSettings = response.settings;
            }
            
            if(response.backendEarnings !== undefined && response.backendEarnings > 0) {
                let bBadge = document.getElementById('backendEarningsBadge');
                bBadge.innerText = `💰 Earned Today: ₹${response.backendEarnings}`;
                bBadge.classList.remove('hidden');
            }

            // Data mapping with fail-safes
            window.appData.rawArray = response.data || [];
            window.appData.orders = {}; 
            
            window.appData.rawArray.forEach(o => { 
                window.appData.orders[o.orderId] = o; 
            });
            
            // 5. UI Render functions ko Try/Catch me rakha hai taaki File Splitting errors catch ho jaye
            try {
                applyDateFilter(); 
            } catch(uiError) {
                throw new Error("UI Render Error: " + uiError.message);
            }

        } else {
            throw new Error(response.message || "Backend API se sync fail ho gaya.");
        }
        
    } catch (err) { 
        console.error("Background sync error: ", err); 
        
        // 6. SCREEN PAR EXACT ERROR DISPLAY KAREGA INSTEAD OF ENDLESS LOADER
        if (!isSilent) {
            grid.innerHTML = `
                <div class="col-span-full py-10 bg-red-900/10 border border-red-500/30 rounded-2xl text-center mx-2 mt-8 shadow-lg">
                    <div class="text-3xl mb-3 animate-bounce">⚠️</div>
                    <p class="text-red-400 font-black tracking-widest uppercase text-sm mb-2">
                        System Sync Failed
                    </p>
                    <p class="text-white text-xs mb-6 font-mono px-4 text-wrap-custom">
                        ${err.message}
                    </p>
                    <button onclick="fetchOrders(false)" class="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                        Retry Connection
                    </button>
                </div>
            `;
        }
    }
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
