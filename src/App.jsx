import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  Upload, Download, Undo, Redo, Plus, History, 
  Grid, CreditCard, Search, Trash2, X 
} from 'lucide-react';
import SuggestionInput from './components/SuggestionInput';
import Toast from './components/Toast';
import JapaneseOrnament from './components/JapaneseOrnament';

function App() {
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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [currentFileName, setCurrentFileName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Auto-save
  useEffect(() => {
    if (autoSaveEnabled && data.length > 0 && currentFileName) {
      const timer = setTimeout(() => saveToStorage(), 1000);
      return () => clearTimeout(timer);
    }
  }, [data, autoSaveEnabled, currentFileName]);

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
        showToast('Saved successfully');
      } else if (isCardView && !e.target.matches('input, textarea, select')) {
        if (e.key === 'ArrowLeft' && currentCardIndex > 0) {
          e.preventDefault();
          navigateCard(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateCard(1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, isCardView, currentCardIndex]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

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
        loadSheet(wb, 0, sheetNames);
        saveFileHistory(file.name, sheetNames);
        showToast('File uploaded successfully');
      }
    } catch (error) {
      showToast('Error loading file', 'error');
    }
  };

  const loadSheet = (wb, index, sheetNames) => {
    const ws = wb.Sheets[sheetNames[index]];
    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (jsonData.length > 0) {
      const cols = Object.keys(jsonData[0]);
      setHeaders(cols);
      setData(jsonData);
      setActiveSheet(index);
      setHistory([JSON.parse(JSON.stringify(jsonData))]);
      setHistoryIndex(0);
      setFilters({});
      setSearchTerm('');
      setCurrentCardIndex(0);
    }
  };

  const saveFileHistory = (fileName, sheetNames) => {
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

  const loadFromStorage = () => {
    try {
      const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
      if (fileHistory.length > 0) {
        const lastFile = fileHistory[0];
        loadFileFromHistory(lastFile.state, lastFile.fileName);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const saveToStorage = () => {
    if (currentFileName && data.length > 0) {
      saveFileHistory(currentFileName, sheets);
    }
  };

  const loadFileFromHistory = (state, fileName) => {
    setCurrentFileName(fileName);
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
    setShowHistory(false);
    showToast(`Loaded: ${fileName}`);
  };

  const handleDownload = () => {
    if (data.length === 0) return;

    const wb = XLSX.utils.book_new();
    sheets.forEach((sheetName, idx) => {
      const wsData = idx === activeSheet ? data : [];
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const fileName = currentFileName
      ? currentFileName.replace('.xlsx', `_edited_${Date.now()}.xlsx`)
      : `edited_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('File downloaded');
  };

  const updateCell = (rowIndex, header, value) => {
    if (rowIndex < 0 || rowIndex >= data.length) return;

    const newData = [...data];
    newData[rowIndex][header] = value;
    setData(newData);
    addToHistory(newData);
  };

  const addRow = () => {
    const newRow = {};
    headers.forEach(h => (newRow[h] = ''));
    const newData = [...data, newRow];
    setData(newData);
    addToHistory(newData);
    showToast('Row added');

    if (isCardView) {
      const filteredData = getFilteredData(newData);
      setCurrentCardIndex(filteredData.length - 1);
    }
  };

  const deleteRow = (index) => {
    if (index < 0 || index >= data.length) return;

    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    addToHistory(newData);
    showToast('Row deleted');

    const filteredData = getFilteredData(newData);
    if (currentCardIndex >= filteredData.length) {
      setCurrentCardIndex(Math.max(0, filteredData.length - 1));
    }
  };

  const addToHistory = (newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory.slice(-50));
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setData(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      showToast('Undo successful');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setData(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      showToast('Redo successful');
    }
  };

  const getFilteredData = (dataToFilter = data) => {
    return dataToFilter.filter(row => {
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

  const navigateCard = (direction) => {
    const filteredData = getFilteredData();
    const newIndex = currentCardIndex + direction;
    setCurrentCardIndex(Math.max(0, Math.min(newIndex, filteredData.length - 1)));
  };

  const clearAllHistory = () => {
    if (window.confirm('Clear all saved files? This cannot be undone.')) {
      localStorage.removeItem('excelFileHistory');
      showToast('History cleared');
      setShowHistory(false);
    }
  };

  const filteredData = getFilteredData();
  const hasData = data.length > 0;

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 relative overflow-hidden paper-texture">
      <JapaneseOrnament />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl shadow-2xl p-4 md:p-6 mb-4 md:mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-sage mb-1">
                Excel Editor Pro
              </h1>
              <p className="text-terracotta text-sm">Professional Data Management System</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-sage font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded"
                />
                <span>Auto-save</span>
              </label>

              <div className="inline-flex bg-white rounded-xl p-1 shadow-md">
                <button
                  onClick={() => setIsCardView(false)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    !isCardView
                      ? 'bg-gradient-to-r from-terracotta to-sand text-white shadow-lg'
                      : 'text-terracotta'
                  }`}
                >
                  <Grid className="inline-block" size={16} />
                  <span className="ml-1 hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setIsCardView(true)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    isCardView
                      ? 'bg-gradient-to-r from-terracotta to-sand text-white shadow-lg'
                      : 'text-terracotta'
                  }`}
                >
                  <CreditCard className="inline-block" size={16} />
                  <span className="ml-1 hidden sm:inline">Card</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="fileInput"
            />
            <button
              onClick={() => document.getElementById('fileInput').click()}
              className="btn-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2"
            >
              <Upload size={16} />
              <span>Upload</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={!hasData}
              className="btn-secondary px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} />
              <span>Download</span>
            </button>

            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="bg-white text-terracotta px-3 py-2 md:py-3 rounded-lg shadow-md border-2 border-cream disabled:opacity-50"
              title="Undo"
            >
              <Undo size={16} />
            </button>

            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="bg-white text-terracotta px-3 py-2 md:py-3 rounded-lg shadow-md border-2 border-cream disabled:opacity-50"
              title="Redo"
            >
              <Redo size={16} />
            </button>

            <button
              onClick={addRow}
              disabled={!hasData}
              className="btn-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={16} />
              <span>Add Row</span>
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="bg-white text-terracotta px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-md border-2 border-cream font-medium text-sm flex items-center gap-2"
            >
              <History size={16} />
              <span>Files</span>
            </button>
          </div>
        </motion.div>

        {/* Sheets Navigation */}
        <AnimatePresence>
          {sheets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-xl shadow-lg p-3 mb-4"
            >
              <div className="flex gap-2 overflow-x-auto pb-2">
                {sheets.map((sheet, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (workbook) {
                        loadSheet(workbook, idx, sheets);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap text-sm transition-all ${
                      activeSheet === idx
                        ? 'bg-gradient-to-r from-terracotta to-sand text-white shadow-lg'
                        : 'bg-white text-terracotta hover:bg-cream border-2 border-cream'
                    }`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <AnimatePresence>
          {hasData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-xl shadow-lg p-4 mb-4"
            >
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-terracotta" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search across all columns..."
                    className="w-full pl-10 pr-4 py-2 border-2 border-cream rounded-lg focus:border-terracotta focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {headers.map(header => {
                  const uniqueValues = [...new Set(data.map(row => row[header]))]
                    .filter(v => v !== '' && v !== '-')
                    .sort();

                  return (
                    <div key={header}>
                      <label className="block text-xs font-medium text-sage mb-1.5 truncate" title={header}>
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
                        className="w-full px-2 py-2 border-2 border-cream rounded-lg focus:border-terracotta focus:outline-none text-xs"
                      >
                        <option value="">All ({uniqueValues.length})</option>
                        {uniqueValues.slice(0, 100).map(val => (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-xl shadow-lg p-4 mb-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-sage">Saved Files</h3>
                <button
                  onClick={clearAllHistory}
                  className="text-red-500 text-sm font-medium hover:text-red-700 px-3 py-1 hover:bg-red-50 rounded"
                >
                  Clear All
                </button>
              </div>
              <HistoryList onLoad={loadFileFromHistory} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Views */}
        {!hasData ? (
          <EmptyState />
        ) : isCardView ? (
          <CardView
            data={filteredData}
            headers={headers}
            currentIndex={currentCardIndex}
            onNavigate={navigateCard}
            onUpdate={updateCell}
            onDelete={deleteRow}
            allData={data}
          />
        ) : (
          <TableView
            data={filteredData}
            headers={headers}
            onUpdate={updateCell}
            onDelete={deleteRow}
            originalData={data}
            allData={data}
          />
        )}
      </div>

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl shadow-2xl p-8 text-center"
    >
      <Upload className="mx-auto text-stone mb-4" size={48} />
      <h2 className="text-2xl font-bold text-sage mb-2">No Data Yet</h2>
      <p className="text-terracotta mb-4">Upload an Excel file to start editing</p>
      <button
        onClick={() => document.getElementById('fileInput').click()}
        className="btn-primary text-white px-6 py-3 rounded-lg shadow-lg font-medium"
      >
        Choose File
      </button>
    </motion.div>
  );
}

// History List Component
function HistoryList({ onLoad }) {
  const [fileHistory, setFileHistory] = useState([]);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
    setFileHistory(history);
  }, []);

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
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
      if (interval >= 1) return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  };

  if (fileHistory.length === 0) {
    return <p className="text-terracotta text-center py-4">No saved files</p>;
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {fileHistory.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          onClick={() => onLoad(item.state, item.fileName)}
          className="p-3 bg-white rounded-lg border-2 border-cream hover:border-terracotta cursor-pointer transition-all hover:transform hover:translate-x-1"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sage text-sm truncate">{item.fileName}</p>
              <p className="text-xs text-terracotta">
                {item.sheets} sheet{item.sheets > 1 ? 's' : ''} • {item.rows} rows
              </p>
            </div>
            <span className="text-xs text-stone whitespace-nowrap ml-2">
              {getTimeAgo(item.timestamp)}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Table View Component
function TableView({ data, headers, onUpdate, onDelete, originalData, allData }) {
  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-xl shadow-2xl p-8 text-center"
      >
        <p className="text-terracotta text-lg">No data matches your filters</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-terracotta to-sand text-white sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-xs">Actions</th>
              {headers.map(h => (
                <th key={h} className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap" title={h}>
                  <div className="min-w-[80px] max-w-[150px] truncate">{h}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => {
              const originalIndex = originalData.indexOf(row);
              return (
                <motion.tr
                  key={originalIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rowIdx * 0.02 }}
                  className="border-b border-cream hover:bg-cream hover:bg-opacity-50"
                >
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onDelete(originalIndex)}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                  {headers.map(header => (
                    <td key={header} className="px-3 py-2">
                      <div title={row[header]} className="min-w-[80px] max-w-[150px]">
                        <SuggestionInput
                          value={row[header]}
                          column={header}
                          rowIndex={originalIndex}
                          onChange={(value) => onUpdate(originalIndex, header, value)}
                          allData={allData}
                          isCard={false}
                        />
                      </div>
                    </td>
                  ))}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Card View Component
function CardView({ data, headers, currentIndex, onNavigate, onUpdate, onDelete, allData }) {
  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-xl shadow-2xl p-8 text-center"
      >
        <p className="text-terracotta text-lg mb-4">No data matches your filters</p>
      </motion.div>
    );
  }

  const row = data[currentIndex];
  const originalIndex = allData.indexOf(row);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-center gap-3 glass rounded-xl p-4 shadow-lg mb-4"
      >
        <div className="text-sage font-semibold text-sm">
          Card {currentIndex + 1} of {data.length}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => onNavigate(-1)}
            disabled={currentIndex === 0}
            className="flex-1 sm:flex-none bg-white text-terracotta px-4 py-2 rounded-lg shadow-md border-2 border-cream text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => onDelete(originalIndex)}
            className="flex-1 sm:flex-none bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 text-sm"
          >
            Delete
          </button>
          <button
            onClick={() => onNavigate(1)}
            disabled={currentIndex === data.length - 1}
            className="flex-1 sm:flex-none btn-primary text-white px-4 py-2 rounded-lg shadow-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </motion.div>

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="glass rounded-xl shadow-2xl p-4 md:p-8"
      >
        <div className="space-y-3">
          {headers.map((header, idx) => (
            <motion.div
              key={header}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="border-b border-cream pb-3 p-2 rounded-lg hover:bg-ivory transition-all"
            >
              <label className="block text-sm font-semibold text-sage mb-2">{header}</label>
              <SuggestionInput
                value={row[header]}
                column={header}
                rowIndex={originalIndex}
                onChange={(value) => onUpdate(originalIndex, header, value)}
                allData={allData}
                isCard={true}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  );
}

export default App;
