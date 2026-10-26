#!/usr/bin/env node
/**
 * MANIFEST ↔ signals/*.md 一致性校验
 *
 * 背景：2026-10-19 发现两处长期漂移 —— 一处信号文件头部过期、一处 MANIFEST 虚高。
 * 根因是「回填 MANIFEST」这一步没有校验机制，靠人记不可靠。
 * 本脚本把 playbook 第 5 步 (e) 变成可执行的检查。
 *
 * 用法：
 *   node scripts/check-consistency.mjs           # 只检查，有问题退出码 1
 *   node scripts/check-consistency.mjs --fix     # 自动对齐 MANIFEST 到信号文件（以文件为准）
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "MANIFEST.md");
const SIGDIR = join(ROOT, "信号");
const FIX = process.argv.includes("--fix");

const read = (p) => readFileSync(p, "utf8").replace(/^\uFEFF/, "");
/** 从「1（立档）」「3」这类字段里取出数字 */
const num = (v) => {
  const m = String(v ?? "").match(/^(\d+)/);
  return m ? m[1] : undefined;
};

/** 从信号文件头部解析字段 */
function parseHeader(text) {
  const get = (k) => {
    const m = text.match(new RegExp("^\\| " + k + " \\| (.+?) \\|$", "m"));
    return m ? m[1].replace(/\*\*/g, "").trim() : undefined;
  };
  const i4 = text.indexOf("## 四、证据时间线");
  const i5 = text.indexOf("## 五、复盘");
  const sec4 = (i4 >= 0 && i5 > i4) ? text.slice(i4, i5) : "";
  const evidenceSections = (sec4.match(/^### \d{4}-\d{2}-\d{2}/gm) || []).length;
  return {
    status: get("状态"),
    trend: get("趋势判断"),
    window: get("时间窗"),
    confidence: get("置信度"),
    evidence: get("证据条数"),
    updated: get("最后更新"),
    evidenceSections,
  };
}

/** 解析 MANIFEST 表格行 */
function parseManifest(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  lines.forEach((line, idx) => {
    if (!line.startsWith("| T-")) return;
    const cells = line.split("|").map((c) => c.trim());
    // cells: ["", id, 事件, 文件, 状态, 趋势, 时间窗, 置信度, 证据, 行动项, 最近到期, ""]
    const fileMatch = (cells[3] || "").match(/\]\((.+?)\)/);
    rows.push({
      idx, id: cells[1], name: cells[2],
      file: fileMatch ? fileMatch[1] : undefined,
      status: (cells[4] || "").replace(/\*\*/g, "").trim(),
      trend: (cells[5] || "").trim(),
      window: (cells[6] || "").trim(),
      confidence: (cells[7] || "").replace(/\*\*/g, "").trim(),
      evidence: (cells[8] || "").trim(),
      actions: (cells[9] || "").trim(),
      due: (cells[10] || "").trim(),
      raw: line,
    });
  });
  return { lines, rows };
}

const manifestText = read(MANIFEST);
const { lines, rows } = parseManifest(manifestText);
const problems = [];
const fixes = [];

for (const row of rows) {
  if (!row.file) { problems.push({ id: row.id, kind: "missing-file-link", detail: "MANIFEST 行没有文件链接" }); continue; }
  const p = join(ROOT, row.file.replace(/\//g, "\\"));
  if (!existsSync(p)) { problems.push({ id: row.id, kind: "file-not-found", detail: row.file }); continue; }
  const h = parseHeader(read(p));

  if (num(h.evidence) && num(h.evidence) !== num(row.evidence)) {
    problems.push({ id: row.id, kind: "evidence-mismatch", detail: "MANIFEST=" + row.evidence + " 文件=" + h.evidence });
    fixes.push({ row, next: row.evidence = num(h.evidence) });
  }
  // 证据条数 应当等于时间线小节数
  if (num(h.evidence) && Number(num(h.evidence)) !== h.evidenceSections) {
    problems.push({ id: row.id, kind: "evidence-count-drift", detail: "声明=" + h.evidence + " 时间线小节=" + h.evidenceSections });
  }
  if (h.status && h.status !== row.status) {
    problems.push({ id: row.id, kind: "status-mismatch", detail: "MANIFEST=" + row.status + " 文件=" + h.status });
    fixes.push({ row, next: row.status = h.status });
  }
  const confShort = (h.confidence || "").match(/(中偏低|中高|高|中|低)/);
  const rowConf = row.confidence.match(/(中偏低|中高|高|中|低)/);
  if (confShort && rowConf && confShort[1] !== rowConf[1]) {
    problems.push({ id: row.id, kind: "confidence-mismatch", detail: "MANIFEST=" + rowConf[1] + " 文件=" + confShort[1] });
    fixes.push({ row, next: row.confidence = confShort[1] });
  }
}

// 反向检查：signals/ 里有文件但 MANIFEST 没有对应行
const manifestIds = new Set(rows.map((r) => r.id));
for (const f of readdirSync(SIGDIR)) {
  if (!f.endsWith(".md") || f.startsWith("_")) continue;
  const t = read(join(SIGDIR, f));
  const id = (t.match(/^# (T-\d{8}-\d{2})/) || [])[1];
  if (id && !manifestIds.has(id)) problems.push({ id, kind: "orphan-signal", detail: "信号文件 " + f + " 未登记到 MANIFEST" });
}

// 报告
const byKind = {};
for (const p of problems) (byKind[p.kind] ||= []).push(p);

if (problems.length === 0) {
  console.log("\u2705 一致性检查通过：MANIFEST 与 " + rows.length + " 个信号文件完全一致");
  process.exit(0);
}

console.log("\u26a0\ufe0f 发现 " + problems.length + " 处不一致：\n");
for (const [kind, list] of Object.entries(byKind)) {
  console.log("  [" + kind + "] " + list.length + " 处");
  for (const p of list) console.log("    " + p.id + "  " + p.detail);
}

if (FIX) {
  // 以信号文件为准，重写 MANIFEST 对应行
  const out = [...lines];
  for (const row of rows) {
    const cells = row.raw.split("|").map((c) => c.trim());
    cells[4] = row.status === "待验证" ? "待验证" : "**" + row.status + "**";
    cells[8] = row.evidence;
    const conf = row.confidence;
    cells[7] = ["高", "中高", "中偏低"].includes(conf) ? "**" + conf + "**" : conf;
    out[row.idx] = "| " + cells.slice(1, cells.length - 1).join(" | ") + " |";
  }
  writeFileSync(MANIFEST, "\uFEFF" + out.join("\n"), "utf8");
  console.log("\n\u2705 已按信号文件回写 MANIFEST");
  process.exit(0);
}

console.log("\n提示：加 --fix 可自动以信号文件为准回写 MANIFEST");
process.exit(1);
