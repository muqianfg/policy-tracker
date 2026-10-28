#!/usr/bin/env node
/**
 * 报告总览生成器（2026-10-27 重写）
 *
 * 结构约定：<目录>\文档\<分类>\xxx.md  →  <目录>\网页\<分类>\xxx.html
 * 本脚本扫描 文档\ 下所有 md（递归），按分类分组，生成 <目录>\网页\报告总览.html
 *
 * 用法：node 新闻自动化\工具\html-index.mjs <目录> [更多...]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, basename, dirname, extname } from "node:path";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const plain = (t) => t
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  .replace(/[*`#>]/g, "")
  .replace(/\s+/g, " ")
  .trim();

function describe(mdPath) {
  const md = readFileSync(mdPath, "utf8").replace(/^\uFEFF/, "");
  const lines = md.split(/\r?\n/);
  let title = basename(mdPath, ".md");
  let desc = "";
  let tables = 0, h2s = 0, inTable = false;
  for (const l of lines) {
    const h1 = l.match(/^#\s+(.+)$/);
    if (h1 && title === basename(mdPath, ".md")) title = plain(h1[1]);
    if (/^##\s+/.test(l)) h2s++;
    const isT = /^\s*\|/.test(l);
    if (isT && !inTable) { tables++; inTable = true; }
    else if (!isT) inTable = false;
    if (!desc && /^>\s+/.test(l)) {
      const t = plain(l.replace(/^>\s*/, ""));
      if (t.length > 8) desc = t;
    }
  }
  if (!desc) {
    const p = lines.find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith(">") && !l.startsWith("`"));
    desc = p ? plain(p).slice(0, 90) : "";
  }
  const st = statSync(mdPath);
  return { title, desc: desc.slice(0, 110), tables, sections: h2s, mtime: st.mtime };
}

const CAT_META = {
  "规则": { icon: "📐", note: "人手写的规则与方法论，变化慢" },
  "报告": { icon: "📊", note: "脚本自动生成的数据报告，每天更新" },
  "图表": { icon: "📈", note: "可视化图表" },
};

function page(dirName, groups) {
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const sections = groups.map((g) => {
    const meta = CAT_META[g.name] ?? { icon: "📄", note: "" };
    return `<section>
  <h2><span class="ic">${meta.icon}</span>${esc(g.name)}<em>${esc(meta.note)}</em></h2>
  <div class="grid">${g.items.map((it) => `
    <a class="card" href="${encodeURI(it.href)}">
      <div class="ct">${esc(it.title)}</div>
      <div class="cd">${esc(it.desc)}</div>
      <div class="cm"><span>${it.sections} 节</span><span>${it.tables} 表</span><span>${it.mtime}</span></div>
    </a>`).join("")}</div>
</section>`;
  }).join("\n");
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(dirName)} · 报告总览</title>
<style>
:root{--bg:#faf8f4;--card:#fff;--text:#23262b;--text-2:#5a6068;--text-3:#8b9199;--accent:#8c2f39;--accent-soft:#f3e6e7;--line:#e6e1d8}
@media(prefers-color-scheme:dark){:root{--bg:#16181d;--card:#1d2026;--text:#e6e8ec;--text-2:#a8aeb8;--text-3:#767c86;--accent:#e0878f;--accent-soft:#33252a;--line:#2e333c}}
*{box-sizing:border-box}
body{margin:0;padding:0 20px 70px;background:var(--bg);color:var(--text);font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.7}
.wrap{max-width:1100px;margin:0 auto}
header{padding:30px 0 20px;border-bottom:2px solid var(--accent);margin-bottom:14px}
h1{margin:0 0 8px;font-size:28px;font-weight:800}
.meta{font-size:13px;color:var(--text-3)}
section{margin-top:34px}
h2{font-size:19px;margin:0 0 14px;padding-left:12px;border-left:4px solid var(--accent);display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;font-weight:700}
h2 .ic{font-size:17px}
h2 em{font-style:normal;font-size:12.5px;color:var(--text-3);font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:15px}
.card{display:block;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:11px;padding:16px 18px;text-decoration:none;color:inherit;transition:.15s}
.card:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.09);background:var(--accent-soft)}
.ct{font-size:16.5px;font-weight:700;margin-bottom:7px;line-height:1.42}
.cd{font-size:13.5px;color:var(--text-2);margin-bottom:11px;min-height:40px}
.cm{display:flex;gap:12px;font-size:11.5px;color:var(--text-3)}
.tip{background:var(--accent-soft);border-left:4px solid var(--accent);border-radius:0 10px 10px 0;padding:13px 17px;margin:22px 0;font-size:13.5px}
footer{margin-top:52px;padding-top:18px;border-top:1px solid var(--line);font-size:13px;color:var(--text-3);text-align:center}
@media(max-width:640px){body{padding:0 14px 50px}h1{font-size:23px}.grid{grid-template-columns:1fr}}
</style></head>
<body><div class="wrap">
<header><h1>${esc(dirName)} · 报告总览</h1>
<div class="meta">共 ${total} 份 · 生成于 ${now} · 点卡片打开</div></header>
<div class="tip"><strong>目录约定：</strong><code>文档\</code> 放 md（给 AI 读），<code>网页\</code> 放 html（给人看），两者一一对应。<br>改了 md 后跑 <code>md2html.mjs</code> 重新生成 html。</div>
${sections}
<footer>md 供 AI 读取 · 本页供人阅读 · 每次更新后重新生成</footer>
</div></body></html>`;
}

const dirs = process.argv.slice(2);
if (!dirs.length) { console.log("用法：node 新闻自动化\\工具\\html-index.mjs <目录> [更多...]"); process.exit(1); }

for (const d of dirs) {
  const root = /^[A-Za-z]:|^\\\\/.test(d) ? d : join(process.cwd(), d);
  const docDir = join(root, "文档");
  const webDir = join(root, "网页");
  if (!existsSync(webDir)) { console.log("跳过（无 网页\\）：" + d); continue; }
  mkdirSync(webDir, { recursive: true });

  const groups = [];
  if (existsSync(docDir)) {
    for (const e of readdirSync(docDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const catDir = join(docDir, e.name);
      const items = readdirSync(catDir)
        .filter((f) => extname(f).toLowerCase() === ".md")
        .map((f) => {
          const info = describe(join(catDir, f));
          return {
            title: info.title, desc: info.desc, tables: info.tables, sections: info.sections,
            href: e.name + "/" + f.replace(/\.md$/i, ".html"),
            mtime: info.mtime.toLocaleDateString("sv-SE"),
          };
        })
        .sort((a, b) => b.mtime.localeCompare(a.mtime));
      if (items.length) groups.push({ name: e.name, items });
    }
    // 日志\ 下的 md → 网页\日志\
    const logDir = join(root, "日志");
    if (existsSync(logDir)) {
      const litems = readdirSync(logDir).filter((f) => extname(f).toLowerCase() === ".md").map((f) => {
        const info = describe(join(logDir, f));
        return { title: info.title, desc: info.desc, tables: info.tables, sections: info.sections, href: "日志/" + f.replace(/\.md$/i, ".html"), mtime: info.mtime.toLocaleDateString("sv-SE") };
      });
      if (litems.length) groups.push({ name: "日志", items: litems });
    }
    // 网页\ 根下的独立 html（如 图表分析.html）归入「图表」
    const rf = readdirSync(webDir, { withFileTypes: true })
      .filter((e) => e.isFile() && extname(e.name).toLowerCase() === ".html" && e.name !== "报告总览.html");
    if (rf.length) groups.push({ name: "图表", items: rf.map((e) => ({ title: basename(e.name, ".html"), desc: "可视化图表", tables: 0, sections: 0, href: e.name, mtime: statSync(join(webDir, e.name)).mtime.toLocaleDateString("sv-SE") })) });
  } else {
    const rf = readdirSync(webDir, { withFileTypes: true })
      .filter((e) => e.isFile() && extname(e.name).toLowerCase() === ".html" && e.name !== "报告总览.html");
    if (rf.length) groups.push({ name: "总览", items: rf.map((e) => ({ title: basename(e.name, ".html"), desc: "顶层报告", tables: 0, sections: 0, href: e.name, mtime: statSync(join(webDir, e.name)).mtime.toLocaleDateString("sv-SE") })) });
    for (const e of readdirSync(webDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const sub = join(webDir, e.name);
      const items = readdirSync(sub).filter((f) => extname(f).toLowerCase() === ".html" && f !== "报告总览.html")
        .map((f) => ({ title: basename(f, ".html"), desc: "数据与记录", tables: 0, sections: 0, href: e.name + "/" + f, mtime: statSync(join(sub, f)).mtime.toLocaleDateString("sv-SE") }));
      if (items.length) groups.push({ name: e.name, items });
    }
  }

  const name = basename(root);
  writeFileSync(join(webDir, "报告总览.html"), page(name, groups), "utf8");
  console.log("✅ " + name + "\\网页\\报告总览.html  （" + groups.map((g) => g.name + " " + g.items.length).join(" · ") + "）");
}
