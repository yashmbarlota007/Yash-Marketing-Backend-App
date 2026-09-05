// js/config.js

const API_URL = "https://script.google.com/macros/s/AKfycbxuZcbliBTpFKM2Hf7r3rN_5djcxRSl4DRt8yBqqIyEH5BQu_Xn7C818yuQCtrQekS5fw/exec";

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
