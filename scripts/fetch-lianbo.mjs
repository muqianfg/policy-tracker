import fs from 'node:fs';
// 抓取指定日期《新闻联播》条目单（央视官方源）
// CLI: node fetch-lianbo.mjs [YYYY-MM-DD] [--json]
// 模块: import { fetchLianbo } from './fetch-lianbo.mjs'
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

async function get(u) {
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + u);
  return await r.text();
}

function meta(html, attr) {
  let m = html.match(new RegExp('<meta[^>]*name=.?' + attr + '.?[^>]*content=.([^\'">]*)', 'i'));
  if (m) return m[1];
  m = html.match(new RegExp('<meta[^>]*content=.([^\'">]*).[^>]*name=.?' + attr + '.?', 'i'));
  return m ? m[1] : '';
}

// 条目以「编号 + 句点」开头；编号后必须紧跟句点，因此不会误切 51.42% 这类小数
function segments(s) {
  const segs = [];
  for (const m of s.matchAll(/(?:^|[；\s])(\d{1,2})[.．]\s*([^；]*)/g)) {
    const text = (m[2] || '').trim().replace(/[；。]$/, '');
    if (text) segs.push({ n: Number(m[1]), text });
  }
  return segs;
}

function parseSub(s) {
  return [...s.matchAll(/(?:（(\d{1,2})）|(?:^|[；。])\s*(\d{1,2})[.．])\s*([^；（]*)/g)]
    .map(m => ({ n: Number(m[1] || m[2]), text: (m[3] || '').trim().replace(/[；。]$/, '') }))
    .filter(x => x.text);
}

export function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

export async function fetchLianbo(day) {
  const DAY = day || today();
  const YMD = DAY.replace(/-/g, '');
  const api = 'https://api.cntv.cn/NewVideo/getVideoListByColumn?id=TOPC1451528971114112&n=30&sort=desc&p=1&d=&mode=0&serviceId=tvcctv&cb=';
  const list = JSON.parse(await get(api)).data.list;

  let target = list.find(v => v.title.includes(YMD) && v.title.includes('19:00'))
            || list.find(v => v.title.includes(YMD));
  if (!target) {
    throw new Error('未在央视列表中找到 ' + DAY + ' 的《新闻联播》，可能尚未上线。列表最新一条: ' + (list[0] && list[0].title));
  }

  let html = await get(target.url);
  let desc = meta(html, 'description');
  if (!desc || desc.length < 80) {
    const alt = list.find(v => v.title.includes(YMD) && v.url !== target.url);
    if (alt) {
      const d2 = meta(await get(alt.url), 'description');
      if (d2 && d2.length >= 80) { desc = d2; target = alt; }
    }
  }
  let source = 'cctv-official';
if (!desc || desc.length < 80) {
  // 降级：官方页面 description 未填充时，用兜底文件（媒体整理的条目单，由调用方提供）
  const fb = process.env.LIANBO_FALLBACK || (process.argv.includes('--fallback') ? process.argv[process.argv.indexOf('--fallback') + 1] : '');
  if (fb && fs.existsSync(fb)) {
    const raw = fs.readFileSync(fb, 'utf8').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
    if (raw.length >= 80) { desc = raw; source = 'fallback-file:' + fb; }
  }
}
// 页面正文提取：央视视频页的"视频简介"里会先于 meta 出现完整节目单
function bodyRundown(html) {
  const flat = html.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const one = flat.replace(/\s+/g, ' ');
  const start = one.indexOf('本期节目主要内容');
  if (start < 0) return '';
  let seg = one.slice(start).replace(/^本期节目主要内容[:：]?\s*/, '');
  // 从"本期节目主要内容"到下一个栏目信息/页脚之间，就是完整条目单 —— 不能按行截断
  const stops = ['栏目信息', '栏目名称', '（《新闻联播》', '《新闻联播》 20261010 19:00）', '分享到', '责任编辑'];
  for (const s of stops) {
    const i = seg.indexOf(s);
    if (i > 100) seg = seg.slice(0, i);
  }
  const cleaned = seg.trim();
  return (cleaned.length >= 80 && /\d{1,2}[.．]/.test(cleaned)) ? cleaned : '';
}
if (!desc || desc.length < 80) {
  const b = bodyRundown(html);
  if (b) { desc = b; source = 'cctv-page-body'; }
}
if (!desc || desc.length < 80) {
  // 兜底 A：央视栏目页/图文页常常先于视频页填充"本期节目主要内容"
  try {
    const lm = await get('https://tv.cctv.com/lm/xwlb/');
    const links = [...lm.matchAll(/href=["']?(https?:\/\/[^"' >]*?(?:news\.cctv|tv\.cctv)[^"' >]*?26101[0-9][^"' >]*?)["' >]/g)].map(m => m[1]);
    const uniq = [...new Set(links)].slice(0, 12);
    for (const u of uniq) {
      try {
        const h = await get(u);
        const d = meta(h, 'description');
        if (d && d.length >= 80 && /\d+\s*[.．]/.test(d)) { desc = d; source = 'cctv-column:' + u; break; }
      } catch {}
    }
  } catch {}
}
if (!desc || desc.length < 80) {
  throw new Error('未能解析条目单：央视官方页面 description 为空/过短（' + (desc || '').length + ' 字符，阈值 80），且未提供有效的兜底文件。URL: ' + target.url +
    '\n处理办法：① 稍后重试（官方页面通常会在当晚补全）；② 用 web_search 搜索「新闻联播 ' + DAY + ' 主要内容」取得条目单，写入 txt 文件后加 --fallback <文件路径> 重新运行。');
}

  desc = desc.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  desc = desc.replace(/（《新闻联播》[^）]*）\s*$/, '').trim();
  desc = desc.replace(/^本期节目主要内容[:：]\s*/, '').replace(/^主要内容[:：]\s*/, '').trim();

  const all = segments(desc);
  // 编号连续递增的部分 = 主干条目；第一次跳号之后 = 快讯 / 国际板块
  const items = [];
  let i = 0;
  for (; i < all.length; i++) {
    if (i > 0 && all[i].n !== all[i - 1].n + 1) break;
    items.push(all[i]);
  }
  const tail = all.slice(i);

  let quickText = '';
  const biDom = desc.indexOf('国内联播快讯');
  const biInt = desc.indexOf('国际联播快讯');
  if (biDom >= 0 || biInt >= 0) {
    quickText = desc.slice(Math.min(...[biDom, biInt].filter(x => x >= 0)));
  } else if (tail.length) {
    quickText = tail.map(s => s.n + '.' + s.text).join('；');
  }
  // 只保留快讯内部的（n）子项：遇到"；11."这种顶层编号就截断，避免与快讯子项混淆
  let quickSubOnly = quickText;
  const topQ = quickSubOnly.search(/[；。]\s*\d{1,2}[.．]/);
  if (topQ >= 0) quickSubOnly = quickSubOnly.slice(0, topQ);
  const quickDetail = [];
  if (quickText) {
    for (const part of quickSubOnly.split(/(?=国际联播快讯)/)) {
      if (!part.trim()) continue;
      for (const q of parseSub(part)) quickDetail.push(q.text);
    }
  }

  return { date: DAY, title: target.title, url: target.url, source, count: items.length, items, quickText, quickDetail, tail, raw: desc };
}

function isMain() {
  const p = (process.argv[1] || '').replace(/\\/g, '/');
  return p.endsWith('fetch-lianbo.mjs');
}

if (isMain()) {
  const dayArg = (process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2])) ? process.argv[2] : null;
  const asJson = process.argv.includes('--json');
  const out = await fetchLianbo(dayArg);
  if (out.count === 0) {
    console.error('【告警】解析出 0 条主条目，条目单可能格式异常或页面未填充。数据源: ' + out.source + '，raw 长度: ' + out.raw.length);
    console.error('raw 前 200 字符: ' + out.raw.slice(0, 200));
  } else if (out.source !== 'cctv-official' && out.source !== 'cctv-page-body') {
    console.error('【告警】本次未使用央视官方条目单，数据源: ' + out.source);
  }
  if (asJson) {
    console.log(JSON.stringify(out, null, 1));
  } else {
    console.log('日期: ' + out.date);
    console.log('标题: ' + out.title);
    console.log('链接: ' + out.url);
    console.log('主条目数: ' + out.count);
    console.log('-'.repeat(64));
    for (const it of out.items) console.log(String(it.n).padStart(2, ' ') + '. ' + it.text);
    if (out.quickText) {
      console.log('-'.repeat(64));
      console.log('【快讯板块】');
      console.log(out.quickText);
      console.log('-'.repeat(64));
      for (const q of out.quickDetail) console.log('   · ' + q);
    }
  }
}
