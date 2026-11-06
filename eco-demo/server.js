const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { collectNews } = require('./lib/scrapers');
const { answerQuery, listIndicators, getSeries, SOURCES } = require('./lib/indicators');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
const PORT = process.env.PORT || 3210;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function readNews() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, 'news.json'), 'utf-8'));
  } catch {
    return { updatedAt: null, sources: [], items: [] };
  }
}

function sendJson(res, data, code = 200) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let file = pathname === '/' ? '/index.html' : pathname;
  const full = path.normalize(path.join(PUBLIC, file));
  if (!full.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  fs.readFile(full, (err, buf) => {
    if (err) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(u.pathname);

  if (pathname === '/api/news') {
    const data = readNews();
    const q = (u.searchParams.get('q') || '').trim();
    const tag = u.searchParams.get('tag') || '';
    let items = data.items;
    if (q) items = items.filter((i) => (i.title + i.summary + i.tags.join('')).includes(q));
    if (tag) items = items.filter((i) => i.tags.includes(tag));
    return sendJson(res, { ...data, items });
  }

  if (pathname === '/api/news/refresh' && req.method === 'POST') {
    try {
      const result = await collectNews();
      return sendJson(res, result);
    } catch (e) {
      return sendJson(res, { error: String(e.message || e) }, 500);
    }
  }

  if (pathname === '/api/indicators') {
    return sendJson(res, { sources: SOURCES, indicators: listIndicators() });
  }

  if (pathname === '/api/query' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { question } = JSON.parse(body || '{}');
        sendJson(res, answerQuery(question || ''));
      } catch (e) {
        sendJson(res, { error: String(e.message || e) }, 400);
      }
    });
    return;
  }

  if (pathname === '/api/series') {
    const name = u.searchParams.get('indicator') || '';
    const s = getSeries(name);
    if (!s) return sendJson(res, { error: '未找到指标: ' + name }, 404);
    return sendJson(res, s);
  }

  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`生态环境信息抓取与分析平台 · Demo 已启动: http://localhost:${PORT}`);
});
