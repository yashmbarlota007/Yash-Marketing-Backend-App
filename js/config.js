// js/config.js

const API_URL = "https://script.google.com/macros/s/AKfycbyXHJaFTSkjwu6C8ze4czs2Q42NQsgzjW814j8OLA7ztMXTW-nqmh2gkpjebmdSW4YJjA/exec";

// Trimmed to 9 Stages for Max Efficiency
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

window.appData = { 
    rawArray: [], 
    orders: {} 
};

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
