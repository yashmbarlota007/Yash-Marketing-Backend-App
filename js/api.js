// js/api.js

// --- MASTER KEY BYPASS SYSTEM ---
// --- MASTER KEY BYPASS SYSTEM (NO HEADERS + AUTO RETRY) ---
async function gasRequest(payloadObj, options = {}) {
    const maxRetries = options.retries !== undefined ? options.retries : 2;
    const timeoutMs = options.timeoutMs || 35000;
    const onRetry = options.onRetry || null;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            if (attempt > 0 && typeof onRetry === 'function') {
                onRetry(attempt, maxRetries);
            }

            const res = await fetch(API_URL, {
                method: 'POST',
                // Keep no custom headers so browser sends as text/plain avoiding CORS preflight
                body: JSON.stringify(payloadObj),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const textResponse = await res.text();

            try {
                return JSON.parse(textResponse);
            } catch (parseErr) {
                console.error(`gasRequest (attempt ${attempt + 1}/${maxRetries + 1}) non-JSON response:`, textResponse);
                // If Google Apps Script sent an HTML warmup/busy page, retry if attempts remain
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
                    continue;
                }
                throw new Error("System Error: Google script failed to return valid JSON.");
            }
        } catch (networkErr) {
            clearTimeout(timeoutId);
            lastError = networkErr;

            const isAbort = networkErr.name === 'AbortError';
            console.warn(`gasRequest attempt ${attempt + 1}/${maxRetries + 1} failed:`, isAbort ? "Request timed out" : networkErr.message);

            if (attempt < maxRetries) {
                const delayMs = (attempt + 1) * 1500;
                await new Promise(r => setTimeout(r, delayMs));
                continue;
            }
        }
    }

    if (lastError && lastError.name === 'AbortError') {
        throw new Error("Request timed out. Server is busy, please tap to retry.");
    }
    throw new Error(lastError?.message || "Failed to fetch: Check internet or Google Apps Script URL.");
}

async function fetchOrders(isSilent = false) {
    const grid = document.getElementById('orderGrid');
    
    // BUG FIX: Added safety check in case grid element doesn't exist yet
    if (grid && !isSilent && window.appData.rawArray.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center" id="empty-state"><div class="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div><p class="text-indigo-400 font-bold tracking-widest uppercase text-sm">Syncing with Mainframe...</p></div>`;
    }
    
    try {
        const response = await gasRequest({ action: 'getOrders', staffName: currentUserName }, { retries: 1 });
        
        if (response.status === 'success') {
            if (response.settings) window.appSettings = response.settings;
            if (response.backendEarnings !== undefined && response.backendEarnings > 0) {
                let bBadge = document.getElementById('backendEarningsBadge');
                // BUG FIX: Ensure element exists before manipulating it
                if (bBadge) {
                    bBadge.innerText = `💰 Earned Today: ₹${response.backendEarnings}`;
                    bBadge.classList.remove('hidden');
                }
            }

            window.appData.rawArray = response.data || [];
            window.appData.orders = {}; 
            window.appData.rawArray.forEach(o => { window.appData.orders[o.orderId] = o; });
            
            try { 
                applyDateFilter(); 
            } catch(uiError) { 
                throw new Error("UI Error: " + uiError.message); 
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
    // 1. Double-submit prevention lock
    if (window.isSubmittingStage) {
        console.warn("Stage submission already in progress. Ignoring duplicate click.");
        return;
    }

    const btn = document.getElementById(`submitBtn_${stageNum}`); 
    const statusLabel = document.getElementById(`status_${stageNum}`);
    
    // Safety check for active order
    if (!currentActiveOrder) {
        alert("System Error: No active order found to process.");
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
    
    // Stage 6 Validation
    if (stageNum === 6) { 
        let runnerVal = document.getElementById('runnerSelect')?.value;
        let transportVal = document.getElementById('transportSelect')?.value;
        
        let runner = runnerVal === "Others" ? document.getElementById('runnerOther')?.value : runnerVal;
        let transport = transportVal === "Others" ? document.getElementById('transportOther')?.value : transportVal;
        
        if (!runner || !transport) { 
            alert("Accountability requires data! Please select both runner and transport."); 
            return; 
        }
        payload.actionText = `Runner: ${runner} | Transport: ${transport}`;
    }
    
    // Stage 9 Validation
    if (stageNum === 9) { 
        const rating = document.getElementById('ratingInput')?.value;
        if (!rating) { 
            alert("Customer Rating is mandatory."); 
            return; 
        }
        payload.rating = rating;
    }

    // Stage 3 Validation
    if (stageNum === 3) { 
        let processed = [], short = [];
        if (currentActiveOrder.items && currentActiveOrder.items.length > 0) {
            currentActiveOrder.items.forEach((item, idx) => {
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
        }
        
        if (processed.length === 0) { 
            alert("You must dispatch at least one item."); 
            return; 
        }
        if (short.length > 0) payload.partialStock = { processedItems: processed, shortItems: short }; 
    }

    // File Proof Validation
    let fileRequired = !(payload.isNoResponse || stageNum === 9 || stageNum === 6 || stageNum === 2 || (stageNum === 7 && !isCod));
    if (fileRequired && queuedFiles.length === 0) { 
        alert(stageNum === 7 && isCod ? "For COD Orders, Call Recording is MANDATORY." : "A file proof (Screenshot/Photo) is mandatory."); 
        return; 
    }
    if (!fileRequired && queuedFiles.length === 0 && (stageNum === 2 || stageNum === 7)) payload.isWhatsAppOnly = true; 

    // --- LOCK SUBMISSION & SHOW SPINNER ---
    window.isSubmittingStage = true;
    if (btn) { 
        btn.innerHTML = `<svg class="animate-spin inline-block w-5 h-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> PROCESSING...`;
        btn.disabled = true; 
        btn.classList.add('opacity-70', 'cursor-not-allowed');
    }
    if (statusLabel) { 
        statusLabel.innerText = "⏳ Preparing Payload..."; 
        statusLabel.className = "text-[10px] font-black tracking-widest mt-3 text-indigo-400 block animate-pulse text-center uppercase"; 
        statusLabel.classList.remove('hidden'); 
    }

    try {
        // Step A: Process files with compression & safe fallback
        if (queuedFiles.length > 0) {
            for (let i = 0; i < queuedFiles.length; i++) {
                let f = queuedFiles[i];
                if (statusLabel) {
                    statusLabel.innerText = `📸 Compressing Photo (${i + 1}/${queuedFiles.length})...`;
                }
                try {
                    if (f.type.startsWith('image/') && typeof compressImage === 'function') {
                        payload.files.push(await compressImage(f)); 
                    } else if (typeof getBase64 === 'function') {
                        payload.files.push(await getBase64(f)); 
                    }
                } catch (imgErr) {
                    console.warn("Image compression failed, falling back to raw base64:", imgErr);
                    if (typeof getBase64 === 'function') {
                        payload.files.push(await getBase64(f));
                    }
                }
            }
        }

        // Step B: Transmit to Google Apps Script
        if (statusLabel) { 
            statusLabel.innerText = "📡 Uplinking Data to Server..."; 
            statusLabel.className = "text-[10px] font-black tracking-widest mt-3 text-indigo-400 block animate-pulse text-center uppercase"; 
        }
        if (btn) {
            btn.innerHTML = `<svg class="animate-spin inline-block w-5 h-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> TRANSMITTING...`;
        }

        const data = await gasRequest(payload, {
            retries: 2,
            timeoutMs: 35000,
            onRetry: (attempt, maxRetries) => {
                if (statusLabel) {
                    statusLabel.innerText = `🔄 Server warming up... Auto-retrying (${attempt}/${maxRetries})`;
                    statusLabel.className = "text-[10px] font-black tracking-widest mt-3 text-yellow-400 block animate-pulse text-center uppercase";
                }
                if (btn) {
                    btn.innerHTML = `<svg class="animate-spin inline-block w-5 h-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> RETRYING (${attempt}/${maxRetries})...`;
                }
            }
        });

        // Step C: On Successful Backend Execution
        if (data && data.status === 'success') { 
            if (btn) { 
                btn.innerHTML = "✓ SUBMITTED SUCCESSFULLY"; 
                btn.classList.remove('opacity-70', 'cursor-not-allowed', 'bg-indigo-600', 'bg-pink-600', 'hover:bg-indigo-500', 'hover:bg-pink-500'); 
                btn.classList.add('bg-emerald-600');
            } 
            if (statusLabel) {
                statusLabel.innerText = "✓ Confirmed by Server";
                statusLabel.className = "text-[10px] font-black tracking-widest mt-3 text-emerald-400 block text-center uppercase";
            }

            queuedFiles = []; 

            if (data.splitOrderId) { 
                alert(`✂️ SPLIT ORDER CREATED!\nNew ID: ${data.splitOrderId}`); 
                showNotification("SPLIT ORDER CREATED", `New ID: ${data.splitOrderId}`); 
            }

            // 1. Optimistic Local State Update
            const targetOrderId = currentActiveOrder.orderId;
            const newCompletedStage = Math.max(Number(currentActiveOrder.completedStages) || 0, stageNum);
            currentActiveOrder.completedStages = newCompletedStage;

            if (!Array.isArray(currentActiveOrder.stageUrls)) {
                currentActiveOrder.stageUrls = [];
            }

            let savedUrlText = "";
            if (data.fileUrls && data.fileUrls.length > 0) {
                let fileUrlsStr = data.fileUrls.join(',');
                savedUrlText = payload.actionText ? `[${payload.actionText}] || ${fileUrlsStr}` : fileUrlsStr;
                if (stageNum === 7) {
                    currentActiveOrder.recentFileUrls = data.fileUrls;
                }
            } else if (payload.actionText) {
                savedUrlText = `[${payload.actionText}]`;
            } else if (payload.isWhatsAppOnly) {
                savedUrlText = "[WhatsApp Sent]";
            } else if (payload.isNoResponse) {
                savedUrlText = "[No Response]";
            }

            if (savedUrlText) {
                currentActiveOrder.stageUrls[stageNum - 1] = savedUrlText;
            }

            // Sync with global window.appData.orders
            if (window.appData && window.appData.orders && window.appData.orders[targetOrderId]) {
                Object.assign(window.appData.orders[targetOrderId], currentActiveOrder);
            }

            // Refresh grid cards in background
            if (typeof applyDateFilter === 'function') {
                try { applyDateFilter(); } catch(e) { console.error(e); }
            }

            // 2. Advance Modal UI smoothly (after brief 400ms confirmation feedback)
            setTimeout(() => {
                if (typeof openModal === 'function') {
                    if (stageNum === 7 && currentActiveOrder.recentFileUrls) {
                        openModal(targetOrderId, { triggerWhatsApp: true });
                    } else if (stageNum >= 9) {
                        showNotification("ORDER COMPLETED", `Order ${targetOrderId} is successfully completed!`);
                        if (typeof closeModal === 'function') closeModal();
                    } else {
                        openModal(targetOrderId); 
                    }
                }
            }, 400);

            // 3. Silent background refresh to guarantee complete data parity with sheet
            fetchOrders(true).catch(e => console.warn("Background fetchOrders notice:", e));
            
        } else { 
            throw new Error(data?.message || "Server rejected stage update."); 
        }
    } catch (err) {
        console.error("submitStage error:", err);
        if (statusLabel) { 
            statusLabel.innerText = "❌ " + (err.message || "Network Drop. Please tap Retry."); 
            statusLabel.className = "text-[10px] font-black mt-3 text-pink-500 block text-center uppercase"; 
        }
        if (btn) { 
            btn.innerText = "Retry Transmission"; 
            btn.classList.remove('bg-indigo-600', 'bg-emerald-600', 'hover:bg-indigo-500'); 
            btn.classList.add('bg-pink-600', 'hover:bg-pink-500'); 
            btn.disabled = false; 
            btn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
    } finally {
        window.isSubmittingStage = false;
    }
}

async function saveHandover() {
    // BUG FIX: Ensure input exists to avoid crash
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
    if (!historyDiv) return; // Prevent crash if missing

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
