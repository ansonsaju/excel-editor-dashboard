const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdn.sheetjs.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for custom suggestions (can be extended)
app.post('/api/suggestions', (req, res) => {
  const { column, value, data } = req.body;
  
  try {
    // Custom suggestion logic can be added here
    const suggestions = generateCustomSuggestions(column, value, data);
    res.json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for saving custom suggestion rules
app.post('/api/save-rules', (req, res) => {
  const { rules } = req.body;
  // In production, save to database
  res.json({ success: true, message: 'Rules saved successfully' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Catch-all route - serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function generateCustomSuggestions(column, value, data) {
  // Basic suggestion algorithm
  const suggestions = [];
  
  // Get frequency of values in column
  const valueCounts = {};
  data.forEach(row => {
    const val = row[column];
    if (val) valueCounts[val] = (valueCounts[val] || 0) + 1;
  });
  
  // Sort by frequency
  const sorted = Object.entries(valueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([val]) => val);
  
  return sorted;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Excel Editor Pro running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Access: http://localhost:${PORT}`);
});

module.exports = app;
