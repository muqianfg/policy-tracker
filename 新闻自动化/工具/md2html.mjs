#!/usr/bin/env node
/**
 * Markdown → 可读 HTML（2026-10-27）
 *
 * 用途：md 给 AI 读，html 给人看。数据分析类的 md 都配一份 html。
 *
 * 零依赖（不用 node_modules），自包含单文件，支持深色模式。
 *
 * 用法：
 *   node 新闻自动化\工具\md2html.mjs <文件.md|目录> [更多...]
 *   node 新闻自动化\工具\md2html.mjs --all         # 转换三个目录下所有数据分析类 md
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ───────── Markdown 解析 ─────────
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s) {
  let t = esc(s);
  // 行内代码优先（避免里面的 * 被当粗体）
  const codes = [];
  t = t.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return "\u0000CODE" + (codes.length - 1) + "\u0000"; });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt, href) => {
    const h = href.replace(/\.md($|#)/i, ".html$1");
    return '<a href="' + h + '">' + txt + "</a>";
  });
  t = t.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => "<code>" + codes[+i] + "</code>");
  return t;
}

function parse(md) {
  const lines = md.replace(/^\uFEFF/, "").split(/\r?\n/);
  const out = [];
  let i = 0;
  const flushPara = (buf) => { if (buf.length) { out.push("<p>" + inline(buf.join(" ")) + "</p>"); buf.length = 0; } };
  let para = [];
  while (i < lines.length) {
    const line = lines[i];
    // 代码块
    if (/^```/.test(line.trim())) {
      flushPara(para);
      const lang = line.trim().replace(/```/, "").trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      i++;
      out.push('<pre' + (lang ? ' data-lang="' + esc(lang) + '"' : "") + "><code>" + esc(buf.join("\n")) + "</code></pre>");
      continue;
    }
    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara(para);
      const lv = h[1].length;
      const txt = h[2];
      const id = "h-" + out.length;
      out.push("<h" + lv + ' id="' + id + '">' + inline(txt) + "</h" + lv + ">");
      i++; continue;
    }
    // 分隔线
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flushPara(para); out.push("<hr>"); i++; continue; }
    // 表格
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flushPara(para);
      const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { body.push(cells(lines[i])); i++; }
      let html = '<div class="table-wrap"><table><thead><tr>';
      for (const c of head) html += "<th>" + inline(c) + "</th>";
      html += "</tr></thead><tbody>";
      for (const r of body) {
        html += "<tr>";
        for (let k = 0; k < head.length; k++) html += "<td>" + inline(r[k] ?? "") + "</td>";
        html += "</tr>";
      }
      html += "</tbody></table></div>";
      out.push(html);
      continue;
    }
    // 引用
    if (/^\s*>/.test(line)) {
      flushPara(para);
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      out.push("<blockquote>" + buf.map((b) => b.trim() ? "<p>" + inline(b) + "</p>" : "").join("") + "</blockquote>");
      continue;
    }
    // 列表
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      flushPara(para);
      const items = [];
      const ordered = /^\s*\d+\./.test(line);
      let indentBase = line.match(/^\s*/)[0].length;
      while (i < lines.length) {
        const l = lines[i];
        const m = l.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (!m) {
          // 续行
          if (l.trim() === "" ) break;
          if (/^\s{2,}/.test(l) && items.length) { items[items.length - 1].text += " " + l.trim(); i++; continue; }
          break;
        }
        const indent = m[1].length;
        items.push({ indent, text: m[3] });
        i++;
      }
      // 简单两级嵌套
      let html = ordered ? "<ol>" : "<ul>";
      let inSub = false;
      for (const it of items) {
        if (it.indent > indentBase) {
          if (!inSub) { html += "<ul>"; inSub = true; }
          html += "<li>" + inline(it.text) + "</li>";
        } else {
          if (inSub) { html += "</ul>"; inSub = false; }
          html += "<li>" + inline(it.text) + "</li>";
        }
      }
      if (inSub) html += "</ul>";
      html += ordered ? "</ol>" : "</ul>";
      out.push(html);
      continue;
    }
    // 空行
    if (line.trim() === "") { flushPara(para); i++; continue; }
    para.push(line.trim());
    i++;
  }
  flushPara(para);
  return out.join("\n");
}

// ───────── 页面模板 ─────────
function page(title, body, srcName) {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{
  --bg:#faf8f4; --card:#fff; --text:#23262b; --text-2:#5a6068; --text-3:#8b9199;
  --accent:#8c2f39; --accent-soft:#f3e6e7; --line:#e6e1d8; --code-bg:#f4f1ea;
  --th-bg:#f7f3ec; --zebra:#fcfaf7;
}
@media (prefers-color-scheme: dark){
  :root{
    --bg:#16181d; --card:#1d2026; --text:#e6e8ec; --text-2:#a8aeb8; --text-3:#767c86;
    --accent:#e0878f; --accent-soft:#33252a; --line:#2e333c; --code-bg:#23272f;
    --th-bg:#232730; --zebra:#1f2229;
  }
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; padding:0 20px 80px; background:var(--bg); color:var(--text);
  font-family:"PingFang SC","Microsoft YaHei","Hiragino Sans GB","Source Han Sans SC",system-ui,sans-serif;
  font-size:16.5px; line-height:1.78; letter-spacing:.01em;
}
.wrap{max-width:1080px; margin:0 auto}
header.top{
  padding:26px 0 18px; border-bottom:2px solid var(--accent); margin-bottom:34px;
  display:flex; align-items:baseline; justify-content:space-between; gap:16px; flex-wrap:wrap;
}
header.top .src{font-size:13px; color:var(--text-3); font-family:ui-monospace,Consolas,monospace}
header.top .note{font-size:12.5px; color:var(--text-3)}
h1{font-size:30px; line-height:1.32; margin:0 0 26px; padding-bottom:14px; border-bottom:1px solid var(--line); font-weight:800; letter-spacing:-.01em}
h2{font-size:23px; line-height:1.4; margin:44px 0 16px; padding-left:12px; border-left:4px solid var(--accent); font-weight:700}
h3{font-size:19px; margin:32px 0 12px; font-weight:700; color:var(--text)}
h4{font-size:17px; margin:24px 0 10px; font-weight:700; color:var(--text-2)}
p{margin:12px 0}
strong{font-weight:700; color:var(--accent)}
em{font-style:normal; color:var(--text-2)}
a{color:var(--accent); text-decoration:none; border-bottom:1px solid var(--accent-soft)}
a:hover{border-bottom-color:var(--accent)}
ul,ol{margin:12px 0 12px 22px; padding:0}
li{margin:7px 0}
li>ul{margin-top:6px}
blockquote{
  margin:20px 0; padding:14px 20px; background:var(--accent-soft);
  border-left:4px solid var(--accent); border-radius:0 8px 8px 0;
}
blockquote p{margin:6px 0}
blockquote p:first-child{margin-top:0}
blockquote p:last-child{margin-bottom:0}
code{
  font-family:ui-monospace,"Cascadia Code",Consolas,monospace; font-size:.9em;
  background:var(--code-bg); padding:2px 6px; border-radius:5px; color:var(--accent);
}
pre{
  background:var(--code-bg); border:1px solid var(--line); border-radius:10px;
  padding:16px 18px; overflow-x:auto; margin:18px 0; line-height:1.62;
}
pre code{background:none; padding:0; color:var(--text); font-size:13.5px; white-space:pre}
hr{border:none; border-top:1px dashed var(--line); margin:34px 0}
.table-wrap{overflow-x:auto; margin:20px 0; border:1px solid var(--line); border-radius:10px; background:var(--card)}
table{border-collapse:collapse; width:100%; font-size:15px; line-height:1.62}
thead th{
  background:var(--th-bg); position:sticky; top:0; font-weight:700; text-align:left;
  padding:11px 14px; border-bottom:2px solid var(--line); white-space:nowrap; font-size:14px; color:var(--text-2)
}
tbody td{padding:10px 14px; border-bottom:1px solid var(--line); vertical-align:top}
tbody tr:nth-child(even){background:var(--zebra)}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover{background:var(--accent-soft)}
footer.bottom{margin-top:56px; padding-top:20px; border-top:1px solid var(--line); font-size:13px; color:var(--text-3); text-align:center}
@media (max-width:720px){
  body{font-size:15.5px; padding:0 14px 60px}
  h1{font-size:24px} h2{font-size:20px} h3{font-size:17.5px}
  table{font-size:13.5px} thead th,tbody td{padding:8px 10px}
}
@media print{
  body{background:#fff; font-size:12pt}
  header.top .note,footer.bottom{display:none}
  .table-wrap{overflow:visible; break-inside:avoid}
  h1,h2,h3{break-after:avoid}
}
</style>
</head>
<body>
<div class="wrap">
<header class="top">
  <span class="src">源文件：${esc(srcName)}</span>
  <span class="note">由 md2html 自动生成 · ${now} · 修改 md 后需重新生成</span>
</header>
${body}
<footer class="bottom">md 供 AI 读取 · 本页供人阅读 · 内容以 md 为准</footer>
</div>
</body>
</html>`;
}

// ───────── 主流程 ─────────
function outPathFor(mdPath) {
  const dir = dirname(mdPath);
  const base = basename(mdPath).replace(/\.md$/i, ".html");
  // 通用规则：定位项目根（期货 / 打板 / 新闻自动化），输出到该项目下的 网页\
  const m = mdPath.match(/^(.*?[\\/](?:期货|打板|新闻自动化))[\\/](.+)$/);
  if (m) {
    const projRoot = m[1];
    let rel = dirname(m[2]);                       // 相对项目根的目录
    if (rel === ".") rel = "";
    rel = rel.replace(/^文档[\\/]?/, "");         // 文档\ 这一层去掉
    const webDir = rel ? join(projRoot, "网页", rel) : join(projRoot, "网页");
    mkdirSync(webDir, { recursive: true });
    return join(webDir, base);
  }
  return join(dir, base);
}

function convert(mdPath) {
  const md = readFileSync(mdPath, "utf8");
  const titleM = md.match(/^#\s+(.+)$/m);
  const title = titleM ? titleM[1].trim() : basename(mdPath, ".md");
  const html = page(title, parse(md), basename(mdPath));
  const outPath = outPathFor(mdPath);
  writeFileSync(outPath, html, "utf8");
  return outPath;
}

const args = process.argv.slice(2);
const targets = [];

if (args.includes("--all")) {
  const DIRS = [
    join(ROOT, "期货"),
    join(ROOT, "打板"),
    join(ROOT, "新闻自动化"),
  ];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "网页") walk(p); }
      else if (extname(e.name).toLowerCase() === ".md") targets.push(p);
    }
  };
  for (const d of DIRS) walk(d);
} else {
  for (const a of args) {
    const p = a.startsWith("\\") || /^[A-Za-z]:/.test(a) ? a : join(process.cwd(), a);
    if (!existsSync(p)) { console.log("跳过（不存在）：" + a); continue; }
    if (statSync(p).isDirectory()) {
      for (const e of readdirSync(p, { withFileTypes: true })) {
        if (e.isFile() && extname(e.name).toLowerCase() === ".md") targets.push(join(p, e.name));
      }
    } else targets.push(p);
  }
}

if (!targets.length) {
  console.log("没有找到要转换的 md 文件");
  console.log("用法：node 新闻自动化\\工具\\md2html.mjs <文件.md|目录> [更多...]");
  console.log("      node 新闻自动化\\工具\\md2html.mjs --all");
  process.exit(1);
}

let n = 0;
for (const t of targets) {
  try {
    const out = convert(t);
    const rel = out.replace(ROOT + "\\", "");
    console.log("✅ " + rel);
    n++;
  } catch (e) {
    console.log("❌ " + t + " → " + e.message);
  }
}
console.log("");
console.log("共转换 " + n + " / " + targets.length + " 个文件");
