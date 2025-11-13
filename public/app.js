// Excel Editor Pro - Complete Application
// Color palette
const colors = {
  sage: '#6D7F6C',
  mint: '#D7E7A4',
  terracotta: '#C68A60',
  blush: '#DDC1B0',
  cream: '#E1ECB3',
  ivory: '#FFF4EB'
};

// Global state
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
let fileName = '';
let saveTimeout = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  loadFromStorage();
});

function initializeApp() {
  // Setup event listeners
  document.getElementById('uploadBtn').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
  document.getElementById('downloadBtn').addEventListener('click', downloadFile);
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  document.getElementById('addRowBtn').addEventListener('click', addRow);
  document.getElementById('historyBtn').addEventListener('click', toggleHistory);
  document.getElementById('tableViewBtn').addEventListener('click', () => setViewMode(false));
  document.getElementById('cardViewBtn').addEventListener('click', () => setViewMode(true));
  document.getElementById('autoSaveCheckbox').addEventListener('change', (e) => autoSaveEnabled = e.target.checked);
  document.getElementById('globalSearch').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderData();
  });
  document.getElementById('prevCard').addEventListener('click', () => navigateCard(-1));
  document.getElementById('nextCard').addEventListener('click', () => navigateCard(1));
  document.getElementById('deleteCard').addEventListener('click', deleteCurrentCard);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearAllHistory);
  document.getElementById('emptyStateBtn').addEventListener('click', () => document.getElementById('fileInput').click());

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  fileName = file.name;
  try {
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer);
    sheets = workbook.SheetNames;
    
    if (sheets.length > 0) {
      loadSheet(0);
      renderSheetButtons();
      updateUI();
      saveFileHistory(file.name);
      showToast('File uploaded successfully!', 'success');
    }
  } catch (error) {
    console.error('Upload error:', error);
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
    debouncedSave();
  }
}

function analyzeDataForSuggestions() {
  customSuggestions = {};
  
  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== '' && v !== '-');
    
    if (values.length === 0) return;
    
    // Frequency analysis
    const frequency = {};
    values.forEach(v => {
      frequency[v] = (frequency[v] || 0) + 1;
    });
    
    const sortedByFreq = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([val]) => val);

    // Check if numeric
    const numValues = values.filter(v => !isNaN(v) && v !== '').map(Number);
    
    if (numValues.length > values.length * 0.5) {
      // Numeric field
      const avg = numValues.reduce((a, b) => a + b, 0) / numValues.length;
      const min = Math.min(...numValues);
      const max = Math.max(...numValues);
      
      customSuggestions[header] = {
        type: 'numeric',
        common: sortedByFreq,
        stats: { avg, min, max },
        recent: numValues.slice(-5)
      };
    } else {
      // Text field
      customSuggestions[header] = {
        type: 'text',
        common: sortedByFreq,
        recent: values.slice(-5)
      };
    }
  });
}

function generateSuggestions(header, currentValue) {
  const headerSuggestions = customSuggestions[header];
  if (!headerSuggestions) return [];

  let suggestions = new Set();

  // Add common values
  headerSuggestions.common.forEach(v => suggestions.add(v));
  
  // Add recent values
  if (headerSuggestions.recent) {
    headerSuggestions.recent.forEach(v => suggestions.add(v));
  }

  // For numeric fields, add smart predictions
  if (headerSuggestions.type === 'numeric' && currentValue && !isNaN(currentValue)) {
    const num = Number(currentValue);
    const { min, max, avg } = headerSuggestions.stats;
    
    // Add nearby values
    [-5, -2, -1, 1, 2, 5].forEach(offset => {
      const val = num + offset;
      if (val >= min && val <= max) {
        suggestions.add(Math.round(val * 100) / 100);
      }
    });
    
    // Add average
    suggestions.add(Math.round(avg * 100) / 100);
  }

  return Array.from(suggestions).slice(0, 12);
}

function renderSheetButtons() {
  const container = document.getElementById('sheetButtons');
  container.innerHTML = sheets.map((sheet, idx) => `
    <button 
      onclick="handleSheetChange(${idx})" 
      class="px-4 py-2 rounded-lg font-medium text-sm transition-all ${
        activeSheet === idx 
          ? 'bg-gradient-to-r from-[#6D7F6C] to-[#D7E7A4] text-white shadow-lg' 
          : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
      }"
    >
      ${sheet}
    </button>
  `).join('');
  
  document.getElementById('sheetsNav').classList.remove('hidden');
}

function handleSheetChange(index) {
  if (workbook) {
    loadSheet(index);
    renderSheetButtons();
    if (fileName) saveFileHistory(fileName);
  }
}

function renderFilters() {
  const container = document.getElementById('filterContainer');
  container.innerHTML = headers.map(header => {
    const uniqueValues = [...new Set(data.map(row => row[header]))]
      .filter(v => v !== '' && v !== '-')
      .sort();
    
    return `
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1 truncate" title="${header}">
          ${header}
        </label>
        <select 
          onchange="handleFilterChange('${header}', this.value)" 
          class="w-full px-2 py-2 border-2 border-gray-200 rounded-lg focus:border-[#6D7F6C] focus:outline-none text-sm"
        >
          <option value="">All (${uniqueValues.length})</option>
          ${uniqueValues.slice(0, 100).map(val => `
            <option value="${val}">${val}</option>
          `).join('')}
        </select>
      </div>
    `;
  }).join('');
}

function handleFilterChange(header, value) {
  if (value === '') {
    delete filters[header];
  } else {
    filters[header] = value;
  }
  currentCardIndex = 0;
  renderData();
}

function getFilteredData() {
  return data.filter(row => {
    const matchesFilters = Object.entries(filters).every(([key, value]) => 
      String(row[key]) === String(value)
    );
    const matchesSearch = searchTerm === '' || 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesFilters && matchesSearch;
  });
}

function setViewMode(cardMode) {
  isCardView = cardMode;
  
  const tableBtn = document.getElementById('tableViewBtn');
  const cardBtn = document.getElementById('cardViewBtn');
  const tableView = document.getElementById('tableView');
  const cardView = document.getElementById('cardView');
  
  if (cardMode) {
    tableBtn.classList.remove('active');
    cardBtn.classList.add('active');
    tableView.classList.add('hidden');
    cardView.classList.remove('hidden');
  } else {
    cardBtn.classList.remove('active');
    tableBtn.classList.add('active');
    cardView.classList.add('hidden');
    tableView.classList.remove('hidden');
  }
  
  renderData();
  debouncedSave();
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
  const headerRow = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  
  // Render headers
  headerRow.innerHTML = `
    <th class="px-4 py-3 text-left font-semibold text-sm">Actions</th>
    ${headers.map(h => `
      <th class="px-4 py-3 text-left font-semibold text-sm whitespace-nowrap" title="${h}">
        ${h}
      </th>
    `).join('')}
  `;
  
  // Render rows
  if (filteredData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${headers.length + 1}" class="px-4 py-8 text-center text-gray-500">
          No data matches your filters
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = filteredData.map(row => {
      const originalIndex = data.indexOf(row);
      return `
        <tr class="border-b border-gray-100 hover:bg-gradient-to-r hover:from-[#E1ECB3]/30 hover:to-transparent transition-all">
          <td class="px-4 py-2">
            <button 
              onclick="deleteRow(${originalIndex})" 
              class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
              title="Delete row"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </td>
          ${headers.map(header => `
            <td class="px-4 py-2">
              ${renderCellInput(originalIndex, header, row[header])}
            </td>
          `).join('')}
        </tr>
      `;
    }).join('');
  }
}

function renderCardView(filteredData) {
  const container = document.getElementById('cardContainer');
  const counter = document.getElementById('cardCounter');
  const prevBtn = document.getElementById('prevCard');
  const nextBtn = document.getElementById('nextCard');
  const deleteBtn = document.getElementById('deleteCard');
  
  if (filteredData.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <p class="text-gray-500 text-lg">No data matches your filters</p>
      </div>
    `;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    deleteBtn.disabled = true;
    return;
  }
  
  if (currentCardIndex >= filteredData.length) {
    currentCardIndex = 0;
  }
  
  const row = filteredData[currentCardIndex];
  const originalIndex = data.indexOf(row);
  
  counter.textContent = `Card ${currentCardIndex + 1} of ${filteredData.length}`;
  prevBtn.disabled = currentCardIndex === 0;
  nextBtn.disabled = currentCardIndex === filteredData.length - 1;
  deleteBtn.disabled = false;
  
  container.innerHTML = `
    <div class="space-y-4">
      ${headers.map(header => `
        <div class="border-b border-gray-100 pb-4 last:border-0">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            ${header}
          </label>
          ${renderCellInput(originalIndex, header, row[header], true)}
        </div>
      `).join('')}
    </div>
  `;
}

function renderCellInput(rowIndex, header, value, isCard = false) {
  const suggestions = generateSuggestions(header, value);
  const inputId = `input-${rowIndex}-${header.replace(/\s+/g, '_')}`;
  
  if (suggestions.length > 0) {
    return `
      <div class="relative">
        <input 
          type="text" 
          id="${inputId}"
          value="${value || ''}" 
          onchange="updateCell(${rowIndex}, '${header}', this.value)"
          onfocus="showSuggestions('${inputId}', ${rowIndex}, '${header}')"
          class="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-lg focus:border-[#6D7F6C] focus:ring-2 focus:ring-[#6D7F6C]/20 transition-all ${isCard ? 'text-base' : 'text-sm'}"
          placeholder="Enter ${header}"
        />
        <div 
          id="suggestions-${inputId}" 
          class="hidden absolute z-50 mt-2 w-full bg-white/95 backdrop-blur-xl border-2 border-[#6D7F6C] rounded-xl shadow-2xl max-h-64 overflow-y-auto"
          style="animation: fadeIn 0.3s ease-out"
        >
          <div class="sticky top-0 bg-gradient-to-r from-[#6D7F6C] to-[#C68A60] text-white px-4 py-2 text-xs font-semibold flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3l-1.5 4.5h-4.5l3.75 2.7-1.5 4.5 3.75-2.7 3.75 2.7-1.5-4.5 3.75-2.7h-4.5z"/>
            </svg>
            Smart Suggestions
          </div>
          ${suggestions.map(s => {
            const isCommon = customSuggestions[header]?.common.includes(s);
            const isRecent = customSuggestions[header]?.recent?.includes(s);
            return `
              <div 
                class="suggestion-item px-4 py-3 hover:bg-gradient-to-r hover:from-[#E1ECB3] hover:to-[#FFF4EB] cursor-pointer transition-all border-b border-gray-100 last:border-0 flex items-center justify-between"
                onclick="selectSuggestion(${rowIndex}, '${header}', '${s}', '${inputId}')"
              >
                <span class="font-medium text-gray-800">${s}</span>
                ${isCommon ? '<span class="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-[#C68A60] to-[#DDC1B0] text-white">Common</span>' : ''}
                ${isRecent && !isCommon ? '<span class="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-[#D7E7A4] to-[#E1ECB3] text-gray-700">Recent</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else {
    return `
      <input 
        type="text" 
        value="${value || ''}" 
        onchange="updateCell(${rowIndex}, '${header}', this.value)"
        class="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-lg focus:border-[#6D7F6C] focus:ring-2 focus:ring-[#6D7F6C]/20 transition-all ${isCard ? 'text-base' : 'text-sm'}"
        placeholder="Enter ${header}"
      />
    `;
  }
}

function showSuggestions(inputId, rowIndex, header) {
  const suggestionBox = document.getElementById(`suggestions-${inputId}`);
  if (suggestionBox) {
    // Hide all other suggestion boxes
    document.querySelectorAll('[id^="suggestions-"]').forEach(box => {
      if (box.id !== `suggestions-${inputId}`) {
        box.classList.add('hidden');
      }
    });
    
    suggestionBox.classList.remove('hidden');
    
    // Close on outside click
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
}

function selectSuggestion(rowIndex, header, value, inputId) {
  updateCell(rowIndex, header, value);
  
  const input = document.getElementById(inputId);
  if (input) {
    input.value = value;
  }
  
  const suggestionBox = document.getElementById(`suggestions-${inputId}`);
  if (suggestionBox) {
    suggestionBox.classList.add('hidden');
  }
  
  // Auto-advance to next field in card view
  if (isCardView) {
    const currentIndex = headers.indexOf(header);
    if (currentIndex < headers.length - 1) {
      setTimeout(() => {
        const nextHeader = headers[currentIndex + 1];
        const nextInputId = `input-${rowIndex}-${nextHeader.replace(/\s+/g, '_')}`;
        const nextInput = document.getElementById(nextInputId);
        if (nextInput) nextInput.focus();
      }, 100);
    } else {
      const filteredData = getFilteredData();
      if (currentCardIndex < filteredData.length - 1) {
        navigateCard(1);
      }
    }
  }
}

function updateCell(rowIndex, header, value) {
  if (rowIndex < 0 || rowIndex >= data.length) return;
  
  data[rowIndex][header] = value;
  addToHistory(JSON.parse(JSON.stringify(data)));
  analyzeDataForSuggestions();
  debouncedSave();
}

function addRow() {
  const newRow = {};
  headers.forEach(h => newRow[h] = '');
  data.push(newRow);
  
  addToHistory(JSON.parse(JSON.stringify(data)));
  debouncedSave();
  renderData();
  
  if (isCardView) {
    const filteredData = getFilteredData();
    currentCardIndex = filteredData.length - 1;
    renderData();
  }
  
  showToast('Row added successfully', 'success');
}

function deleteRow(index) {
  if (index < 0 || index >= data.length) return;
  
  if (confirm('Delete this row?')) {
    data.splice(index, 1);
    addToHistory(JSON.parse(JSON.stringify(data)));
    debouncedSave();
    
    const filteredData = getFilteredData();
    if (currentCardIndex >= filteredData.length) {
      currentCardIndex = Math.max(0, filteredData.length - 1);
    }
    
    renderData();
    showToast('Row deleted', 'success');
  }
}

function deleteCurrentCard() {
  const filteredData = getFilteredData();
  if (filteredData.length === 0) return;
  
  const row = filteredData[currentCardIndex];
  const originalIndex = data.indexOf(row);
  deleteRow(originalIndex);
}

function navigateCard(direction) {
  const filteredData = getFilteredData();
  currentCardIndex += direction;
  currentCardIndex = Math.max(0, Math.min(currentCardIndex, filteredData.length - 1));
  renderData();
}

function addToHistory(newData) {
  history = history.slice(0, historyIndex + 1);
  history.push(newData);
  historyIndex = history.length - 1;
  
  if (history.length > 50) {
    history.shift();
    historyIndex--;
  }
  
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
  }
}

function updateHistoryButtons() {
  document.getElementById('undoBtn').disabled = historyIndex <= 0;
  document.getElementById('redoBtn').disabled = historyIndex >= history.length - 1;
}

function toggleHistory() {
  const panel = document.getElementById('historyPanel');
  const isVisible = !panel.classList.contains('hidden');
  
  if (isVisible) {
    panel.classList.add('hidden');
  } else {
    renderHistoryList();
    panel.classList.remove('hidden');
  }
}

function renderHistoryList() {
  const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
  const container = document.getElementById('historyList');
  
  if (fileHistory.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">No saved files</p>';
    return;
  }
  
  container.innerHTML = fileHistory.map((item, idx) => {
    const date = new Date(item.timestamp);
    const timeAgo = getTimeAgo(date);
    
    return `
      <div 
        class="file-item p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-[#6D7F6C] cursor-pointer transition-all hover:shadow-md"
        onclick='loadFileFromHistory(${JSON.stringify(item).replace(/'/g, "\\'")})'
      >
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-gray-800 text-sm truncate">${item.fileName}</p>
            <p class="text-xs text-gray-600">${item.sheets?.length || 0} sheets • ${item.data?.length || 0} rows</p>
          </div>
          <span class="text-xs text-gray-500 whitespace-nowrap ml-2">${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');
}

function loadFileFromHistory(item) {
  fileName = item.fileName;
  data = item.data || [];
  headers = item.headers || [];
  sheets = item.sheets || [];
  activeSheet = item.activeSheet || 0;
  history = [JSON.parse(JSON.stringify(data))];
  historyIndex = 0;
  
  if (data.length > 0) {
    analyzeDataForSuggestions();
    renderData();
    renderFilters();
    if (sheets.length > 0) renderSheetButtons();
    updateUI();
    document.getElementById('historyPanel').classList.add('hidden');
    showToast(`Loaded: ${fileName}`, 'success');
  }
}

function clearAllHistory() {
  if (confirm('Clear all saved files? This cannot be undone.')) {
    localStorage.removeItem('excelFileHistory');
    renderHistoryList();
    showToast('History cleared', 'success');
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
}

function downloadFile() {
  if (data.length === 0) return;
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheets[activeSheet] || 'Sheet1');
  
  const downloadName = fileName 
    ? fileName.replace('.xlsx', `_edited_${Date.now()}.xlsx`) 
    : `edited_${Date.now()}.xlsx`;
  
  XLSX.writeFile(wb, downloadName);
  showToast('File downloaded successfully!', 'success');
}

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveToStorage(), 1000);
}

function saveToStorage() {
  if (!autoSaveEnabled || data.length === 0) return;
  if (fileName) saveFileHistory(fileName);
}

function saveFileHistory(name) {
  const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
  const fileEntry = {
    fileName: name,
    timestamp: new Date().toISOString(),
    data: data,
    headers: headers,
    sheets: sheets,
    activeSheet: activeSheet
  };
  
  const existingIndex = fileHistory.findIndex(f => f.fileName === name);
  if (existingIndex >= 0) {
    fileHistory.splice(existingIndex, 1);
  }
  
  fileHistory.unshift(fileEntry);
  localStorage.setItem('excelFileHistory', JSON.stringify(fileHistory.slice(0, 10)));
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

function updateUI() {
  const hasData = data.length > 0;
  
  document.getElementById('emptyState').classList.toggle('hidden', hasData);
  document.getElementById('tableView').classList.toggle('hidden', !hasData || isCardView);
  document.getElementById('cardView').classList.toggle('hidden', !hasData || !isCardView);
  document.getElementById('sheetsNav').classList.toggle('hidden', sheets.length === 0);
  document.getElementById('filterSection').classList.toggle('hidden', !hasData);
  
  document.getElementById('downloadBtn').disabled = !hasData;
  document.getElementById('addRowBtn').disabled = !hasData;
  
  updateHistoryButtons();
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' 
    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
  
  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${icon}
      </svg>
      <span>${message}</span>
    </div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function handleKeyboardShortcuts(e) {
  // Undo: Ctrl+Z or Cmd+Z
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    showToast('Undo', 'success');
  }
  // Redo: Ctrl+Y or Cmd+Shift+Z
  else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
    showToast('Redo', 'success');
  }
  // Save: Ctrl+S or Cmd+S
  else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveToStorage();
    showToast('Saved', 'success');
  }
  // Card navigation with arrow keys (only in card view)
  else if (isCardView && !e.target.matches('input, textarea, select')) {
    if (e.key === 'ArrowLeft' && currentCardIndex > 0) {
      e.preventDefault();
      navigateCard(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateCard(1);
    }
  }
}

// Auto-save before page unload
window.addEventListener('beforeunload', () => {
  if (autoSaveEnabled && data.length > 0) {
    saveToStorage();
  }
});

// Initialize UI state
updateUI();
