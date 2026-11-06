# eco-insight

生态环境信息抓取与分析平台（本地 Demo）。

## 一期模块

- 首页总览
- 新闻精选
- 数据查询
- 数据图表
- 趋势分析
- 报告生成

## 目录结构

```
eco-demo/
├── server.js          # HTTP 服务与 API
├── lib/scrapers.js    # 新闻采集（中国环境网）
├── lib/indicators.js  # 指标库与查询模板
├── data/news.json     # 采集结果快照
└── public/            # 前端页面与静态资源
```

## 运行

无需安装依赖，Node.js 18+ 直接启动：

```bash
node eco-demo/server.js
```

打开 http://localhost:3210 。端口可通过 `PORT` 环境变量覆盖。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/news` | 新闻列表，支持 `q` 关键词与 `tag` 标签筛选 |
| POST | `/api/news/refresh` | 重新采集新闻 |
| GET | `/api/indicators` | 指标目录 |
| POST | `/api/query` | 自然语言查询，返回表格与分析 |
| GET | `/api/series?indicator=` | 指标时序数据 |

## 数据说明

- 新闻：实时采集自中国环境网公开页面，按关键词命中筛选。
- 指标：当前为示例数据，用于验证查询、图表与报告链路；后续接入国家统计局、生态环境部及广西相关数据源。
- 智能问答与报告撰写目前为模板化输出，大模型能力后续接入。
