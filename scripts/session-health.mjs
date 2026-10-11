// 会长大的东西不是文件，是会话。这个脚本告诉你每个会话现在多大、离压缩线还有多远。
// 用法: node session-health.mjs
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.env.USERPROFILE || '', '.dsh', 'storages', 'session_projcache', 'sessions');
const STORE = path.join(process.env.USERPROFILE || '', '.dsh', 'storages', 'session_projcache.json');
const SCHEDULE = path.join(process.env.USERPROFILE || '', '.dsh', 'storages', 'schedule.json');

const THRESHOLD_RATIO = 0.8;   // dsh-compaction-basic 默认：压力达到上下文的 80% 触发压缩
const RETAIN_RATIO = 0.16;     // 压缩后保留的逐字尾部比例

// 哪些会话挂着定时任务
let bound = new Map();
try {
  const s = JSON.parse(fs.readFileSync(SCHEDULE, 'utf8'));
  for (const [id, v] of Object.entries(s.tables?.tasks ?? {})) {
    bound.set(v.sessionId, (bound.get(v.sessionId) ?? []).concat(id));
  }
} catch {}

if (!fs.existsSync(DIR)) { console.error('找不到会话缓存目录: ' + DIR); process.exit(1); }

const rows = [];
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.json'))) {
  const id = 'session-' + f.replace(/^session-/, '').replace(/\.json$/, '');
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch { continue; }
  const r = j?.record?.rows;
  if (!r) continue;
  const cp = r.contextPressure?.val ?? {};
  const stats = r.sessionStats?.val ?? {};
  const usage = r.tokenUsage?.val?.totals ?? {};
  const surface = cp.surfaceTokens ?? 0;
  const window = cp.contextWindow ?? 0;
  if (!window) continue;
  const pct = surface / window;
  rows.push({
    id,
    title: String(r.title?.val ?? '').slice(0, 34),
    turns: stats.turns ?? 0,
    surface,
    window,
    pct,
    cacheRead: usage.cacheReadTokens ?? 0,
    uncachedIn: usage.uncachedInputTokens ?? 0,
    out: usage.outputTokens ?? 0,
    tasks: bound.get(id) ?? [],
    mtime: fs.statSync(path.join(DIR, f)).mtime,
  });
}

rows.sort((a, b) => b.surface - a.surface);
const k = (n) => (n / 1000).toFixed(0) + 'k';
const kb = (n) => (n / 1e6).toFixed(2) + 'M';

console.log('会话健康度（按上下文大小排序）  ' + new Date().toLocaleString('sv-SE'));
console.log('压缩线 = 上下文 ' + (THRESHOLD_RATIO * 100) + '% ，压缩后只保留约 ' + (RETAIN_RATIO * 100) + '% 逐字内容\n');
console.log('上下文       占比    轮次  缓存读入   未缓存入   输出      挂载任务   标题');
console.log('-'.repeat(112));
for (const r of rows) {
  const warn = r.pct >= 0.5 ? ' ⚠' : r.pct >= 0.2 ? ' ·' : '';
  console.log(
    (' ' + k(r.surface) + '/' + k(r.window)).padEnd(13) +
    ((r.pct * 100).toFixed(1) + '%').padEnd(7) +
    String(r.turns).padEnd(6) +
    kb(r.cacheRead).padEnd(11) +
    k(r.uncachedIn).padEnd(11) +
    k(r.out).padEnd(9) +
    (r.tasks.length ? r.tasks.map(t => t.slice(9, 17)).join(',') : '-').padEnd(11) +
    r.title + warn
  );
}

const boundRow = rows.find(r => r.tasks.length);
console.log('\n结论');
if (boundRow) {
  const left = Math.floor((THRESHOLD_RATIO * boundRow.window - boundRow.surface) / 1000);
  console.log('  · 自动化会话: ' + boundRow.id.slice(0, 16) + '  当前 ' + k(boundRow.surface) + '，距离压缩线还有约 ' + left + 'k tokens');
  console.log('  · 建议: 每 30 天或在占比超过 30% 时，新建会话并重建定时任务（任务提示词见 video\\任务提示词.md）');
} else {
  console.log('  · 未发现挂载定时任务的会话（任务可能已被删除）');
}
console.log('  · 判断会话是否"贵"，看 缓存读入 与 未缓存入 的比例，而不是看总 tokens');
