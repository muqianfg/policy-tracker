#!/usr/bin/env node
/**
 * 今日总览（2026-10-27）—— 三个自动化系统的统一入口
 *
 * 读 新闻自动化/打板/期货 三个目录的账户与状态，生成一个 HTML 面板。
 * 用法：node 新闻自动化\工具\dashboard.mjs
 * 输出：D:\自动化任务\今日总览.html
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "今日总览.html");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
const rd = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")) : null);

// ── 打板 ──
const B = rd(join(ROOT, "打板", "数据", "账户.json"));
const board = { ok: false };
if (B) {
  const t = (k) => {
    const tr = B[k];
    const eq = tr.equity.at(-1)?.equity ?? tr.cash;
    return { eq, ret: (eq - 30000) / 300, cash: tr.cash, pos: tr.position, trades: tr.trades.length };
  };
  board.ok = true;
  board.A = t("A");
  board.B = t("B");
  board.legacy = (B.legacy || []).length;
  board.decisions = (B.decisions || []).length;
  board.todayCands = B.decisions?.at(-1)?.candidates?.length ?? 0;
  board.todayRej = B.decisions?.at(-1)?.rejectedCount ?? 0;
}

// ── 期货 ──
const F = rd(join(ROOT, "期货", "数据", "账户.json"));
const fut = { ok: false };
if (F) {
  const margin = F.positions.reduce((s, p) => s + p.margin, 0);
  const float = F.positions.reduce((s, p) => s + (p.floatPnl || 0), 0);
  const eq = F.cash + margin + float;
  fut.ok = true;
  fut.eq = eq; fut.ret = (eq - 30000) / 300; fut.cash = F.cash;
  fut.margin = margin; fut.float = float; fut.pos = F.positions; fut.trades = F.trades.length;
  fut.decisions = (F.decisions || []).length;
  fut.todayCands = F.decisions?.at(-1)?.decisions?.length ?? 0;
}

// ── 新闻 ──
const news = { ok: false };
const mfPath = join(ROOT, "新闻自动化", "MANIFEST.md");
if (existsSync(mfPath)) {
  const t = readFileSync(mfPath, "utf8").replace(/^\uFEFF/, "");
  const rows = t.split(/\r?\n/).filter((l) => /^\| T-\d{8}-\d{2} \|/.test(l));
  news.ok = true;
  news.total = rows.length;
  news.support = rows.filter((l) => /证据支持/.test(l)).length;
  news.pending = rows.filter((l) => /待验证/.test(l)).length;
  news.todayNew = rows.filter((l) => l.includes("T-20261027")).length;
}

const date = today();
const pct = (v) => (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
const cls = (v) => (v >= 0 ? "up" : "down");

const posRow = (p, i) => {
  if (!p) return "";
  const chg = ((p.lastPrice - p.entry) / p.entry) * 100;
  return `<tr><td>${esc(p.name)}</td><td>${p.dir}</td><td>${p.entry}</td><td>${p.lastPrice ?? p.entry}</td><td class="${cls(p.floatPnl || 0)}">${(p.floatPnl >= 0 ? "+" : "") + (p.floatPnl || 0).toFixed(0)}</td><td>${p.termStructure ? (p.termStructure.spread >= 0 ? "+" : "") + p.termStructure.spread + "%" : "—"}</td></tr>`;
};
const boardPosRow = (tr, label) => {
  const p = tr.pos;
  if (!p) return `<tr><td>${label}</td><td colspan="5">空仓</td></tr>`;
  const state = p.buyDate < date ? "⏳ 今日开盘结算（待 16:30 执行）" : "⏳ 明日开盘结算";
  return `<tr><td>${label}</td><td>${esc(p.name)}(${p.code})</td><td>${p.shares} 股</td><td>${p.cost}</td><td>${p.score}/10</td><td>${state}</td></tr>`;
};

// 今日要点：从持仓与平仓记录动态生成
const futLines = (fut.pos || []).map((p) => `${p.name} ${(p.floatPnl >= 0 ? "+" : "") + (p.floatPnl || 0).toFixed(0)}`).join("、");
const closedToday = (F?.manualCloses || []).filter((m) => m.date === date);
const boardLines = [board.A?.pos, board.B?.pos].filter(Boolean).map((p) => `${p.name}（${p.score}/10 分）`).join("、");
const noteParts = [];
if (boardLines) noteParts.push("打板持仓 <b>" + boardLines + "</b>，结算价待今日开盘确定");
if (futLines) noteParts.push("期货持仓 <b>" + futLines + "</b>（月差：螺纹 " + (fut.pos?.find(x=>x.code==="RB0")?.termStructure?.spread ?? "—") + "%、玻璃 " + (fut.pos?.find(x=>x.code==="FG0")?.termStructure?.spread ?? "—") + "%）");
if (closedToday.length) noteParts.push("今日手动平仓 <b>" + closedToday.map((m) => m.name + " " + (m.pnl >= 0 ? "+" : "") + m.pnl.toFixed(0)).join("、") + "</b>：月差不支持做多的品种已退出并加入排除名单");
const noteText = noteParts.length ? noteParts.join("；") + "。" : "今日无持仓变动。";

const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>今日总览 · ${date}</title>
<style>
:root{--bg:#faf8f4;--card:#fff;--text:#23262b;--text-2:#5a6068;--text-3:#8b9199;--accent:#8c2f39;--accent-soft:#f3e6e7;--line:#e6e1d8;--grid:#f7f3ec}
@media(prefers-color-scheme:dark){:root{--bg:#16181d;--card:#1d2026;--text:#e6e8ec;--text-2:#a8aeb8;--text-3:#767c86;--accent:#e0878f;--accent-soft:#33252a;--line:#2e333c;--grid:#232730}}
*{box-sizing:border-box}
body{margin:0;padding:0 20px 70px;background:var(--bg);color:var(--text);font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.7}
.wrap{max-width:1120px;margin:0 auto}
header{padding:30px 0 20px;border-bottom:2px solid var(--accent);margin-bottom:26px}
h1{margin:0 0 8px;font-size:28px;font-weight:800}
.meta{font-size:13px;color:var(--text-3)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-bottom:30px}
.card{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;padding:18px 20px}
.card h2{margin:0 0 4px;font-size:17px;font-weight:700;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.card h2 a{font-size:12px;font-weight:400;color:var(--accent);text-decoration:none}
.big{font-size:30px;font-weight:800;margin:10px 0 2px}
.sub{font-size:12.5px;color:var(--text-3);margin-bottom:12px}
.kv{display:flex;justify-content:space-between;font-size:13.5px;padding:5px 0;border-bottom:1px dashed var(--line)}
.kv:last-child{border-bottom:none}
.kv b{font-weight:700}
.up{color:#b5493f}.down{color:#3c7a8c}
h3{font-size:18px;margin:34px 0 12px;padding-left:12px;border-left:4px solid var(--accent);font-weight:700}
table{border-collapse:collapse;width:100%;font-size:14px;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th{background:var(--grid);text-align:left;padding:10px 13px;font-size:13px;color:var(--text-2);border-bottom:1px solid var(--line)}
td{padding:9px 13px;border-bottom:1px solid var(--line)}
tr:last-child td{border-bottom:none}
.note{background:var(--accent-soft);border-left:4px solid var(--accent);border-radius:0 10px 10px 0;padding:14px 18px;margin:22px 0;font-size:14px}
footer{margin-top:48px;padding-top:18px;border-top:1px solid var(--line);font-size:13px;color:var(--text-3);text-align:center}
@media(max-width:700px){body{padding:0 14px 50px}h1{font-size:22px}.big{font-size:26px}}
</style></head>
<body><div class="wrap">
<header><h1>今日总览 · ${date}</h1>
<div class="meta">三个自动化系统 · 生成于 ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</div></header>

<div class="cards">
  <div class="card">
    <h2>📰 新闻联播简报 <a href="新闻自动化/网页/报告总览.html">详情 →</a></h2>
    <div class="big ${news.todayNew ? "up" : ""}">${news.todayNew} 条新答案</div>
    <div class="sub">今日已写日报</div>
    <div class="kv"><span>追踪中的信号</span><b>${news.total} 条</b></div>
    <div class="kv"><span>证据支持</span><b>${news.support} 条</b></div>
    <div class="kv"><span>待验证</span><b>${news.pending} 条</b></div>
  </div>

  <div class="card">
    <h2>🎯 打板模拟（股票）<a href="打板/网页/报告总览.html">详情 →</a></h2>
    <div class="big ${cls(board.A?.ret ?? 0)}">${pct(board.A?.ret ?? 0)}</div>
    <div class="sub">A 轨（理想）· 本金 30,000</div>
    <div class="kv"><span>A 轨权益</span><b>${(board.A?.eq ?? 30000).toFixed(2)}</b></div>
    <div class="kv"><span>B 轨权益</span><b>${(board.B?.eq ?? 30000).toFixed(2)}</b></div>
    <div class="kv"><span>今日候选 / 剔除</span><b>${board.todayCands} / ${board.todayRej}</b></div>
    <div class="kv"><span>已平仓</span><b>${board.A?.trades ?? 0} 笔</b></div>
  </div>

  <div class="card">
    <h2>📈 期货模拟（政策）<a href="期货/网页/报告总览.html">详情 →</a></h2>
    <div class="big ${cls(fut.ret ?? 0)}">${pct(fut.ret ?? 0)}</div>
    <div class="sub">本金 30,000 · 保证金占用 ${(fut.margin ?? 0).toFixed(0)}</div>
    <div class="kv"><span>当前权益</span><b>${(fut.eq ?? 30000).toFixed(2)}</b></div>
    <div class="kv"><span>浮动盈亏</span><b class="${cls(fut.float ?? 0)}">${(fut.float >= 0 ? "+" : "") + (fut.float ?? 0).toFixed(0)}</b></div>
    <div class="kv"><span>今日候选</span><b>${fut.todayCands} 个</b></div>
    <div class="kv"><span>已平仓</span><b>${fut.trades ?? 0} 笔</b></div>
  </div>
</div>

<h3>打板持仓（明日开盘结算）</h3>
<table><thead><tr><th>轨道</th><th>标的</th><th>数量</th><th>买入价</th><th>得分</th><th>状态</th></tr></thead>
<tbody>${boardPosRow(board.A ?? {}, "A 轨 · 理想")}${boardPosRow(board.B ?? {}, "B 轨 · 现实")}</tbody></table>

<h3>期货持仓（持满 28 天平仓）</h3>
<table><thead><tr><th>品种</th><th>方向</th><th>开仓价</th><th>最新价</th><th>浮盈</th><th>月差</th></tr></thead>
<tbody>${(fut.pos || []).map(posRow).join("") || '<tr><td colspan="6">空仓</td></tr>'}</tbody></table>

<div class="note"><strong>今日要点：</strong>${noteText}</div>

<footer>md 供 AI 读取 · 本页供人阅读 · 每次运行后重新生成</footer>
</div></body></html>`;

writeFileSync(OUT, html, "utf8");
console.log("✅ 已生成 今日总览.html");
console.log("   打板 A/B: " + (board.A?.eq ?? 0).toFixed(2) + " / " + (board.B?.eq ?? 0).toFixed(2));
console.log("   期货权益: " + (fut.eq ?? 0).toFixed(2) + "  浮盈 " + (fut.float ?? 0).toFixed(0));
console.log("   新闻信号: " + news.total + " 条，今日新增 " + news.todayNew);
