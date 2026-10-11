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
console.log('='.repeat(64));
console.log(rawBlock);
