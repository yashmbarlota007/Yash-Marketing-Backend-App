﻿﻿﻿// js/utils.js

function updateTatTimers() {
    document.querySelectorAll('.tat-timer').forEach(el => {
        let target = parseInt(el.getAttribute('data-target'));
        
        // BUG FIX: Agar target missing ya invalid hai, toh calculation bypass karein
        if (isNaN(target)) return;
        
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

function showNotification(title, message) {
    const area = document.getElementById('notificationArea');
    // Safety check in case notification area doesn't exist
    if (!area) return; 
    
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

function parseCustomDate(dateStr) {
    if (!dateStr) {
        let now = new Date();
        now._hasTime = false;
        return now;
    }
    
    // If already a Date object
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? new Date() : dateStr;
    }
    
    // If timestamp number
    if (typeof dateStr === 'number' && !isNaN(dateStr)) {
        let d = new Date(dateStr);
        d._hasTime = true;
        return d;
    }

    let str = String(dateStr).trim();

    // Timestamp as numeric string (e.g., "1697463320000")
    if (/^\d{11,14}$/.test(str)) {
        let d = new Date(parseInt(str, 10));
        if (!isNaN(d.getTime())) {
            d._hasTime = true;
            return d;
        }
    }

    // ISO string handling (e.g., "2026-10-16T14:35:22.000Z", "2026-10-16T14:35:22")
    if (str.includes('T')) {
        let d = new Date(str);
        if (!isNaN(d.getTime())) {
            // Check if it was midnight (date-only) vs has explicit time
            d._hasTime = !(d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0);
            return d;
        }
    }

    let parts = str.split(/\s+/);
    let datePart = parts[0];
    let timePart = parts[1];
    let ampmPart = parts[2];

    let ampm = "";
    if (ampmPart && /^(AM|PM)$/i.test(ampmPart)) {
        ampm = ampmPart.toUpperCase();
    } else if (timePart && /(AM|PM)$/i.test(timePart)) {
        let m = timePart.match(/(AM|PM)$/i);
        ampm = m[1].toUpperCase();
        timePart = timePart.replace(/(AM|PM)$/i, '');
    }

    let dParts = datePart.split(/[\/\-.]/);
    if (dParts.length === 3) {
        let p0 = parseInt(dParts[0], 10);
        let p1 = parseInt(dParts[1], 10);
        let p2 = parseInt(dParts[2], 10);
        let year, month, day;

        // If first part is 4 digits (e.g. YYYY-MM-DD or YYYY/MM/DD)
        if (p0 > 31) {
            year = p0;
            month = p1 - 1;
            day = p2;
        } else {
            // Standard format in India: DD/MM/YYYY
            year = p2;
            if (p0 > 12) {
                day = p0;
                month = p1 - 1;
            } else if (p1 > 12) {
                day = p1;
                month = p0 - 1;
            } else {
                day = p0;
                month = p1 - 1;
            }
        }

        if (year < 100) {
            year += 2000;
        }

        let hasTime = false;
        let hours = 0, mins = 0, secs = 0;
        if (timePart) {
            let tParts = timePart.split(':');
            if (tParts.length >= 2) {
                hasTime = true;
                hours = parseInt(tParts[0], 10) || 0;
                mins = parseInt(tParts[1], 10) || 0;
                secs = parseInt(tParts[2], 10) || 0;

                if (ampm === 'PM' && hours < 12) {
                    hours += 12;
                } else if (ampm === 'AM' && hours === 12) {
                    hours = 0;
                }
            }
        }

        let d = new Date(year, month, day, hours, mins, secs);
        d._hasTime = hasTime;
        return d;
    }

    let fallback = new Date(str);
    if (!isNaN(fallback.getTime())) {
        fallback._hasTime = true;
        return fallback;
    }

    let defDate = new Date();
    defDate._hasTime = false;
    return defDate;
}

function formatExactDate(dateString) {
    if (!dateString) {
        return "";
    }
    const d = parseCustomDate(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    // If no time was present in original date (date-only)
    if (d._hasTime === false) {
        return `Received: ${day}/${month}/${year}`;
    }
    
    let hours = d.getHours(); 
    const ampm = hours >= 12 ? 'PM' : 'AM'; 
    
    hours = hours % 12; 
    hours = hours ? hours : 12; 
    
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `Received: ${day}/${month}/${year} ${hours}:${mins} ${ampm}`;
}

function resolveProductDetails(item) {
    if (!item) return { name: "Product", qty: 1, unitPrice: 0, totalValue: 0 };

    let rawName = String(item.name || item.productName || '').trim();
    let qty = parseInt(item.qty || item.quantity || 1, 10);
    if (isNaN(qty) || qty <= 0) qty = 1;

    let unitPrice = parseFloat(item.unitPrice || item.DealerPrice || item.dealerPrice || item.rate || item.price || 0);
    if (isNaN(unitPrice)) unitPrice = 0;

    let totalValue = parseFloat(item.totalValue !== undefined && item.totalValue !== null && item.totalValue !== "" ? item.totalValue : 0);
    if (isNaN(totalValue)) totalValue = 0;

    // Check for product codes like YM1192, Product YM1192, YM-0980, etc.
    let codeMatch = rawName.match(/\b(YM[-_ ]?\d{3,5})\b/i);
    let cleanCode = codeMatch ? codeMatch[1].replace(/[-_ ]/g, '').toUpperCase() : '';

    let catalogMap = window.PRODUCT_CATALOG || {};
    let matched = null;

    if (cleanCode && catalogMap[cleanCode]) {
        matched = catalogMap[cleanCode];
    } else if (catalogMap[rawName.toUpperCase()]) {
        matched = catalogMap[rawName.toUpperCase()];
    }

    let finalName = rawName;
    if (matched) {
        // If generic code name like "Product YM1192", replace with actual catalog name
        if (rawName.startsWith("Product ") || rawName.match(/^YM\d+/i) || !rawName) {
            finalName = matched[0] || rawName;
        }
        // If unitPrice was 0, resolve from catalog
        if (unitPrice === 0 && matched[1] > 0) {
            unitPrice = matched[1];
        }
    }

    if (totalValue === 0 && unitPrice > 0) {
        totalValue = unitPrice * qty;
    }

    return {
        name: finalName || "Product",
        qty: qty,
        unitPrice: unitPrice,
        totalValue: totalValue
    };
}


function getOrderRelativeDateBadge(dateString) {
    if (!dateString) {
        return {
            label: "Today",
            subText: "Today",
            badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
            dotColor: "bg-emerald-400",
            isToday: true,
            isYesterday: false,
            diffDays: 0
        };
    }

    const orderDate = parseCustomDate(dateString);
    if (!orderDate || isNaN(orderDate.getTime())) {
        return {
            label: "Today",
            subText: "Today",
            badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50",
            dotColor: "bg-emerald-400",
            isToday: true,
            isYesterday: false,
            diffDays: 0
        };
    }

    const now = new Date();
    let today = new Date(now); today.setHours(0,0,0,0);
    let orderDay = new Date(orderDate); orderDay.setHours(0,0,0,0);

    let diffDays = Math.round((today.getTime() - orderDay.getTime()) / (1000 * 60 * 60 * 24));

    let timeStr = "";
    if (orderDate._hasTime !== false) {
        let hours = orderDate.getHours();
        let ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        let mins = String(orderDate.getMinutes()).padStart(2, '0');
        timeStr = `${hours}:${mins} ${ampm}`;
    }

    let day = String(orderDate.getDate()).padStart(2, '0');
    let month = String(orderDate.getMonth() + 1).padStart(2, '0');
    let year = orderDate.getFullYear();
    let exactCalDate = `${day}/${month}/${year}`;

    if (diffDays <= 0) {
        let subText = timeStr ? `Today (${exactCalDate}) • ${timeStr}` : `Today (${exactCalDate})`;
        return {
            label: "Today",
            subText: subText,
            badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
            dotColor: "bg-emerald-400",
            isToday: true,
            isYesterday: false,
            diffDays: 0
        };
    } else if (diffDays === 1) {
        let subText = timeStr ? `Yesterday (${exactCalDate}) • ${timeStr}` : `Yesterday (${exactCalDate})`;
        return {
            label: "Yesterday",
            subText: subText,
            badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
            dotColor: "bg-amber-400",
            isToday: false,
            isYesterday: true,
            diffDays: 1
        };
    } else if (diffDays === 2) {
        let subText = timeStr ? `2d ago (${exactCalDate}) • ${timeStr}` : `2 days ago (${exactCalDate})`;
        return {
            label: "2d ago",
            subText: subText,
            badgeClass: "bg-orange-950/80 text-orange-300 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.25)]",
            dotColor: "bg-orange-400",
            isToday: false,
            isYesterday: false,
            diffDays: 2
        };
    } else {
        let subText = timeStr ? `${diffDays}d ago (${exactCalDate}) • ${timeStr}` : `${diffDays} days ago (${exactCalDate})`;
        return {
            label: `${diffDays}d ago`,
            subText: subText,
            badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
            dotColor: "bg-slate-400",
            isToday: false,
            isYesterday: false,
            diffDays: diffDays
        };
    }
}

function getTimeAgoUI(dateString) {
    if (!dateString) {
        return { text: "", color: "text-slate-400", isSLAWarning: false };
    }
    
    const orderDate = parseCustomDate(dateString);
    const now = new Date();
    
    // If date has no time component (date-only)
    if (orderDate._hasTime === false) {
        let today = new Date(now); today.setHours(0,0,0,0);
        let orderDay = new Date(orderDate); orderDay.setHours(0,0,0,0);
        let diffDays = Math.round((today.getTime() - orderDay.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) {
            return { text: "Today", color: "text-emerald-400", isSLAWarning: false };
        } else if (diffDays === 1) {
            return { text: "Yesterday", color: "text-emerald-400", isSLAWarning: false };
        } else if (diffDays === 2) {
            return { text: "2d ago", color: "text-yellow-400", isSLAWarning: true };
        } else {
            return { text: `${diffDays}d ago`, color: "text-pink-500", isSLAWarning: true };
        }
    }
    
    const diffInMs = now.getTime() - orderDate.getTime();
    
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
    // BUG FIX: Prevent crash if url is undefined, null, or empty
    if (!url) return ""; 
    
    let match = url.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

function compressImage(file) {
    return new Promise((resolve) => {
        // Safety timeout: If canvas/image processing takes longer than 2.5 seconds,
        // instantly fallback to direct FileReader getBase64! Never hang!
        let hasResolved = false;
        const timer = setTimeout(() => {
            if (!hasResolved) {
                hasResolved = true;
                console.warn("compressImage timed out, falling back to direct getBase64 for:", file.name);
                getBase64(file).then(resolve).catch(() => {
                    resolve({ name: file.name, mimeType: file.type || 'image/jpeg', base64: '' });
                });
            }
        }, 2500);

        try {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                if (hasResolved) return;
                clearTimeout(timer);
                hasResolved = true;
                try {
                    URL.revokeObjectURL(objectUrl);
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    let width = img.width || 800;
                    let height = img.height || 600;
                    let scale = width > MAX_WIDTH ? (MAX_WIDTH / width) : 1;

                    canvas.width = Math.round(width * scale);
                    canvas.height = Math.round(height * scale);

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.70);
                    const base64 = dataUrl.split(',')[1] || '';

                    resolve({
                        name: file.name,
                        mimeType: 'image/jpeg',
                        base64: base64
                    });
                } catch(canvasErr) {
                    console.warn("Canvas compression failed, falling back to getBase64:", canvasErr);
                    getBase64(file).then(resolve).catch(() => {
                        resolve({ name: file.name, mimeType: file.type || 'image/jpeg', base64: '' });
                    });
                }
            };

            img.onerror = () => {
                if (hasResolved) return;
                clearTimeout(timer);
                hasResolved = true;
                try { URL.revokeObjectURL(objectUrl); } catch(e){}
                getBase64(file).then(resolve).catch(() => {
                    resolve({ name: file.name, mimeType: file.type || 'image/jpeg', base64: '' });
                });
            };

            img.src = objectUrl;
        } catch(err) {
            if (!hasResolved) {
                clearTimeout(timer);
                hasResolved = true;
                getBase64(file).then(resolve).catch(() => {
                    resolve({ name: file.name, mimeType: file.type || 'image/jpeg', base64: '' });
                });
            }
        }
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


// ==========================================
// OFFICE TV AUDIBLE ALARM SYSTEM (WEB AUDIO SYNTHESIZER)
// Zero latency, zero external asset dependencies, works on Smart TVs
// ==========================================
let alarmAudioCtx = null;
let isAudioEngineUnlocked = false;

function getAudioContext() {
    if (!alarmAudioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            alarmAudioCtx = new AudioContextClass();
        }
    }
    return alarmAudioCtx;
}

function unlockAudioEngine(playChime = false) {
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    isAudioEngineUnlocked = true;
                    hideTvAudioUnlockBanner();
                    updateAlarmStatusBadge(true);
                    if (playChime) playAudioReadyChime();
                }).catch(e => console.warn("Audio unlock notice:", e));
            } else {
                isAudioEngineUnlocked = true;
                hideTvAudioUnlockBanner();
                updateAlarmStatusBadge(true);
                if (playChime) playAudioReadyChime();
            }
        }
    } catch(e) {
        console.warn("Audio unlock notice:", e);
    }
}

function playAudioReadyChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
    } catch(e) {}
}

function showTvAudioUnlockBanner() {
    const banner = document.getElementById('tvAudioUnlockPrompt');
    if (banner) banner.classList.remove('hidden');
}

function hideTvAudioUnlockBanner() {
    const banner = document.getElementById('tvAudioUnlockPrompt');
    if (banner) banner.classList.add('hidden');
}

// Automatically unlock audio audio on first interaction anywhere on screen
['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, () => {
        if (!isAudioEngineUnlocked) {
            unlockAudioEngine();
        }
    }, { passive: true });
});

function playTone(freq, startOffset, duration, type = 'triangle', gainVal = 0.5) {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const startTime = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(gainVal, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
}

// =========================================================
// 1. POLICE SIREN AUDIO SYNTHESIS FOR NEW ORDERS
// Oscillating pitch sweep: 650Hz <-> 1400Hz (Wee-Ooo Police Siren)
// =========================================================
function playPoliceSirenSequence(durationSeconds = 5) {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';

    // Volume Envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.05);

    // Police Siren Wail: 650Hz <-> 1400Hz
    const cycleDuration = 0.70;
    const totalCycles = Math.ceil(durationSeconds / cycleDuration) + 1;

    for (let i = 0; i < totalCycles; i++) {
        const cycleStart = now + (i * cycleDuration);
        const halfCycle = cycleStart + (cycleDuration / 2);
        const cycleEnd = cycleStart + cycleDuration;

        osc.frequency.setValueAtTime(650, cycleStart);
        osc.frequency.linearRampToValueAtTime(1400, halfCycle);
        osc.frequency.linearRampToValueAtTime(650, cycleEnd);
    }

    gain.gain.setValueAtTime(0.55, now + durationSeconds - 0.15);
    gain.gain.linearRampToValueAtTime(0.001, now + durationSeconds);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSeconds + 0.1);
}

function playNewOrderAlarm(durationSeconds = 5, force = false) {
    if (!force && !isTvModeActive()) return;
    if (typeof unlockAudioEngine === 'function') unlockAudioEngine(false);

    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        if (typeof showTvAudioUnlockBanner === 'function') showTvAudioUnlockBanner();
    }

    if (typeof updateAlarmStatusBadge === 'function') updateAlarmStatusBadge(true, true);

    try {
        playPoliceSirenSequence(durationSeconds);
    } catch(err) {
        console.warn("Police siren error:", err);
    }

    setTimeout(() => {
        if (typeof updateAlarmStatusBadge === 'function') updateAlarmStatusBadge(true, false);
    }, durationSeconds * 1000);
}

function testNewOrderPoliceSiren() {
    if (typeof unlockAudioEngine === 'function') unlockAudioEngine();
    playNewOrderAlarm(5, true);
    if (typeof showNotification === 'function') {
        showNotification("🚨 POLICE SIREN TEST", "New Order Police Siren Active & Tested (5s)!");
    }
}

function testLateTimerAlarm() {
    if (typeof unlockAudioEngine === 'function') unlockAudioEngine();
    playPendingOrderSlaAlarm(5, true);
    if (typeof showNotification === 'function') {
        showNotification("⏰ LATE TIMER ALARM TEST", "1-Hour / 30-Min Late Alert Beeps Active & Tested (5s)!");
    }
}

function testOrEnableAlarm() {
    testNewOrderPoliceSiren();
}

function updateAlarmStatusBadge(isActive, isTriggered = false) {
    const btn = document.getElementById('alarmToggleBtn');
    const text = document.getElementById('alarmText');
    const icon = document.getElementById('alarmIcon');
    if (!btn || !text || !icon) return;

    if (isTriggered) {
        btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all border border-red-500 bg-red-950/80 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-bounce";
        text.innerText = "🚨 POLICE SIREN ACTIVE!";
        setTimeout(() => updateAlarmStatusBadge(true, false), 4000);
        return;
    }

    if (isActive) {
        btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all border border-red-500/50 bg-red-950/60 text-red-300 hover:bg-red-900/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
        text.innerText = "Test: Police Siren (New Order)";
        icon.innerText = "🚨";
    }
}

function showNewOrderAlertBanner(orders) {
    const banner = document.getElementById('newOrderBanner');
    const bannerText = document.getElementById('newOrderBannerText');
    const bannerSub = document.getElementById('newOrderBannerSub');
    if (!banner || !bannerText || !bannerSub) return;

    if (!Array.isArray(orders) || orders.length === 0) return;

    if (orders.length === 1) {
        const o = orders[0];
        bannerText.innerText = `${o.orderId || 'NEW ORDER'} • ${o.shopName || 'Dealer'}`;
        bannerSub.innerText = `Total: ₹${o.totalAmount || o.orderTotal || '0'} • Items: ${o.itemsCount || (o.items ? o.items.length : '1')} • Just Now`;
    } else {
        bannerText.innerText = `🎉 ${orders.length} NAYE ORDERS AAYE HAIN!`;
        const ids = orders.map(o => o.orderId).slice(0, 3).join(', ');
        bannerSub.innerText = `${ids}${orders.length > 3 ? '...' : ''} • Check Dashboard Now`;
    }

    banner.classList.remove('hidden');

    if (window._bannerDismissTimer) clearTimeout(window._bannerDismissTimer);
    window._bannerDismissTimer = setTimeout(() => {
        dismissNewOrderBanner();
    }, 15000);
}

function dismissNewOrderBanner() {
    const banner = document.getElementById('newOrderBanner');
    if (banner) {
        banner.classList.add('hidden');
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn("Fullscreen request error:", err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}







// =========================================================
// OFFICE TV 1-HOUR// =========================================================
// IS TV MODE HELPER: STRICT GUARD SO AUDIO ONLY PLAYS ON TV!
// =========================================================
function isTvModeActive() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tv') === '1' || urlParams.get('mode') === 'tv') return true;
        if (window.isTvMode === true) return true;
        const role = (typeof currentUserRole !== 'undefined' ? currentUserRole : '') || localStorage.getItem('yash_role');
        if (role === 'TV') return true;
        const tvScreen = document.getElementById('tvDisplayScreen');
        if (tvScreen && !tvScreen.classList.contains('hidden')) return true;
    } catch(e) {}
    return false;
}

// =========================================================
// OFFICE TV 1-HOUR SLA & PENDING ALARM SYSTEM (CLEAN LABELS)
// =========================================================
function getOrderTvSlaInfo(order) {
    if (!order) {
        return {
            isPending: false,
            elapsedMinutes: 0,
            remainingMinutes: 60,
            status: 'safe',
            label: '1 Hr Target',
            timeText: '1 Hr Target (60m)',
            badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
            sideBadgeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50',
            containerBorderClass: 'border-slate-800',
            timeTextColor: 'text-cyan-300',
            progressColor: 'bg-cyan-400',
            progressPct: 0,
            dotClass: 'bg-cyan-400',
            isWarning: false,
            isBreached: false
        };
    }

    const stageNum = Number(order.completedStages || 0);
    const isPending = !order.isFullyCompleted && stageNum < 2;
    const stageNamesList = (typeof STAGE_NAMES !== 'undefined' && Array.isArray(STAGE_NAMES)) ? STAGE_NAMES : [];
    const stageLabel = (stageNum >= 0 && stageNum < stageNamesList.length) ? stageNamesList[stageNum] : ('Stage ' + stageNum);

    // If order has passed pending (stage 2+ or fully completed)
    if (!isPending) {
        return {
            isPending: false,
            elapsedMinutes: 0,
            remainingMinutes: 0,
            status: 'processed',
            label: 'Processed',
            timeText: 'Processed (' + stageLabel + ')',
            badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
            sideBadgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50',
            containerBorderClass: 'border-emerald-500/30 bg-emerald-950/20',
            timeTextColor: 'text-emerald-400',
            progressColor: 'bg-emerald-500',
            progressPct: 100,
            dotClass: 'bg-emerald-400',
            isWarning: false,
            isBreached: false
        };
    }

    const dateBadge = (typeof getOrderRelativeDateBadge === 'function') 
        ? getOrderRelativeDateBadge(order.date) 
        : { isToday: true, label: "Today" };

    if (!dateBadge.isToday) {
        return {
            isPending: false,
            isOldOrder: true,
            elapsedMinutes: 0,
            remainingMinutes: 0,
            status: 'old_order',
            label: (dateBadge.label || 'Past Order'),
            timeText: (dateBadge.label || 'Past Order') + ' (Pending)',
            badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
            sideBadgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
            containerBorderClass: 'border-slate-800 bg-[#0B1121]',
            timeTextColor: 'text-slate-400',
            progressColor: 'bg-slate-600',
            progressPct: 100,
            dotClass: 'bg-slate-500',
            isWarning: false,
            isBreached: false
        };
    }

    // TODAY's Pending Order
    const orderDate = (typeof parseCustomDate === 'function') ? parseCustomDate(order.date) : new Date(order.date || Date.now());
    const now = new Date();
    const diffMs = now.getTime() - orderDate.getTime();
    const elapsedMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const totalAllowedMinutes = 60; // 1 hour target
    const remainingMinutes = totalAllowedMinutes - elapsedMinutes;

    if (elapsedMinutes < 30) {
        const progressPct = Math.min(100, Math.max(5, Math.round((elapsedMinutes / 60) * 100)));
        return {
            isPending: true,
            elapsedMinutes: elapsedMinutes,
            remainingMinutes: remainingMinutes,
            status: 'safe',
            label: '1 Hr Target: ' + remainingMinutes + 'm left',
            timeText: remainingMinutes + 'm left (1 Hr Target)',
            badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-sm',
            sideBadgeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50',
            containerBorderClass: 'border-slate-800 bg-[#080d1a]',
            timeTextColor: 'text-cyan-300',
            progressColor: 'bg-cyan-400',
            progressPct: progressPct,
            dotClass: 'bg-cyan-400',
            isWarning: false,
            isBreached: false
        };
    } else if (elapsedMinutes <= 60) {
        const progressPct = Math.min(100, Math.round((elapsedMinutes / 60) * 100));
        return {
            isPending: true,
            elapsedMinutes: elapsedMinutes,
            remainingMinutes: remainingMinutes,
            status: 'warning',
            label: 'âš ï¸ 1 Hr Target: ' + remainingMinutes + 'm left',
            timeText: remainingMinutes + 'm left (Pending > ' + elapsedMinutes + 'm!)',
            badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse',
            sideBadgeClass: 'bg-amber-950/90 text-amber-300 border-amber-400 animate-pulse',
            containerBorderClass: 'border-amber-500/70 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
            timeTextColor: 'text-amber-300',
            progressColor: 'bg-amber-400 animate-pulse',
            progressPct: progressPct,
            dotClass: 'bg-amber-400 animate-ping',
            isWarning: true,
            isBreached: false
        };
    } else {
        const overdueMins = elapsedMinutes - 60;
        return {
            isPending: true,
            elapsedMinutes: elapsedMinutes,
            remainingMinutes: remainingMinutes,
            status: 'breached',
            label: 'ðŸš¨ Overdue (+' + overdueMins + 'm)',
            timeText: 'OVERDUE by ' + overdueMins + 'm (1 Hr Target Breached!)',
            badgeClass: 'bg-red-950/90 text-red-200 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-bounce',
            sideBadgeClass: 'bg-red-950/90 text-red-200 border-2 border-red-500 animate-bounce',
            containerBorderClass: 'border-red-500 bg-red-950/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
            timeTextColor: 'text-red-400',
            progressColor: 'bg-red-500',
            progressPct: 100,
            dotClass: 'bg-red-500 animate-ping',
            isWarning: true,
            isBreached: true
        };
    }
}

// DIGITAL TIMER BURST (For Late 1-Hour SLA Warnings)
function playDigitalTimerBeepBurst(startTime, freq = 2200) {
    const ctx = getAudioContext();
    if (!ctx) return;

    for (let i = 0; i < 4; i++) {
        const beepStart = startTime + (i * 0.11);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, beepStart);

        gain.gain.setValueAtTime(0.001, beepStart);
        gain.gain.linearRampToValueAtTime(0.40, beepStart + 0.01);
        gain.gain.setValueAtTime(0.40, beepStart + 0.06);
        gain.gain.linearRampToValueAtTime(0.001, beepStart + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(beepStart);
        osc.stop(beepStart + 0.08);
    }
}

// LATE PENDING ALARM: STRICTLY ONLY PLAYS IN TV MODE!
function playPendingOrderSlaAlarm(durationSeconds = 5, force = false) {
    if (!force && !isTvModeActive()) return;

    if (typeof unlockAudioEngine === 'function') unlockAudioEngine(false);

    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        if (typeof showTvAudioUnlockBanner === 'function') showTvAudioUnlockBanner();
    }

    if (typeof updateAlarmStatusBadge === 'function') updateAlarmStatusBadge(true, true);

    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const burstInterval = 0.75;
    const totalBursts = Math.floor(durationSeconds / burstInterval);

    for (let i = 0; i < totalBursts; i++) {
        const burstTime = now + (i * burstInterval);
        playDigitalTimerBeepBurst(burstTime, 2200);
    }

    setTimeout(() => {
        if (typeof updateAlarmStatusBadge === 'function') updateAlarmStatusBadge(true, false);
    }, durationSeconds * 1000);
}

function checkTvPendingOrdersSlaAlert(orders) {
    if (!orders || !Array.isArray(orders)) return;
    // CRITICAL: Strictly only check & ring on TV screen!
    if (!isTvModeActive()) return;

    window.slaAlertedMilestones = window.slaAlertedMilestones || {};
    window.lastSlaAlarmTime = window.lastSlaAlarmTime || 0;

    const now = Date.now();
    const criticalPendingOrders = [];
    let shouldRingAlarm = false;
    let alarmReason = "";

    orders.forEach(o => {
        const stageNum = Number(o.completedStages || 0);
        if (o.isFullyCompleted || stageNum >= 2) return;

        const dateBadge = (typeof getOrderRelativeDateBadge === 'function') 
            ? getOrderRelativeDateBadge(o.date) 
            : { isToday: false };
        if (!dateBadge.isToday) return;

        const sla = getOrderTvSlaInfo(o);
        if (!sla || !sla.isPending) return;

        const orderIdStr = String(o.orderId);

        if (sla.elapsedMinutes >= 30 && sla.elapsedMinutes < 45) {
            criticalPendingOrders.push(o);
            const key = orderIdStr + '_30m';
            if (!window.slaAlertedMilestones[key]) {
                window.slaAlertedMilestones[key] = true;
                shouldRingAlarm = true;
                alarmReason = 'Aaj ka Order #' + orderIdStr + ' 30 min se pending hai!';
            }
        } else if (sla.elapsedMinutes >= 45 && sla.elapsedMinutes < 60) {
            criticalPendingOrders.push(o);
            const key = orderIdStr + '_45m';
            if (!window.slaAlertedMilestones[key]) {
                window.slaAlertedMilestones[key] = true;
                shouldRingAlarm = true;
                alarmReason = 'Aaj ka Order #' + orderIdStr + ' 45 min se pending hai! 15m left!';
            }
        } else if (sla.elapsedMinutes >= 60) {
            criticalPendingOrders.push(o);
            const key = orderIdStr + '_60m';
            if (!window.slaAlertedMilestones[key]) {
                window.slaAlertedMilestones[key] = true;
                shouldRingAlarm = true;
                alarmReason = 'Aaj ka Order #' + orderIdStr + ' 1 Hr SLA OVERDUE ho gaya hai!';
            }
        }
    });

    if (criticalPendingOrders.length > 0) {
        if ((now - window.lastSlaAlarmTime) > 90000) {
            shouldRingAlarm = true;
            if (!alarmReason) {
                alarmReason = criticalPendingOrders.length + ' orders pending > 30 mins!';
            }
        }
    }

    if (shouldRingAlarm) {
        window.lastSlaAlarmTime = now;
        console.warn('[TV SLA ALARM (TODAY ORDERS ONLY)]', alarmReason);
        playPendingOrderSlaAlarm(5, true);
        showPendingOrderAlertBanner(criticalPendingOrders, alarmReason);
    }
}

function showPendingOrderAlertBanner(orders, reason) {
    const banner = document.getElementById('newOrderBanner');
    const bannerText = document.getElementById('newOrderBannerText');
    const bannerSub = document.getElementById('newOrderBannerSub');
    if (!banner || !bannerText || !bannerSub) return;
    if (!Array.isArray(orders) || orders.length === 0) return;

    banner.className = "fixed top-5 left-1/2 -translate-x-1/2 z-[300] max-w-xl w-[90%] bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-1 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.9)] animate-pulse pointer-events-auto";
    bannerText.innerText = 'âš ï¸ PENDING ORDER ALERT! (' + orders.length + ' Order)';
    const ids = orders.map(o => o.orderId).slice(0, 3).join(', ');
    bannerSub.innerText = (reason || 'Orders pending > 30 mins!') + ' (IDs: ' + ids + ')';

    banner.classList.remove('hidden');

    if (window._bannerDismissTimer) clearTimeout(window._bannerDismissTimer);
    window._bannerDismissTimer = setTimeout(() => {
        banner.classList.add('hidden');
    }, 12000);
}

// User-interaction auto-unlocker for TV audio
window.addEventListener('click', function() {
    if (typeof unlockAudioEngine === 'function') unlockAudioEngine();
});
window.addEventListener('keydown', function() {
    if (typeof unlockAudioEngine === 'function') unlockAudioEngine();
});

