#!/usr/bin/env node
/**
 * 打板模拟账户（纸上交易，1 万本金 → 3 万）
 *
 * ⚠ 这是"日线级近似"，不是真打板：
 *   · 真打板要在盘中以涨停价排队买；这里简化为"收盘后按涨停价成交"
 *   · 真打板要盯封单与炸板过程；这里用「封板资金」和「炸板次数」近似
 *   · 无法判断"买不买得到"，只能用成交额做流动性下限（缩量一字板视为买不到）
 *
 * 用法：
 *   node scripts/paper-trade.mjs            # 结算昨日持仓 + 买入今日标的
 *   node scripts/paper-trade.mjs --report   # 只看账户报告，不交易
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_PATH = join(ROOT, "tracking", "模拟账户.json");
const REPORT = process.argv.includes("--report");
const INIT_CAPITAL = 30000;
const COST_RATE = 0.0015;      // 往返摩擦成本 0.15%
const MAX_POS_PCT = 0.30;      // 单笔最大仓位 30%
const MIN_AMOUNT = 50_000_000; // 成交额下限 5000 万（低于此视为买不进）

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
const ymd = () => today().replace(/-/g, "");

function loadState() {
  if (existsSync(STATE_PATH)) return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  return { createdAt: today(), initial: INIT_CAPITAL, cash: INIT_CAPITAL, position: null, trades: [], equity: [] };
}
const saveState = (s) => { mkdirSync(dirname(STATE_PATH), { recursive: true }); writeFileSync(STATE_PATH, JSON.stringify(s, null, 2), "utf8"); };

async function fetchJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://quote.eastmoney.com/" } });
  return await r.json();
}

/** 涨停池：带连板数/封板时间/封板资金/炸板次数 */
async function ztPool(date) {
  const url = "https://push2ex.eastmoney.com/getTopicZTPool?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=100&sort=fbt%3Aasc&date=" + date;
  try { const j = await fetchJson(url); return j?.data?.pool ?? []; } catch { return []; }
}

/** 单只个股实时行情（取今开与现价） */
async function quote(code, market) {
  const prefix = market === 1 ? "sh" : "sz";
  const url = "https://qt.gtimg.cn/q=" + prefix + code;
  const r = await fetch(url, { headers: { Referer: "https://gu.qq.com/" } });
  const txt = await r.text();
  const m = txt.match(/="([^"]+)"/);
  if (!m) return null;
  const f = m[1].split("~");
  return { name: f[1], price: +f[3], prevClose: +f[4], open: +f[5], high: +f[32], low: +f[33], pct: +f[31] };
}

function report(s) {
  const done = s.trades.filter((t) => t.pnl !== undefined);
  const wins = done.filter((t) => t.pnl > 0);
  const losses = done.filter((t) => t.pnl <= 0);
  const sumWin = wins.reduce((a, t) => a + t.pnl, 0);
  const sumLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const totalPnl = done.reduce((a, t) => a + t.pnl, 0);
  const eq = s.equity.at(-1)?.equity ?? s.cash;
  const ret = ((eq - s.initial) / s.initial) * 100;
  const dd = s.equity.length ? Math.min(...s.equity.map((x) => x.equity)) : eq;
  console.log("");
  console.log("════════ 打板模拟账户 ════════");
  console.log("  起始本金      " + s.initial.toLocaleString() + " 元（" + s.createdAt + "）");
  console.log("  当前权益      " + eq.toFixed(2) + " 元");
  console.log("  累计收益      " + (ret >= 0 ? "+" : "") + ret.toFixed(2) + "%");
  console.log("  最大回撤参考  " + (((dd - s.initial) / s.initial) * 100).toFixed(2) + "%（历史最低权益）");
  console.log("  ─────────────────────────");
  console.log("  已平仓笔数    " + done.length);
  console.log("  胜率          " + (done.length ? ((wins.length / done.length) * 100).toFixed(1) : "—") + "%");
  console.log("  平均盈利      " + (wins.length ? (sumWin / wins.length).toFixed(2) : "—") + " 元");
  console.log("  平均亏损      " + (losses.length ? (sumLoss / losses.length).toFixed(2) : "—") + " 元");
  console.log("  盈亏比        " + (wins.length && losses.length ? ((sumWin / wins.length) / (sumLoss / losses.length)).toFixed(2) : "—"));
  console.log("  累计盈亏      " + (totalPnl >= 0 ? "+" : "") + totalPnl.toFixed(2) + " 元");
  if (s.position) console.log("  ⏳ 当前持仓    " + s.position.name + "(" + s.position.code + ") " + s.position.shares + " 股 @ " + s.position.cost);
  console.log("══════════════════════════════");
}

const state = loadState();
if (REPORT) { report(state); process.exit(0); }

// ── 第一步：结算昨日持仓（按今日开盘价卖出，模拟"隔日冲高卖"）──
if (state.position) {
  const p = state.position;
  const q = await quote(p.code, p.market);
  if (!q) { console.log("⚠ 取不到 " + p.name + " 行情，跳过结算"); }
  else {
    const sellPrice = q.open || q.price;
    const stopped = q.open === 0 ? p.cost : sellPrice; // 停牌/无法卖出则按成本
    const gross = (stopped - p.cost) * p.shares;
    const fee = (stopped * p.shares) * COST_RATE;
    const pnl = gross - fee;
    state.cash += stopped * p.shares - fee;
    state.trades.push({ ...p, sellDate: today(), sellPrice: stopped, nextOpen: q.open, nextPct: q.pct, pnl: +pnl.toFixed(2) });
    state.position = null;
    console.log("结算 " + p.name + "：" + p.cost + " → " + stopped.toFixed(2) + "（" + ((stopped / p.cost - 1) * 100).toFixed(2) + "%），盈亏 " + pnl.toFixed(2) + " 元");
  }
}

// ── 第二步：买入今日标的 ──
let bought = null;
if (!state.position) {
  const pool = await ztPool(ymd());
  console.log("今日涨停池：" + pool.length + " 只");
  if (!pool.length) console.log("（今日无涨停或非交易日）");
  // 规则：首板或二板 / 未炸板 / 10:00 前封板 / 成交额>5000万 / 排除 ST 与北交所 / 封板资金降序取第一
  const cand = pool.filter((x) => {
    const isST = /ST|\*ST/.test(x.n || "");
    const isBJ = String(x.c || "").startsWith("92") || x.m === 2;
    return x.lbc >= 1 && x.lbc <= 2 && x.zbc === 0 && x.fbt <= 100000 && x.amount > MIN_AMOUNT && !isST && !isBJ;
  }).sort((a, b) => (b.fund || 0) - (a.fund || 0));

  console.log("符合规则的候选：" + cand.length + " 只");
  cand.slice(0, 5).forEach((x) => console.log("  " + x.n + "(" + x.c + ") " + x.lbc + "板 封板资金" + (x.fund / 1e8).toFixed(2) + "亿 成交" + (x.amount / 1e8).toFixed(2) + "亿 换手" + x.hs.toFixed(1) + "% " + x.hybk));

  if (cand.length) {
    const pick = cand[0];
    const price = pick.p / 1000;
    const budget = Math.min(state.cash * MAX_POS_PCT, state.cash);
    const shares = Math.floor(budget / price / 100) * 100; // 整手
    if (shares >= 100) {
      const cost = price * shares;
      const fee = cost * (COST_RATE / 2); // 买入单边
      state.cash -= cost + fee;
      state.position = { code: pick.c, market: pick.m, name: pick.n, cost: price, shares, buyDate: today(), lbc: pick.lbc, fund: pick.fund, hybk: pick.hybk };
      bought = pick;
      console.log("✅ 买入 " + pick.n + "(" + pick.c + ") " + shares + " 股 @ " + price + "（" + pick.lbc + "板，" + pick.hybk + "），占用 " + (cost + fee).toFixed(0) + " 元");
    } else console.log("⚠ 资金不足一手，跳过");
  }
} else console.log("已有持仓，今日不再买入（单持仓规则）");

// ── 第三步：记录净值 ──
let equity = state.cash;
if (state.position) {
  const q = await quote(state.position.code, state.position.market);
  equity += (q?.price ?? state.position.cost) * state.position.shares;
}
state.equity.push({ date: today(), equity: +equity.toFixed(2) });
saveState(state);
report(state);
