const fs = require('fs');
const path = require('path');

const jsContent = fs.readFileSync(path.join(__dirname, '../frontend/admin/dashboard/admin-dashboard.js'), 'utf8');

if (jsContent.includes('audit-table-body') && jsContent.includes('openPayloadModal') && jsContent.includes('closePayloadModal')) {
  console.log('SUCCESS: AdminAudit table rendering and modal methods are present');
} else {
  console.error('FAIL: Missing AdminAudit implementation');
  process.exit(1);
}

