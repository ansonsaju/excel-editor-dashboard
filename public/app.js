// Excel Editor Pro - Vanilla JavaScript Version
let workbook = null;
let sheets = [];
let activeSheet = 0;
let data = [];
let headers = [];
let history = [];
let historyIndex = -1;
let filters = {};
let searchTerm = '';
let currentCardIndex = 0;
let isCardView = false;
let autoSaveEnabled = true;
let customSuggestions = {};
let saveTimeout = null;
let currentFileName = '';
let activeSuggestionInput = null;

// DOM Elements
const els = {
    fileInput: document.getElementById('fileInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    addRowBtn: document.getElementById('addRowBtn'),
    historyBtn: document.getElementById('historyBtn'),
    tableViewBtn: document.getElementById('tableViewBtn'),
    cardViewBtn: document.getElementById('cardViewBtn'),
    autoSave: document.getElementById('autoSave'),
    globalSearch: document.getElementById('globalSearch'),
    emptyState: document.getElementById('emptyState'),
    tableView: document.getElementById('tableView'),
    cardViewContainer: document.getElementById('cardViewContainer'),
    filterSection: document.getElementById('filterSection'),
    historyPanel: document.getElementById('historyPanel'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    emptyStateBtn: document.getElementById('emptyStateBtn'),
    prevCard: document.getElementById('prevCard'),
    nextCard: document.getElementById('nextCard'),
    deleteCard: document.getElementById('deleteCard')
};

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgClass = type === 'success' 
        ? 'bg-gradient-to-r from-emerald-500/90 to-green-600/90' 
        : 'bg-gradient-to-r from-red-500/90 to-rose-600/90';
    
    toast.className = `${bgClass} text-white px-6 py-3 rounded-xl shadow-2xl backdrop-blur-lg animate-slide-in`;
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success' 
                    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>'
                    : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
                }
            </svg>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// File Upload
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    currentFileName = file.name;
    try {
        const arrayBuffer = await file.arrayBuffer();
        workbook = XLSX.read(arrayBuffer);
        sheets = workbook.SheetNames;
        
        if (sheets.length > 0) {
            loadSheet(0);
            saveFileHistory(file.name);
            showToast('File uploaded successfully! 🎉');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading file', 'error');
    }
}

function loadSheet(index) {
    const ws = workbook.Sheets[sheets[index]];
    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
    
    if (jsonData.length > 0) {
        headers = Object.keys(jsonData[0]);
        data = jsonData;
        activeSheet = index;
        history = [JSON.parse(JSON.stringify(data))];
        historyIndex = 0;
        filters = {};
        searchTerm = '';
        currentCardIndex = 0;
        analyzeDataForSuggestions();
        renderData();
        renderFilters();
        updateUI();
    }
}

// Smart Suggestion Analysis
function analyzeDataForSuggestions() {
    customSuggestions = {};
    
    headers.forEach(header => {
        const values = data.map(row => row[header]).filter(v => v !== '' && v !== '-');
        
        // Frequency Analysis
        const valueCounts = {};
        values.forEach(v => valueCounts[v] = (valueCounts[v] || 0) + 1);
        
        const frequent = Object.entries(valueCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([val, count]) => ({ value: val, count, badge: 'Common' }));
        
        // Recent Values
        const recent = [...new Set(values.slice(-5))].map(val => ({ 
            value: val, 
            badge: 'Recent' 
        }));
        
        // Numeric Analysis
        const numericValues = values.filter(v => !isNaN(v) && v !== '').map(Number);
        if (numericValues.length > 2) {
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            const median = getMedian(numericValues);
            
            customSuggestions[header] = {
                type: 'numeric',
                suggestions: [
                    ...frequent,
                    ...recent.filter(r => !frequent.find(f => f.value === r.value)),
                    { value: Math.round(avg * 100) / 100, badge: 'Average' },
                    { value: Math.round(median * 100) / 100, badge: 'Median' },
                    ...generateNumericRange(min, max).map(v => ({ value: v, badge: 'Range' }))
                ].slice(0, 12)
            };
        } else {
            customSuggestions[header] = {
                type: 'text',
                suggestions: [...frequent, ...recent.filter(r => !frequent.find(f => f.value === r.value))].slice(0, 12)
            };
        }
    });
}

function getMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function generateNumericRange(min, max) {
    const range = [];
    const step = Math.max(0.5, Math.round((max - min) / 8 * 100) / 100);
    for (let i = 1; i <= 6; i++) {
        const val = Math.round((min + step * i) * 100) / 100;
        if (val < max) range.push(val);
    }
    return range;
}

// Render Functions
function renderFilters() {
    if (!els.filterContainer) {
        els.filterContainer = document.getElementById('filterContainer');
    }
    
    els.filterContainer.innerHTML = headers.map(header => {
        const uniqueValues = [...new Set(data.map(row => row[header]))].filter(v => v !== '' && v !== '-').sort();
        return `
            <div>
                <label class="block text-xs font-semibold text-[#6D776E] mb-1.5 truncate" title="${header}">${header}</label>
                <select onchange="handleFilterChange('${header}', this.value)" class="w-full px-3 py-2 glass-effect border-2 border-[#E8DCC8] rounded-lg focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20 transition-all outline-none text-sm">
                    <option value="">All (${uniqueValues.length})</option>
                    ${uniqueValues.slice(0, 100).map(val => `<option value="${val}">${val}</option>`).join('')}
                </select>
            </div>
        `;
    }).join('');
}

window.handleFilterChange = function(header, value) {
    if (value === '') delete filters[header];
    else filters[header] = value;
    currentCardIndex = 0;
    renderData();
};

function getFilteredData() {
    return data.filter(row => {
        const matchesFilters = Object.entries(filters).every(
            ([key, value]) => String(row[key]) === String(value)
        );
        const matchesSearch = searchTerm === '' || 
            Object.values(row).some(val => 
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            );
        return matchesFilters && matchesSearch;
    });
}

function renderData() {
    const filteredData = getFilteredData();
    
    if (isCardView) {
        renderCardView(filteredData);
    } else {
        renderTableView(filteredData);
    }
}

function renderTableView(filteredData) {
    document.getElementById('tableHeader').innerHTML = `
        <th class="px-4 py-4 text-left font-bold text-sm">Actions</th>
        ${headers.map(h => `
            <th class="px-4 py-4 text-left font-bold text-sm whitespace-nowrap" title="${h}">
                <div class="flex items-center gap-2">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
                    ${h}
                </div>
            </th>
        `).join('')}
    `;
    
    document.getElementById('tableBody').innerHTML = filteredData.length === 0 
        ? `<tr><td colspan="${headers.length + 1}" class="px-6 py-12 text-center text-[#6D776E] text-lg">
            <div class="flex flex-col items-center gap-3">
                <svg class="w-16 h-16 text-[#D4A574] opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                No data matches your filters
            </div>
        </td></tr>`
        : filteredData.map(row => {
            const originalIndex = data.indexOf(row);
            return `
                <tr class="border-b border-[#E8DCC8] hover:bg-[#FFF8EB]/50 transition-all">
                    <td class="px-4 py-3">
                        <button onclick="deleteRow(${originalIndex})" class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all">
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </td>
                    ${headers.map(header => `
                        <td class="px-4 py-3">
                            <div class="min-w-[120px] max-w-[200px]">
                                ${renderCellInput(originalIndex, header, row[header])}
                            </div>
                        </td>
                    `).join('')}
                </tr>
            `;
        }).join('');
}

function renderCardView(filteredData) {
    if (filteredData.length === 0) {
        document.getElementById('cardContent').innerHTML = `
            <div class="text-center py-8">
                <p class="text-[#6D776E] text-lg mb-4">No data matches your filters</p>
            </div>
        `;
        els.prevCard.disabled = true;
        els.nextCard.disabled = true;
        els.deleteCard.disabled = true;
        return;
    }
    
    if (currentCardIndex >= filteredData.length) currentCardIndex = 0;
    
    const row = filteredData[currentCardIndex];
    const originalIndex = data.indexOf(row);
    
    document.getElementById('cardCounter').innerHTML = `
        <svg class="w-5 h-5 text-[#D4A574]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/>
        </svg>
        Card ${currentCardIndex + 1} of ${filteredData.length}
    `;
    
    els.prevCard.disabled = currentCardIndex === 0;
    els.nextCard.disabled = currentCardIndex === filteredData.length - 1;
    els.deleteCard.disabled = false;
    
    document.getElementById('cardContent').innerHTML = `
        <div class="space-y-4">
            ${headers.map(header => `
                <div class="border-b border-[#E8DCC8] pb-4 p-3 rounded-xl hover:bg-[#FFF8EB]/50 transition-all">
                    <label class="block text-sm font-bold text-[#2C3E2F] mb-2 flex items-center gap-2">
                        <svg class="w-4 h-4 text-[#D4A574]" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        ${header}
                    </label>
                    ${renderCellInput(originalIndex, header, row[header])}
                </div>
            `).join('')}
        </div>
    `;
}

function renderCellInput(rowIndex, header, value) {
    const inputId = `input-${rowIndex}-${header.replace(/\s+/g, '_')}`;
    const suggestions = customSuggestions[header]?.suggestions || [];
    const hasSuggestions = suggestions.length > 0;
    
    return `
        <div class="relative w-full">
            <input
                type="text"
                id="${inputId}"
                value="${value || ''}"
                onchange="updateCell(${rowIndex}, '${header}', this.value)"
                onfocus="showSuggestions('${inputId}')"
                class="w-full px-3 py-2 glass-effect border-2 border-[#E8DCC8] rounded-lg focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20 transition-all outline-none text-sm"
                placeholder="Enter ${header}"
            />
            ${hasSuggestions ? `
                <div class="absolute right-2 top-2.5 pointer-events-none">
                    <svg class="w-4 h-4 text-[#D4A574]" style="animation:pulse 2s infinite" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                </div>
                <div id="suggestions-${inputId}" class="hidden absolute z-50 mt-1 w-full glass-effect border-2 border-[#D4A574]/30 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                    <div class="sticky top-0 bg-gradient-to-r from-[#6D776E]/90 to-[#D4A574]/90 text-white px-3 py-2 text-xs font-bold flex items-center gap-2">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>
                        Smart Suggestions
                    </div>
                    ${suggestions.map(s => `
                        <div class="suggestion-item" onclick="selectSuggestion(${rowIndex}, '${header}', '${s.value}', '${inputId}')">
                            <span class="font-medium text-[#2C3E2F]">${s.value}</span>
                            <span class="text-[10px] px-2 py-1 rounded-full font-bold ${getBadgeColor(s.badge)}">
                                ${s.badge}${s.count ? ` (${s.count})` : ''}
                            </span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function getBadgeColor(badge) {
    switch (badge) {
        case 'Common': return 'bg-[#D4A574] text-white';
        case 'Recent': return 'bg-[#6D776E] text-white';
        case 'Average':
        case 'Median': return 'bg-blue-500 text-white';
        default: return 'bg-[#E8DCC8] text-[#6D776E]';
    }
}

window.showSuggestions = function(inputId) {
    const suggestionBox = document.getElementById(`suggestions-${inputId}`);
    if (suggestionBox) {
        document.querySelectorAll('[id^="suggestions-"]').forEach(box => {
            if (box.id !== `suggestions-${inputId}`) box.classList.add('hidden');
        });
        suggestionBox.classList.remove('hidden');
        
        setTimeout(() => {
            document.addEventListener('click', function hideSuggestions(e) {
                const input = document.getElementById(inputId);
                if (input && !input.contains(e.target) && !suggestionBox.contains(e.target)) {
                    suggestionBox.classList.add('hidden');
                    document.removeEventListener('click', hideSuggestions);
                }
            });
        }, 100);
    }
};

window.selectSuggestion = function(rowIndex, header, value, inputId) {
    updateCell(rowIndex, header, value);
    const suggestionBox = document.getElementById(`suggestions-${inputId}`);
    if (suggestionBox) suggestionBox.classList.add('hidden');
};

window.updateCell = function(rowIndex, header, value) {
    if (rowIndex < 0 || rowIndex >= data.length) return;
    data[rowIndex][header] = value;
    addToHistory();
    analyzeDataForSuggestions();
    debouncedSave();
};

// Data Management
window.deleteRow = function(index) {
    if (window.confirm('Delete this row?')) {
        data.splice(index, 1);
        addToHistory();
        debouncedSave();
        renderData();
        showToast('Row deleted');
    }
};

function addRow() {
    const newRow = {};
    headers.forEach(h => newRow[h] = '');
    data.push(newRow);
    addToHistory();
    debouncedSave();
    renderData();
    showToast('Row added ✨');
    
    if (isCardView) {
        currentCardIndex = getFilteredData().length - 1;
        renderData();
    }
}

// History Management
function addToHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(JSON.parse(JSON.stringify(data)));
    if (history.length > 50) history.shift();
    else historyIndex = history.length - 1;
    updateHistoryButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        data = JSON.parse(JSON.stringify(history[historyIndex]));
        updateHistoryButtons();
        analyzeDataForSuggestions();
        debouncedSave();
        renderData();
        showToast('Undo successful');
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        data = JSON.parse(JSON.stringify(history[historyIndex]));
        updateHistoryButtons();
        analyzeDataForSuggestions();
        debouncedSave();
        renderData();
        showToast('Redo successful');
    }
}

function updateHistoryButtons() {
    els.undoBtn.disabled = historyIndex <= 0;
    els.redoBtn.disabled = historyIndex >= history.length - 1;
}

// View Management
function setViewMode(cardMode) {
    isCardView = cardMode;
    
    if (cardMode) {
        els.tableViewBtn.classList.remove('bg-gradient-to-r', 'from-[#6D776E]', 'to-[#D4A574]', 'text-white', 'shadow-lg');
        els.tableViewBtn.classList.add('text-[#6D776E]', 'hover:bg-white/50');
        els.cardViewBtn.classList.add('bg-gradient-to-r', 'from-[#6D776E]', 'to-[#D4A574]', 'text-white', 'shadow-lg');
        els.cardViewBtn.classList.remove('text-[#6D776E]', 'hover:bg-white/50');
        els.tableView.classList.add('hidden');
        els.cardViewContainer.classList.remove('hidden');
    } else {
        els.cardViewBtn.classList.remove('bg-gradient-to-r', 'from-[#6D776E]', 'to-[#D4A574]', 'text-white', 'shadow-lg');
        els.cardViewBtn.classList.add('text-[#6D776E]', 'hover:bg-white/50');
        els.tableViewBtn.classList.add('bg-gradient-to-r', 'from-[#6D776E]', 'to-[#D4A574]', 'text-white', 'shadow-lg');
        els.tableViewBtn.classList.remove('text-[#6D776E]', 'hover:bg-white/50');
        els.cardViewContainer.classList.add('hidden');
        els.tableView.classList.remove('hidden');
    }
    
    renderData();
    debouncedSave();
}

// Storage
function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveToStorage(), 1000);
}

function saveToStorage() {
    if (!autoSaveEnabled || data.length === 0) return;
    if (currentFileName) {
        const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
        if (fileHistory.length > 0) {
            fileHistory[0].state = {
                sheets, activeSheet, data, headers, filters, searchTerm, currentCardIndex, isCardView
            };
            localStorage.setItem('excelFileHistory', JSON.stringify(fileHistory));
        }
    }
}

function saveFileHistory(fileName) {
    const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
    const fileEntry = {
        fileName,
        timestamp: new Date().toISOString(),
        sheets: sheets.length,
        rows: data.length,
        state: { sheets, activeSheet, data, headers, filters, searchTerm, currentCardIndex, isCardView }
    };
    
    const existingIndex = fileHistory.findIndex(f => f.fileName === fileName);
    if (existingIndex >= 0) fileHistory.splice(existingIndex, 1);
    
    fileHistory.unshift(fileEntry);
    localStorage.setItem('excelFileHistory', JSON.stringify(fileHistory.slice(0, 10)));
}

function loadFromStorage() {
    try {
        const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
        if (fileHistory.length > 0) {
            const lastFile = fileHistory[0];
            loadFileFromHistory(lastFile);
        }
    } catch (e) {
        console.error('Load error:', e);
    }
}

function loadFileFromHistory(fileEntry) {
    const state = fileEntry.state;
    currentFileName = fileEntry.fileName;
    sheets = state.sheets || [];
    activeSheet = state.activeSheet || 0;
    data = state.data || [];
    headers = state.headers || [];
    filters = state.filters || {};
    searchTerm = state.searchTerm || '';
    currentCardIndex = state.currentCardIndex || 0;
    isCardView = state.isCardView || false;
    history = [JSON.parse(JSON.stringify(state.data || []))];
    historyIndex = 0;
    
    if (state.data && state.data.length > 0) {
        analyzeDataForSuggestions();
        if (isCardView) setViewMode(true);
        renderData();
        renderFilters();
        updateUI();
        showToast(`Loaded: ${fileEntry.fileName}`);
    }
}

function renderHistoryList() {
    const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
    const container = document.getElementById('historyList');
    
    if (fileHistory.length === 0) {
        container.innerHTML = '<p class="text-[#6D776E] text-center py-8">No saved files</p>';
        return;
    }
    
    container.innerHTML = fileHistory.map((item, idx) => {
        const date = new Date(item.timestamp);
        const timeAgo = getTimeAgo(date);
        return `
            <div class="p-4 glass-effect rounded-xl border-2 border-[#E8DCC8] hover:border-[#D4A574] cursor-pointer transform hover:scale-[1.02] transition-all" onclick='loadFileFromHistory(${JSON.stringify(item).replace(/'/g, "\\'")}); toggleHistory();'>
                <div class="flex justify-between items-start">
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-[#2C3E2F] truncate">${item.fileName}</p>
                        <p class="text-xs text-[#6D776E]">
                            ${item.sheets} sheet${item.sheets > 1 ? 's' : ''} • ${item.rows} rows
                        </p>
                    </div>
                    <span class="text-xs text-[#D4A574] whitespace-nowrap ml-2 font-medium">${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
        year: 31536000, month: 2592000, week: 604800,
        day: 86400, hour: 3600, minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
    return 'Just now';
}

function toggleHistory() {
    const isVisible = !els.historyPanel.classList.contains('hidden');
    if (isVisible) {
        els.historyPanel.classList.add('hidden');
    } else {
        renderHistoryList();
        els.historyPanel.classList.remove('hidden');
    }
}

// Download
function handleDownload() {
    if (data.length === 0) return;
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    const fileName = currentFileName 
        ? currentFileName.replace('.xlsx', `_edited_${Date.now()}.xlsx`)
        : `edited_${Date.now()}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showToast('File downloaded successfully! 📥');
}

// UI Updates
function updateUI() {
    const hasData = data.length > 0;
    els.emptyState.classList.toggle('hidden', hasData);
    els.tableView.classList.toggle('hidden', !hasData || isCardView);
    els.cardViewContainer.classList.toggle('hidden', !hasData || !isCardView);
    els.filterSection.classList.toggle('hidden', !hasData);
    els.downloadBtn.disabled = !hasData;
    els.addRowBtn.disabled = !hasData;
    updateHistoryButtons();
}

// Event Listeners
els.uploadBtn.addEventListener('click', () => els.fileInput.click());
els.emptyStateBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', handleFileUpload);
els.downloadBtn.addEventListener('click', handleDownload);
els.undoBtn.addEventListener('click', undo);
els.redoBtn.addEventListener('click', redo);
els.addRowBtn.addEventListener('click', addRow);
els.historyBtn.addEventListener('click', toggleHistory);
els.tableViewBtn.addEventListener('click', () => setViewMode(false));
els.cardViewBtn.addEventListener('click', () => setViewMode(true));
els.autoSave.addEventListener('change', e => autoSaveEnabled = e.target.checked);
els.globalSearch.addEventListener('input', e => {
    searchTerm = e.target.value;
    renderData();
});
els.prevCard.addEventListener('click', () => {
    currentCardIndex = Math.max(0, currentCardIndex - 1);
    renderData();
});
els.nextCard.addEventListener('click', () => {
    const filteredData = getFilteredData();
    currentCardIndex = Math.min(filteredData.length - 1, currentCardIndex + 1);
    renderData();
});
els.deleteCard.addEventListener('click', () => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return;
    const row = filteredData[currentCardIndex];
    const originalIndex = data.indexOf(row);
    deleteRow(originalIndex);
});
els.clearHistoryBtn.addEventListener('click', () => {
    if (window.confirm('Clear all saved files? This cannot be undone.')) {
        localStorage.removeItem('excelFileHistory');
        renderHistoryList();
        showToast('History cleared');
    }
});

// Keyboard Shortcuts
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToStorage();
        showToast('Saved!');
    } else if (isCardView && !e.target.matches('input, textarea, select')) {
        if (e.key === 'ArrowLeft' && currentCardIndex > 0) {
            e.preventDefault();
            currentCardIndex--;
            renderData();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const filteredData = getFilteredData();
            if (currentCardIndex < filteredData.length - 1) {
                currentCardIndex++;
                renderData();
            }
        }
    }
});

// Auto-save on unload
window.addEventListener('beforeunload', () => {
    if (autoSaveEnabled && data.length > 0) saveToStorage();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    updateUI();
});

console.log('Excel Editor Pro loaded successfully! 🎉');
