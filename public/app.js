// Excel Editor Pro - Vanilla JavaScript Version
let workbook = null;
let data = [];
let headers = [];
let history = [];
let historyIndex = -1;
let filters = {};
let searchTerm = '';
let currentCardIndex = 0;
let isCardView = false;
let autoSave = true;
let currentFileName = '';
let customSuggestions = {};
let activeSuggestionInput = null;
let saveTimeout = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const downloadBtn = document.getElementById('downloadBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const addRowBtn = document.getElementById('addRowBtn');
const historyBtn = document.getElementById('historyBtn');
const autoSaveCheckbox = document.getElementById('autoSave');
const tableViewBtn = document.getElementById('tableViewBtn');
const cardViewBtn = document.getElementById('cardViewBtn');
const globalSearch = document.getElementById('globalSearch');
const emptyState = document.getElementById('emptyState');
const emptyStateBtn = document.getElementById('emptyStateBtn');
const tableView = document.getElementById('tableView');
const cardViewContainer = document.getElementById('cardViewContainer');
const filterSection = document.getElementById('filterSection');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const toastContainer = document.getElementById('toastContainer');

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `px-6 py-3 rounded-xl shadow-2xl backdrop-blur-lg animate-slide-in ${
    type === 'success' 
      ? 'bg-gradient-to-r from-emerald-500/90 to-green-600/90 text-white' 
      : 'bg-gradient-to-r from-red-500/90 to-rose-600/90 text-white'
  }`;
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success' ? 
          '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>' :
          '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
        }
      </svg>
      <span class="font-medium">${message}</span>
    </div>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());
emptyStateBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);
downloadBtn.addEventListener('click', handleDownload);
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
addRowBtn.addEventListener('click', addRow);
historyBtn.addEventListener('click', () => toggleHistoryPanel());
clearHistoryBtn.addEventListener('click', clearHistory);
autoSaveCheckbox.addEventListener('change', (e) => {
  autoSave = e.target.checked;
  if (autoSave && data.length > 0) saveToStorage();
});
tableViewBtn.addEventListener('click', () => switchView(false));
cardViewBtn.addEventListener('click', () => switchView(true));
globalSearch.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  render();
});

// Card view navigation
document.getElementById('prevCard').addEventListener('click', () => {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    renderCardView();
  }
});
document.getElementById('nextCard').addEventListener('click', () => {
  const filtered = getFilteredData();
  if (currentCardIndex < filtered.length - 1) {
    currentCardIndex++;
    renderCardView();
  }
});
document.getElementById('deleteCard').addEventListener('click', () => {
  if (confirm('Delete this card?')) {
    const filtered = getFilteredData();
    const row = filtered[currentCardIndex];
    const originalIndex = data.indexOf(row);
    deleteRow(originalIndex);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
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
  }
});

// File upload handler
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  currentFileName = file.name;
  try {
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    if (jsonData.length > 0) {
      headers = Object.keys(jsonData[0]);
      data = jsonData;
      history = [JSON.parse(JSON.stringify(data))];
      historyIndex = 0;
      filters = {};
      searchTerm = '';
      currentCardIndex = 0;
      analyzeDataForSuggestions();
      saveFileHistory();
      render();
      showToast('File uploaded successfully! 🎉');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error loading file', 'error');
  }
}

// Smart suggestion system
function analyzeDataForSuggestions() {
  customSuggestions = {};
  
  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== '' && v !== '-');
    
    const valueCounts = {};
    values.forEach(v => {
      valueCounts[v] = (valueCounts[v] || 0) + 1;
    });
    
    const sorted = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([val, count]) => ({ value: val, count, type: 'frequent' }));
    
    const recent = [...new Set(values.slice(-5))].map(val => ({ value: val, type: 'recent' }));
    
    const numericValues = values.filter(v => !isNaN(v) && v !== '').map(Number);
    if (numericValues.length > 2) {
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      
      customSuggestions[header] = {
        type: 'numeric',
        frequent: sorted,
        recent,
        stats: { min, max, avg: Math.round(avg * 100) / 100 }
      };
    } else {
      customSuggestions[header] = {
        type: 'text',
        frequent: sorted,
        recent
      };
    }
  });
}

function getSuggestionsForField(header) {
  const fieldSuggestions = customSuggestions[header];
  if (!fieldSuggestions) return [];
  
  const allSuggestions = [];
  
  fieldSuggestions.frequent?.forEach(item => {
    allSuggestions.push({
      value: item.value,
      label: `${item.value}`,
      badge: 'Common',
      count: item.count,
      priority: 1
    });
  });
  
  fieldSuggestions.recent?.forEach(item => {
    if (!allSuggestions.find(s => s.value === item.value)) {
      allSuggestions.push({
        value: item.value,
        label: `${item.value}`,
        badge: 'Recent',
        priority: 2
      });
    }
  });
  
  if (fieldSuggestions.type === 'numeric' && fieldSuggestions.stats) {
    const { avg } = fieldSuggestions.stats;
    if (!allSuggestions.find(s => s.value === avg)) {
      allSuggestions.push({
        value: avg,
        label: `${avg} (Avg)`,
        badge: 'Average',
        priority: 3
      });
    }
  }
  
  return allSuggestions.sort((a, b) => a.priority - b.priority).slice(0, 12);
}

// Update cell
function updateCell(rowIndex, header, value) {
  data[rowIndex][header] = value;
  addToHistory();
  analyzeDataForSuggestions();
  render();
  debouncedSave();
}

// History management
function addToHistory() {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(JSON.parse(JSON.stringify(data)));
  if (newHistory.length > 50) {
    newHistory.shift();
  } else {
    historyIndex = newHistory.length - 1;
  }
  history = newHistory;
  updateButtons();
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    data = JSON.parse(JSON.stringify(history[historyIndex]));
    render();
    showToast('Undo successful');
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    data = JSON.parse(JSON.stringify(history[historyIndex]));
    render();
    showToast('Redo successful');
  }
}

// Add row
function addRow() {
  const newRow = {};
  headers.forEach(h => newRow[h] = '');
  data.push(newRow);
  addToHistory();
  render();
  showToast('Row added ✨');
  
  if (isCardView) {
    currentCardIndex = getFilteredData().length - 1;
    renderCardView();
  }
}

// Delete row
function deleteRow(index) {
  data.splice(index, 1);
  addToHistory();
  render();
  showToast('Row deleted');
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

// Storage functions
function saveFileHistory() {
  const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
  const fileEntry = {
    fileName: currentFileName,
    timestamp: new Date().toISOString(),
    sheets: 1,
    rows: data.length,
    state: { data, headers, filters, searchTerm, currentCardIndex, isCardView }
  };
  
  const existingIndex = fileHistory.findIndex(f => f.fileName === currentFileName);
  if (existingIndex >= 0) fileHistory.splice(existingIndex, 1);
  
  fileHistory.unshift(fileEntry);
  localStorage.setItem('excelFileHistory', JSON.stringify(fileHistory.slice(0, 10)));
}

function saveToStorage() {
  if (!autoSave || data.length === 0) return;
  if (currentFileName) {
    const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
    if (fileHistory.length > 0) {
      fileHistory[0].state = { data, headers, filters, searchTerm, currentCardIndex, isCardView };
      localStorage.setItem('excelFileHistory', JSON.stringify(fileHistory));
    }
  }
}

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveToStorage(), 1000);
}

function loadFromStorage() {
  try {
    const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
    if (fileHistory.length > 0) {
      loadFileFromHistory(fileHistory[0]);
    }
  } catch (e) {
    console.error('Load error:', e);
  }
}

function loadFileFromHistory(fileEntry) {
  const state = fileEntry.state;
  currentFileName = fileEntry.fileName;
  data = state.data || [];
  headers = state.headers || [];
  filters = state.filters || {};
  searchTerm = state.searchTerm || '';
  currentCardIndex = state.currentCardIndex || 0;
  isCardView = state.isCardView || false;
  history = [JSON.parse(JSON.stringify(data))];
  historyIndex = 0;
  
  if (data.length > 0) {
    analyzeDataForSuggestions();
    render();
    showToast(`Loaded: ${fileEntry.fileName}`);
  }
}

function toggleHistoryPanel() {
  const isVisible = !historyPanel.classList.contains('hidden');
  historyPanel.classList.toggle('hidden', isVisible);
  if (!isVisible) renderHistoryList();
}

function renderHistoryList() {
  const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
  if (fileHistory.length === 0) {
    historyList.innerHTML = '<p class="text-[#6D776E] text-center py-8">No saved files</p>';
    return;
  }
  
  historyList.innerHTML = fileHistory.map((item, idx) => {
    const date = new Date(item.timestamp);
    const timeAgo = getTimeAgo(date);
    return `
      <div onclick="loadHistoryItem(${idx})" class="p-4 glass-effect rounded-xl border-2 border-[#E8DCC8] hover:border-[#D4A574] cursor-pointer transform hover:scale-[1.02] transition-all">
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-[#2C3E2F] truncate">${item.fileName}</p>
            <p class="text-xs text-[#6D776E]">${item.rows} rows</p>
          </div>
          <span class="text-xs text-[#D4A574] whitespace-nowrap ml-2 font-medium">${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

window.loadHistoryItem = function(index) {
  const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
  loadFileFromHistory(fileHistory[index]);
  historyPanel.classList.add('hidden');
};

function clearHistory() {
  if (confirm('Clear all saved files? This cannot be undone.')) {
    localStorage.removeItem('excelFileHistory');
    historyPanel.classList.add('hidden');
    showToast('History cleared');
  }
}

// Filtering
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

// Switch view
function switchView(toCardView) {
  isCardView = toCardView;
  tableViewBtn.className = `px-4 py-2 rounded-lg font-medium transition-all ${
    !isCardView 
      ? 'bg-gradient-to-r from-[#6D776E] to-[#D4A574] text-white shadow-lg'
      : 'text-[#6D776E] hover:bg-white/50'
  }`;
  cardViewBtn.className = `px-4 py-2 rounded-lg font-medium transition-all ${
    isCardView 
      ? 'bg-gradient-to-r from-[#6D776E] to-[#D4A574] text-white shadow-lg'
      : 'text-[#6D776E] hover:bg-white/50'
  }`;
  render();
}

// Update buttons
function updateButtons() {
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = historyIndex >= history.length - 1;
  downloadBtn.disabled = data.length === 0;
  addRowBtn.disabled = data.length === 0;
}

// Render
function render() {
  updateButtons();
  
  if (data.length === 0) {
    emptyState.classList.remove('hidden');
    tableView.classList.add('hidden');
    cardViewContainer.classList.add('hidden');
    filterSection.classList.add('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  filterSection.classList.remove('hidden');
  renderFilters();
  
  if (isCardView) {
    tableView.classList.add('hidden');
    cardViewContainer.classList.remove('hidden');
    renderCardView();
  } else {
    cardViewContainer.classList.add('hidden');
    tableView.classList.remove('hidden');
    renderTableView();
  }
}

function renderFilters() {
  const filterContainer = document.getElementById('filterContainer');
  filterContainer.innerHTML = headers.map(header => {
    const uniqueValues = [...new Set(data.map(row => row[header]))].filter(v => v !== '' && v !== '-').sort();
    return `
      <div>
        <label class="block text-xs font-semibold text-[#6D776E] mb-1.5 truncate" title="${header}">${header}</label>
        <select onchange="updateFilter('${header}', this.value)" class="w-full px-3 py-2 glass-effect border-2 border-[#E8DCC8] rounded-lg focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20 transition-all outline-none text-sm">
          <option value="">All (${uniqueValues.length})</option>
          ${uniqueValues.slice(0, 100).map(val => 
            `<option value="${val}" ${filters[header] === val ? 'selected' : ''}>${val}</option>`
          ).join('')}
        </select>
      </div>
    `;
  }).join('');
}

window.updateFilter = function(header, value) {
  if (value === '') {
    delete filters[header];
  } else {
    filters[header] = value;
  }
  currentCardIndex = 0;
  render();
};

function renderCardView() {
  const filtered = getFilteredData();
  const cardCounter = document.getElementById('cardCounter');
  const cardContent = document.getElementById('cardContent');
  
  cardCounter.innerHTML = `
    <svg class="w-5 h-5 text-[#D4A574]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/>
    </svg>
    Card ${currentCardIndex + 1} of ${filtered.length}
  `;
  
  if (filtered.length === 0) {
    cardContent.innerHTML = '<p class="text-center text-[#6D776E] py-8">No data matches your filters</p>';
    return;
  }
  
  const row = filtered[currentCardIndex];
  const originalIndex = data.indexOf(row);
  
  cardContent.innerHTML = `
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

function renderTableView() {
  const filtered = getFilteredData();
  const tableHeader = document.getElementById('tableHeader');
  const tableBody = document.getElementById('tableBody');
  
  tableHeader.innerHTML = `
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
  
  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${headers.length + 1}" class="px-6 py-12 text-center text-[#6D776E] text-lg">
          <div class="flex flex-col items-center gap-3">
            <svg class="w-16 h-16 text-[#D4A574] opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            No data matches your filters
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = filtered.map(row => {
    const originalIndex = data.indexOf(row);
    return `
      <tr class="border-b border-[#E8DCC8] hover:bg-[#FFF8EB]/50 transition-all">
        <td class="px-4 py-3">
          <button onclick="deleteRow(${originalIndex})" class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all" title="Delete row">
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

function renderCellInput(rowIndex, header, value) {
  const inputId = `input-${rowIndex}-${header}`;
  const suggestions = getSuggestionsForField(header);
  const hasSuggestions = suggestions.length > 0;
  
  return `
    <div class="relative w-full">
      <input
        type="text"
        id="${inputId}"
        value="${value || ''}"
        onchange="updateCell(${rowIndex}, '${header}', this.value)"
        onfocus="${hasSuggestions ? `showSuggestions('${inputId}', ${rowIndex}, '${header}')` : ''}"
        class="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-[#E8DCC8] rounded-lg focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20 transition-all outline-none text-sm"
        placeholder="Enter ${header}"
      />
      ${hasSuggestions ? `
        <div class="absolute right-2 top-2.5 pointer-events-none">
          <svg class="w-4 h-4 text-[#D4A574] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
        </div>
        <div id="suggestions-${inputId}" class="hidden absolute z-50 mt-1 w-full bg-white/95 backdrop-blur-lg border-2 border-[#D4A574]/30 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
          <div class="sticky top-0 bg-gradient-to-r from-[#6D776E]/90 to-[#D4A574]/90 text-white px-3 py-2 text-xs font-bold flex items-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            Smart Suggestions
          </div>
          ${suggestions.map((suggestion, idx) => `
            <div class="px-3 py-2.5 cursor-pointer hover:bg-[#FFF8EB] border-b border-[#E8DCC8] last:border-0 flex items-center justify-between group transition-all hover:pl-4"
                 onclick="applySuggestion(${rowIndex}, '${header}', '${suggestion.value}', '${inputId}')">
              <span class="font-medium text-[#2C3E2F] group-hover:text-[#6D776E]">${suggestion.label}</span>
              <span class="text-[10px] px-2 py-1 rounded-full font-bold ${
                suggestion.badge === 'Common' ? 'bg-[#D4A574] text-white' :
                suggestion.badge === 'Recent' ? 'bg-[#6D776E] text-white' :
                suggestion.badge === 'Average' ? 'bg-blue-500 text-white' :
                'bg-[#E8DCC8] text-[#6D776E]'
              }">
                ${suggestion.badge}${suggestion.count ? ` (${suggestion.count})` : ''}
              </span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

window.showSuggestions = function(inputId, rowIndex, header) {
  document.querySelectorAll('[id^="suggestions-"]').forEach(el => el.classList.add('hidden'));
  const suggestionsEl = document.getElementById(`suggestions-${inputId}`);
  if (suggestionsEl) {
    suggestionsEl.classList.remove('hidden');
  }
};

window.applySuggestion = function(rowIndex, header, value, inputId) {
  updateCell(rowIndex, header, value);
  const suggestionsEl = document.getElementById(`suggestions-${inputId}`);
  if (suggestionsEl) suggestionsEl.classList.add('hidden');
};

// Make functions global for inline event handlers
window.updateCell = updateCell;
window.deleteRow = deleteRow;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  render();
});
