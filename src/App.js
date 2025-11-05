import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Filter, History, Grid, List, Undo, Redo, Save, X, ChevronLeft, ChevronRight, Plus, Trash2, Brain } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExcelDashboard = () => {
  const [workbook, setWorkbook] = useState(null);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [activeCell, setActiveCell] = useState(null);
  const [filename, setFilename] = useState('');
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);

  const colors = {
    bg: '#EEEED3',
    secondary: '#BDC8B3',
    accent: '#7E9A77',
    text: '#2d3436',
    white: '#ffffff'
  };

  // Check if we're in the browser (not during SSR/build)
  useEffect(() => {
    setIsClient(true);
    loadFromStorage();
  }, []);

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!isClient || data.length === 0) return;

    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    autoSaveIntervalRef.current = setInterval(() => {
      saveToStorage();
    }, 5000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [isClient, data, headers, currentSheet, filename, workbook]);

  const saveToStorage = () => {
    if (!isClient || typeof window === 'undefined') return;

    try {
      const timestamp = new Date().toISOString();
      const saveData = {
        data,
        headers,
        currentSheet,
        filename,
        timestamp,
        workbook: workbook ? XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) : null
      };
      
      window.localStorage.setItem('excel_current', JSON.stringify(saveData));
      
      const historyData = JSON.parse(window.localStorage.getItem('excel_history') || '[]');
      historyData.unshift(saveData);
      if (historyData.length > 20) historyData.pop();
      window.localStorage.setItem('excel_history', JSON.stringify(historyData));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  const loadFromStorage = () => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem('excel_current');
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed.data || []);
        setHeaders(parsed.headers || []);
        setCurrentSheet(parsed.currentSheet || 0);
        setFilename(parsed.filename || '');
        
        if (parsed.workbook) {
          const wb = XLSX.read(parsed.workbook, { type: 'base64' });
          setWorkbook(wb);
        }
        
        if (parsed.data && parsed.headers) {
          setHistory([{ data: parsed.data, headers: parsed.headers }]);
          setHistoryIndex(0);
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  };

  const loadHistoryVersion = (version) => {
    setData(version.data);
    setHeaders(version.headers);
    setFilename(version.filename);
    if (version.workbook) {
      const wb = XLSX.read(version.workbook, { type: 'base64' });
      setWorkbook(wb);
    }
    setShowHistory(false);
    addToHistory(version.data, version.headers);
  };

  const getStoredHistory = () => {
    if (!isClient || typeof window === 'undefined') return [];
    try {
      return JSON.parse(window.localStorage.getItem('excel_history') || '[]');
    } catch {
      return [];
    }
  };

  const addToHistory = (newData, newHeaders) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ data: JSON.parse(JSON.stringify(newData)), headers: [...newHeaders] });
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(history[newIndex].data)));
      setHeaders([...history[newIndex].headers]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(history[newIndex].data)));
      setHeaders([...history[newIndex].headers]);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFilename(file.name);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const wb = XLSX.read(event.target.result, { type: 'binary' });
      setWorkbook(wb);
      loadSheet(wb, 0);
    };
    
    reader.readAsBinaryString(file);
  };

  const loadSheet = (wb, sheetIndex) => {
    const sheetName = wb.SheetNames[sheetIndex];
    const worksheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length > 0) {
      const hdrs = jsonData[0];
      const rows = jsonData.slice(1).map(row => {
        const obj = {};
        hdrs.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj;
      });
      
      setHeaders(hdrs);
      setData(rows);
      setCurrentSheet(sheetIndex);
      addToHistory(rows, hdrs);
    }
  };

  const handleCellChange = (rowIndex, header, value) => {
    const newData = [...data];
    newData[rowIndex][header] = value;
    setData(newData);
    addToHistory(newData, headers);
    
    if (isNumericField(header)) {
      generateAiSuggestions(header, rowIndex, newData);
    }
  };

  const isNumericField = (header) => {
    const numericFields = ['height', 'weight', 'chest', 'hip', 'bmi', 'age'];
    return numericFields.some(field => header.toLowerCase().includes(field));
  };

  const generateAiSuggestions = (header, currentRow, dataArray) => {
    const values = dataArray.slice(Math.max(0, currentRow - 5), currentRow)
      .map(row => parseFloat(row[header]))
      .filter(v => !isNaN(v));
    
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const suggestions = [
        Math.round(avg),
        Math.round(avg - 2),
        Math.round(avg + 2),
        Math.round(avg - 5),
        Math.round(avg + 5)
      ].filter((v, i, arr) => arr.indexOf(v) === i && v > 0);
      
      setAiSuggestions(prev => ({
        ...prev,
        [`${currentRow}-${header}`]: suggestions.slice(0, 5)
      }));
    }
  };

  const addRow = () => {
    const newRow = {};
    headers.forEach(h => newRow[h] = '');
    const newData = [...data, newRow];
    setData(newData);
    addToHistory(newData, headers);
  };

  const deleteRow = (index) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    addToHistory(newData, headers);
  };

  const handleDownload = () => {
    if (!workbook) return;
    
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    workbook.Sheets[workbook.SheetNames[currentSheet]] = ws;
    
    XLSX.writeFile(workbook, filename || 'edited_data.xlsx');
  };

  const getFilteredData = () => {
    let filtered = [...data];
    
    Object.keys(filters).forEach(header => {
      if (filters[header] && filters[header].length > 0) {
        filtered = filtered.filter(row => 
          filters[header].includes(row[header])
        );
      }
    });
    
    return filtered;
  };

  const filteredData = getFilteredData();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.secondary} 100%)`,
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: colors.white,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            color: colors.accent,
            fontSize: '28px',
            fontWeight: '700'
          }}>
            Excel Data Editor
          </h1>
          {filename && (
            <p style={{ margin: 0, color: colors.text, opacity: 0.7, fontSize: '14px' }}>
              {filename}
            </p>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: colors.accent,
              color: colors.white,
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
          >
            <Upload size={18} /> Upload Excel
          </button>
          
          <button
            onClick={handleDownload}
            disabled={!workbook}
            style={{
              background: colors.secondary,
              color: colors.text,
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              cursor: workbook ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              opacity: workbook ? 1 : 0.5
            }}
          >
            <Download size={18} /> Download
          </button>
          
          <button onClick={undo} disabled={historyIndex <= 0} style={{
              background: colors.white,
              color: colors.text,
              border: `2px solid ${colors.secondary}`,
              borderRadius: '12px',
              padding: '12px',
              cursor: historyIndex > 0 ? 'pointer' : 'not-allowed',
              opacity: historyIndex > 0 ? 1 : 0.5
            }}>
            <Undo size={18} />
          </button>
          
          <button onClick={redo} disabled={historyIndex >= history.length - 1} style={{
              background: colors.white,
              color: colors.text,
              border: `2px solid ${colors.secondary}`,
              borderRadius: '12px',
              padding: '12px',
              cursor: historyIndex < history.length - 1 ? 'pointer' : 'not-allowed',
              opacity: historyIndex < history.length - 1 ? 1 : 0.5
            }}>
            <Redo size={18} />
          </button>
          
          <button onClick={() => setShowHistory(!showHistory)} style={{
              background: colors.white,
              color: colors.text,
              border: `2px solid ${colors.secondary}`,
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer'
            }}>
            <History size={18} />
          </button>
          
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'card' : 'grid')} style={{
              background: viewMode === 'card' ? colors.accent : colors.white,
              color: viewMode === 'card' ? colors.white : colors.text,
              border: `2px solid ${colors.accent}`,
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer'
            }}>
            {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* History Panel */}
      {showHistory && (
        <div style={{
          background: colors.white,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: colors.accent }}>Version History</h3>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          {getStoredHistory().map((version, i) => (
            <div
              key={i}
              onClick={() => loadHistoryVersion(version)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: colors.bg,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={e => e.currentTarget.style.background = colors.secondary}
              onMouseOut={e => e.currentTarget.style.background = colors.bg}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                {version.filename || 'Untitled'}
              </div>
              <div style={{ fontSize: '12px', color: colors.text, opacity: 0.7, marginTop: '4px' }}>
                {new Date(version.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheets Tabs */}
      {workbook && workbook.SheetNames.length > 1 && (
        <div style={{
          background: colors.white,
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto'
        }}>
          {workbook.SheetNames.map((name, i) => (
            <button
              key={i}
              onClick={() => loadSheet(workbook, i)}
              style={{
                background: i === currentSheet ? colors.accent : colors.bg,
                color: i === currentSheet ? colors.white : colors.text,
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      {headers.length > 0 && (
        <div style={{
          background: colors.white,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Filter size={20} color={colors.accent} />
            <h3 style={{ margin: 0, color: colors.accent }}>Filters</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {headers.map(header => {
              const uniqueValues = [...new Set(data.map(row => row[header]))].filter(Boolean);
              return (
                <div key={header}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    {header}
                  </label>
                  <select
                    multiple
                    value={filters[header] || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFilters({ ...filters, [header]: selected });
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: `2px solid ${colors.secondary}`,
                      fontSize: '14px',
                      maxHeight: '100px'
                    }}
                  >
                    {uniqueValues.map((value, i) => (
                      <option key={i} value={value}>{value || '(empty)'}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data View - Grid */}
      {data.length > 0 && viewMode === 'grid' && (
        <div style={{
          background: colors.white,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: colors.accent }}>Data Grid</h3>
            <button onClick={addRow} style={{
                background: colors.accent,
                color: colors.white,
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
              <Plus size={16} /> Add Row
            </button>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={{ 
                    background: colors.accent, 
                    color: colors.white, 
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}>#</th>
                  {headers.map((header, i) => (
                    <th key={i} style={{ 
                      background: colors.accent, 
                      color: colors.white, 
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '600',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      minWidth: '150px'
                    }}>{header}</th>
                  ))}
                  <th style={{ 
                    background: colors.accent, 
                    color: colors.white, 
                    padding: '12px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ 
                    background: rowIndex % 2 === 0 ? colors.bg : colors.white
                  }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: colors.accent }}>
                      {rowIndex + 1}
                    </td>
                    {headers.map((header, colIndex) => {
                      const cellKey = `${rowIndex}-${header}`;
                      const suggestions = aiSuggestions[cellKey];
                      
                      return (
                        <td key={colIndex} style={{ padding: '8px', position: 'relative' }}>
                          <input
                            type="text"
                            value={row[header] || ''}
                            onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                            onFocus={() => {
                              setActiveCell(cellKey);
                              if (isNumericField(header)) {
                                generateAiSuggestions(header, rowIndex, data);
                              }
                            }}
                            onBlur={() => setTimeout(() => setActiveCell(null), 200)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: '8px',
                              border: `2px solid ${colors.secondary}`,
                              fontSize: '14px',
                              background: colors.white
                            }}
                          />
                          {activeCell === cellKey && suggestions && suggestions.length > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: '8px',
                              background: colors.white,
                              border: `2px solid ${colors.accent}`,
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              zIndex: 1000,
                              marginTop: '4px',
                              minWidth: '120px'
                            }}>
                              <div style={{ 
                                padding: '8px', 
                                fontSize: '12px', 
                                fontWeight: '600',
                                color: colors.accent,
                                borderBottom: `1px solid ${colors.secondary}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Brain size={14} /> AI Suggestions
                              </div>
                              {suggestions.map((suggestion, i) => (
                                <div
                                  key={i}
                                  onClick={() => {
                                    handleCellChange(rowIndex, header, suggestion.toString());
                                    setActiveCell(null);
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    borderBottom: i < suggestions.length - 1 ? `1px solid ${colors.bg}` : 'none'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = colors.bg}
                                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  {suggestion}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: '8px' }}>
                      <button
                        onClick={() => deleteRow(rowIndex)}
                        style={{
                          background: '#e74c3c',
                          color: colors.white,
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card View */}
      {data.length > 0 && viewMode === 'card' && (
        <div style={{
          background: colors.white,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: 0, color: colors.accent }}>Card View</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                disabled={currentCardIndex === 0}
                style={{
                  background: colors.accent,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: currentCardIndex > 0 ? 'pointer' : 'not-allowed',
                  opacity: currentCardIndex > 0 ? 1 : 0.5
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                {currentCardIndex + 1} / {filteredData.length}
              </span>
              <button
                onClick={() => setCurrentCardIndex(Math.min(filteredData.length - 1, currentCardIndex + 1))}
                disabled={currentCardIndex === filteredData.length - 1}
                style={{
                  background: colors.accent,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: currentCardIndex < filteredData.length - 1 ? 'pointer' : 'not-allowed',
                  opacity: currentCardIndex < filteredData.length - 1 ? 1 : 0.5
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          {filteredData[currentCardIndex] && (
            <div style={{
              background: colors.bg,
              borderRadius: '12px',
              padding: '24px',
              border: `2px solid ${colors.secondary}`
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                {headers.map((header, i) => (
                  <div key={i}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.accent
                    }}>
                      {header}
                    </label>
                    <input
                      type="text"
                      value={filteredData[currentCardIndex][header] || ''}
                      onChange={(e) => {
                        const actualIndex = data.findIndex(row => 
                          JSON.stringify(row) === JSON.stringify(filteredData[currentCardIndex])
                        );
                        handleCellChange(actualIndex, header, e.target.value);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `2px solid ${colors.secondary}`,
                        fontSize: '16px',
                        background: colors.white
                      }}
                    />
                  </div>
                ))}
              </div>
              
              <div style={{ 
                marginTop: '24px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    const actualIndex = data.findIndex(row => 
                      JSON.stringify(row) === JSON.stringify(filteredData[currentCardIndex])
                    );
                    deleteRow(actualIndex);
                    setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
                  }}
                  style={{
                    background: '#e74c3c',
                    color: colors.white,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  <Trash2 size={16} /> Delete Row
                </button>
              </div>
            </div>
          )}
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => {
                addRow();
                setCurrentCardIndex(data.length);
              }}
              style={{
                background: colors.accent,
                color: colors.white,
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <Plus size={18} /> Add New Row
            </button>
          </div>
        </div>
      )}
      
      {data.length === 0 && (
        <div style={{
          background: colors.white,
          borderRadius: '16px',
          padding: '60px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <Upload size={64} color={colors.accent} style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: colors.accent, marginBottom: '12px' }}>No Data Loaded</h2>
          <p style={{ color: colors.text, opacity: 0.7, marginBottom: '24px' }}>
            Upload an Excel file to get started
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: colors.accent,
              color: colors.white,
              border: 'none',
              borderRadius: '12px',
              padding: '14px 32px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(126,154,119,0.3)'
            }}
          >
            Upload Excel File
          </button>
        </div>
      )}
      
      {/* Auto-save indicator */}
      {isClient && data.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: colors.accent,
          color: colors.white,
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '600',
          opacity: 0.9
        }}>
          <Save size={16} /> Auto-saving...
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        input:focus {
          outline: none;
          border-color: ${colors.accent} !important;
          box-shadow: 0 0 0 3px rgba(126,154,119,0.1);
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        select:focus {
          outline: none;
          border-color: ${colors.accent};
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${colors.bg};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${colors.secondary};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${colors.accent};
        }
      `}</style>
    </div>
  );
};

export default ExcelDashboard;
