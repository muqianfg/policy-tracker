import fs from 'node:fs';
import { spawn } from 'node:child_process';
const dir = process.argv[2];
const orient = process.argv[3];
const W = orient === 'h' ? 1920 : 1080, H = orient === 'h' ? 1080 : 1920;
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ff = 'C:/Users/simpl/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const sts = JSON.parse(fs.readFileSync(dir + '\\statements.json','utf8'));
const total = JSON.parse(fs.readFileSync(dir + '\\timeline.json','utf8')).total;
const shot = (html, png) => new Promise((resolve) => { const p = spawn(edge, ['--headless=new','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1','--window-size='+W+','+H,'--force-color-profile=srgb','--default-background-color=00000000','--screenshot='+png,'--user-data-dir=C:/Windows/Temp/edge-ep03-'+orient,'file:///'+html.replace(/\\/g,'/')], { stdio:['ignore','ignore','ignore'] }); p.on('close',()=>resolve()); p.on('error',()=>resolve()); });
const run = (args) => new Promise((resolve) => { const p = spawn(ff,args,{stdio:['ignore','pipe','pipe'],cwd:dir}); let e=''; p.stderr.on('data',d=>e+=d); p.on('close',c=>resolve({code:c,err:e.slice(-160)})); p.on('error',er=>resolve({code:-1,err:String(er)})); });
async function main(){
  await shot(dir+'\\html-base-'+orient+'.html', dir+'\\png-base-'+orient+'.png');
  for (const s of sts) await shot(dir+'\\html-'+s.id+'-'+orient+'.html', dir+'\\png-'+s.id+'-'+orient+'.png');
  console.log('rendered', sts.length+1, 'layers', orient);
  const list = [];
  for (let i=0;i<sts.length;i++){
    const s = sts[i]; const start = i===0 ? 0 : s.start; const end = s.end; const dur = end - start;
    const fin = Math.max(0.12, Math.min(0.3, dur*0.08));
    const fout = Math.max(0.25, Math.min(0.4, dur*0.1));
    const fc = '[1:v]format=rgba,fade=t=in:st=0.12:d='+fin.toFixed(2)+':alpha=1,fade=t=out:st='+(dur-fout-0.1).toFixed(2)+':d='+fout.toFixed(2)+':alpha=1[s];[0:v][s]overlay=0:0,format=yuv420p[v]';
    const args = ['-y','-loop','1','-framerate','30','-t',String(dur),'-i', dir+'\\png-base-'+orient+'.png','-loop','1','-framerate','30','-t',String(dur),'-i', dir+'\\png-'+s.id+'-'+orient+'.png','-filter_complex',fc,'-map','[v]','-t',String(dur),'-r','30','-c:v','libx264','-preset','ultrafast','-crf','23','-pix_fmt','yuv420p', dir+'\\seg-'+orient+'-'+String(i).padStart(2,'0')+'.mp4'];
    const r = await run(args); if(r.code!==0) console.log('seg fail',s.id,r.err);
    list.push("file '"+dir+'\\seg-'+orient+'-'+String(i).padStart(2,'0')+".mp4'");
  }
  fs.writeFileSync(dir+'\\segs-'+orient+'.txt', list.join('\n'), 'utf8');
  const r2 = await run(['-y','-f','concat','-safe','0','-i',dir+'\\segs-'+orient+'.txt','-c','copy',dir+'\\video-'+orient+'-nosound.mp4']); console.log('concat',orient,r2.code,r2.code===0?'':r2.err);
  const subs = orient === 'h' ? 'subs-h.ass' : 'subs-v.ass';
  const r3 = await run(['-y','-i',dir+'\\video-'+orient+'-nosound.mp4','-i',dir+'\\audio\\voice.wav','-filter_complex','[0:v]ass='+subs+'[v]','-map','[v]','-map','1:a','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-shortest',dir+'\\第03期-1112-'+(orient==='h'?'横屏':'竖屏')+'-字幕.mp4']); console.log('burn',orient,r3.code,r3.code===0?'':r3.err);
}
main();