// =======================================================
// GLOBAL STATE & CONSTANTS
// =======================================================
const API_URL = "https://script.google.com/macros/s/AKfycbzQ7W09dn_1gyNSq_PCPrKLX6ApgB52Ob2_1BnmRe5SdYTMNyc8kRwudr80pe2QFCQZCg/exec"; 

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

window.appData = { rawArray: [], orders: {} };
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
// TIMERS & NOTIFICATIONS
// =======================================================
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
setInterval(updateTatTimers, 1000);

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
// DATA PARSERS & FILE HANDLERS
// =======================================================
function parseCustomDate(dateStr) {
    if (!dateStr) return new Date();
    let d = new Date(dateStr);
    if (!isNaN(d)) return d;
    
    let parts = String(dateStr).split(' ');
    if (parts.length >= 1) {
        let dateParts = parts[0].split(/[\/\-]/);
        if (dateParts.length === 3) {
            let day = parseInt(dateParts[0]);
            let month = parseInt(dateParts[1]) - 1;
            let year = parseInt(dateParts[2]);
            if (year < 100) year += 2000;
            
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
    if (!dateString) return "";
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
    if (!dateString) return { text: "", color: "text-slate-400", isSLAWarning: false };
    
    const orderDate = parseCustomDate(dateString);
    const diffInMs = new Date() - orderDate;
    
    if (diffInMs < 0) return { text: "Just now", color: "text-emerald-400", isSLAWarning: false };
    
    const diffInHrs = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMins = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let color = 'text-emerald-400';
    let isSLAWarning = false;
    
    if (diffInHrs >= 48) { color = 'text-pink-500'; } 
    else if (diffInHrs >= 46) { color = 'text-yellow-400'; isSLAWarning = true; } 
    else if (diffInHrs >= 4) { color = 'text-orange-400'; }

    if (diffInHrs > 48) return { text: `${Math.floor(diffInHrs/24)}d ago`, color, isSLAWarning };
    if (diffInHrs > 0) return { text: `${diffInHrs}h ${diffInMins}m ago`, color, isSLAWarning };
    if (diffInMins > 0) return { text: `${diffInMins}m ago`, color, isSLAWarning };
    return { text: `Just now`, color, isSLAWarning };
}

function makeDirectDriveLink(url) {
    let match = url.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            let scale = 1;
            if (img.width > MAX_WIDTH) scale = MAX_WIDTH / img.width;
            
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
        img.onerror = (error) => { URL.revokeObjectURL(objectUrl); reject(error); };
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
