const { useState, useEffect, useRef, createElement: h } = React;

// Lucide Icons as SVG components
const Upload = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), h('polyline', { points: "17 8 12 3 7 8" }), h('line', { x1: "12", x2: "12", y1: "3", y2: "15" }));

const Download = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), h('polyline', { points: "7 10 12 15 17 10" }), h('line', { x1: "12", x2: "12", y1: "15", y2: "3" }));

const Undo = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M3 7v6h6" }), h('path', { d: "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" }));

const Redo = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M21 7v6h-6" }), h('path', { d: "M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" }));

const Plus = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M5 12h14" }), h('path', { d: "M12 5v14" }));

const History = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }), h('path', { d: "M3 3v5h5" }), h('path', { d: "M12 7v5l4 2" }));

const Grid = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('rect', { width: "7", height: "7", x: "3", y: "3", rx: "1" }), h('rect', { width: "7", height: "7", x: "14", y: "3", rx: "1" }), h('rect', { width: "7", height: "7", x: "14", y: "14", rx: "1" }), h('rect', { width: "7", height: "7", x: "3", y: "14", rx: "1" }));

const CreditCard = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('rect', { width: "20", height: "14", x: "2", y: "5", rx: "2" }), h('line', { x1: "2", x2: "22", y1: "10", y2: "10" }));

const Search = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('circle', { cx: "11", cy: "11", r: "8" }), h('path', { d: "m21 21-4.3-4.3" }));

const X = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M18 6 6 18" }), h('path', { d: "m6 6 12 12" }));

const ChevronLeft = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "m15 18-6-6 6-6" }));

const ChevronRight = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "m9 18 6-6-6-6" }));

const Trash2 = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M3 6h18" }), h('path', { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }), h('path', { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }), h('line', { x1: "10", x2: "10", y1: "11", y2: "17" }), h('line', { x1: "14", x2: "14", y1: "11", y2: "17" }));

const Save = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }), h('polyline', { points: "17 21 17 13 7 13 7 21" }), h('polyline', { points: "7 3 7 8 15 8" }));

const Sparkles = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('path', { d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" }), h('path', { d: "M5 3v4" }), h('path', { d: "M19 17v4" }), h('path', { d: "M3 5h4" }), h('path', { d: "M17 19h4" }));

const TrendingUp = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('polyline', { points: "22 7 13.5 15.5 8.5 10.5 2 17" }), h('polyline', { points: "16 7 22 7 22 13" }));

const Clock = (props) => h('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, h('circle', { cx: "12", cy: "12", r: "10" }), h('polyline', { points: "12 6 12 12 16 14" }));

// Safe JSON parse helper
const safeJSONParse = (str, defaultValue) => {
  try {
    if (!str || str === 'undefined' || str === 'null') return defaultValue;
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
};

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isCardView, setIsCardView] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [autoSave, setAutoSave] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [customSuggestions, setCustomSuggestions] = useState({});
  const [fileName, setFileName] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load saved file from localStorage on mount
    try {
      const savedFiles = safeJSONParse(localStorage.getItem('excelFileHistory'), []);
      if (savedFiles && savedFiles.length > 0 && savedFiles[0].data) {
        loadFileFromHistory(savedFiles[0]);
      }
    } catch (e) {
      console.log('No saved files found');
    }
  }, []);

  useEffect(() => {
    if (autoSave && data.length > 0 && fileName) {
      const timeout = setTimeout(() => saveToStorage(), 1000);
      return () => clearTimeout(timeout);
    }
  }, [data, autoSave, fileName]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setFileName(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(arrayBuffer);
      const sheetNames = workbook.SheetNames;
      
      setSheets(sheetNames);
      loadSheet(workbook, 0);
      showToast('File uploaded successfully!');
    } catch (error) {
      showToast('Error uploading file', 'error');
      console.error('Upload error:', error);
    }
  };

  const loadSheet = (workbook, index) => {
    try {
      const ws = workbook.Sheets[workbook.SheetNames[index]];
      const jsonData = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
      
      if (jsonData.length > 0) {
        const cols = Object.keys(jsonData[0]);
        setHeaders(cols);
        setData(jsonData);
        setActiveSheet(index);
        setHistory([JSON.parse(JSON.stringify(jsonData))]);
        setHistoryIndex(0);
        setSearchTerm('');
        analyzeDataForSuggestions(jsonData, cols);
      }
    } catch (error) {
      showToast('Error loading sheet', 'error');
      console.error('Load sheet error:', error);
    }
  };

  const analyzeDataForSuggestions = (dataset, cols) => {
    try {
      const suggestions = {};
      
      cols.forEach(header => {
        const values = dataset.map(row => row[header]).filter(v => v !== '' && v !== '-' && v !== null && v !== undefined);
        
        const frequency = {};
        values.forEach(v => {
          const key = String(v);
          frequency[key] = (frequency[key] || 0) + 1;
        });
        
        const sortedByFreq = Object.entries(frequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([val]) => val);

        const numValues = values.filter(v => !isNaN(v) && v !== '').map(Number);
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
    } catch (error) {
      console.error('Suggestion analysis error:', error);
    }
  };

  const generateSuggestions = (header, currentValue) => {
    try {
      const headerSuggestions = customSuggestions[header];
      if (!headerSuggestions) return [];

      let suggestions = new Set();
      
      if (headerSuggestions.common) {
        headerSuggestions.common.forEach(v => suggestions.add(v));
      }
      
      if (headerSuggestions.recent) {
        headerSuggestions.recent.forEach(v => suggestions.add(v));
      }

      if (headerSuggestions.type === 'numeric' && currentValue && !isNaN(currentValue)) {
        const num = Number(currentValue);
        const { min, max, avg } = headerSuggestions.stats;
        
        [-5, -2, -1, 1, 2, 5].forEach(offset => {
          const val = num + offset;
          if (val >= min && val <= max) suggestions.add(String(Math.round(val * 100) / 100));
        });
        
        suggestions.add(String(Math.round(avg * 100) / 100));
      }

      return Array.from(suggestions).slice(0, 12);
    } catch (error) {
      console.error('Generate suggestions error:', error);
      return [];
    }
  };

  const updateCell = (rowIndex, header, value) => {
    try {
      const newData = [...data];
      newData[rowIndex][header] = value;
      setData(newData);
      addToHistory(newData);
      analyzeDataForSuggestions(newData, headers);
    } catch (error) {
      console.error('Update cell error:', error);
    }
  };

  const addToHistory = (newData) => {
    try {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newData)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } catch (error) {
      console.error('Add to history error:', error);
    }
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
    
    if (isCardView && currentCardIndex >= newData.length) {
      setCurrentCardIndex(Math.max(0, newData.length - 1));
    }
  };

  const saveToStorage = () => {
    try {
      if (fileName && data.length > 0) {
        const fileHistory = safeJSONParse(localStorage.getItem('excelFileHistory'), []);
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
    } catch (error) {
      console.error('Save to storage error:', error);
    }
  };

  const loadFileFromHistory = (file) => {
    try {
      if (file && file.data) {
        setFileName(file.fileName);
        setData(file.data);
        setHeaders(file.headers || []);
        setSheets(file.sheets || []);
        setActiveSheet(file.activeSheet || 0);
        setHistory([JSON.parse(JSON.stringify(file.data))]);
        setHistoryIndex(0);
        analyzeDataForSuggestions(file.data, file.headers || []);
        showToast(`Loaded: ${file.fileName}`);
      }
    } catch (error) {
      console.error('Load file from history error:', error);
      showToast('Error loading file', 'error');
    }
  };

  const downloadFile = () => {
    try {
      if (data.length === 0) return;
      
      const wb = window.XLSX.utils.book_new();
      const ws = window.XLSX.utils.json_to_sheet(data);
      window.XLSX.utils.book_append_sheet(wb, ws, sheets[activeSheet] || 'Sheet1');
      
      const downloadName = fileName ? fileName.replace('.xlsx', `_edited_${Date.now()}.xlsx`) : `edited_${Date.now()}.xlsx`;
      window.XLSX.writeFile(wb, downloadName);
      showToast('File downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Error downloading file', 'error');
    }
  };

  const getFilteredData = () => {
    try {
      return data.filter(row => {
        const matchesSearch = searchTerm === '' || 
          Object.values(row).some(val => 
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
          );
        return matchesSearch;
      });
    } catch (error) {
      console.error('Filter error:', error);
      return data;
    }
  };

  const CellInput = ({ rowIndex, header, value, isCard }) => {
    const [localValue, setLocalValue] = useState(value || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const suggestions = generateSuggestions(header, localValue);

    useEffect(() => {
      setLocalValue(value || '');
    }, [value]);

    const handleFocus = () => {
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

    return h('div', { className: 'relative group' },
      h('input', {
        type: 'text',
        value: localValue,
        onChange: (e) => setLocalValue(e.target.value),
        onBlur: (e) => {
          handleChange(e.target.value);
          handleBlur();
        },
        onFocus: handleFocus,
        className: `w-full px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-transparent focus:border-[#6D7F6C] focus:ring-2 focus:ring-[#6D7F6C]/20 rounded-lg transition-all duration-300 ${isCard ? 'text-base' : 'text-sm'} hover:bg-white hover:shadow-md`,
        placeholder: `Enter ${header}`
      }),
      
      showDropdown && suggestions.length > 0 && h('div', { 
        className: 'absolute z-50 mt-2 w-full bg-white/95 backdrop-blur-xl border-2 border-[#6D7F6C] rounded-xl shadow-2xl max-h-64 overflow-y-auto'
      },
        h('div', { 
          className: 'sticky top-0 bg-gradient-to-r from-[#6D7F6C] to-[#C68A60] text-white px-4 py-2 text-xs font-semibold flex items-center gap-2'
        },
          h(Sparkles, { size: 14 }),
          'Smart Suggestions'
        ),
        ...suggestions.map((suggestion, idx) => {
          const isCommon = customSuggestions[header]?.common?.includes(suggestion);
          const isRecent = customSuggestions[header]?.recent?.includes(String(suggestion));
          
          return h('div', {
            key: idx,
            onClick: () => handleChange(suggestion),
            className: 'px-4 py-3 hover:bg-gradient-to-r hover:from-[#E1ECB3] hover:to-[#FFF4EB] cursor-pointer transition-all duration-200 flex items-center justify-between border-b border-gray-100 last:border-0'
          },
            h('span', { className: 'font-medium text-gray-800' }, suggestion),
            isCommon && h('span', { 
              className: 'text-xs px-2 py-1 rounded-full bg-gradient-to-r from-[#C68A60] to-[#DDC1B0] text-white flex items-center gap-1'
            },
              h(TrendingUp, { size: 10 }),
              ' Common'
            ),
            isRecent && !isCommon && h('span', { 
              className: 'text-xs px-2 py-1 rounded-full bg-gradient-to-r from-[#D7E7A4] to-[#E1ECB3] text-gray-700 flex items-center gap-1'
            },
              h(Clock, { size: 10 }),
              ' Recent'
            )
          );
        })
      )
    );
  };

  const JapaneseDecoration = () => h('div', { className: 'absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none' },
    h('svg', { viewBox: '0 0 200 200', className: 'w-full h-full' },
      h('circle', { cx: '170', cy: '30', r: '25', fill: colors.terracotta }),
      h('path', { d: 'M120 80 Q140 70, 160 80 T200 80', stroke: colors.sage, strokeWidth: '2', fill: 'none' }),
      h('path', { d: 'M130 90 Q150 85, 170 95', stroke: colors.sage, strokeWidth: '1.5', fill: 'none' }),
      h('rect', { x: '100', y: '110', width: '60', height: '15', fill: colors.sage, opacity: '0.8' }),
      h('rect', { x: '105', y: '130', width: '50', height: '12', fill: colors.sage, opacity: '0.6' }),
      h('rect', { x: '110', y: '145', width: '40', height: '10', fill: colors.sage, opacity: '0.4' }),
      h('circle', { cx: '185', cy: '140', r: '3', fill: colors.terracotta })
    )
  );

  const filteredData = getFilteredData();
  const hasData = data.length > 0;

  return h('div', { className: 'min-h-screen bg-gradient-to-br from-[#E1EBED] via-[#F5F8F9] to-[#D7E7E7] p-4 md:p-6 relative overflow-hidden' },
    h('div', { className: 'fixed inset-0 pointer-events-none overflow-hidden' },
      h('div', { className: 'absolute top-20 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-[#6D7F6C]/10 to-[#D7E7A4]/10 blur-3xl animate-pulse' }),
      h('div', { className: 'absolute bottom-20 right-10 w-40 h-40 rounded-full bg-gradient-to-br from-[#C68A60]/10 to-[#DDC1B0]/10 blur-3xl animate-pulse', style: { animationDelay: '1s' } })
    ),

    h('div', { className: 'max-w-7xl mx-auto relative z-10' },
      h('div', { className: 'bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 mb-6 border border-white/50 relative overflow-hidden' },
        h(JapaneseDecoration),
        
        h('div', { className: 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 relative z-10' },
          h('div', {},
            h('h1', { className: 'text-4xl font-bold bg-gradient-to-r from-[#6D7F6C] to-[#C68A60] bg-clip-text text-transparent mb-2' }, 'Excel Editor Pro'),
            h('p', { className: 'text-gray-600 flex items-center gap-2' },
              h(Sparkles, { size: 16, className: 'text-[#C68A60]' }),
              'Professional Data Management System'
            )
          ),
          
          h('div', { className: 'flex items-center gap-3 flex-wrap' },
            h('label', { className: 'flex items-center gap-2 text-sm font-medium cursor-pointer px-4 py-2 bg-gradient-to-r from-white to-gray-50 rounded-lg hover:shadow-md transition-all' },
              h('input', {
                type: 'checkbox',
                checked: autoSave,
                onChange: (e) => setAutoSave(e.target.checked),
                className: 'rounded accent-[#6D7F6C]'
              }),
              h(Save, { size: 16 }),
              'Auto-save'
            ),
            
            h('div', { className: 'flex bg-white rounded-xl p-1 shadow-lg border border-gray-100' },
              h('button', {
                onClick: () => setIsCardView(false),
                className: `px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${!isCardView ? 'bg-gradient-to-r from-[#6D7F6C] to-[#D7E7A4] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`
              },
                h(Grid, { size: 16 }),
                h('span', { className: 'hidden sm:inline' }, 'Table')
              ),
              h('button', {
                onClick: () => setIsCardView(true),
                className: `px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${isCardView ? 'bg-gradient-to-r from-[#6D7F6C] to-[#D7E7A4] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`
              },
                h(CreditCard, { size: 16 }),
                h('span', { className: 'hidden sm:inline' }, 'Card')
              )
            )
          )
        ),

        h('div', { className: 'flex flex-wrap gap-2 relative z-10' },
          h('button', {
            onClick: () => fileInputRef.current?.click(),
            className: 'btn-gradient px-6 py-3 rounded-xl shadow-lg font-medium flex items-center gap-2 bg-gradient-to-r from-[#6D7F6C] to-[#C68A60] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300'
          },
            h(Upload, { size: 18 }),
            'Upload'
          ),
          h('input', {
            ref: fileInputRef,
            type: 'file',
            accept: '.xlsx,.xls',
            onChange: handleFileUpload,
            className: 'hidden'
          }),
          
          h('button', {
            onClick: downloadFile,
            disabled: !hasData,
            className: 'px-6 py-3 rounded-xl shadow-lg font-medium flex items-center gap-2 bg-gradient-to-r from-[#D7E7A4] to-[#E1ECB3] text-gray-800 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50'
          },
            h(Download, { size: 18 }),
            'Download'
          ),
          
          h('button', {
            onClick: undo,
            disabled: historyIndex <= 0,
            className: 'p-3 rounded-xl bg-white shadow-md border-2 border-gray-100 hover:shadow-lg hover:border-[#6D7F6C] transition-all disabled:opacity-50',
            title: 'Undo'
          },
            h(Undo, { size: 18, className: 'text-[#6D7F6C]' })
          ),
          
          h('button', {
            onClick: redo,
            disabled: historyIndex >= history.length - 1,
            className: 'p-3 rounded-xl bg-white shadow-md border-2 border-gray-100 hover:shadow-lg hover:border-[#6D7F6C] transition-all disabled:opacity-50',
            title: 'Redo'
          },
            h(Redo, { size: 18, className: 'text-[#6D7F6C]' })
          ),
          
          h('button', {
            onClick: addRow,
            disabled: !hasData,
            className: 'px-6 py-3 rounded-xl shadow-lg font-medium flex items-center gap-2 bg-gradient-to-r from-[#6D7F6C] to-[#D7E7A4] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50'
          },
            h(Plus, { size: 18 }),
            'Add Row'
          ),
          
          h('button', {
            onClick: () => setShowHistory(!showHistory),
            className: 'px-6 py-3 rounded-xl bg-white shadow-md border-2 border-gray-100 font-medium flex items-center gap-2 hover:shadow-lg hover:border-[#6D7F6C] transition-all'
          },
            h(History, { size: 18, className: 'text-[#6D7F6C]' }),
            'Files'
          )
        )
      ),

      hasData && h('div', { className: 'bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/50 animate-fadeIn' },
        h('div', { className: 'relative mb-4' },
          h(Search, { className: 'absolute left-4 top-1/2 -translate-y-1/2 text-gray-400', size: 20 }),
          h('input', {
            type: 'text',
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            placeholder: 'Search across all columns...',
            className: 'w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6D7F6C] focus:ring-4 focus:ring-[#6D7F6C]/20 transition-all bg-white/80 backdrop-blur-sm'
          })
        )
      ),

      showHistory && h('div', { className: 'bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/50 animate-fadeIn' },
        h('div', { className: 'flex justify-between items-center mb-4' },
          h('h3', { className: 'text-lg font-bold text-gray-800' }, 'Saved Files'),
          h('button', {
            onClick: () => {
              localStorage.removeItem('excelFileHistory');
              setShowHistory(false);
              showToast('History cleared');
            },
            className: 'text-red-500 hover:text-red-700 font-medium px-3 py-1 hover:bg-red-50 rounded-lg'
          }, 'Clear All')
        ),
        h('div', { className: 'space-y-2 max-h-60 overflow-y-auto' },
          ...safeJSONParse(localStorage.getItem('excelFileHistory'), []).map((file, idx) =>
            h('div', {
              key: idx,
              onClick: () => {
                loadFileFromHistory(file);
                setShowHistory(false);
              },
              className: 'p-4 bg-gradient-to-r from-white to-gray-50 rounded-xl border-2 border-gray-100 hover:border-[#6D7F6C] cursor-pointer transition-all hover:shadow-md hover:translate-x-1'
            },
              h('p', { className: 'font-semibold text-gray-800' }, file.fileName),
              h('p', { className: 'text-sm text-gray-600' }, new Date(file.timestamp).toLocaleString())
            )
          )
        )
      ),

      !hasData ? h('div', { className: 'bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-12 text-center border border-white/50' },
        h('div', { className: 'mb-6' },
          h(Upload, { className: 'mx-auto text-gray-300', size: 64 })
        ),
        h('h2', { className: 'text-2xl font-bold text-gray-800 mb-2' }, 'No Data Yet'),
        h('p', { className: 'text-gray-600 mb-6' }, 'Upload an Excel file to get started'),
        h('button', {
          onClick: () => fileInputRef.current?.click(),
          className: 'px-8 py-4 rounded-xl shadow-lg font-medium bg-gradient-to-r from-[#6D7F6C] to-[#C68A60] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300'
        }, 'Choose File')
      ) : isCardView ? h('div', { className: 'animate-fadeIn' },
        h('div', { className: 'flex justify-between items-center bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-lg mb-4' },
          h('span', { className: 'font-semibold text-gray-800' }, `Card ${currentCardIndex + 1} of ${filteredData.length}`),
          h('div', { className: 'flex gap-2' },
            h('button', {
              onClick: () => setCurrentCardIndex(Math.max(0, currentCardIndex - 1)),
              disabled: currentCardIndex === 0,
              className: 'p-2 rounded-lg bg-white shadow border-2 border-gray-200 hover:border-[#6D7F6C] disabled:opacity-50 transition-all'
            },
              h(ChevronLeft, { size: 20 })
            ),
            h('button', {
              onClick: () => deleteRow(data.indexOf(filteredData[currentCardIndex])),
              className: 'px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all'
            },
              h(Trash2, { size: 20 })
            ),
            h('button', {
              onClick: () => setCurrentCardIndex(Math.min(filteredData.length - 1, currentCardIndex + 1)),
              disabled: currentCardIndex === filteredData.length - 1,
              className: 'p-2 rounded-lg bg-gradient-to-r from-[#6D7F6C] to-[#D7E7A4] text-white shadow disabled:opacity-50 transition-all'
            },
              h(ChevronRight, { size: 20 })
            )
          )
        ),
        
        filteredData.length > 0 && h('div', { className: 'bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/50' },
          h('div', { className: 'space-y-4' },
            ...headers.map(header =>
              h('div', { key: header, className: 'border-b border-gray-100 pb-4 last:border-0' },
                h('label', { className: 'block text-sm font-semibold text-gray-700 mb-2' }, header),
                h(CellInput, {
                  rowIndex: data.indexOf(filteredData[currentCardIndex]),
                  header: header,
                  value: filteredData[currentCardIndex][header],
                  isCard: true
                })
              )
            )
          )
        )
      ) : h('div', { className: 'bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/50 animate-fadeIn' },
        h('div', { className: 'overflow-x-auto' },
          h('table', { className: 'w-full' },
            h('thead', { className: 'bg-gradient-to-r from-[#6D7F6C] to-[#C68A60] text-white' },
              h('tr', {},
                h('th', { className: 'px-4 py-3 text-left font-semibold sticky top-0' }, 'Actions'),
                ...headers.map(header =>
                  h('th', { key: header, className: 'px-4 py-3 text-left font-semibold whitespace-nowrap sticky top-0' }, header)
                )
              )
            ),
            h('tbody', {},
              ...filteredData.map((row, idx) => {
                const originalIndex = data.indexOf(row);
                return h('tr', {
                  key: idx,
                  className: 'border-b border-gray-100 hover:bg-gradient-to-r hover:from-[#E1ECB3]/30 hover:to-transparent transition-all'
                },
                  h('td', { className: 'px-4 py-2' },
                    h('button', {
                      onClick: () => deleteRow(originalIndex),
                      className: 'text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all'
                    },
                      h(Trash2, { size: 16 })
                    )
                  ),
                  ...headers.map(header =>
                    h('td', { key: header, className: 'px-4 py-2' },
                      h(CellInput, {
                        rowIndex: originalIndex,
                        header: header,
                        value: row[header],
                        isCard: false
                      })
                    )
                  )
                );
              })
            )
          )
        )
      )
    ),

    toast.show && h('div', {
      className: `fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl animate-slideIn flex items-center gap-3 ${
        toast.type === 'success' 
          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
          : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
      }`
    },
      toast.type === 'success' ? h('svg', { className: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M5 13l4 4L19 7' })
      ) : h(X, { size: 24 }),
      h('span', { className: 'font-medium' }, toast.message)
    )
  );
};

// Render the app
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(h(ExcelEditorPro));
