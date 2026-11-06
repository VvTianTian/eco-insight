/* 生态环境信息抓取与分析平台 · Demo 前端逻辑 */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const PAGE_TITLES = {
  home: ['首页总览', 'PLATFORM OVERVIEW'],
  news: ['新闻精选', 'NEWS HIGHLIGHTS'],
  query: ['数据查询', 'DATA QUERY'],
  charts: ['数据图表', 'DATA CHARTS'],
  trend: ['趋势分析', 'TREND ANALYSIS'],
  report: ['报告生成', 'REPORT GENERATION'],
};

const state = {
  news: { items: [], keywords: [], sources: [], updatedAt: null },
  indicators: [],
  activeTag: '',
  newsQ: '',
  charts: {},
};

/* ---------- 路由 ---------- */
function goto(page) {
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.page === page));
  $$('.page').forEach((p) => p.classList.toggle('active', p.id === 'page-' + page));
  const [t, sub] = PAGE_TITLES[page];
  $('#page-title').textContent = t;
  $('#page-subtitle').textContent = sub;
  if (page === 'charts') renderChart();
  if (page === 'trend') renderTrend();
  window.scrollTo(0, 0);
}
$$('#nav a').forEach((a) => a.addEventListener('click', () => goto(a.dataset.page)));

/* ---------- 首页 ---------- */
async function loadHome() {
  const [indRes, newsRes] = await Promise.all([
    fetch('/api/indicators').then((r) => r.json()),
    fetch('/api/news').then((r) => r.json()),
  ]);
  state.indicators = indRes.indicators;
  state.news = newsRes;

  $('#news-count').textContent = newsRes.items.length || '';
  $('#news-updated').textContent = newsRes.updatedAt
    ? '新闻最近更新:' + new Date(newsRes.updatedAt).toLocaleString('zh-CN')
    : '';

  const okSrc = newsRes.sources.filter((s) => s.status === 'ok').length;
  $('#src-status').innerHTML =
    `新闻源: <span class="ok">${okSrc} 正常</span> / <span class="err">${newsRes.sources.length - okSrc} 待适配</span><br>` +
    `指标库: ${indRes.indicators.length} 项(示例)`;

  $('#home-stats').innerHTML = [
    { num: newsRes.items.length, label: '收录新闻(条)' },
    { num: newsRes.matchedCount ?? newsRes.items.filter((i) => i.matched).length, label: '关键词命中(条)' },
    { num: indRes.indicators.length, label: '指标数量(项)' },
    { num: indRes.sources.length, label: '配置数据源(个)' },
  ]
    .map((c) => `<div class="stat-card"><div class="num">${c.num}</div><div class="label">${c.label}</div></div>`)
    .join('');

  const srcRows = [
    ...indRes.sources.map((s) => ({ name: s.name, type: '数据', status: s.key === 'demo' ? 'warn' : 'warn', note: s.note })),
    ...newsRes.sources.map((s) => ({ name: s.name, type: '新闻', status: s.status === 'ok' ? 'ok' : 'err', note: s.status === 'ok' ? `抓取成功,${s.count} 条` : s.message })),
  ];
  $('#source-table tbody').innerHTML = srcRows
    .map(
      (r) => `<tr><td>${r.name}</td><td>${r.type}</td><td><span class="pill ${r.status}">${r.status === 'ok' ? '已接入' : r.status === 'warn' ? '示例数据' : '待适配'}</span></td><td style="color:var(--text-dim);font-size:12px">${r.note || ''}</td></tr>`
    )
    .join('');

  $('#module-grid').innerHTML = [
    ['news', '新闻精选', '聚合 4 个新闻源,按关键词过滤,AI 辅助解读'],
    ['query', '数据查询', '对话式查询指标数据,自动生成摘要/分析/建议'],
    ['charts', '数据图表', '指标可视化,折线/柱状图切换'],
    ['trend', '趋势分析', '历史趋势 + 简单外推预测'],
    ['report', '报告生成', '按模板自动汇总新闻与数据,一键导出'],
  ]
    .map(([p, n, d]) => `<div class="module-card" data-goto="${p}"><div class="m-name">${n}</div><div class="m-desc">${d}</div></div>`)
    .join('');
  $$('#module-grid .module-card').forEach((c) => c.addEventListener('click', () => goto(c.dataset.goto)));

  buildNewsPage();
  buildQuerySide();
  buildSelectors();
}

/* ---------- 新闻 ---------- */
function buildNewsPage() {
  const { keywords } = state.news;
  $('#tag-filters').innerHTML =
    `<span class="tag-chip ${state.activeTag === '' ? 'on' : ''}" data-tag="">全部</span>` +
    keywords
      .map((k) => `<span class="tag-chip ${state.activeTag === k ? 'on' : ''}" data-tag="${k}">${k}</span>`)
      .join('');
  $$('#tag-filters .tag-chip').forEach((c) =>
    c.addEventListener('click', () => {
      state.activeTag = c.dataset.tag;
      buildNewsPage();
    })
  );
  renderNewsList();
}

async function renderNewsList() {
  const q = state.newsQ ? `?q=${encodeURIComponent(state.newsQ)}&tag=${encodeURIComponent(state.activeTag)}` : `?tag=${encodeURIComponent(state.activeTag)}`;
  const res = await fetch('/api/news' + q).then((r) => r.json());
  const items = res.items;
  $('#news-meta').textContent = `当前展示 ${items.length} 条新闻 · 关键词:${state.news.keywords.join(' / ')}`;
  $('#news-list').innerHTML = items
    .map((i, idx) => {
      const tags = i.tags.length
        ? i.tags.map((t) => `<span class="news-tag">${t}</span>`).join('')
        : `<span class="news-tag dim">${i.column || '综合'}</span>`;
      return `
      <div class="news-card ${i.matched ? 'hit' : ''}">
        <div class="news-tags">${tags}</div>
        <div class="news-title">${i.title}</div>
        ${i.summary ? `<div class="news-summary">${i.summary}</div>` : ''}
        <div class="news-foot">
          <span>${i.date}</span><span>来源:${i.source}</span>
          <a href="${i.url}" target="_blank" rel="noopener">打开原文</a>
          <button class="btn-ghost" onclick="toggleReading(${idx})">AI 解读</button>
        </div>
        <div class="ai-reading" id="reading-${idx}">${aiReading(i)}</div>
      </div>`;
    })
    .join('') || '<p class="news-meta">没有符合条件的新闻</p>';
}

window.toggleReading = function (idx) {
  const el = $('#reading-' + idx);
  if (el) el.classList.toggle('show');
};

function aiReading(item) {
  const isPolicy = /督察|整治|执法|条例|办法|方案|政策/.test(item.title);
  return `
    <h5>AI 辅助解读(演示)</h5>
    <p><span class="sec">要点解读:</span>本条新闻${item.tags.length ? '涉及关键词「' + item.tags.join('」「') + '」,与本期重点关注方向直接相关' : '与重点关注关键词无直接命中,建议作为背景信息参考'}。核心内容为「${item.title}」。</p>
    <p><span class="sec">${isPolicy ? '法律定位:' : '分析研判:'}</span>${isPolicy ? '该类文件通常属于部门规章或工作方案层级,建议核对发布主体与施行日期,评估对本区域生态环境管理工作的约束范围。' : '建议关注事件后续进展及同类问题的排查范围是否扩大,评估对区域环境质量指标的潜在影响。'}</p>
    <p class="ans-src">注:演示版为规则模板生成的示例解读,正式版将接入大模型生成。</p>`;
}

let searchTimer;
$('#news-search').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.newsQ = e.target.value.trim();
    renderNewsList();
  }, 300);
});

/* ---------- 数据查询 ---------- */
const EXAMPLES = [
  '广西近三年的GDP走势如何?',
  '全国地表水水质优良比例变化情况?',
  '广西环境空气质量优良天数比例是多少?',
  '339个城市的PM2.5平均浓度趋势如何?',
  '广西固定资产投资增速有什么变化?',
  '全国GDP和广西GDP对比一下',
];

function buildQuerySide() {
  $('#example-questions').innerHTML = EXAMPLES.map((q) => `<div class="example-q">${q}</div>`).join('');
  $$('#example-questions .example-q').forEach((el) =>
    el.addEventListener('click', () => {
      $('#chat-input').value = el.textContent;
      sendQuestion();
    })
  );
  $('#indicator-catalog').innerHTML = state.indicators
    .map(
      (i) => `<div class="ind-card"><div class="i-name">${i.name}</div>
      <div class="i-meta">${i.unit} · ${i.freq} · ${i.range}<br>来源:${i.source}</div></div>`
    )
    .join('');
}

function botGreeting() {
  $('#chat-box').innerHTML = `<div class="chat-msg bot"><div class="bubble">您好,我是生态环境数据查询助手。您可以询问指标数据、走势与政策建议,例如:<br>「广西近三年的GDP走势如何?」</div></div>`;
}

async function sendQuestion() {
  const input = $('#chat-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  appendMsg('user', q);
  appendMsg('bot', '<span style="color:var(--text-dim)">正在分析数据…</span>');
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: q }),
  }).then((r) => r.json());
  $('#chat-box').lastChild.remove();
  appendMsg('bot', renderAnswer(res));
}

function appendMsg(who, html) {
  const div = document.createElement('div');
  div.className = 'chat-msg ' + who;
  div.innerHTML = `<div class="bubble">${html}</div>`;
  $('#chat-box').appendChild(div);
  $('#chat-box').scrollTop = $('#chat-box').scrollHeight;
}

function renderAnswer(res) {
  if (!res.matched) return `<div>${res.hint}</div>`;
  return res.sections
    .map((s, i) => {
      const rows = s.summary
        .map((r) => `<tr><td>${r.year}</td><td>${r.value} ${s.unit}</td><td>${r.growth === null ? '—' : (r.growth > 0 ? '+' : '') + r.growth + '%'}</td></tr>`)
        .join('');
      const sugg = s.suggestions.length ? `<ul style="padding-left:18px;margin-top:4px">${s.suggestions.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
      return `
      ${i > 0 ? '<hr style="border-color:var(--border);margin:12px 0">' : ''}
      <div class="ans-title">一、数据摘要 · ${s.indicator}</div>
      <table><thead><tr><th>年份</th><th>数值(${s.unit})</th><th>同比</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="ans-title">二、深度分析</div>
      <div>${s.analysis}</div>
      <div class="ans-title">三、政策建议</div>${sugg}
      ${s.notes ? `<div class="ans-note">口径说明:${s.notes}</div>` : ''}
      <div class="ans-src">指标来源:${s.source} · 频率:${s.freq}</div>`;
    })
    .join('');
}

$('#chat-send').addEventListener('click', sendQuestion);
$('#chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendQuestion();
  }
});

/* ---------- 图表 ---------- */
function buildSelectors() {
  const opts = state.indicators.map((i) => `<option>${i.name}</option>`).join('');
  $('#chart-indicator').innerHTML = opts;
  $('#trend-indicator').innerHTML = opts;
  $('#trend-indicator').value = state.indicators[0]?.name || '';
  $('#chart-indicator').addEventListener('change', renderChart);
  $('#chart-type').addEventListener('change', renderChart);
  $('#trend-indicator').addEventListener('change', renderTrend);
  $('#trend-years').addEventListener('change', renderTrend);
}

async function fetchSeries(name) {
  const res = await fetch('/api/series?indicator=' + encodeURIComponent(name)).then((r) => r.json());
  return res;
}

const CHART_BASE = {
  backgroundColor: 'transparent',
  textStyle: { color: '#dbe6f5' },
  grid: { left: 60, right: 30, top: 50, bottom: 40 },
  tooltip: { trigger: 'axis' },
};

async function renderChart() {
  const name = $('#chart-indicator').value;
  const type = $('#chart-type').value;
  const s = await fetchSeries(name);
  if (!s || s.error) return;
  const years = Object.keys(s.data).sort();
  const values = years.map((y) => s.data[y]);
  const chart = echarts.init($('#chart-main'));
  chart.setOption({
    ...CHART_BASE,
    title: { text: s.name + '(${s.unit})'.replace('${s.unit}', s.unit), textStyle: { color: '#dbe6f5', fontSize: 14 }, left: 'center' },
    xAxis: { type: 'category', data: years, axisLine: { lineStyle: { color: '#7d92b4' } } },
    yAxis: { type: 'value', name: s.unit, splitLine: { lineStyle: { color: '#1f3457' } } },
    series: [{ type, data: values, itemStyle: { color: '#2fd6c8' }, areaStyle: type === 'line' ? { opacity: 0.15 } : undefined, smooth: true }],
  });
  state.charts.main = chart;
}

/* ---------- 趋势 ---------- */
function linearForecast(years, values, n) {
  const xs = years.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = values.reduce((a, b) => a + b, 0) / values.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (values[i] - my);
    den += (x - mx) ** 2;
  });
  const k = den === 0 ? 0 : num / den;
  const b = my - k * mx;
  const forecast = [];
  for (let i = 1; i <= n; i++) {
    forecast.push({ year: String(+years[years.length - 1] + i), value: +(k * (xs.length - 1 + i) + b).toFixed(2) });
  }
  return { k, b, forecast };
}

async function renderTrend() {
  const name = $('#trend-indicator').value;
  const n = +$('#trend-years').value;
  const s = await fetchSeries(name);
  if (!s || s.error) return;
  const years = Object.keys(s.data).sort();
  const values = years.map((y) => s.data[y]);
  const { k, forecast } = linearForecast(years, values, n);
  const fYears = forecast.map((f) => f.year);
  const chart = echarts.init($('#trend-main'));
  chart.setOption({
    ...CHART_BASE,
    title: { text: s.name + ' · 趋势与预测', textStyle: { color: '#dbe6f5', fontSize: 14 }, left: 'center' },
    legend: { data: ['历史', '预测'], textStyle: { color: '#dbe6f5' }, top: 30 },
    xAxis: { type: 'category', data: [...years, ...fYears], axisLine: { lineStyle: { color: '#7d92b4' } } },
    yAxis: { type: 'value', name: s.unit, splitLine: { lineStyle: { color: '#1f3457' } } },
    series: [
      { name: '历史', type: 'line', data: values, itemStyle: { color: '#2fd6c8' }, smooth: true },
      {
        name: '预测', type: 'line', data: [...Array(values.length - 1).fill(null), values[values.length - 1], ...forecast.map((f) => f.value)],
        itemStyle: { color: '#e8c476' }, lineStyle: { type: 'dashed' }, smooth: true,
      },
    ],
  });
  state.charts.trend = chart;

  const up = s.unit === 'μg/m³' ? k < 0 : k > 0;
  const dirWord = s.unit === 'μg/m³' ? (up ? '下降' : '上升') : up ? '上升' : '下降';
  $('#trend-words').innerHTML = `<h3 style="color:var(--accent);margin-bottom:8px">研判结论(演示)</h3>
    「${s.name}」近 ${years.length} 年整体${values[values.length - 1] >= values[0] ? '上行' : '下行'},
    年均变动约 ${Math.abs(k).toFixed(2)} ${s.unit}/年。
    按线性趋势外推未来 ${n} 年:${fYears.map((y, i) => y + ' 年约 ' + forecast[i].value + ' ' + s.unit).join(',' )},
    呈${dirWord}趋势。正式版将结合季节性、政策因素做复合模型预测,并支持置信区间展示。`;
}

/* ---------- 报告 ---------- */
$('#report-month').value = new Date().toISOString().slice(0, 7);
$('#report-gen').addEventListener('click', genReport);
$('#report-print').addEventListener('click', () => {
  if (!$('#report-out').querySelector('h1')) return alert('请先生成报告');
  window.print();
});

async function genReport() {
  const month = $('#report-month').value || new Date().toISOString().slice(0, 7);
  const [newsRes, indRes] = await Promise.all([
    fetch('/api/news').then((r) => r.json()),
    fetch('/api/indicators').then((r) => r.json()),
  ]);
  const matched = newsRes.items.filter((i) => i.matched).slice(0, 10);
  const parts = [];
  parts.push(`<h1>生态环境形势分析报告</h1><div class="r-date">报告期:${month} · 系统自动生成(演示版)</div>`);

  if ($('#rep-news').checked) {
    parts.push(`<h2>一、新闻摘要</h2>
      <p class="r-note">本期共收录新闻 ${newsRes.items.length} 条,命中重点关注关键词 ${matched.length} 条(来源:${newsRes.sources.filter((s) => s.status === 'ok').map((s) => s.name).join('、') || '无'})。</p>`);
    parts.push(
      `<table><thead><tr><th>日期</th><th>标题</th><th>来源</th><th>命中关键词</th></tr></thead><tbody>` +
        matched.map((i) => `<tr><td>${i.date}</td><td><a href="${i.url}" style="color:#1a5cb0;text-decoration:none">${i.title}</a></td><td>${i.source}</td><td>${i.tags.join('、')}</td></tr>`).join('') +
        '</tbody></table>'
    );
  }

  if ($('#rep-data').checked) {
    parts.push('<h2>二、核心指标数据</h2>');
    for (const ind of indRes.indicators.slice(0, 4)) {
      const s = await fetchSeries(ind.name);
      const years = Object.keys(s.data).sort();
      parts.push(`<h3>${ind.name}(${s.unit})</h3>
        <table><thead><tr><th>年份</th>${years.map((y) => `<th>${y}</th>`).join('')}</tr></thead>
        <tbody><tr><td>数值</td>${years.map((y) => `<td>${s.data[y]}</td>`).join('')}</tr></tbody></table>`);
    }
    parts.push('<p class="r-note">注:当前为演示示例数据,正式版接入真实数据源后自动填充。</p>');
  }

  if ($('#rep-trend').checked) {
    parts.push('<h2>三、趋势研判</h2>');
    for (const ind of indRes.indicators.slice(0, 3)) {
      const s = await fetchSeries(ind.name);
      const years = Object.keys(s.data).sort();
      const values = years.map((y) => s.data[y]);
      const { forecast } = linearForecast(years, values, 2);
      parts.push(`<h3>${ind.name}</h3><p>${years[0]}-${years[years.length - 1]} 年整体${values[values.length - 1] >= values[0] ? '上行' : '下行'};线性外推:${forecast.map((f) => f.year + ' 年约 ' + f.value + ' ' + s.unit).join(',' )}。</p>`);
    }
  }

  parts.push('<h2>四、工作建议</h2><ul><li>持续关注中央生态环保督察及排查整治类动态,及时跟进本地区相关问题整改。</li><li>加强畜禽养殖、秸秆焚烧、重金属等重点领域的常态化监测与源头管控。</li><li>按月跟踪核心环境指标,异常波动及时启动专项分析。</li></ul>');
  parts.push('<p class="r-note">本报告由演示系统自动生成,数据来源与口径需以正式发布版为准。</p>');

  $('#report-out').innerHTML = parts.join('');
}

/* ---------- 启动 ---------- */
window.addEventListener('resize', () => Object.values(state.charts).forEach((c) => c && c.resize()));
botGreeting();
loadHome();
