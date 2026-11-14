const fs = require('fs');
const path = require('path');

const jsContent = fs.readFileSync(path.join(__dirname, '../frontend/admin/dashboard/admin-dashboard.js'), 'utf8');

if (jsContent.includes('Shipped / Out for Delivery') && jsContent.includes('Processing & QC Passed') && jsContent.includes('Placed / New Orders')) {
  console.log('SUCCESS: Full status labels present in admin-dashboard.js');
} else {
  console.error('FAIL: Missing full status labels');
  process.exit(1);
}

if (!jsContent.includes('whitespace-nowrap">${st.label}')) {
  console.log('SUCCESS: No whitespace-nowrap or truncation on status label');
} else {
  console.error('FAIL: Still using whitespace-nowrap on status label');
  process.exit(1);
}

