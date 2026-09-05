// js/config.js

const API_URL = "https://script.google.com/macros/s/AKfycbylBlv3afIpteVvngb_OgJtA2KGMhdkHERuw4ww6lJuj-uBjWRN3VFXZzLtyr01kLLYWg/exec"; 

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
