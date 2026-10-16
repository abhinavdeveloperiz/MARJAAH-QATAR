const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=UTF-8',
  '.xml': 'application/xml; charset=UTF-8',
};

const server = http.createServer((req, res) => {
  // Proxy /api requests to NestJS backend on port 3001
  if (req.url.startsWith('/api/')) {
    const proxyReq = http.request({
      hostname: 'localhost',
      port: 3001,
      path: req.url,
      method: req.method,
      headers: req.headers,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend proxy error', details: err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  // Parse path
  let parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  let cleanPath = pathname.replace(/^\/ar\//, '/').replace(/^\/ar$/, '/');
  if (cleanPath === '/privacy-policy' || cleanPath === '/privacy-policy/') cleanPath = '/privacy/';
  if (cleanPath === '/returns-policy' || cleanPath === '/returns-policy/' || cleanPath === '/refund-policy') cleanPath = '/returns/';
  if (cleanPath === '/terms-and-conditions' || cleanPath === '/terms-and-conditions/') cleanPath = '/terms/';
  if (cleanPath === '/order-tracking') cleanPath = '/track-order/';

  let filePath = path.join(FRONTEND_DIR, cleanPath);

  // Route clean product URLs: /product/:slug, /ar/product/:slug
  if (pathname.match(/^\/(?:ar\/)?product(?:\/.*)?$/)) {
    filePath = path.join(FRONTEND_DIR, 'product', 'index.html');
  } else if (pathname === '/robot.txt') {
    filePath = path.join(FRONTEND_DIR, 'robots.txt');
  } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
    res.end('<h1>404 Not Found</h1>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
});
