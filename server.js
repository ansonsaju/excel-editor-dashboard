const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Excel Editor Dashboard running on port ${PORT}`);
});
```

#### **3. Create `.gitignore`:**
```
node_modules/
.DS_Store
*.log
.env
package-lock.json
```

#### **4. Create `public` folder and add `index.html`:**
Copy the entire HTML content from the artifact I just created above (the complete_index_html artifact).

Your folder structure should look like:
```
excel-editor-dashboard/
├── package.json
├── server.js
├── .gitignore
└── public/
    └── index.html
