import fs from 'node:fs';
import { spawn } from 'node:child_process';
const dir = process.argv[2];
const els = JSON.parse(fs.readFileSync(dir + '\\elements.json', 'utf8'));
const SERIF7 = 'file:///C:/Windows/Temp/noto-serif-700.woff2';
const SERIF9 = 'file:///C:/Windows/Temp/noto-serif-900.woff2';
const SANS = 'file:///C:/Windows/Fonts/Alibaba-PuHuiTi-Regular.otf';
const YH = 'file:///C:/Windows/Fonts/msyhbd.ttc';
const CSS = "@font-face{font-family:'SerifSC';src:url('" + SERIF7 + "');font-weight:700}@font-face{font-family:'SerifSC';src:url('" + SERIF9 + "');font-weight:900}@font-face{font-family:'SansSC';src:url('" + SANS + "');font-weight:400}@font-face{font-family:'YH';src:url('" + YH + "');font-weight:700}*{margin:0;padding:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden;background:transparent;position:relative}body{font-family:'SansSC','Microsoft YaHei UI',sans-serif}.serif{font-family:'SerifSC';font-weight:900}.yh{font-family:'YH';font-weight:700}.acc{color:#D9A651}.grad{background:linear-gradient(100deg,#F0CE8A 0%,#D9A651 55%,#B8852F 100%);-webkit-background-clip:text;background-clip:text;color:transparent}.cardD{position:absolute;border-radius:22px;background:#1D1A16;border:1.5px solid rgba(217,166,81,.32);box-shadow:0 26px 60px rgba(0,0,0,.5);color:#F2E8D5;padding:26px 32px}.cardC{position:absolute;border-radius:22px;background:#FBF6E9;border:1.5px solid #E4D2AE;box-shadow:0 20px 46px rgba(60,40,10,.12);color:#2A2117;padding:24px 30px}.lab{font-size:22px;letter-spacing:.14em;color:#9C8F79}.labC{font-size:22px;letter-spacing:.12em;color:#8A7857}.sub{font-size:24px;color:#9C8F79;line-height:1.5}";
const page = (body) => '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><style>' + CSS + '</style></head><body>' + body + '</body></html>';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
function shot(html, png, transparent) {
  return new Promise((resolve) => {
    const args = ['--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1920,1080','--force-color-profile=srgb'];
    if (transparent) args.push('--default-background-color=00000000');
    args.push('--screenshot=' + png, '--user-data-dir=C:/Windows/Temp/edge-ep01', 'file:///' + html.replace(/\\/g,'/'));
    const p = spawn(edge, args, { stdio: ['ignore','ignore','ignore'] });
    p.on('close', () => resolve()); p.on('error', () => resolve());
  });
}
const NAV = ['开场','热点','关注','外贸','创新药','钱往哪去','结尾'];
function navHtml(active, dark) {
  const pills = NAV.map((n) => {
    const on = n === active;
    const base = dark ? 'background:rgba(243,232,213,.10);border:1.5px solid rgba(243,232,213,.16);color:#F2E8D5;' : 'background:#FBF6E9;border:1.5px solid #E4D2AE;color:#2A2117;';
    const act = 'background:#D9A651;border-color:#D9A651;color:#241B0E;font-family:YH;font-weight:700;';
    return '<span style="font-size:23px;border-radius:12px;padding:10px 18px;' + (on ? act : base) + '">' + n + '</span>';
  }).join('');
  return '<div style="position:absolute;left:64px;right:64px;top:48px;display:flex;gap:12px">' + pills + '</div>';
}
const bgCream = '<div style="position:absolute;inset:0;background:#F5EEDD"></div><div style="position:absolute;inset:0;background-image:radial-gradient(rgba(42,33,23,.28) 2.2px, transparent 2.2px);background-size:30px 30px"></div>';
const bgDark = '<div style="position:absolute;inset:0;background:#141210"></div><div style="position:absolute;inset:0;background-image:radial-gradient(rgba(243,232,213,.10) 2.2px, transparent 2.2px);background-size:30px 30px"></div>';
async function main() {
  for (const el of els) {
    const htmlPath = dir + '\\html\\' + el.id + '.html';
    fs.writeFileSync(htmlPath, page(el.html), 'utf8');
    await shot(htmlPath, dir + '\\png\\' + el.id + '.png', true);
  }
  fs.writeFileSync(dir + '\\html\\bg-cream.html', page(bgCream), 'utf8');
  await shot(dir + '\\html\\bg-cream.html', dir + '\\png\\bg-cream.png', false);
  fs.writeFileSync(dir + '\\html\\bg-dark.html', page(bgDark), 'utf8');
  await shot(dir + '\\html\\bg-dark.html', dir + '\\png\\bg-dark.png', false);
  const navDefs = [['nav-1','开场',false],['nav-2','热点',false],['nav-3','关注',false],['nav-4','外贸',true],['nav-5','创新药',true],['nav-6','钱往哪去',true],['nav-7','结尾',false]];
  for (const [id, active, dark] of navDefs) {
    fs.writeFileSync(dir + '\\html\\' + id + '.html', page(navHtml(active, dark)), 'utf8');
    await shot(dir + '\\html\\' + id + '.html', dir + '\\png\\' + id + '.png', true);
  }
  console.log('rendered', els.length + 9, 'layers');
}
main();