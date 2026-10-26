﻿// js/utils.js

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

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let dayMonth = `${orderDate.getDate()} ${months[orderDate.getMonth()]}`;

    if (diffDays <= 0) {
        let subText = timeStr ? `Today • ${timeStr}` : `Today, ${dayMonth}`;
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
        let subText = timeStr ? `Yesterday • ${timeStr}` : `Yesterday, ${dayMonth}`;
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
        let subText = timeStr ? `2d ago (${dayMonth}) • ${timeStr}` : `2 days ago (${dayMonth})`;
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
        let subText = timeStr ? `${diffDays}d ago (${dayMonth}) • ${timeStr}` : `${diffDays} days ago (${dayMonth})`;
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

function unlockAudioEngine() {
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            isAudioEngineUnlocked = true;
            updateAlarmStatusBadge(true);
        }
    } catch(e) {
        console.warn("Audio unlock notice:", e);
    }
}

// Automatically unlock audio on first interaction anywhere on screen
['click', 'keydown', 'touchstart'].forEach(evt => {
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

function playChimeSequence() {
    try {
        // High visibility order arrival chime: G5 (784Hz) -> C6 (1046Hz) -> E6 (1318Hz) -> G6 (1568Hz)
        playTone(784, 0.0, 0.15, 'triangle', 0.5);
        playTone(1046, 0.15, 0.18, 'triangle', 0.6);
        playTone(1318, 0.35, 0.22, 'triangle', 0.7);
        playTone(1568, 0.58, 0.45, 'sine', 0.8);
    } catch(err) {
        console.warn("Chime playback error:", err);
    }
}

function playNewOrderAlarm(durationSeconds = 5) {
    unlockAudioEngine();
    updateAlarmStatusBadge(true, true);

    // Initial sequence
    playChimeSequence();

    // Loop chime sequence every 1.1s for sustained 5s alarm
    const intervalId = setInterval(() => {
        playChimeSequence();
    }, 1100);

    // Stop after exact duration (5 seconds requested by user)
    const stopMs = Math.max(1000, (durationSeconds * 1000) - 100);
    setTimeout(() => {
        clearInterval(intervalId);
    }, stopMs);

    setTimeout(() => {
        updateAlarmStatusBadge(true, false);
    }, durationSeconds * 1000);
}

function testOrEnableAlarm() {
    unlockAudioEngine();
    playNewOrderAlarm(5);
    showNotification("🔊 ALARM TEST", "5-Second Order Alert Chime Active & Tested!");
}
function updateAlarmStatusBadge(isActive, isTriggered = false) {
    const btn = document.getElementById('alarmToggleBtn');
    const text = document.getElementById('alarmText');
    const icon = document.getElementById('alarmIcon');
    if (!btn || !text || !icon) return;

    if (isTriggered) {
        btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all border border-red-500 bg-red-950/80 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-bounce";
        text.innerText = "🚨 NEW ORDER!";
        setTimeout(() => updateAlarmStatusBadge(true, false), 4000);
        return;
    }

    if (isActive) {
        btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all border border-emerald-500/40 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
        text.innerText = "Alarm: Active (Test)";
        icon.innerText = "🔔";
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



