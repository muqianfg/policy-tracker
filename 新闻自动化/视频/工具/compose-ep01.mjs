import fs from 'node:fs';
import { spawn } from 'node:child_process';
const dir = process.argv[2];
const ff = 'C:/Users/simpl/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const els = JSON.parse(fs.readFileSync(dir + '\\elements.json', 'utf8'));
const sections = [
  { id: 's0', start: 0.0, end: 17.32, bg: 'bg-cream' },
  { id: 's1', start: 17.32, end: 31.92, bg: 'bg-cream' },
  { id: 's2', start: 31.92, end: 100.56, bg: 'bg-dark' },
  { id: 's3', start: 100.56, end: 183.76, bg: 'bg-dark' },
  { id: 's4', start: 183.76, end: 254.16, bg: 'bg-dark' },
  { id: 's5', start: 254.16, end: 264.56, bg: 'bg-cream' },
];
const navs = { s0: [['nav-1',0,2.92],['nav-2',2.92,null]], s1: [['nav-3',0,null]], s2: [['nav-4',0,null]], s3: [['nav-5',0,null]], s4: [['nav-6',0,null]], s5: [['nav-7',0,null]] };
function run(args) {
  return new Promise((resolve) => {
    const p = spawn(ff, args, { stdio: ['ignore','pipe','pipe'] });
    let e = ''; p.stderr.on('data', (d) => e += d);
    p.on('close', (c) => resolve({ code: c, err: e.slice(-300) }));
    p.on('error', (er) => resolve({ code: -1, err: String(er) }));
  });
}
async function main() {
  const list = [];
  for (const sec of sections) {
    const dur = sec.end - sec.start;
    const items = els.filter((e) => e.sec === Number(sec.id.slice(1)));
    const inputs = [];
    inputs.push('-loop','1','-framerate','30','-t',String(dur),'-i', dir + '\\png\\' + sec.bg + '.png');
    const layers = [];
    const navDefs = navs[sec.id];
    for (const [navId, inT, outT] of navDefs) {
      inputs.push('-loop','1','-framerate','30','-t',String(dur),'-i', dir + '\\png\\' + navId + '.png');
      layers.push({ id: navId, idx: inputs.length/2 - 0, inLocal: inT, outLocal: outT });
    }
    for (const el of items) {
      inputs.push('-loop','1','-framerate','30','-t',String(dur),'-i', dir + '\\png\\' + el.id + '.png');
      const inLocal = Math.max(0, el.inT - sec.start);
      const outLocal = el.outT == null ? null : Math.min(dur, el.outT - sec.start);
      layers.push({ id: el.id, idx: 0, inLocal, outLocal });
    }
    const fc = [];
    let layerIdx = 1;
    for (const L of layers) {
      const parts = ['[' + layerIdx + ':v]format=rgba'];
      if (L.inLocal > 0.05) parts.push('fade=t=in:st=' + L.inLocal.toFixed(3) + ':d=0.3:alpha=1');
      if (L.outLocal != null && L.outLocal < dur - 0.05) parts.push('fade=t=out:st=' + L.outLocal.toFixed(3) + ':d=0.3:alpha=1');
      fc.push(parts.join(',') + '[l' + layerIdx + ']');
      layerIdx++;
    }
    let prev = '[0:v]';
    for (let k = 1; k < layerIdx; k++) {
      const out = k === layerIdx - 1 ? '[vout]' : '[v' + k + ']';
      fc.push(prev + '[l' + k + ']overlay=0:0' + out);
      prev = out;
    }
    fc.push('[vout]format=yuv420p[final]');
    const args = ['-y', ...inputs, '-filter_complex', fc.join(';'), '-map','[final]','-t',String(dur),'-r','30','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p', dir + '\\' + sec.id + '.mp4'];
    const r = await run(args);
    console.log(sec.id, 'exit', r.code, r.code === 0 ? '' : r.err);
    list.push('file \'' + dir + '\\' + sec.id + '.mp4\'');
  }
  fs.writeFileSync(dir + '\\sections.txt', list.join('\n'), 'utf8');
  const r2 = await run(['-y','-f','concat','-safe','0','-i', dir + '\\sections.txt','-c','copy', dir + '\\video-nosound.mp4']);
  console.log('concat', r2.code, r2.code === 0 ? '' : r2.err);
  const r3 = await run(['-y','-i', dir + '\\video-nosound.mp4','-i', dir + '\\audio\\voice.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-shortest', dir + '\\第01期-联播解读-成片.mp4']);
  console.log('mux', r3.code, r3.code === 0 ? '' : r3.err);
}
main();