// This file contains the exact same React component from the artifact
// Copy the entire ExcelEditorPro component code here

const { useState, useEffect, useRef, useCallback } = React;

const ExcelEditorPro = () => {
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardView, setIsCardView] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [currentFileName, setCurrentFileName] = useState('');
  const [customSuggestions, setCustomSuggestions] = useState({});
  const [activeSuggestionInput, setActiveSuggestionInput] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const fileInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Load from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (autoSave && data.length > 0) {
      debouncedSave();
    }
  }, [data, autoSave]);

  const debouncedSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToStorage(), 1000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
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
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // File upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setCurrentFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);
      setWorkbook(wb);
      const sheetNames = wb.SheetNames;
      setSheets(sheetNames);
      
      if (sheetNames.length > 0) {
        loadSheet(wb, 0);
        saveFileHistory(file.name, wb, sheetNames);
        showToast('File uploaded successfully! 🎉');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error loading file', 'error');
    }
  };

  const loadSheet = (wb, index) => {
    const ws = wb.Sheets[sheets[index] || wb.SheetNames[index]];
    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
    
    if (jsonData.length > 0) {
      const hdrs = Object.keys(jsonData[0]);
      setHeaders(hdrs);
      setData(jsonData);
      setActiveSheet(index);
      setHistory([JSON.parse(JSON.stringify(jsonData))]);
      setHistoryIndex(0);
      setFilters({});
      setSearchTerm('');
      setCurrentCardIndex(0);
      analyzeDataForSuggestions(hdrs, jsonData);
    }
  };

  // Smart suggestion system with multiple algorithms
  const analyzeDataForSuggestions = (hdrs, dataSet) => {
    const suggestions = {};
    
    hdrs.forEach(header => {
      const values = dataSet.map(row => row[header]).filter(v => v !== '' && v !== '-');
      
      // 1. Frequency Analysis
      const valueCounts = {};
      values.forEach(v => {
        valueCounts[v] = (valueCounts[v] || 0) + 1;
      });
      
      const sorted = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([val, count]) => ({ value: val, count, type: 'frequent' }));
      
      // 2. Recent Values (Last 5)
      const recent = [...new Set(values.slice(-5))].map(val => ({ 
        value: val, 
        type: 'recent' 
      }));
      
      // 3. Pattern Detection for Numeric Values
      const numericValues = values.filter(v => !isNaN(v) && v !== '').map(Number);
      if (numericValues.length > 2) {
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        const median = getMedian(numericValues);
        
        // Detect if it's an incremental sequence
        const isSequential = detectSequentialPattern(numericValues);
        
        suggestions[header] = {
          type: 'numeric',
          frequent: sorted,
          recent,
          stats: { 
            min, 
            max, 
            avg: Math.round(avg * 100) / 100,
            median: Math.round(median * 100) / 100
          },
          range: generateSmartNumericRange(min, max, avg),
          isSequential
        };
      } else {
        // 4. Text Pattern Detection
        const patterns = detectTextPatterns(values);
        
        suggestions[header] = {
          type: 'text',
          frequent: sorted,
          recent,
          patterns
        };
      }
    });
    
    setCustomSuggestions(suggestions);
  };

  const getMedian = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const detectSequentialPattern = (numbers) => {
    if (numbers.length < 3) return false;
    const diffs = [];
    for (let i = 1; i < numbers.length; i++) {
      diffs.push(numbers[i] - numbers[i - 1]);
    }
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const isConsistent = diffs.every(d => Math.abs(d - avgDiff) < avgDiff * 0.2);
    return isConsistent ? avgDiff : false;
  };

  const detectTextPatterns = (texts) => {
    const patterns = {
      hasPrefix: null,
      hasSuffix: null,
      commonWords: []
    };
    
    if (texts.length < 2) return patterns;
    
    // Find common prefix
    const sortedTexts = [...texts].sort();
    const first = sortedTexts[0].toString();
    const last = sortedTexts[sortedTexts.length - 1].toString();
    let prefixLen = 0;
    while (prefixLen < first.length && first[prefixLen] === last[prefixLen]) {
      prefixLen++;
    }
    if (prefixLen > 0) patterns.hasPrefix = first.substring(0, prefixLen);
    
    // Find common words
    const wordCounts = {};
    texts.forEach(text => {
      const words = text.toString().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });
    patterns.commonWords = Object.entries(wordCounts)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    
    return patterns;
  };

  const generateSmartNumericRange = (min, max, avg) => {
    const range = [];
    const step = Math.max(0.5, Math.round((max - min) / 10 * 100) / 100);
    
    // Add key values
    range.push(min);
    
    // Add values around average
    const avgRounded = Math.round(avg);
    for (let offset of [-2, -1, 0, 1, 2]) {
      const val = avgRounded + offset;
      if (val > min && val < max && !range.includes(val)) {
        range.push(val);
      }
    }
    
    // Add intermediate values
    for (let i = 1; i <= 8; i++) {
      const val = Math.round((min + step * i) * 100) / 100;
      if (!range.includes(val) && val < max) {
        range.push(val);
      }
    }
    
    range.push(max);
    return [...new Set(range)].sort((a, b) => a - b).slice(0, 12);
  };

  // Get suggestions for a field with prioritization
  const getSuggestionsForField = (header, currentValue) => {
    const fieldSuggestions = customSuggestions[header];
    if (!fieldSuggestions) return [];
    
    const allSuggestions = [];
    
    // Priority 1: Frequent values (most common)
    fieldSuggestions.frequent?.forEach(item => {
      allSuggestions.push({
        value: item.value,
        label: `${item.value}`,
        badge: 'Common',
        count: item.count,
        priority: 1
      });
    });
    
    // Priority 2: Recent values
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
    
    // Priority 3: Smart numeric suggestions
    if (fieldSuggestions.type === 'numeric') {
      // Add statistics-based suggestions
      if (fieldSuggestions.stats) {
        const { avg, median } = fieldSuggestions.stats;
        if (!allSuggestions.find(s => s.value === avg)) {
          allSuggestions.push({
            value: avg,
            label: `${avg} (Avg)`,
            badge: 'Average',
            priority: 3
          });
        }
        if (!allSuggestions.find(s => s.value === median)) {
          allSuggestions.push({
            value: median,
            label: `${median} (Median)`,
            badge: 'Median',
            priority: 3
          });
        }
      }
      
      // Add range values
      fieldSuggestions.range?.forEach(val => {
        if (!allSuggestions.find(s => s.value === val)) {
          allSuggestions.push({
            value: val,
            label: `${val}`,
            badge: 'Range',
            priority: 4
          });
        }
      });
    }
    
    // Priority 4: Pattern-based suggestions for text
    if (fieldSuggestions.type === 'text' && fieldSuggestions.patterns) {
      const { hasPrefix, commonWords } = fieldSuggestions.patterns;
      if (hasPrefix && currentValue && currentValue.startsWith(hasPrefix)) {
        // User is typing something with the common prefix
        // Could suggest completions here
      }
    }
    
    return allSuggestions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 12);
  };

  // Update cell with auto-analysis
  const updateCell = (rowIndex, header, value) => {
    const newData = [...data];
    newData[rowIndex][header] = value;
    setData(newData);
    addToHistory(newData);
    
    // Re-analyze with updated data
    analyzeDataForSuggestions(headers, newData);
  };

  // History management
  const addToHistory = (newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    if (newHistory.length > 50) newHistory.shift();
    else setHistoryIndex(newHistory.length - 1);
    setHistory(newHistory);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(history[newIndex])));
      showToast('Undo successful');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(history[newIndex])));
      showToast('Redo successful');
    }
  };

  // Add row
  const addRow = () => {
    const newRow = {};
    headers.forEach(h => newRow[h] = '');
    const newData = [...data, newRow];
    setData(newData);
    addToHistory(newData);
    showToast('Row added ✨');
    
    if (isCardView) {
      setCurrentCardIndex(getFilteredData(newData).length - 1);
    }
  };

  // Delete row
  const deleteRow = (index) => {
    if (window.confirm('Delete this row?')) {
      const newData = data.filter((_, i) => i !== index);
      setData(newData);
      addToHistory(newData);
      showToast('Row deleted');
    }
  };

  // Download
  const handleDownload = () => {
    if (data.length === 0) return;
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    const fileName = currentFileName 
      ? currentFileName.replace('.xlsx', `_edited_${Date.now()}.xlsx`)
      : `edited_${Date.now()}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showToast('File downloaded successfully! 📥');
  };

  // Storage functions
  const saveFileHistory = (fileName, wb, sheetNames) => {
    const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
    const fileEntry = {
      fileName,
      timestamp: new Date().toISOString(),
      sheets: sheetNames.length,
      rows: data.length,
      state: {
        sheets: sheetNames,
        activeSheet,
        data,
        headers,
        filters,
        searchTerm,
        currentCardIndex,
        isCardView
      }
    };
    
    const existingIndex = fileHistory.findIndex(f => f.fileName === fileName);
    if (existingIndex >= 0) fileHistory.splice(existingIndex, 1);
    
    fileHistory.unshift(fileEntry);
    localStorage.setItem('excelFileHistory', JSON.stringify(fileHistory.slice(0, 10)));
  };

  const saveToStorage = () => {
    if (!autoSave || data.length === 0) return;
    if (currentFileName) {
      const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
      if (fileHistory.length > 0) {
        fileHistory[0].state = {
          sheets,
          activeSheet,
          data,
          headers,
          filters,
          searchTerm,
          currentCardIndex,
          isCardView
        };
        localStorage.setItem('excelFileHistory', JSON.stringify(fileHistory));
      }
    }
  };

  const loadFromStorage = () => {
    try {
      const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
      if (fileHistory.length > 0) {
        const lastFile = fileHistory[0];
        loadFileFromHistory(lastFile);
      }
    } catch (e) {
      console.error('Load error:', e);
    }
  };

  const loadFileFromHistory = (fileEntry) => {
    const state = fileEntry.state;
    setCurrentFileName(fileEntry.fileName);
    setSheets(state.sheets || []);
    setActiveSheet(state.activeSheet || 0);
    setData(state.data || []);
    setHeaders(state.headers || []);
    setFilters(state.filters || {});
    setSearchTerm(state.searchTerm || '');
    setCurrentCardIndex(state.currentCardIndex || 0);
    setIsCardView(state.isCardView || false);
    setHistory([JSON.parse(JSON.stringify(state.data || []))]);
    setHistoryIndex(0);
    
    if (state.data && state.data.length > 0) {
      analyzeDataForSuggestions(state.headers || [], state.data || []);
      showToast(`Loaded: ${fileEntry.fileName}`);
    }
  };

  // Filtering
  const getFilteredData = (dataSet = data) => {
    return dataSet.filter(row => {
      const matchesFilters = Object.entries(filters).every(
        ([key, value]) => String(row[key]) === String(value)
      );
      const matchesSearch = searchTerm === '' || 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesFilters && matchesSearch;
    });
  };

  const filteredData = getFilteredData();

  // Render suggestion dropdown
  const renderSuggestionDropdown = (rowIndex, header, currentValue) => {
    const suggestions = getSuggestionsForField(header, currentValue);
    const inputId = `input-${rowIndex}-${header}`;
    
    if (suggestions.length === 0) return null;
    
    return activeSuggestionInput === inputId && (
      <div className="absolute z-50 mt-1 w-full bg-white/95 backdrop-blur-lg border-2 border-[#D4A574]/30 rounded-xl shadow-2xl max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
        <div className="sticky top-0 bg-gradient-to-r from-[#6D776E]/90 to-[#D4A574]/90 text-white px-3 py-2 text-xs font-bold flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          Smart Suggestions
        </div>
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="px-3 py-2.5 cursor-pointer hover:bg-[#FFF8EB] border-b border-[#E8DCC8] last:border-0 flex items-center justify-between group transition-all hover:pl-4"
            onClick={() => {
              updateCell(rowIndex, header, suggestion.value);
              setActiveSuggestionInput(null);
            }}
          >
            <span className="font-medium text-[#2C3E2F] group-hover:text-[#6D776E]">
              {suggestion.label}
            </span>
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
              suggestion.badge === 'Common' ? 'bg-[#D4A574] text-white' :
              suggestion.badge === 'Recent' ? 'bg-[#6D776E] text-white' :
              suggestion.badge === 'Average' || suggestion.badge === 'Median' ? 'bg-blue-500 text-white' :
              'bg-[#E8DCC8] text-[#6D776E]'
            }`}>
              {suggestion.badge}
              {suggestion.count ? ` (${suggestion.count})` : ''}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render cell input
  const renderCellInput = (rowIndex, header, value) => {
    const inputId = `input-${rowIndex}-${header}`;
    const hasSuggestions = getSuggestionsForField(header, value).length > 0;
    
    return (
      <div className="relative w-full">
        <input
          type="text"
          id={inputId}
          value={value}
          onChange={(e) => updateCell(rowIndex, header, e.target.value)}
          onFocus={() => hasSuggestions && setActiveSuggestionInput(inputId)}
          onBlur={() => setTimeout(() => setActiveSuggestionInput(null), 200)}
          className="w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-[#E8DCC8] rounded-lg focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20 transition-all outline-none text-sm"
          placeholder={`Enter ${header}`}
        />
        {hasSuggestions && activeSuggestionInput === inputId && (
          <div className="absolute right-2 top-2.5 pointer-events-none">
            <svg className="w-4 h-4 text-[#D4A574] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </div>
        )}
        {renderSuggestionDropdown(rowIndex, header, value)}
      </div>
    );
  };

  const getTimeAgo = (date) => {
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8EB] via-[#F5EFE6] to-[#E8DCC8] p-4 relative overflow-hidden">
      {/* Japanese Art Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <svg className="absolute top-10 right-10 w-64 h-64" viewBox="0 0 200 200">
          <circle cx="100" cy="40" r="35" fill="#D4A574"/>
          <path d="M30,120 Q50,80 70,120 T110,120 T150,120 T190,120" stroke="#6D776E" strokeWidth="2" fill="none"/>
          <rect x="80" y="80" width="40" height="60" fill="#2C3E2F" opacity="0.8"/>
          <rect x="85" y="95" width="30" height="20" fill="#FFF8EB"/>
        </svg>
        <svg className="absolute bottom-20 left-10 w-48 h-48" viewBox="0 0 150 150">
          <circle cx="75" cy="30" r="25" fill="#C19563" opacity="0.6"/>
          <path d="M20,80 Q40,60 60,80 T100,80" stroke="#6D776E" strokeWidth="3" fill="none"/>
        </svg>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-3 rounded-xl shadow-2xl backdrop-blur-lg slide-in-from-right ${
          toast.type === 'success' 
            ? 'bg-gradient-to-r from-emerald-500/90 to-green-600/90 text-white' 
            : 'bg-gradient-to-r from-red-500/90 to-rose-600/90 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {toast.type === 'success' ? (
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
              ) : (
                <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
              )}
            </svg>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-effect rounded-2xl shadow-2xl p-6 mb-6 border border-[#E8DCC8]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <svg className="w-12 h-12 text-[#D4A574]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="3" y1="15" x2="21" y2="15"/>
              </svg>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#6D776E] to-[#D4A574] bg-clip-text text-transparent">
                  Excel Editor Pro
                </h1>
                <p className="text-[#6D776E] font-medium">Professional Data Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 px-4 py-2 glass-effect rounded-lg border border-[#E8DCC8] cursor-pointer hover:bg-white/80 transition-all">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="rounded text-[#D4A574]"
                />
                <span className="text-sm font-medium text-[#2C3E2F]">Auto-save</span>
              </label>
              
              <div className="inline-flex glass-effect rounded-xl p-1 border border-[#E8DCC8]">
                <button
                  onClick={() => setIsCardView(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    !isCardView
                      ? 'bg-gradient-to-r from-[#6D776E] to-[#D4A574] text-white shadow-lg'
                      : 'text-[#6D776E] hover:bg-white/50'
                  }`}
                >
                  <svg className="inline-block w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                  </svg>
                  Table
                </button>
                <button
                  onClick={() => setIsCardView(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isCardView
                      ? 'bg-gradient-to-r from-[#6D776E] to-[#D4A574] text-white shadow-lg'
                      : 'text-[#6D776E] hover:bg-white/50'
                  }`}
                >
                  <svg className="inline-block w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="18" rx="2"/>
                    <line x1="2" y1="9" x2="22" y2="9"/>
                  </svg>
                  Card
                </button>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-gradient-to-r from-[#6D776E] to-[#D4A574] text-white rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all font-medium"
            >
              <svg className="inline-block w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Upload File
            </button>
            
            <button
              onClick={handleDownload}
              disabled={data.length === 0}
              className="px-6 py-3 bg-white border-2 border-[#D4A574] text-[#6D776E] rounded-lg shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              <svg className="inline-block w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Download
            </button>
            
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="px-4 py-3 bg-white border-2 border-[#E8DCC8] text-[#6D776E] rounded-lg hover:border-[#D4A574] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6M21 17a9 9 0 00-9-9 9 9 0 00-9 9"/>
              </svg>
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="px-4 py-3 bg-white border-2 border-[#E8DCC8] text-[#6D776E] rounded-lg hover:border-[#D4A574] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6M3 17a9 9 0 019-9 9 9 0 019 9"/>
              </svg>
            </button>
            
            <button
              onClick={addRow}
              disabled={data.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-[#D4A574] to-[#C19563] text-white rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              <svg className="inline-block w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Row
            </button>
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-6 py-3 bg-white border-2 border-[#E8DCC8] text-[#6D776E] rounded-lg hover:border-[#D4A574] transition-all font-medium"
            >
              <svg className="inline-block w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
              </svg>
              Files
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        {data.length > 0 && (
          <div className="glass-effect rounded-2xl shadow-xl p-4 mb-6 border border-[#E8DCC8] animate-fade-in">
            <div className="relative mb-4">
              <svg className="absolute left-3 top-3 w-5 h-5 text-[#D4A574]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across all columns..."
                className="w-full pl-10 pr-4 py-3 glass-effect border-2 border-[#E8DCC8] rounded-xl focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20 transition-all outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {headers.map(header => {
                const uniqueValues = [...new Set(data.map(row => row[header]))].filter(v => v !== '' && v !== '-').sort();
                return (
                  <div key={header}>
                    <label className="block text-xs font-semibold text-[#6D776E] mb-1.5 truncate" title={header}>
                      {header}
                    </label>
                    <select
                      value={filters[header] || ''}
                      onChange={(e) => {
                        const newFilters = { ...filters };
                        if (e.target.value === '') {
                          delete newFilters[header];
                        } else {
                          newFilters[header] = e.target.value;
                        }
                        setFilters(newFilters);
                        setCurrentCardIndex(0);
                      }}
                      className="w-full px-3 py-2 glass-effect border-2 border-[#E8DCC8] rounded-lg focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20 transition-all outline-none text-sm"
                    >
                      <option value="">All ({uniqueValues.length})</option>
                      {uniqueValues.slice(0, 100).map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* File History Panel */}
        {showHistory && (
          <div className="glass-effect rounded-2xl shadow-xl p-6 mb-6 border border-[#E8DCC8] slide-in-from-top">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#2C3E2F]">Saved Files</h3>
              <button
                onClick={() => {
                  if (window.confirm('Clear all saved files? This cannot be undone.')) {
                    localStorage.removeItem('excelFileHistory');
                    setShowHistory(false);
                    showToast('History cleared');
                  }
                }}
                className="text-red-500 text-sm font-medium hover:text-red-700 px-3 py-1 hover:bg-red-50 rounded transition-all"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(() => {
                const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
                if (fileHistory.length === 0) {
                  return <p className="text-[#6D776E] text-center py-8">No saved files</p>;
                }
                return fileHistory.map((item, idx) => {
                  const date = new Date(item.timestamp);
                  const timeAgo = getTimeAgo(date);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        loadFileFromHistory(item);
                        setShowHistory(false);
                      }}
                      className="p-4 glass-effect rounded-xl border-2 border-[#E8DCC8] hover:border-[#D4A574] cursor-pointer transform hover:scale-[1.02] transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#2C3E2F] truncate">{item.fileName}</p>
                          <p className="text-xs text-[#6D776E]">
                            {item.sheets} sheet{item.sheets > 1 ? 's' : ''} • {item.rows} rows
                          </p>
                        </div>
                        <span className="text-xs text-[#D4A574] whitespace-nowrap ml-2 font-medium">
                          {timeAgo}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {data.length === 0 ? (
          <div className="glass-effect rounded-2xl shadow-2xl p-12 text-center border border-[#E8DCC8] animate-fade-in">
            <svg className="mx-auto w-24 h-24 text-[#D4A574] mb-6 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <h2 className="text-3xl font-bold text-[#2C3E2F] mb-3">No Data Yet</h2>
            <p className="text-[#6D776E] mb-6 text-lg">Upload an Excel file to start managing your data</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-gradient-to-r from-[#6D776E] to-[#D4A574] text-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all font-medium text-lg"
            >
              Choose File
            </button>
          </div>
        ) : isCardView ? (
          <>
            {/* Card View Navigation */}
            <div className="glass-effect rounded-2xl shadow-xl p-4 mb-6 border border-[#E8DCC8] animate-fade-in">
              <div className="flex justify-between items-center">
                <div className="text-[#2C3E2F] font-bold flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#D4A574]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="18" rx="2"/>
                    <line x1="2" y1="9" x2="22" y2="9"/>
                  </svg>
                  Card {currentCardIndex + 1} of {filteredData.length}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                    disabled={currentCardIndex === 0}
                    className="px-4 py-2 bg-white border-2 border-[#E8DCC8] text-[#6D776E] rounded-lg hover:border-[#D4A574] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this card?')) {
                        const row = filteredData[currentCardIndex];
                        const originalIndex = data.indexOf(row);
                        deleteRow(originalIndex);
                      }
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg hover:shadow-xl"
                  >
                    🗑️ Delete
                  </button>
                  <button
                    onClick={() => setCurrentCardIndex(Math.min(filteredData.length - 1, currentCardIndex + 1))}
                    disabled={currentCardIndex === filteredData.length - 1}
                    className="px-4 py-2 bg-gradient-to-r from-[#6D776E] to-[#D4A574] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="glass-effect rounded-2xl shadow-2xl p-8 border border-[#E8DCC8] animate-fade-in">
              {filteredData.length > 0 && (() => {
                const row = filteredData[currentCardIndex];
                const originalIndex = data.indexOf(row);
                return (
                  <div className="space-y-4">
                    {headers.map(header => (
                      <div key={header} className="border-b border-[#E8DCC8] pb-4 p-3 rounded-xl hover:bg-[#FFF8EB]/50 transition-all">
                        <label className="block text-sm font-bold text-[#2C3E2F] mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#D4A574]" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          {header}
                        </label>
                        {renderCellInput(originalIndex, header, row[header])}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </>
        ) : (
          <div className="glass-effect rounded-2xl shadow-2xl overflow-hidden border border-[#E8DCC8] animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#6D776E] to-[#D4A574] text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-left font-bold text-sm">Actions</th>
                    {headers.map(h => (
                      <th key={h} className="px-4 py-4 text-left font-bold text-sm whitespace-nowrap" title={h}>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                          </svg>
                          {h}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length + 1} className="px-6 py-12 text-center text-[#6D776E] text-lg">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-16 h-16 text-[#D4A574] opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                          </svg>
                          No data matches your filters
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => {
                      const originalIndex = data.indexOf(row);
                      return (
                        <tr key={originalIndex} className="border-b border-[#E8DCC8] hover:bg-[#FFF8EB]/50 transition-all">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => deleteRow(originalIndex)}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete row"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </td>
                          {headers.map(header => (
                            <td key={header} className="px-4 py-3">
                              <div className="min-w-[120px] max-w-[200px]">
                                {renderCellInput(originalIndex, header, row[header])}
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="fixed bottom-4 right-4 pointer-events-none opacity-10">
        <svg className="w-32 h-32" viewBox="0 0 100 100">
          <circle cx="50" cy="20" r="15" fill="#D4A574"/>
          <path d="M20,60 Q30,40 40,60 T60,60 T80,60" stroke="#6D776E" strokeWidth="2" fill="none"/>
        </svg>
      </div>
    </div>
  );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ExcelEditorPro />);
