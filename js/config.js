// js/config.js

const API_URL = "https://script.google.com/macros/s/AKfycbw3ye5kfsC4y6_qUa6MobtitHsTcC9r5l30YDeDd9nnznfUiUPq4sd7riGNQA8e8r5wwQ/exec"; 

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
