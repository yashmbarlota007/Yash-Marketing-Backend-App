// js/config.js

const API_URL = "https://script.google.com/macros/s/AKfycbzQ7W09dn_1gyNSq_PCPrKLX6ApgB52Ob2_1BnmRe5SdYTMNyc8kRwudr80pe2QFCQZCg/exec"; 

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
