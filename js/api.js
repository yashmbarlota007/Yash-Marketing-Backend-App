// js/api.js

// --- MASTER KEY BYPASS SYSTEM ---
// --- MASTER KEY BYPASS SYSTEM (NO HEADERS) ---
async function gasRequest(payloadObj) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            // Yahan se humne 'headers' puri tarah hata diye hain. 
            // Isse browser isey 'text/plain' manega aur CORS block nahi karega.
            body: JSON.stringify(payloadObj)
        });
        
        const textResponse = await res.text();
        
        try {
            return JSON.parse(textResponse);
        } catch (parseErr) {
            console.error("Backend sent HTML instead of JSON:", textResponse);
            throw new Error("System Error: Google script failed to return JSON.");
        }
    } catch (networkErr) {
        throw new Error("Failed to fetch: Check internet or Google Apps Script URL.");
    }
}

async function fetchOrders(isSilent = false) {
    const grid = document.getElementById('orderGrid');
    
    // Safety check in case grid element doesn't exist yet
    if (grid && !isSilent && window.appData.rawArray.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center" id="empty-state"><div class="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div><p class="text-indigo-400 font-bold tracking-widest uppercase text-sm">Syncing with Mainframe...</p></div>`;
    }
    
    try {
        const response = await gasRequest({ action: 'getOrders', staffName: currentUserName });
        
        if (response.status === 'success') {
            if (response.settings) window.appSettings = response.settings;
            if (response.backendEarnings !== undefined && response.backendEarnings > 0) {
                let bBadge = document.getElementById('backendEarningsBadge');
                if (bBadge) {
                    bBadge.innerText = `💰 Earned Today: ₹${response.backendEarnings}`;
                    bBadge.classList.remove('hidden');
                }
            }

            let incoming = response.data || [];
            
            // CRITICAL SAFEGUARD: Do not let a stale read replica revert a stage
            // that was already submitted and marked completed in this active session
            incoming.forEach(o => {
                let existing = window.appData.orders[o.orderId];
                if (existing) {
                    if ((existing.completedStages || 0) > (o.completedStages || 0)) {
                        o.completedStages = existing.completedStages;
                    }
                    if (existing.stageUrls && Array.isArray(existing.stageUrls)) {
                        if (!o.stageUrls) o.stageUrls = Array(9).fill("");
                        for (let s = 0; s < 9; s++) {
                            if (existing.stageUrls[s] && !o.stageUrls[s]) {
                                o.stageUrls[s] = existing.stageUrls[s];
                            }
                        }
                    }
                }
                window.appData.orders[o.orderId] = o;
                if (currentActiveOrder && currentActiveOrder.orderId === o.orderId) {
                    currentActiveOrder = o;
                }
            });

            window.appData.rawArray = incoming;
            
            try { 
                applyDateFilter(); 
            } catch(uiError) { 
                console.warn("UI Filter Notice:", uiError.message); 
            }
        } else {
            throw new Error(response.message || "Sync Failed.");
        }
    } catch (err) { 
        console.error(err); 
        if (!isSilent && grid) {
            grid.innerHTML = `<div class="col-span-full py-10 bg-red-900/10 border border-red-500/30 rounded-2xl text-center mx-2 mt-8 shadow-lg"><div class="text-3xl mb-3 animate-bounce">⚠️</div><p class="text-red-400 font-black tracking-widest uppercase text-sm mb-2">System Sync Failed</p><p class="text-white text-xs mb-6 font-mono px-4 text-wrap-custom">${err.message}</p><button onclick="fetchOrders(false)" class="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all">Retry Connection</button></div>`;
        }
    }
}

async function executeUnblock(orderId) {
    if (!confirm("Warning: You are bypassing the system Credit Lock for this dealer. Proceed?")) return;
    try {
        let data = await gasRequest({ action: 'unblockOrder', orderId: orderId });
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

async function submitStage(stageNum) {
    const btn = document.getElementById(`submitBtn_${stageNum}`); 
    const statusLabel = document.getElementById(`status_${stageNum}`);
    
    // Safety check for currentActiveOrder
    if (!currentActiveOrder) {
        alert("System Error: No active order found to process.");
        return;
    }

    // Safety lock: prevent duplicate click while submission is transmitting
    if (btn && btn.disabled) {
        console.warn("Stage submission already in progress.");
        return;
    }

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
    if (noRespCheckbox && noRespCheckbox.checked) payload.isNoResponse = true; 
    
    if (stageNum === 6) { 
        let runnerVal = document.getElementById('runnerSelect')?.value;
        let transportVal = document.getElementById('transportSelect')?.value;
        
        let runner = runnerVal === "Others" ? document.getElementById('runnerOther')?.value : runnerVal;
        let transport = transportVal === "Others" ? document.getElementById('transportOther')?.value : transportVal;
        
        if (!runner || !transport) { 
            alert("Accountability requires data!"); 
            if (btn) { btn.disabled = false; btn.innerText = "Allocate Logistics & Proceed"; } 
            return; 
        }
        payload.actionText = `Runner: ${runner} | Transport: ${transport}`;
    }
    
    let fileRequired = !(payload.isNoResponse || stageNum === 9 || stageNum === 6 || stageNum === 2 || (stageNum === 7 && !isCod));
    if (fileRequired && queuedFiles.length === 0) { 
        alert(stageNum === 7 && isCod ? "For COD Orders, Call Recording is MANDATORY." : "A file proof (Screenshot/Photo) is mandatory."); 
        return; 
    }
    if (!fileRequired && queuedFiles.length === 0 && (stageNum === 2 || stageNum === 7)) payload.isWhatsAppOnly = true; 

    // Wrap entire execution in try/catch to ensure button state is always safely restored
    try {
        if (btn) { 
            btn.innerHTML = `<svg class="animate-spin inline-block w-5 h-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> UPLOADING & SUBMITTING...`;
            btn.disabled = true; 
            btn.classList.add('opacity-70', 'cursor-not-allowed');
        }

        if (statusLabel) { 
            statusLabel.innerText = "⏳ Processing Proof Photos..."; 
            statusLabel.className = "text-[10px] font-black tracking-widest mt-3 text-indigo-400 block animate-pulse text-center uppercase"; 
            statusLabel.classList.remove('hidden'); 
        }

        // Convert files in parallel with safety fallback
        if (queuedFiles.length > 0) {
            const convertFile = async (f) => {
                if (f.type.startsWith('image/')) {
                    if (typeof compressImage === 'function') {
                        return await compressImage(f);
                    }
                }
                return typeof getBase64 === 'function' ? await getBase64(f) : { name: f.name, mimeType: f.type || 'image/jpeg', base64: '' };
            };
            payload.files = await Promise.all(queuedFiles.map(convertFile));
        }

        if (stageNum === 9) { 
            const rating = document.getElementById('ratingInput')?.value;
            if (!rating) { 
                alert("Customer Rating is mandatory."); 
                if (btn) { btn.disabled = false; btn.innerText = "Execute & Proceed"; btn.classList.remove('opacity-70', 'cursor-not-allowed'); } 
                return; 
            }
            payload.rating = rating;
        }

        if (stageNum === 3) { 
            let processed = [], short = [];
            let stockItems = (currentActiveOrder.items || []).filter(item => {
                let n = (item.name || "").trim();
                return !n.match(/(?:DEALER NOTE|DEALER COMMENT|REMARK|NOTE|Discount|APPLIED:|Rewards Unlocked|FREE ITEM)/i);
            });
            if (stockItems.length === 0) stockItems = currentActiveOrder.items || [];
            
            stockItems.forEach((item, idx) => {
                let chk = document.getElementById(`chk_item_${idx}`);
                let qtyInput = document.getElementById(`qty_item_${idx}`);
                if (chk && qtyInput) {
                    let userQty = parseInt(qtyInput.value) || 0;
                    let origQty = parseInt(item.qty) || 0;
                    
                    if (chk.checked && userQty > 0) { 
                        processed.push({ name: item.name, qty: userQty }); 
                        if (userQty < origQty) short.push({ name: item.name, qty: origQty - userQty }); 
                    } else { 
                        short.push({ name: item.name, qty: origQty }); 
                    }
                }
            });
            
            if (processed.length === 0) { 
                alert("You must dispatch at least one item."); 
                if (btn) { btn.disabled = false; btn.innerText = "Execute & Proceed"; btn.classList.remove('opacity-70', 'cursor-not-allowed'); } 
                return; 
            }
            if (short.length > 0) payload.partialStock = { processedItems: processed, shortItems: short }; 
        }

        if (statusLabel) { 
            statusLabel.innerText = "⏳ Transmitting Proof & Updating Server..."; 
        }

        const data = await gasRequest(payload);
        if (data.status === 'success') { 
            if (btn) { 
                btn.innerHTML = "✓ SUCCESS"; 
                btn.classList.remove('opacity-70', 'cursor-not-allowed'); 
                btn.classList.replace('bg-indigo-600', 'bg-emerald-600');
            } 
            
            // ====================================================
            // 1. OPTIMISTIC STATE UPDATE (INSTANT ADVANCEMENT!)
            // ====================================================
            let proofUrls = (data.fileUrls && data.fileUrls.length > 0)
                ? data.fileUrls.join(', ')
                : (payload.actionText || (payload.isWhatsAppOnly ? "[WhatsApp Communication Sent]" : "Completed"));
            let stageEntry = `${proofUrls} || TIME: ${Date.now()} || STAFF: ${currentUserName || 'Staff'}`;
            
            if (!currentActiveOrder.stageUrls) {
                currentActiveOrder.stageUrls = Array(9).fill("");
            }
            currentActiveOrder.stageUrls[stageNum - 1] = stageEntry;
            currentActiveOrder.completedStages = Math.max(currentActiveOrder.completedStages || 0, stageNum);
            
            if (stageNum === 7 && data.fileUrls && data.fileUrls.length > 0) {
                currentActiveOrder.recentFileUrls = data.fileUrls;
            }

            // Sync with global store memory immediately
            window.appData.orders[currentActiveOrder.orderId] = currentActiveOrder;
            if (Array.isArray(window.appData.rawArray)) {
                let rIdx = window.appData.rawArray.findIndex(o => o.orderId === currentActiveOrder.orderId);
                if (rIdx !== -1) {
                    window.appData.rawArray[rIdx].completedStages = currentActiveOrder.completedStages;
                    window.appData.rawArray[rIdx].stageUrls = currentActiveOrder.stageUrls;
                }
            }
            
            // Clear queued files
            queuedFiles = []; 
            
            if (data.splitOrderId) { 
                alert(`⚠️ SPLIT ORDER CREATED!\nNew ID: ${data.splitOrderId}`); 
                showNotification("SPLIT ORDER CREATED", `New ID: ${data.splitOrderId}`); 
            }
            
            showNotification("STAGE ADVANCED", `Stage ${stageNum} (${STAGE_NAMES[stageNum - 1] || 'Completed'}) completed!`);

            // ====================================================
            // 2. INSTANT MODAL RE-RENDER (Zero lag on 1st click!)
            // ====================================================
            if (typeof openModal === 'function') {
                if (stageNum === 7 && currentActiveOrder.recentFileUrls) {
                    openModal(currentActiveOrder.orderId, { triggerWhatsApp: true });
                } else {
                    openModal(currentActiveOrder.orderId); 
                }
            }
            
            // ====================================================
            // 3. BACKGROUND MAINFRAME SYNC (Non-blocking)
            // ====================================================
            fetchOrders(true).catch(bgErr => console.warn("Background order sync notice:", bgErr));
            
        } else { 
            throw new Error(data.message); 
        }
    } catch (err) {
        console.error("Submission failed:", err);
        if (statusLabel) { 
            statusLabel.innerText = "❌ " + (err.message || "Network Drop."); 
            statusLabel.className = "text-[10px] font-black mt-3 text-pink-500 block text-center uppercase"; 
        }
        if (btn) { 
            btn.innerText = "Retry Transmission"; 
            btn.classList.replace('bg-indigo-600', 'bg-pink-600'); 
            btn.classList.replace('hover:bg-indigo-500', 'hover:bg-pink-500'); 
            btn.disabled = false; 
            btn.classList.remove('opacity-70', 'cursor-not-allowed'); 
        }
    }
}
async function saveHandover() {
    let inputElem = document.getElementById('handoverNoteInput');
    if (!inputElem) return alert("System Error: Handover input box not found.");
    
    let note = inputElem.value.trim();
    if (!note) return alert("Please write a note before submitting.");
    
    let btn = document.getElementById('btnSaveHandover'); 
    if (btn) { btn.innerText = "Saving..."; btn.disabled = true; }
    
    try {
        let data = await gasRequest({ action: 'saveHandover', staffName: currentUserName, note: note });
        if (data.status === 'success') { 
            inputElem.value = ''; 
            if (typeof fetchHandoverNotes === 'function') fetchHandoverNotes(); 
        } 
        else alert("Failed to save note.");
    } catch(e) { 
        alert("Network error."); 
    }
    
    if (btn) { btn.innerText = "Submit Handover Note"; btn.disabled = false; }
}

async function fetchHandoverNotes() {
    let historyDiv = document.getElementById('handoverHistory');
    if (!historyDiv) return;

    historyDiv.innerHTML = `<div class="text-center text-slate-500 text-xs py-4">Loading notes...</div>`;
    try {
        let data = await gasRequest({ action: 'getHandover' });
        if(data.status === 'success' && data.data.length > 0) {
            historyDiv.innerHTML = data.data.map(n => `<div class="bg-[#0B1121] p-3 rounded-lg border border-slate-800"><div class="flex justify-between items-center mb-2"><span class="text-xs font-black text-indigo-400">${n.staff}</span><span class="text-[9px] text-slate-500 font-mono">${new Date(n.time).toLocaleString('en-GB')}</span></div><p class="text-sm text-slate-300 leading-relaxed">${n.note}</p></div>`).join('');
        } else { 
            historyDiv.innerHTML = `<div class="text-center text-slate-500 text-xs py-4">No recent shift notes found.</div>`; 
        }
    } catch(e) { 
        historyDiv.innerHTML = `<div class="text-center text-pink-500 text-xs py-4">Error loading notes.</div>`; 
    }
}

// ==========================================
// NEW: AI INVOICE VERIFICATION API CALL
// ==========================================
async function verifyInvoiceWithAI(orderId, base64Image) {
    try {
        const payload = {
            action: 'verifyInvoice',
            orderId: orderId,
            base64Image: base64Image
        };

        const response = await gasRequest(payload);
        return response;
    } catch (err) {
        console.error("AI Verification Failed:", err);
        throw new Error("Failed to connect to AI server. Please try again.");
    }
}