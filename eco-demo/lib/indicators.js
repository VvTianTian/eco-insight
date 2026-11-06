// 演示用示例指标库。
// ⚠️ 数据为公开资料整理的近似值,仅用于演示系统功能,正式版需接入真实数据源并核对口径。
const SOURCES = [
  { key: 'demo', name: '演示数据库', note: '示例数据,待接入真实数据源' },
  { key: 'stats-gov', name: '国家统计局', note: 'data.stats.gov.cn 接口当前对本机返回 403(WAF),需评估采集方案' },
  { key: 'gx-stats', name: '广西统计局', note: 'tjj.gxzf.gov.cn 首页可访问,数据以 Excel 附件发布,待开发解析' },
  { key: 'mee', name: '生态环境部', note: 'mee.gov.cn 可访问,月度/年度公报待解析' },
  { key: 'gx-mee', name: '广西生态环境厅', note: 'sthjt.gxzf.gov.cn 可访问,断面水质/空气质量数据待解析' },
];

const DEMO_NOTE = '演示数据库(示例数据)';

const INDICATORS = [
  {
    name: '广西·地区生产总值',
    keys: ['生产总值', 'gdp'],
    aliases: ['广西gdp', '广西生产总值', '广西地区生产总值'],
    unit: '亿元',
    freq: '年度',
    range: '2019-2024',
    source: DEMO_NOTE,
    category: '经济数据',
    data: { 2019: 21237, 2020: 22157, 2021: 24741, 2022: 26301, 2023: 27202, 2024: 28649 },
  },
  {
    name: '全国·国内生产总值',
    keys: ['生产总值', 'gdp'],
    aliases: ['全国gdp', '国内生产总值', 'gdp'],
    unit: '万亿元',
    freq: '年度',
    range: '2019-2024',
    source: DEMO_NOTE,
    category: '经济数据',
    data: { 2019: 98.65, 2020: 101.6, 2021: 114.92, 2022: 120.47, 2023: 126.06, 2024: 134.9 },
    notes: '若问"国民生产总值(GNP)",需注意与GDP口径不同;本系统默认按GDP口径回答。',
  },
  {
    name: '广西·固定资产投资增速',
    keys: ['固定资产投资', '固投'],
    aliases: ['广西固投', '固定资产投资'],
    unit: '%',
    freq: '年度',
    range: '2019-2024',
    source: DEMO_NOTE,
    category: '经济数据',
    data: { 2019: 8.4, 2020: 4.2, 2021: 4.6, 2022: 2.5, 2023: 2.8, 2024: 3.4 },
    notes: '"工业生产总值"为已停用的旧指标名称,现行口径为"规模以上工业增加值增速",正式版需与甲方确认。',
  },
  {
    name: '全国·地表水Ⅰ—Ⅲ类水质比例',
    keys: ['地表水', '水质'],
    aliases: ['地表水', '水质优良比例', '水质比例'],
    unit: '%',
    freq: '年度',
    range: '2019-2024',
    source: DEMO_NOTE,
    category: '环境数据',
    data: { 2019: 74.9, 2020: 83.4, 2021: 84.9, 2022: 87.9, 2023: 89.4, 2024: 90.4 },
  },
  {
    name: '全国·339城PM2.5平均浓度',
    keys: ['pm2.5', 'pm25', '颗粒物'],
    aliases: ['pm2.5', 'pm25', '空气质量'],
    unit: 'μg/m³',
    freq: '年度',
    range: '2019-2024',
    source: DEMO_NOTE,
    category: '环境数据',
    data: { 2019: 36, 2020: 33, 2021: 30, 2022: 29, 2023: 30, 2024: 29.3 },
  },
  {
    name: '广西·国家地表水考核断面水质优良比例',
    keys: ['地表水', '水质', '考核断面'],
    aliases: ['广西水质', '考核断面'],
    unit: '%',
    freq: '年度',
    range: '2019-2024',
    source: DEMO_NOTE,
    category: '环境数据',
    data: { 2019: 96.2, 2020: 97.3, 2021: 97.9, 2022: 98.2, 2023: 98.2, 2024: 98.4 },
  },
  {
    name: '广西·环境空气质量优良天数比例',
    keys: ['空气质量', '优良天数', '空气'],
    aliases: ['广西空气', '优良天数'],
    unit: '%',
    freq: '年度',
    range: '2019-2024',
    source: DEMO_NOTE,
    category: '环境数据',
    data: { 2019: 91.7, 2020: 95.8, 2021: 95.8, 2022: 95.1, 2023: 96.5, 2024: 96.8 },
  },
];

const SUGGESTIONS = {
  经济数据: [
    '结合近三年走势,研判投资下行压力并提出稳投资政策建议。',
    '对比全国水平,评估广西经济总量差距及追赶路径。',
  ],
  环境数据: [
    '评估当前水质/空气质量改善空间,提出污染防治攻坚重点。',
    '结合中央生态环保督察要求,提出常态化管控建议。',
  ],
};

function listIndicators() {
  return INDICATORS.map((i) => ({
    name: i.name,
    unit: i.unit,
    freq: i.freq,
    range: i.range,
    source: i.source,
    category: i.category,
  }));
}

function getSeries(name) {
  return INDICATORS.find((i) => i.name === name) || null;
}

function findIndicators(question) {
  let q = question.toLowerCase();
  if (q.includes('gdp')) q += ' 生产总值';
  if (q.includes('固投')) q += ' 固定资产投资';
  const regions = ['广西', '全国'].filter((r) => q.includes(r));
  let hits = INDICATORS.filter(
    (i) =>
      q.includes(i.name.toLowerCase()) ||
      i.aliases.some((a) => q.includes(a.toLowerCase())) ||
      (i.keys || []).some((k) => q.includes(k.toLowerCase()))
  );
  if (regions.length) {
    const regional = hits.filter((i) => regions.some((r) => i.name.startsWith(r)));
    if (regional.length) hits = regional;
  }
  return hits;
}

function yoy(series) {
  const years = Object.keys(series.data).sort();
  return years.map((y, idx) => {
    const prev = years[idx - 1];
    const v = series.data[y];
    const g = prev ? ((v - series.data[prev]) / series.data[prev]) * 100 : null;
    return { year: y, value: v, growth: g === null ? null : +g.toFixed(2) };
  });
}

function analyze(rows, ind) {
  const growths = rows.filter((r) => r.growth !== null);
  const last = rows[rows.length - 1];
  const firstGrowth = growths[0]?.growth ?? 0;
  const lastGrowth = growths[growths.length - 1]?.growth ?? 0;
  const improving = last.growth !== null ? last.growth > 0 : last.value >= rows[rows.length - 2].value;
  const trend =
    growths.length >= 2 && lastGrowth >= firstGrowth ? '整体呈上升态势' : '增速有所放缓,需关注下行压力';
  const direction = ind.unit === 'μg/m³' ? '下降' : '提升';
  return { last, improving, trend, direction };
}

function answerQuery(question) {
  const hits = findIndicators(question);
  if (hits.length === 0) {
    return {
      matched: false,
      question,
      answer: null,
      hint: '未能识别问题中的指标。支持的指标:' + INDICATORS.map((i) => i.name).join('、'),
    };
  }
  const sections = hits.map((ind) => {
    const rows = yoy(ind);
    const a = analyze(rows, ind);
    const suggest = SUGGESTIONS[ind.category] || [];
    return {
      indicator: ind.name,
      unit: ind.unit,
      freq: ind.freq,
      source: ind.source,
      notes: ind.notes || null,
      summary: rows,
      analysis:
        `${ind.name}最新一期(${a.last.year})为 ${a.last.value} ${ind.unit},` +
        (a.last.growth !== null ? `同比${a.improving ? directionText(ind, a) : '有所回落'}(${a.last.growth}%)。` : '。') +
        `${a.trend}。`,
      suggestions: suggest,
    };
  });

  function directionText(ind, a) {
    return ind.unit === 'μg/m³' ? '下降' : '增长';
  }

  return { matched: true, question, sections };
}

module.exports = { SOURCES, INDICATORS, listIndicators, getSeries, answerQuery };
