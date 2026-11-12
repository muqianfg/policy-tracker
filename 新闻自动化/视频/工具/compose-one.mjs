import fs from 'node:fs';
import { spawn } from 'node:child_process';
const dir = process.argv[2];
const wanted = process.argv.slice(3);
const ff = 'C:/Users/simpl/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const els = JSON.parse(fs.readFileSync(dir + '\\elements.json','utf8'));
const SECTIONS = [
 {id:'s0',start:0.0,end:18.28,bg:'bg-cream'},
 {id:'s1',start:18.28,end:26.92,bg:'bg-cream'},
 {id:'s2',start:26.92,end:94.60,bg:'bg-dark'},
 {id:'s3',start:94.60,end:157.20,bg:'bg-dark'},
 {id:'s4',start:157.20,end:218.28,bg:'bg-dark'},
 {id:'s5',start:218.28,end:233.72,bg:'bg-dark'},
 {id:'s6',start:233.72,end:245.56,bg:'bg-cream'},
];
const navs = { s0:[['nav-1',0,2.8],['nav-2',2.8,null]], s1:[['nav-3',0,null]], s2:[['nav-4',0,null]], s3:[['nav-5',0,null]], s4:[['nav-6',0,null]], s5:[['nav-6',0,null]], s6:[['nav-7',0,null]] };
const run = (args) => new Promise((resolve) => { const p = spawn(ff,args,{stdio:['ignore','pipe','pipe']}); let e=''; p.stderr.on('data',d=>e+=d); p.on('close',c=>resolve({code:c,err:e.slice(-200)})); p.on('error',er=>resolve({code:-1,err:String(er)})); });
async function main(){
  for (const id of wanted.filter(x=>x!=='concat')) {
    const sec = SECTIONS.find(s=>s.id===id); if(!sec) { console.log('skip',id); continue; }
    const dur = sec.end - sec.start;
    const items = els.filter(e=>e.sec===Number(id.slice(1)));
    const inputs = ['-loop','1','-framerate','30','-t',String(dur),'-i', dir+'\\png\\'+sec.bg+'.png'];
    const layers = [];
    for (const [navId,inT,outT] of navs[id]) { inputs.push('-loop','1','-framerate','30','-t',String(dur),'-i', dir+'\\png\\'+navId+'.png'); layers.push({inLocal:inT,outLocal:outT}); }
    for (const el of items) { inputs.push('-loop','1','-framerate','30','-t',String(dur),'-i', dir+'\\png\\'+el.id+'.png'); layers.push({inLocal:Math.max(0,el.inT-sec.start), outLocal: el.outT==null?null:Math.min(dur,el.outT-sec.start)}); }
    const fc=[];
    for (let i=0;i<layers.length;i++){ const L=layers[i]; const idx=i+1; const parts=['['+idx+':v]format=rgba'];
      if(L.inLocal>0.05) parts.push('fade=t=in:st='+L.inLocal.toFixed(3)+':d=0.3:alpha=1');
      if(L.outLocal!=null && L.outLocal<dur-0.05) parts.push('fade=t=out:st='+L.outLocal.toFixed(3)+':d=0.3:alpha=1');
      fc.push(parts.join(',')+'[l'+idx+']'); }
    let prev='[0:v]';
    for(let k=1;k<=layers.length;k++){ const out=(k===layers.length)?'[vout]':'[v'+k+']'; fc.push(prev+'[l'+k+']overlay=0:0'+out); prev=out; }
    fc.push('[vout]format=yuv420p[final]');
    const args=['-y',...inputs,'-filter_complex',fc.join(';'),'-map','[final]','-t',String(dur),'-r','30','-c:v','libx264','-preset','ultrafast','-crf','22','-pix_fmt','yuv420p', dir+'\\'+id+'.mp4'];
    const t0=Date.now(); const r=await run(args); console.log(id, r.code, Math.round((Date.now()-t0)/1000)+'s', r.code===0?'':r.err);
  }
  if (wanted.includes('concat')) {
    const list = SECTIONS.map(s=>"file '" + dir+'\\'+s.id+'.mp4' + "'").join('\n');
    fs.writeFileSync(dir+'\\sections.txt', list, 'utf8');
    const r2=await run(['-y','-f','concat','-safe','0','-i',dir+'\\sections.txt','-c','copy',dir+'\\video-nosound.mp4']); console.log('concat',r2.code,r2.code===0?'':r2.err);
    const r3=await run(['-y','-i',dir+'\\video-nosound.mp4','-i',dir+'\\audio\\voice.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-shortest',dir+'\\第02期-1111联播-无字幕.mp4']); console.log('mux',r3.code,r3.code===0?'':r3.err);
  }
}
main();