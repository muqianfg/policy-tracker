// 当 git 通道被阻断时，用 GitHub Git Data API 提交（不依赖 git 协议，也不启动子进程）
// 用法: node scripts/gh-api-push.mjs "commit message"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNER = 'muqianfg', REPO = 'policy-tracker', BRANCH = 'main';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// —— token：优先环境变量，其次仓库内 .gh-token 文件（不纳入版本控制）——
function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  const p = path.join(ROOT, '.gh-token');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  throw new Error('未找到 GitHub token（设置环境变量 GITHUB_TOKEN，或把 token 写入仓库根目录 .gh-token 文件）');
}

const H = {
  Authorization: 'Bearer ' + getToken(),
  Accept: 'application/vnd.github+json',
  'User-Agent': 'dsh-sync',
  'Content-Type': 'application/json',
};
const api = async (p, init = {}) => {
  const r = await fetch('https://api.github.com' + p, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(p + ' -> ' + r.status + ' ' + t.slice(0, 300));
  return t ? JSON.parse(t) : null;
};

// —— 用 .gitignore 的简单规则挑出要同步的文件 ——
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const ig = fs.existsSync(path.join(ROOT, '.gitignore')) ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8') : '';
const rules = ig.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const ignored = (rel) => rules.some(r => {
  const clean = r.replace(/\/+$/, '');
  if (clean.startsWith('*')) return rel.endsWith(clean.slice(1));
  return rel === clean || rel.startsWith(clean + '/');
});

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !ignored(rel)) walk(abs); }
    else if (!ignored(rel)) files.push(rel);
  }
})(ROOT);
files.sort();
console.log('待同步文件:', files.length);

const ref = await api('/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + BRANCH);
const baseSha = ref.object.sha;
const baseCommit = await api('/repos/' + OWNER + '/' + REPO + '/git/commits/' + baseSha);
console.log('远端 HEAD:', baseSha.slice(0, 7));

const tree = [];
for (const f of files) {
  const blob = await api('/repos/' + OWNER + '/' + REPO + '/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content: fs.readFileSync(path.join(ROOT, f)).toString('base64'), encoding: 'base64' }),
  });
  tree.push({ path: f, mode: '100644', type: 'blob', sha: blob.sha });
}
console.log('已上传 blob:', tree.length);

const newTree = await api('/repos/' + OWNER + '/' + REPO + '/git/trees', {
  method: 'POST',
  body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
});
const commit = await api('/repos/' + OWNER + '/' + REPO + '/git/commits', {
  method: 'POST',
  body: JSON.stringify({ message: process.argv[2] || 'chore: sync via GitHub API', tree: newTree.sha, parents: [baseSha] }),
});
await api('/repos/' + OWNER + '/' + REPO + '/git/refs/heads/' + BRANCH, {
  method: 'PATCH',
  body: JSON.stringify({ sha: commit.sha, force: false }),
});
console.log('✅ 已通过 API 提交:', commit.sha.slice(0, 7));
