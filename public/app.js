import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Download, Undo, Redo, Search, Filter, History, Plus, Trash2, Edit2, Check, X, Grid, Table2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';

const ExcelEditor = () => {
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [savedHistory, setSavedHistory] = useState([]);
  const [editCell, setEditCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showFilterDropdown, setShowFilterDropdown] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem('excelEditorState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.sheets && state.sheets.length > 0) {
          setSheets(state.sheets);
          setActiveSheet(state.activeSheet || 0);
          setData(state.data || []);
          setHeaders(state.headers || []);
          setHistory(state.history || [state.data]);
          setHistoryIndex(state.historyIndex >= 0 ? state.historyIndex : 0);
        }
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }

    // Load history
    const historyData = localStorage.getItem('excelEditorHistory');
    if (historyData) {
      try {
        setSavedHistory(JSON.parse(historyData));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && data.length > 0 && headers.length > 0) {
      const timer = setTimeout(() => {
        const state = {
          sheets,
          activeSheet,
          data,
          headers,
          history,
          historyIndex,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('excelEditorState', JSON.stringify(state));
        
        // Save to history
        const historyData = JSON.parse(localStorage.getItem('excelEditorHistory') || '[]');
        const newHistoryItem = {
          timestamp: new Date().toISOString(),
          sheetName: sheets[activeSheet] || 'Sheet 1',
          rowCount: data.length,
          id: Date.now()
        };
        const updatedHistory = [newHistoryItem, ...historyData.filter(h => h.id !== newHistoryItem.id)].slice(0, 10);
        localStorage.setItem('excelEditorHistory', JSON.stringify(updatedHistory));
        setSavedHistory(updatedHistory);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [data, headers, sheets, activeSheet, autoSaveEnabled, history, historyIndex]);

  // Focus edit input when editing
  useEffect(() => {
    if (editCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editCell]);

  const addToHistory = useCallback((newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // AI-powered number prediction
  const generateAISuggestions = useCallback((header, currentValue) => {
    const columnData = data.map(row => parseFloat(row[header])).filter(val => !isNaN(val));
    if (columnData.length === 0) return [];

    const avg = columnData.reduce((a, b) => a + b, 0) / columnData.length;
    const min = Math.min(...columnData);
    const max = Math.max(...columnData);
    const lastValue = columnData[columnData.length - 1];

    const suggestions = new Set();
    
    // Add common patterns
    if (header.toLowerCase().includes('height')) {
      [150, 155, 160, 165, 170, 175, 180, 185, 190].forEach(v => suggestions.add(v));
    } else if (header.toLowerCase().includes('weight')) {
      [45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].forEach(v => suggestions.add(v));
    } else if (header.toLowerCase().includes('chest') || header.toLowerCase().includes('hip')) {
      [70, 75, 80, 85, 90, 95, 100, 105, 110].forEach(v => suggestions.add(v));
    } else if (header.toLowerCase().includes('bmi')) {
      [18.5, 20, 22, 24, 25, 27, 30].forEach(v => suggestions.add(v));
    }

    // Add statistical suggestions
    suggestions.add(Math.round(avg));
    suggestions.add(Math.round(avg - 5));
    suggestions.add(Math.round(avg + 5));
    
    if (lastValue) {
      suggestions.add(Math.round(lastValue));
      suggestions.add(Math.round(lastValue + 1));
      suggestions.add(Math.round(lastValue - 1));
    }

    // If user is typing, filter suggestions
    if (currentValue && !isNaN(currentValue)) {
      const numValue = parseFloat(currentValue);
      for (let i = -2; i <= 2; i++) {
        suggestions.add(Math.round(numValue + i));
      }
    }

    return Array.from(suggestions)
      .filter(v => v > 0)
      .sort((a, b) => a - b)
      .slice(0, 10);
  }, [data]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);
      
      setWorkbook(wb);
      setSheets(wb.SheetNames);
      
      if (wb.SheetNames.length > 0) {
        loadSheet(wb, 0, XLSX);
      }
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Error loading Excel file. Please try again.');
    }
  };

  const loadSheet = async (wb, index, XLSX) => {
    if (!XLSX) {
      XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
    }
    
    const wsname = wb.SheetNames[index];
    const ws = wb.Sheets[wsname];
    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
    
    if (jsonData.length > 0) {
      const cols = Object.keys(jsonData[0]);
      setHeaders(cols);
      setData(jsonData);
      setActiveSheet(index);
      setHistory([jsonData]);
      setHistoryIndex(0);
      setFilters({});
      setSearchTerm('');
      setCurrentCardIndex(0);
    }
  };

  const handleSheetChange = async (index) => {
    if (workbook) {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
      loadSheet(workbook, index, XLSX);
    }
  };

  const handleDownload = async () => {
    if (data.length === 0) return;
    
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
    const wb = XLSX.utils.book_new();
    
    sheets.forEach((sheetName, idx) => {
      const wsData = idx === activeSheet ? data : [];
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    XLSX.writeFile(wb, `edited_${new Date().getTime()}.xlsx`);
  };

  const handleCellEdit = (rowIndex, header) => {
    setEditCell({ rowIndex, header });
    const value = data[rowIndex][header] || '';
    setEditValue(value);
    
    // Show AI suggestions for number fields
    const suggestions = generateAISuggestions(header, value);
    setAiSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  };

  const handleCellSave = () => {
    if (editCell) {
      const newData = [...data];
      newData[editCell.rowIndex][editCell.header] = editValue;
      setData(newData);
      addToHistory(newData);
      setEditCell(null);
      setEditValue('');
      setShowSuggestions(false);
    }
  };

  const handleCellCancel = () => {
    setEditCell(null);
    setEditValue('');
    setShowSuggestions(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const selectSuggestion = (value) => {
    setEditValue(value.toString());
    setShowSuggestions(false);
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }, 0);
  };

  const addRow = () => {
    const newRow = {};
    headers.forEach(h => newRow[h] = '');
    const newData = [...data, newRow];
    setData(newData);
    addToHistory(newData);
    setCurrentCardIndex(newData.length - 1);
  };

  const deleteRow = (index) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    addToHistory(newData);
    if (currentCardIndex >= newData.length) {
      setCurrentCardIndex(Math.max(0, newData.length - 1));
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setData(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setData(history[historyIndex + 1]);
    }
  };

  const handleFilterChange = (header, value) => {
    setFilters({ ...filters, [header]: value });
    setShowFilterDropdown({ ...showFilterDropdown, [header]: false });
  };

  const getUniqueValues = (header) => {
    const values = new Set(data.map(row => row[header]).filter(v => v !== ''));
    return Array.from(values).sort();
  };

  const clearFilter = (header) => {
    const newFilters = { ...filters };
    delete newFilters[header];
    setFilters(newFilters);
  };

  const filteredData = data.filter(row => {
    const matchesFilters = Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      return String(row[key]).toLowerCase().includes(value.toLowerCase());
    });
    
    const matchesSearch = searchTerm === '' || 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesFilters && matchesSearch;
  });

  const loadHistoryItem = (item) => {
    const confirmed = window.confirm(`Load data from ${new Date(item.timestamp).toLocaleString()}?`);
    if (confirmed) {
      const saved = localStorage.getItem('excelEditorState');
      if (saved) {
        try {
          const state = JSON.parse(saved);
          setData(state.data);
          setHeaders(state.headers);
          setSheets(state.sheets);
          setActiveSheet(state.activeSheet);
          setHistory([state.data]);
          setHistoryIndex(0);
          setShowHistory(false);
        } catch (e) {
          console.error('Failed to load history:', e);
        }
      }
    }
  };

  const nextCard = () => {
    if (currentCardIndex < filteredData.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEEED3] to-[#BDC8B3] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-6 mb-4 md:mb-6 animate-fadeIn border-2 border-[#7E9A77]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-[#7E9A77]">Excel Editor Pro</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-[#7E9A77] font-medium">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded border-[#7E9A77]"
                />
                Auto-save
              </label>
              <div className="flex gap-2 bg-[#BDC8B3] p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-[#7E9A77] text-white' : 'text-[#7E9A77]'}`}
                >
                  <Table2 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-[#7E9A77] text-white' : 'text-[#7E9A77]'}`}
                >
                  <Grid size={18} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-[#7E9A77] text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-[#6B8A6B] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-sm md:text-base"
            >
              <Upload size={18} />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              onClick={handleDownload}
              disabled={data.length === 0}
              className="flex items-center gap-2 bg-[#BDC8B3] text-[#7E9A77] px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-[#A8B89F] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 text-sm md:text-base font-medium"
            >
              <Download size={18} />
              Download
            </button>
            
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="flex items-center gap-2 bg-[#EEEED3] text-[#7E9A77] px-3 md:px-4 py-2 md:py-3 rounded-lg hover:bg-[#E0E0C5] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#BDC8B3]"
            >
              <Undo size={18} />
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="flex items-center gap-2 bg-[#EEEED3] text-[#7E9A77] px-3 md:px-4 py-2 md:py-3 rounded-lg hover:bg-[#E0E0C5] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#BDC8B3]"
            >
              <Redo size={18} />
            </button>
            
            <button
              onClick={addRow}
              disabled={headers.length === 0}
              className="flex items-center gap-2 bg-[#7E9A77] text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-[#6B8A6B] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 text-sm md:text-base font-medium"
            >
              <Plus size={18} />
              Add Row
            </button>
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 bg-[#BDC8B3] text-[#7E9A77] px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-[#A8B89F] transition-all duration-300 shadow-lg transform hover:-translate-y-1 text-sm md:text-base font-medium"
            >
              <History size={18} />
              History
            </button>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4 md:mb-6 animate-slideIn border-2 border-[#7E9A77]">
            <h3 className="text-lg font-bold text-[#7E9A77] mb-3">Saved History</h3>
            {savedHistory.length > 0 ? (
              <div className="space-y-2">
                {savedHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-[#EEEED3] rounded-lg hover:bg-[#BDC8B3] transition-all">
                    <div>
                      <p className="font-medium text-[#7E9A77]">{item.sheetName}</p>
                      <p className="text-sm text-gray-600">{new Date(item.timestamp).toLocaleString()} - {item.rowCount} rows</p>
                    </div>
                    <button
                      onClick={() => loadHistoryItem(item)}
                      className="px-4 py-2 bg-[#7E9A77] text-white rounded-lg hover:bg-[#6B8A6B] transition-all text-sm"
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No saved history yet</p>
            )}
          </div>
        )}

        {/* Sheet Tabs */}
        {sheets.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-4 md:mb-6 animate-slideIn border-2 border-[#7E9A77]">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sheets.map((sheet, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSheetChange(idx)}
                  className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-all duration-300 whitespace-nowrap text-sm md:text-base ${
                    activeSheet === idx
                      ? 'bg-[#7E9A77] text-white shadow-lg'
                      : 'bg-[#EEEED3] text-[#7E9A77] hover:bg-[#BDC8B3]'
                  }`}
                >
                  {sheet}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter */}
        {data.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4 md:mb-6 animate-slideIn border-2 border-[#7E9A77]">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-[#7E9A77]" size={20} />
                <input
                  type="text"
                  placeholder="Search across all columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#BDC8B3] rounded-lg focus:border-[#7E9A77] focus:outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {headers.map(header => (
                <div key={header} className="relative">
                  <button
                    onClick={() => setShowFilterDropdown({ ...showFilterDropdown, [header]: !showFilterDropdown[header] })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm border-2 border-[#BDC8B3] rounded-lg hover:border-[#7E9A77] transition-all bg-white text-left"
                  >
                    <Filter size={16} className="text-[#7E9A77]" />
                    <span className="flex-1 truncate text-[#7E9A77] font-medium">{header}</span>
                    {filters[header] && (
                      <XCircle 
                        size={16} 
                        className="text-red-500 cursor-pointer hover:text-red-700" 
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFilter(header);
                        }}
                      />
                    )}
                  </button>
                  
                  {showFilterDropdown[header] && (
                    <div className="absolute z-10 mt-1 w-full bg-white border-2 border-[#7E9A77] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="Type to filter..."
                          value={filters[header] || ''}
                          onChange={(e) => handleFilterChange(header, e.target.value)}
                          className="w-full px-3 py-2 border-2 border-[#BDC8B3] rounded-lg focus:border-[#7E9A77] focus:outline-none text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {getUniqueValues(header).map((value, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleFilterChange(header, value)}
                            className="w-full text-left px-4 py-2 hover:bg-[#EEEED3] transition-colors text-sm text-[#7E9A77]"
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card View Mode */}
        {viewMode === 'card' && filteredData.length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden animate-fadeIn border-2 border-[#7E9A77]">
            <div className="bg-[#7E9A77] text-white p-4 flex items-center justify-between">
              <button
                onClick={prevCard}
                disabled={currentCardIndex === 0}
                className="p-2 hover:bg-[#6B8A6B] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={24} />
              </button>
              
              <div className="text-center">
                <p className="text-sm opacity-90">Entry</p>
                <p className="text-2xl font-bold">{currentCardIndex + 1} / {filteredData.length}</p>
              </div>
              
              <button
                onClick={nextCard}
                disabled={currentCardIndex === filteredData.length - 1}
                className="p-2 hover:bg-[#6B8A6B] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {headers.map((header) => {
                  const rowIndex = data.indexOf(filteredData[currentCardIndex]);
                  const isEditing = editCell?.rowIndex === rowIndex && editCell?.header === header;
                  
                  return (
                    <div key={header} className="space-y-2">
                      <label className="block text-sm font-bold text-[#7E9A77] uppercase tracking-wide">
                        {header}
                      </label>
                      
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                const suggestions = generateAISuggestions(header, e.target.value);
                                setAiSuggestions(suggestions);
                                setShowSuggestions(suggestions.length > 0);
                              }}
                              onKeyDown={handleKeyPress}
                              className="flex-1 px-4 py-3 border-2 border-[#7E9A77] rounded-lg focus:outline-none text-lg"
                            />
                            <button
                              onClick={handleCellSave}
                              className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                            >
                              <Check size={20} />
                            </button>
                            <button
                              onClick={handleCellCancel}
                              className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          
                          {showSuggestions && aiSuggestions.length > 0 && (
                            <div className="bg-[#EEEED3] border-2 border-[#7E9A77] rounded-lg p-3">
                              <p className="text-xs font-semibold text-[#7E9A77] mb-2">AI Suggestions:</p>
                              <div className="flex flex-wrap gap-2">
                                {aiSuggestions.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => selectSuggestion(suggestion)}
                                    className="px-3 py-1.5 bg-[#7E9A77] text-white rounded-md hover:bg-[#6B8A6B] transition-all text-sm font-medium"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          onClick={() => handleCellEdit(rowIndex, header)}
                          className="px-4 py-3 bg-[#EEEED3] rounded-lg cursor-pointer hover:bg-[#BDC8B3] transition-all group border-2 border-transparent hover:border-[#7E9A77] min-h-[48px] flex items-center justify-between"
                        >
                          <span className="text-lg text-gray-800">{filteredData[currentCardIndex][header] || '—'}</span>
                          <Edit2 size={16} className="opacity-0 group-hover:opacity-100 text-[#7E9A77]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 flex justify-between items-center pt-6 border-t-2 border-[#BDC8B3]">
                <button
                  onClick={() => deleteRow(data.indexOf(filteredData[currentCardIndex]))}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg"
                >
                  <Trash2 size={18} />
                  Delete Entry
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={prevCard}
                    disabled={currentCardIndex === 0}
                    className="px-6 py-3 bg-[#BDC8B3] text-[#7E9A77] rounded-lg hover:bg-[#A8B89F] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextCard}
                    disabled={currentCardIndex === filteredData.length - 1}
                    className="px-6 py-3 bg-[#7E9A77] text-white rounded-lg hover:bg-[#6B8A6B] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table View Mode */}
        {viewMode === 'table' && data.length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden animate-fadeIn border-2 border-[#7E9A77]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#7E9A77] text-white">
                  <tr>
                    <th className="px-4 py-4 text-left font-semibold sticky left-0 bg-[#7E9A77] z-10">Actions</th>
                    {headers.map(header => (
                      <th key={header} className="px-4 py-4 text-left font-semibold whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, rowIndex) => {
                    const actualIndex = data.indexOf(row);
                    return (
                      <tr
                        key={rowIndex}
                        className="border-b border-[#BDC8B3] hover:bg-[#EEEED3] transition-all duration-200"
                      >
                        <td className="px-4 py-3 sticky left-0 bg-white hover:bg-[#EEEED3]">
                          <button
                            onClick={() => deleteRow(actualIndex)}
                            className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                        {headers.map(header => (
                          <td key={header} className="px-4 py-3">
                            {editCell?.rowIndex === actualIndex && editCell?.header === header ? (
                              <div className="relative">
                                <div className="flex items-center gap-2">
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => {
                                      setEditValue(e.target.value);
                                      const suggestions = generateAISuggestions(header, e.target.value);
                                      setAiSuggestions(suggestions);
                                      setShowSuggestions(suggestions.length > 0);
                                    }}
                                    onKeyDown={handleKeyPress}
                                    className="flex-1 px-3 py-2 border-2 border-[#7E9A77] rounded-lg focus:outline-none"
                                  />
                                  <button
                                    onClick={handleCellSave}
                                    className="text-green-600 hover:text-green-800 p-1"
                                  >
                                    <Check size={20} />
                                  </button>
                                  <button
                                    onClick={handleCellCancel}
                                    className="text-red-600 hover:text-red-800 p-1"
                                  >
                                    <X size={20} />
                                  </button>
                                </div>
                                
                                {showSuggestions && aiSuggestions.length > 0 && (
                                  <div className="absolute z-20 mt-1 bg-white border-2 border-[#7E9A77] rounded-lg shadow-xl p-2 min-w-[200px]">
                                    <p className="text-xs font-semibold text-[#7E9A77] mb-2">AI Suggestions:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {aiSuggestions.map((suggestion, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => selectSuggestion(suggestion)}
                                          className="px-2 py-1 bg-[#7E9A77] text-white rounded hover:bg-[#6B8A6B] transition-all text-xs"
                                        >
                                          {suggestion}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellEdit(actualIndex, header)}
                                className="cursor-pointer hover:bg-[#BDC8B3] hover:bg-opacity-40 px-2 py-1 rounded min-h-[32px] flex items-center group"
                              >
                                <span className="flex-1">{row[header]}</span>
                                <Edit2 size={14} className="opacity-0 group-hover:opacity-100 ml-2 text-[#7E9A77]" />
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data.length === 0 && (
          <div className="bg-white rounded-xl shadow-2xl p-12 text-center animate-fadeIn border-2 border-[#7E9A77]">
            <Upload size={64} className="mx-auto text-[#7E9A77] mb-4" />
            <h2 className="text-2xl font-bold text-[#7E9A77] mb-2">No Data Yet</h2>
            <p className="text-gray-600 mb-6">Upload an Excel file to get started with data collection</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#7E9A77] text-white px-8 py-3 rounded-lg hover:bg-[#6B8A6B] transition-all duration-300 shadow-lg transform hover:-translate-y-1"
            >
              Choose File
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: #EEEED3;
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb {
          background: #7E9A77;
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #6B8A6B;
        }
      `}</style>
    </div>
  );
};

export default ExcelEditor;