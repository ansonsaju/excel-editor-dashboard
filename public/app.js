const { useState, useEffect, useRef } = React;
const { Upload, Download, Undo, Redo, Plus, History, Grid, CreditCard, Search, X, ChevronLeft, ChevronRight, Trash2, Save, Sparkles, TrendingUp, Clock } = lucide;

// Color palette
const colors = {
  sage: '#6D7F6C',
  mint: '#D7E7A4',
  terracotta: '#C68A60',
  blush: '#DDC1B0',
  cream: '#E1ECB3',
  ivory: '#FFF4EB'
};

const ExcelEditorPro = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isCardView, setIsCardView] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [autoSave, setAutoSave] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [customSuggestions, setCustomSuggestions] = useState({});
  const [fileName, setFileName] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [focusedCell, setFocusedCell] = useState(null);
  const fileInputRef = useRef(null);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && data.length > 0) {
      const timeout = setTimeout(() => saveToStorage(), 1000);
      return () => clearTimeout(timeout);
    }
  }, [data, autoSave]);

  // Load from storage on mount
  useEffect(() => {
    const savedFiles = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
    if (savedFiles.length > 0) {
      loadFileFromHistory(savedFiles[0]);
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const sheetNames = workbook.SheetNames;
    
    setSheets(sheetNames);
    loadSheet(workbook, 0);
    saveFileHistory(file.name, workbook);
    showToast('File uploaded successfully!');
  };

  const loadSheet = (workbook, index) => {
    const ws = workbook.Sheets[workbook.SheetNames[index]];
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
      analyzeDataForSuggestions(jsonData, cols);
    }
  };

  const analyzeDataForSuggestions = (dataset, cols) => {
    const suggestions = {};
    
    cols.forEach(header => {
      const values = dataset.map(row => row[header]).filter(v => v !== '' && v !== '-');
      
      const frequency = {};
      values.forEach(v => {
        frequency[v] = (frequency[v] || 0) + 1;
      });
      
      const sortedByFreq = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([val]) => val);

      const numValues = values.filter(v => !isNaN(v)).map(Number);
      if (numValues.length > 0) {
        const avg = numValues.reduce((a, b) => a + b, 0) / numValues.length;
        const min = Math.min(...numValues);
        const max = Math.max(...numValues);
        
        suggestions[header] = {
          type: 'numeric',
          common: sortedByFreq,
          stats: { avg, min, max },
          recent: numValues.slice(-5)
        };
      } else {
        suggestions[header] = {
          type: 'text',
          common: sortedByFreq,
          recent: values.slice(-5)
        };
      }
    });
    
    setCustomSuggestions(suggestions);
  };

  const generateSuggestions = (header, currentValue) => {
    const headerSuggestions = customSuggestions[header];
    if (!headerSuggestions) return [];

    let suggestions = new Set();

    headerSuggestions.common.forEach(v => suggestions.add(v));
    headerSuggestions.recent.forEach(v => suggestions.add(v));

    if (headerSuggestions.type === 'numeric' && currentValue && !isNaN(currentValue)) {
      const num = Number(currentValue);
      const { min, max, avg } = headerSuggestions.stats;
      
      [-5, -2, -1, 1, 2, 5].forEach(offset => {
        const val = num + offset;
        if (val >= min && val <= max) suggestions.add(Math.round(val * 100) / 100);
      });
      
      suggestions.add(Math.round(avg * 100) / 100);
    }

    return Array.from(suggestions).slice(0, 12);
  };

  const updateCell = (rowIndex, header, value) => {
    const newData = [...data];
    newData[rowIndex][header] = value;
    setData(newData);
    addToHistory(newData);
    analyzeDataForSuggestions(newData, headers);
  };

  const addToHistory = (newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory);
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

  const addRow = () => {
    const newRow = {};
    headers.forEach(h => newRow[h] = '');
    const newData = [...data, newRow];
    setData(newData);
    addToHistory(newData);
    showToast('Row added successfully');
  };

  const deleteRow = (index) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    addToHistory(newData);
    showToast('Row deleted');
  };

  const saveToStorage = () => {
    if (fileName) {
      const fileHistory = JSON.parse(localStorage.getItem('excelFileHistory') || '[]');
      const fileEntry = {
        fileName,
        timestamp: new Date().toISOString(),
        data,
        headers,
        sheets,
        activeSheet
      };
      
      const existingIndex = fileHistory.findIndex(f => f.fileName === fileName);
      if (existingIndex >= 0) fileHistory.splice(existingIndex, 1);
      
      fileHistory.unshift(fileEntry);
      localStorage.setItem('excelFileHistory', JSON.stringify(fileHistory.slice(0, 10)));
    }
  };

  const saveFileHistory = (name, workbook) => {
    setFileName(name);
    saveToStorage();
  };

  const loadFileFromHistory = (file) => {
    setFileName(file.fileName);
    setData(file.data);
    setHeaders(file.headers);
    setSheets(file.sheets);
    setActiveSheet(file.activeSheet);
    setHistory([JSON.parse(JSON.stringify(file.data))]);
    setHistoryIndex(0);
    analyzeDataForSuggestions(file.data, file.headers);
    showToast(`Loaded: ${file.fileName}`);
  };

  const downloadFile = () => {
    if (data.length === 0) return;
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheets[activeSheet] || 'Sheet1');
    
    const downloadName = fileName ? fileName.replace('.xlsx', `_edited_${Date.now()}.xlsx`) : `edited_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, downloadName);
    showToast('File downloaded successfully!');
  };

  const getFilteredData = () => {
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
  };

  const CellInput = ({ rowIndex, header, value, isCard }) => {
    const [localValue, setLocalValue] = useState(value);
    const [showDropdown, setShowDropdown] = useState(false);
    const suggestions = generateSuggestions(header, localValue);

    const handleFocus = () => {
      setFocusedCell(`${rowIndex}-${header}`);
      if (suggestions.length > 0) setShowDropdown(true);
    };

    const handleBlur = () => {
      setTimeout(() => setShowDropdown(false), 200);
    };

    const handleChange = (newValue) => {
      setLocalValue(newValue);
      updateCell(rowIndex, header, newValue);
      setShowDropdown(false);
    };

    return (
      <div className="relative group">
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={(e) => {
            handleChange(e.target.value);
            handleBlur();
          }}
          onFocus={handleFocus}
          style={{
            borderColor: showDropdown ? colors.sage : 'transparent'
          }}
          className={`w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2
            focus:ring-2 focus:ring-opacity-20 rounded-lg
            transition-all duration-300 ${isCard ? 'text-base' : 'text-sm'}
            hover:bg-white hover:shadow-md`}
          placeholder={`Enter ${header}`}
        />
        
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 mt-2 w-full bg-white/95 backdrop-blur-xl border-2 
            rounded-xl shadow-2xl max-h-64 overflow-y-auto animate-fadeIn"
            style={{ borderColor: colors.sage }}>
            <div className="sticky top-0 text-white px-4 py-2 text-xs font-semibold flex items-center gap-2"
              style={{ background: `linear-gradient(to right, ${colors.sage}, ${colors.terracotta})` }}>
              <Sparkles size={14} />
              Smart Suggestions
            </div>
            {suggestions.map((suggestion, idx) => {
              const isCommon = customSuggestions[header]?.common.includes(suggestion);
              const isRecent = customSuggestions[header]?.recent.includes(suggestion);
              
              return (
                <div
                  key={idx}
                  onClick={() => handleChange(suggestion)}
                  className="px-4 py-3 cursor-pointer transition-all duration-200 flex items-center justify-between
                    border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-800">
                    {suggestion}
                  </span>
                  {isCommon && (
                    <span className="text-xs px-2 py-1 rounded-full text-white flex items-center gap-1"
                      style={{ background: `linear-gradient(to right, ${colors.terracotta}, ${colors.blush})` }}>
                      <TrendingUp size={10} /> Common
                    </span>
                  )}
                  {isRecent && !isCommon && (
                    <span className="text-xs px-2 py-1 rounded-full text-gray-700 flex items-center gap-1"
                      style={{ background: `linear-gradient(to right, ${colors.mint}, ${colors.cream})` }}>
                      <Clock size={10} /> Recent
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const JapaneseDecoration = () => (
    <div className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <circle cx="170" cy="30" r="25" fill={colors.terracotta} />
        <path d="M120 80 Q140 70, 160 80 T200 80" stroke={colors.sage} strokeWidth="2" fill="none" />
        <path d="M130 90 Q150 85, 170 95" stroke={colors.sage} strokeWidth="1.5" fill="none" />
        <rect x="100" y="110" width="60" height="15" fill={colors.sage} opacity="0.8" />
        <rect x="105" y="130" width="50" height="12" fill={colors.sage} opacity="0.6" />
        <rect x="110" y="145" width="40" height="10" fill={colors.sage} opacity="0.4" />
        <circle cx="185" cy="140" r="3" fill={colors.terracotta} />
      </svg>
    </div>
  );

  const filteredData = getFilteredData();
  const hasData = data.length > 0;

  return (
    <div className="min-h-screen p-4 md:p-6 relative overflow-hidden" 
      style={{ background: 'linear-gradient(to bottom right, #E1EBED, #F5F8F9, #D7E7E7)' }}>
      
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full blur-3xl animate-pulse" 
          style={{ background: `linear-gradient(to bottom right, ${colors.sage}20, ${colors.mint}20)` }} />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full blur-3xl animate-pulse" 
          style={{ background: `linear-gradient(to bottom right, ${colors.terracotta}20, ${colors.blush}20)`, animationDelay: '1s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 mb-6 border border-white/50 relative overflow-hidden">
          <JapaneseDecoration />
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 relative z-10">
            <div>
              <h1 className="text-4xl font-bold mb-2" 
                style={{ 
                  background: `linear-gradient(to right, ${colors.sage}, ${colors.terracotta})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                Excel Editor Pro
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Sparkles size={16} style={{ color: colors.terracotta }} />
                Professional Data Management System
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer px-4 py-2 
                bg-gradient-to-r from-white to-gray-50 rounded-lg hover:shadow-md transition-all">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: colors.sage }}
                />
                <Save size={16} />
                Auto-save
              </label>
              
              <div className="flex bg-white rounded-xl p-1 shadow-lg border border-gray-100">
                <button
                  onClick={() => setIsCardView(false)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                    !isCardView 
                      ? 'text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={!isCardView ? { background: `linear-gradient(to right, ${colors.sage}, ${colors.mint})` } : {}}
                >
                  <Grid size={16} />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setIsCardView(true)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                    isCardView 
                      ? 'text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={isCardView ? { background: `linear-gradient(to right, ${colors.sage}, ${colors.mint})` } : {}}
                >
                  <CreditCard size={16} />
                  <span className="hidden sm:inline">Card</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 relative z-10">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-xl shadow-lg font-medium flex items-center gap-2 text-white
                hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              style={{ background: `linear-gradient(to right, ${colors.sage}, ${colors.terracotta})` }}
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
              onClick={downloadFile}
              disabled={!hasData}
              className="px-6 py-3 rounded-xl shadow-lg font-medium flex items-center gap-2 text-gray-800
                hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
              style={{ background: `linear-gradient(to right, ${colors.mint}, ${colors.cream})` }}
            >
              <Download size={18} />
              Download
            </button>
            
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-3 rounded-xl bg-white shadow-md border-2 border-gray-100
                hover:shadow-lg transition-all disabled:opacity-50"
              style={{ borderColor: historyIndex > 0 ? colors.sage : '' }}
              title="Undo"
            >
              <Undo size={18} style={{ color: colors.sage }} />
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-3 rounded-xl bg-white shadow-md border-2 border-gray-100
                hover:shadow-lg transition-all disabled:opacity-50"
              title="Redo"
            >
              <Redo size={18} style={{ color: colors.sage }} />
            </button>
            
            <button
              onClick={addRow}
              disabled={!hasData}
              className="px-6 py-3 rounded-xl shadow-lg font-medium flex items-center gap-2 text-white
                hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
              style={{ background: `linear-gradient(to right, ${colors.sage}, ${colors.mint})` }}
            >
              <Plus size={18} />
              Add Row
            </button>
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-6 py-3 rounded-xl bg-white shadow-md border-2 border-gray-100 font-medium
                flex items-center gap-2 hover:shadow-lg transition-all"
              style={{ borderColor: showHistory ? colors.sage : '' }}
            >
              <History size={18} style={{ color: colors.sage }} />
              Files
            </button>
          </div>
        </div>

        {/* Search */}
        {hasData && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/50 animate-fadeIn">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across all columns..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl
                  focus:ring-4 transition-all bg-white/80 backdrop-blur-sm"
                style={{ 
                  borderColor: searchTerm ? colors.sage : '',
                  outlineColor: colors.sage
                }}
              />
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/50 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Saved Files</h3>
              <button
                onClick={() => {
                  localStorage.removeItem('excelFileHistory');
                  setShowHistory(false);
                  showToast('History cleared');
                }}
                className="text-red-500 hover:text-red-700 font-medium px-3 py-1 hover:bg-red-50 rounded-lg"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {JSON.parse(localStorage.getItem('excelFileHistory') || '[]').map((file, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    loadFileFromHistory(file);
                    setShowHistory(false);
                  }}
                  className="p-4 bg-gradient-to-r from-white to-gray-50 rounded-xl border-2 border-gray-100
                    cursor-pointer transition-all hover:shadow-md hover:translate-x-1"
                  style={{ borderColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.sage}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <p className="font-semibold text-gray-800">{file.fileName}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(file.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data View */}
        {!hasData ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-12 text-center border border-white/50">
            <div className="mb-6">
              <Upload className="mx-auto text-gray-300" size={64} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Data Yet</h2>
            <p className="text-gray-600 mb-6">Upload an Excel file to get started</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 rounded-xl shadow-lg font-medium text-white
                hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              style={{ background: `linear-gradient(to right, ${colors.sage}, ${colors.terracotta})` }}
            >
              Choose File
            </button>
          </div>
        ) : isCardView ? (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-lg mb-4">
              <span className="font-semibold text-gray-800">
                Card {currentCardIndex + 1} of {filteredData.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                  disabled={currentCardIndex === 0}
                  className="p-2 rounded-lg bg-white shadow border-2 border-gray-200 
                    disabled:opacity-50 transition-all"
                  style={{ borderColor: currentCardIndex > 0 ? colors.sage : '' }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => deleteRow(data.indexOf(filteredData[currentCardIndex]))}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={() => setCurrentCardIndex(Math.min(filteredData.length - 1, currentCardIndex + 1))}
                  disabled={currentCardIndex === filteredData.length - 1}
                  className="p-2 rounded-lg text-white shadow disabled:opacity-50 transition-all"
                  style={{ background: `linear-gradient(to right, ${colors.sage}, ${colors.mint})` }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/50">
              <div className="space-y-4">
                {headers.map(header => (
                  <div key={header} className="border-b border-gray-100 pb-4 last:border-0">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {header}
                    </label>
                    <CellInput
                      rowIndex={data.indexOf(filteredData[currentCardIndex])}
                      header={header}
                      value={filteredData[currentCardIndex][header]}
                      isCard={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/50 animate-fadeIn">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-white" 
                  style={{ background: `linear-gradient(to right, ${colors.sage}, ${colors.terracotta})` }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold sticky top-0">Actions</th>
                    {headers.map(header => (
                      <th key={header} className="px-4 py-3 text-left font-semibold whitespace-nowrap sticky top-0">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => {
                    const originalIndex = data.indexOf(row);
                    return (
                      <tr
                        key={idx}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                      >
                        <td className="px-4 py-2">
                          <button
                            onClick={() => deleteRow(originalIndex)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                        {headers.map(header => (
                          <td key={header} className="px-4 py-2">
                            <CellInput
                              rowIndex={originalIndex}
                              header={header}
                              value={row[header]}
                              isCard={false}
                            />
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
      </div>

      {/* Toast Notifications */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl
          animate-slideIn flex items-center gap-3 ${
          toast.type === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
            : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <X size={24} />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ExcelEditorPro />);
