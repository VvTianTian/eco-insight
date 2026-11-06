const fs = require('fs');
const path = require('path');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const KEYWORDS = [
  '生态环境',
  '重金属',
  '排查整治',
  '畜禽养殖',
  '秸秆',
  '漓江总体战',
  '中央生态环境保护督察',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function matchTags(text) {
  return KEYWORDS.filter((k) => text.includes(k));
}

// 已验证可用:中国环境网 CMS API
async function fetchCenews() {
  const columns = [
    { cid: 9, name: '头条' },
    { cid: 51, name: '聚焦' },
    { cid: 167, name: '发布厅' },
    { cid: 288, name: '地方头条' },
  ];
  const items = [];
  for (const col of columns) {
    const url = `https://cmsapi.cenews.com.cn/api/getArticles?cid=${col.cid}&page=1&size=20`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`cenews ${col.cid} HTTP ${res.status}`);
    const data = await res.json();
    for (const a of data.list || []) {
      if (a.articleType !== 0 && a.articleType !== undefined && !a.fileID) continue;
      const title = a.title || '';
      const summary = (a.abstract || '').trim();
      const text = title + summary;
      const tags = matchTags(text);
      items.push({
        id: `cenews-${a.fileID}`,
        title,
        summary,
        date: (a.publishTime || '').slice(0, 10),
        source: a.source || '中国环境网',
        url: `https://www.cenews.com.cn/news.html?aid=${a.fileID}`,
        tags,
        column: col.name,
        matched: tags.length > 0,
      });
    }
    await sleep(800);
  }
  return items;
}

// 待适配:以下站点对服务端直接抓取有 WAF/JS 渲染限制,演示版先记录状态
async function fetchPlaceholder(name) {
  throw new Error(`${name}:页面为JS动态渲染或WAF防护,需浏览器渲染方案(Playwright),演示版暂未接入`);
}

const ADAPTERS = [
  { key: 'cenews', name: '中国环境网', fetch: fetchCenews },
  { key: 'people', name: '人民网', fetch: () => fetchPlaceholder('人民网') },
  { key: 'gxnews', name: '广西新闻网', fetch: () => fetchPlaceholder('广西新闻网') },
  { key: 'gxzf', name: '广西政府网', fetch: () => fetchPlaceholder('广西政府网') },
];

async function collectNews() {
  const sources = [];
  let all = [];
  for (const ad of ADAPTERS) {
    try {
      const items = await ad.fetch();
      sources.push({ key: ad.key, name: ad.name, status: 'ok', count: items.length });
      all = all.concat(items);
    } catch (e) {
      sources.push({ key: ad.key, name: ad.name, status: 'error', message: String(e.message || e) });
    }
  }
  // 去重 + 优先保留命中关键词的条目排前面
  const seen = new Set();
  all = all.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
  all.sort((a, b) => Number(b.matched) - Number(a.matched) || b.date.localeCompare(a.date));

  const out = {
    updatedAt: new Date().toISOString(),
    keywords: KEYWORDS,
    sources,
    matchedCount: all.filter((i) => i.matched).length,
    items: all,
  };
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'news.json'), JSON.stringify(out, null, 2));
  return out;
}

module.exports = { collectNews, KEYWORDS };
