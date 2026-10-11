// 生成当天日报骨架：daily/YYYY-MM-DD.md
// 用法: node new-daily.mjs [YYYY-MM-DD] [--force]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLianbo, today } from './fetch-lianbo.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BOM = '\uFEFF';

function argDate() {
  const a = process.argv.find(x => /^\d{4}-\d{2}-\d{2}$/.test(x));
  return a || today();
}


// 维护 README 的「每日简报索引」：在表格首行插入当天的条目
function updateReadmeIndex(day, firstHook) {
  const readmePath = path.join(ROOT, 'README.md');
  if (!fs.existsSync(readmePath)) return;
  let rd = fs.readFileSync(readmePath, 'utf8');
  const marker = '| --- | --- |';
  const i = rd.indexOf('## 每日简报索引');
  if (i < 0) return;
  const j = rd.indexOf(marker, i);
  if (j < 0) return;
  const line = '| [' + day + '](daily/' + day + '.md) | ' + firstHook + ' |';
  const insertAt = j + marker.length;
  if (rd.slice(insertAt, insertAt + 200).includes('daily/' + day + '.md')) return;
  rd = rd.slice(0, insertAt) + '\n' + line + rd.slice(insertAt);
  fs.writeFileSync(readmePath, '\uFEFF' + rd.replace(/^\uFEFF/, ''), 'utf8');
  console.log('已更新 README 索引: ' + day);
}

const DAY = argDate();
const FORCE = process.argv.includes('--force');
const dailyDir = path.join(ROOT, 'daily');
const tplPath = path.join(ROOT, 'templates', 'daily-template.md');
const outPath = path.join(dailyDir, DAY + '.md');

fs.mkdirSync(dailyDir, { recursive: true });
if (fs.existsSync(outPath) && !FORCE) {
  console.log('已存在，不覆盖: ' + outPath);
  console.log('（如需重建请加 --force）');
  process.exit(0);
}

const data = await fetchLianbo(DAY);
const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });

let rawBlock = '> 来源：' + data.url + '\n';
rawBlock += '> 播出：' + data.title + ' ｜ 主条目 ' + data.count + ' 条\n\n';
rawBlock += data.items.map(it => it.n + '. ' + it.text).join('\n');
if (data.quickDetail.length) {
  rawBlock += '\n\n**联播快讯 / 国际条目**\n\n';
  rawBlock += data.quickDetail.map((q, i) => '- ' + q).join('\n');
}

let tpl = fs.readFileSync(tplPath, 'utf8');
tpl = tpl.replace(/^\uFEFF/, '').replace(/YYYY-MM-DD/g, DAY);
tpl = tpl.replace('<!--RAW_ITEMS-->', rawBlock);
tpl = tpl.replace('<!--GENERATED_AT-->', now);

fs.writeFileSync(outPath, BOM + tpl, 'utf8');
console.log('已生成: ' + outPath);
// 索引里先占位，分析完成后由 agent 用真实钩子替换
try { updateReadmeIndex(DAY, '（待补充一句话摘要）'); } catch (e) { console.log('索引更新跳过: ' + e.message); }
console.log('='.repeat(64));
console.log(rawBlock);
