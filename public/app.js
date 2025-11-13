// Excel Editor Pro - Working Version (No localStorage errors)
const { useState, useEffect, useRef } = React;
const { createElement: h } = React;

// Safe localStorage helper
const safeStorage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item && item !== 'undefined' && item !== 'null' ? JSON.parse(item) : [];
    } catch (e) {
      console.warn('Storage read error:', e);
      return [];
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }
};

// Simple Icon Component
const Icon = ({ d, size = 24 }) => 
  h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('path', { d })
  );

// Main App
const ExcelEditorPro = () => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '' });
  const fileRef = useRef(null);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setFileName(file.name);
      const ab = await file.arrayBuffer();
      const wb = window.XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
      
      if (json.length > 0) {
        setHeaders(Object.keys(json[0]));
        setData(json);
        showToast('✅ File uploaded!');
      }
    } catch (err) {
      showToast('❌ Upload failed');
      console.error(err);
    }
  };

  const handleDownload = () => {
    if (!data.length) return showToast('⚠️ No data');
    
    try {
      const wb = window.XLSX.utils.book_new();
      const ws = window.XLSX.utils.json_to_sheet(data);
      window.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      window.XLSX.writeFile(wb, fileName || 'data.xlsx');
      showToast('✅ Downloaded!');
    } catch (err) {
      showToast('❌ Download failed');
    }
  };

  const addRow = () => {
    const row = {};
    headers.forEach(h => row[h] = '');
    setData([...data, row]);
    showToast('✅ Row added');
  };

  const delRow = (i) => {
    setData(data.filter((_, idx) => idx !== i));
    showToast('✅ Row deleted');
  };

  const updateCell = (i, h, val) => {
    const newData = [...data];
    newData[i][h] = val;
    setData(newData);
  };

  return h('div', { 
    className: 'min-h-screen p-6',
    style: { background: 'linear-gradient(135deg, #E1EBED, #D7E7E7)' }
  },
    h('div', { className: 'max-w-7xl mx-auto' },
      // Header
      h('div', { className: 'bg-white/90 rounded-2xl shadow-2xl p-6 mb-6' },
        h('h1', {
          className: 'text-4xl font-bold mb-4',
          style: {
            background: 'linear-gradient(to right, #6D7F6C, #C68A60)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }
        }, 'Excel Editor Pro'),
        
        // Buttons
        h('div', { className: 'flex flex-wrap gap-2' },
          h('button', {
            onClick: () => fileRef.current?.click(),
            className: 'px-6 py-3 rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-2',
            style: { background: 'linear-gradient(to right, #6D7F6C, #C68A60)' }
          },
            h(Icon, { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', size: 18 }),
            'Upload'
          ),
          h('input', { ref: fileRef, type: 'file', accept: '.xlsx,.xls', onChange: handleUpload, className: 'hidden' }),
          
          h('button', {
            onClick: handleDownload,
            disabled: !data.length,
            className: 'px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50',
            style: { background: 'linear-gradient(to right, #D7E7A4, #E1ECB3)', color: '#333' }
          },
            h(Icon, { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', size: 18 }),
            'Download'
          ),
          
          h('button', {
            onClick: addRow,
            disabled: !data.length,
            className: 'px-6 py-3 rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50',
            style: { background: 'linear-gradient(to right, #6D7F6C, #D7E7A4)' }
          },
            h(Icon, { d: 'M12 5v14M5 12h14', size: 18 }),
            'Add Row'
          )
        )
      ),

      // Data Table
      !data.length ? h('div', { className: 'bg-white/90 rounded-2xl shadow-2xl p-12 text-center' },
        h('div', { className: 'mb-4' },
          h(Icon, { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', size: 64, className: 'mx-auto text-gray-300' })
        ),
        h('h2', { className: 'text-2xl font-bold mb-2' }, 'No Data Yet'),
        h('p', { className: 'text-gray-600 mb-6' }, 'Upload an Excel file to start'),
        h('button', {
          onClick: () => fileRef.current?.click(),
          className: 'px-8 py-4 rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all',
          style: { background: 'linear-gradient(to right, #6D7F6C, #C68A60)' }
        }, 'Choose File')
      ) : h('div', { className: 'bg-white/90 rounded-2xl shadow-2xl overflow-hidden' },
        h('div', { className: 'overflow-x-auto' },
          h('table', { className: 'w-full' },
            h('thead', { 
              className: 'text-white',
              style: { background: 'linear-gradient(to right, #6D7F6C, #C68A60)' }
            },
              h('tr', {},
                h('th', { className: 'px-4 py-3 text-left' }, 'Actions'),
                ...headers.map(hdr => h('th', { key: hdr, className: 'px-4 py-3 text-left whitespace-nowrap' }, hdr))
              )
            ),
            h('tbody', {},
              ...data.map((row, i) => 
                h('tr', { key: i, className: 'border-b hover:bg-gray-50' },
                  h('td', { className: 'px-4 py-2' },
                    h('button', {
                      onClick: () => delRow(i),
                      className: 'text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-all'
                    }, h(Icon, { d: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6', size: 16 }))
                  ),
                  ...headers.map(hdr =>
                    h('td', { key: hdr, className: 'px-4 py-2' },
                      h('input', {
                        type: 'text',
                        value: row[hdr] || '',
                        onChange: (e) => updateCell(i, hdr, e.target.value),
                        className: 'w-full px-3 py-2 border-2 border-transparent focus:border-blue-500 rounded text-sm'
                      })
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),

    // Toast
    toast.show && h('div', {
      className: 'fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl text-white font-medium',
      style: { background: 'linear-gradient(to right, #10b981, #059669)', animation: 'slideIn 0.3s ease-out' }
    }, toast.msg)
  );
};

// Render
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(h(ExcelEditorPro));
  console.log('✅ App loaded successfully');
} catch (err) {
  console.error('❌ Render error:', err);
  document.getElementById('root').innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h1 style="color: #ef4444;">Error Loading App</h1>
      <p>${err.message}</p>
    </div>
  `;
}
