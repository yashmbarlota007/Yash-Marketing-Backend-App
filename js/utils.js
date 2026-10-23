// js/utils.js

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
                base64: canvas.toDataURL('image/jpeg', 0.72).split(',')[1]
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
