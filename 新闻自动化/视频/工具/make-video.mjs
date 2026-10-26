#!/usr/bin/env node
/**
 * 视频流水线 v3：真·元素逐条入场
 *
 * v3 相对 v2 的核心改动：把"静态图 + 推拉"升级为"CSS 动画逐帧截帧"。
 * 原理：给页面加 ?t=秒 参数，JS 把所有 CSS 动画的 animation-delay 减去 t
 *       并设 play-state=paused，于是截图就得到动画在 t 时刻的真实一帧。
 *       按 15fps 取 0~1.5 秒共 22 帧，拼成"逐条入场"的动画。
 *
 * 动效机制借用 html-ppt skill（MIT）的 kf-rise 曲线：
 *   @keyframes kf-rise{from{opacity:0;transform:translateY(60px) scale(.97);filter:blur(6px)}
 *                      to{opacity:1;transform:none;filter:none}}
 *
 * 用法：node scripts/make-video.mjs video/scripts/xxx.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FF = "C:\\Users\\simpl\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe";
const FFPROBE = FF.replace("ffmpeg.exe", "ffprobe.exe");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const TRANS = 0.55;
const FPS = 30;
const ANIM_FPS = 15;       // 截帧帧率
const ANIM_SEC = 1.5;      // 入场动画总时长
const NFRAMES = Math.round(ANIM_FPS * ANIM_SEC);

const specPath = process.argv[2];
if (!specPath) { console.error("用法: node scripts/make-video.mjs <spec.json>"); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, "utf8").replace(/^\uFEFF/, ""));
const slug = basename(specPath, ".json");
const BUILD = join(ROOT, "素材", "_build", slug);
for (const d of ["html", "frames", "audio", "seg"]) {
  const p = join(BUILD, d);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  mkdirSync(p, { recursive: true });
}

// ══════════ 样式：v2 的居中构图 + html-ppt 的入场曲线 ══════════
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden}
body{background:#0a0e14;color:#e8eef6;font-family:"Microsoft YaHei","PingFang SC",sans-serif;
  position:relative;display:flex;align-items:center;justify-content:center}
body::before{content:"";position:absolute;inset:0;
  background:radial-gradient(ellipse 62% 58% at 50% 48%, rgba(240,180,41,.13) 0%, rgba(240,180,41,.05) 38%, rgba(10,14,20,0) 72%)}
body::after{content:"";position:absolute;inset:0;opacity:.16;
  background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);
  background-size:120px 120px;
  mask-image:radial-gradient(ellipse 70% 65% at 50% 50%, #000 15%, transparent 78%);
  -webkit-mask-image:radial-gradient(ellipse 70% 65% at 50% 50%, #000 15%, transparent 78%)}
.stage{position:relative;z-index:2;width:1560px;text-align:center}
.kicker{font-size:27px;letter-spacing:.34em;color:#7d8896;margin-bottom:44px}
.rule{width:72px;height:4px;background:#f0b429;margin:0 auto 46px;border-radius:2px}
h1{font-size:132px;line-height:1.16;font-weight:900;letter-spacing:-.015em}
h2{font-size:78px;line-height:1.24;font-weight:800;color:#f0b429;margin-bottom:50px}
.sub{font-size:46px;line-height:1.6;color:#8d99a8;margin-top:52px}
.numwrap{display:flex;align-items:baseline;justify-content:center;gap:18px}
.big{font-size:330px;font-weight:900;line-height:.95;letter-spacing:-.045em;
  background:linear-gradient(180deg,#ffd25e 0%,#f0b429 62%,#c98d12 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.unit{font-size:70px;color:#98a4b3;font-weight:600}
.label{font-size:52px;line-height:1.45;margin-top:34px;color:#e8eef6}
.points{display:flex;flex-direction:column;gap:30px;width:1380px;margin:0 auto;text-align:left}
.pt{display:flex;align-items:flex-start;gap:30px}
.badge{flex:0 0 auto;width:60px;height:60px;border-radius:15px;
  background:rgba(240,180,41,.14);border:2px solid rgba(240,180,41,.5);
  color:#f0b429;font-size:30px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:6px}
.ptxt{font-size:50px;line-height:1.52;color:#eaf0f7;word-break:normal;line-break:strict;text-wrap:pretty}
.qmark{font-size:150px;line-height:.6;color:#f0b429;opacity:.5;font-family:Georgia,serif}
.quote{font-size:74px;line-height:1.5;font-weight:700;white-space:pre-line;margin:18px 0 0}
.source{font-size:36px;color:#7d8896;margin-top:48px;letter-spacing:.06em}
.footer{position:absolute;left:0;right:0;bottom:52px;text-align:center;font-size:26px;color:#4d5663;letter-spacing:.1em;z-index:2}
/* ── 入场动画（借用 html-ppt 的 kf-rise 曲线）── */
@keyframes kf-rise{from{opacity:0;transform:translateY(60px) scale(.97);filter:blur(6px)}
                   to{opacity:1;transform:none;filter:none}}
@keyframes kf-fade{from{opacity:0}to{opacity:1}}
@keyframes kf-line{from{transform:scaleX(0);opacity:0}to{transform:scaleX(1);opacity:1}}
.a{opacity:0;animation:kf-rise .55s cubic-bezier(.22,1,.36,1) both}
.af{opacity:0;animation:kf-fade .6s ease both}
.al{opacity:0;animation:kf-line .5s cubic-bezier(.22,1,.36,1) both;transform-origin:center}
.d02{animation-delay:.02s}.d06{animation-delay:.06s}.d10{animation-delay:.10s}
.d18{animation-delay:.18s}.d24{animation-delay:.24s}.d30{animation-delay:.30s}
.d36{animation-delay:.36s}.d42{animation-delay:.42s}.d48{animation-delay:.48s}
.d54{animation-delay:.54s}
`;

const stripNum = function (str) { return String(str).replace(/^[\u2460-\u2473\u2776-\u277F\u2780-\u2789]\s*/, ""); };

function htmlFor(seg) {
  const v = seg.visual || {};
  const kicker = (v.kicker || "") ? '<div class="kicker a d02">' + v.kicker + "</div>" : "";
  const rule = '<div class="rule al d10"></div>';
  let body = "";
  if (v.type === "title") {
    body = kicker + rule + '<h1 class="a d18">' + (v.main || "") + "</h1>"
      + (v.sub ? '<div class="sub af d48">' + v.sub + "</div>" : "");
  } else if (v.type === "number") {
    body = kicker + rule
      + '<div class="numwrap a d18"><span class="big">' + (v.value || "") + '</span><span class="unit">' + (v.unit || "") + "</span></div>"
      + (v.label ? '<div class="label af d36">' + v.label + "</div>" : "")
      + (v.sub ? '<div class="sub af d48">' + v.sub + "</div>" : "");
  } else if (v.type === "points") {
    const delays = ["d18", "d30", "d42", "d54", "d54", "d54"];
    const items = (v.points || []).map(function (p, i) {
      return '<div class="pt a ' + delays[i] + '"><div class="badge">' + (i + 1) + '</div><div class="ptxt">' + stripNum(p) + "</div></div>";
    }).join("");
    body = kicker + (v.title ? '<h2 class="a d10">' + v.title + "</h2>" : "")
      + '<div class="points">' + items + "</div>";
  } else if (v.type === "quote") {
    body = kicker + '<div class="qmark a d10">"</div><div class="quote a d18">' + (v.quote || "") + "</div>"
      + (v.source ? '<div class="source af d48">—— ' + v.source + "</div>" : "");
  }
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>' + CSS + '</style></head><body><div class="stage">';
}
function docFor(seg) {
  const v = seg.visual || {};
  const kicker = (v.kicker || "") ? '<div class="kicker a d02">' + v.kicker + "</div>" : "";
  const rule = '<div class="rule al d10"></div>';
  let body = "";
  if (v.type === "title") {
    body = kicker + rule + '<h1 class="a d18">' + (v.main || "") + "</h1>" + (v.sub ? '<div class="sub af d48">' + v.sub + "</div>" : "");
  } else if (v.type === "number") {
    body = kicker + rule + '<div class="numwrap a d18"><span class="big">' + (v.value || "") + '</span><span class="unit">' + (v.unit || "") + "</span></div>" + (v.label ? '<div class="label af d36">' + v.label + "</div>" : "") + (v.sub ? '<div class="sub af d48">' + v.sub + "</div>" : "");
  } else if (v.type === "points") {
    const delays = ["d18", "d30", "d42", "d54", "d54", "d54"];
    const items = (v.points || []).map(function (p, i) { return '<div class="pt a ' + delays[i] + '"><div class="badge">' + (i + 1) + '</div><div class="ptxt">' + stripNum(p) + "</div></div>"; }).join("");
    body = kicker + (v.title ? '<h2 class="a d10">' + v.title + "</h2>" : "") + '<div class="points">' + items + "</div>";
  } else if (v.type === "quote") {
    body = kicker + '<div class="qmark a d10">"</div><div class="quote a d18">' + (v.quote || "") + "</div>" + (v.source ? '<div class="source af d48">—— ' + v.source + "</div>" : "");
  }
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>' + CSS + '</style></head><body><div class="stage">'
    + body + '</div><div class="footer">以上是我个人观点，不构成任何投资建议</div>'
    + '<script>'
    + 'var q=new URLSearchParams(location.search);var t=parseFloat(q.get("t")||"3");'
    + 'var els=[].slice.call(document.querySelectorAll(".a,.af,.al"));'
    + 'var orig=els.map(function(e){return parseFloat(getComputedStyle(e).animationDelay)||0;});'
    + 'els.forEach(function(e,i){e.style.animationDelay=(orig[i]-t)+"s";e.style.animationPlayState="paused";});'
    + '</scr' + 'ipt></body></html>';
}

// ── 1. HTML ──
for (const seg of spec.segments) writeFileSync(join(BUILD, "html", seg.id + ".html"), "\uFEFF" + docFor(seg), "utf8");
console.log("[1/7] HTML 已生成：" + spec.segments.length + " 页（含入场动画）");

// ── 2. 配音 ──
const ttsCfg = spec.tts || { provider: "mimo" };
const mod = await import("./tts-mimo.mjs");
const voice = ttsCfg.voice || "白桦";
for (const seg of spec.segments) {
  const r = await mod.synth({ text: seg.tts, out: join(BUILD, "audio", seg.id + ".wav"), voice, instruction: ttsCfg.instruction || "", style: ttsCfg.style || "" });
  console.log("       " + seg.id + "  " + (r.bytes / 1024).toFixed(0) + " KB" + (r.attempts > 1 ? "  (重试" + r.attempts + "次)" : ""));
}
console.log("[2/7] 配音已生成（小米 MiMo · " + voice + "）");

// ── 3. 逐帧截取入场动画（走 CDP，一个浏览器连续截帧）──
const idsArg = spec.segments.map(function (x) { return x.id; }).join(",");
execFileSync("node", [join(ROOT, "工具", "render-frames.mjs"), BUILD, idsArg, String(NFRAMES), String(ANIM_FPS)], { stdio: "inherit" });
console.log("[3/7] 入场动画逐帧截取完成（" + NFRAMES + " 帧/页 × " + spec.segments.length + " 页）");

// ── 4. 时长 ──
function dur(wav) { return parseFloat(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString().trim()); }
const durs = spec.segments.map(function (s) { return dur(join(BUILD, "audio", s.id + ".wav")); });

// ── 5. 每页：帧序列 + 末帧停留 + 配音 ──
spec.segments.forEach(function (seg, idx) {
  const dir = join(BUILD, "frames", seg.id);
  const total = durs[idx] + TRANS;
  const animTotal = (NFRAMES - 1) / ANIM_FPS;
  const hold = Math.max(0.1, total - animTotal);
  const lines = [];
  for (let i = 0; i < NFRAMES; i++) {
    lines.push("file '" + join(dir, String(i).padStart(3, "0") + ".png").replace(/\\/g, "/") + "'");
    const d = (i === NFRAMES - 1) ? hold : (1 / ANIM_FPS);
    lines.push("duration " + d.toFixed(4));
  }
  lines.push("file '" + join(dir, String(NFRAMES - 1).padStart(3, "0") + ".png").replace(/\\/g, "/") + "'");
  const listFile = join(BUILD, "seg", seg.id + ".txt");
  writeFileSync(listFile, lines.join("\n"), "utf8");
  execFileSync(FF, ["-y", "-f", "concat", "-safe", "0", "-i", listFile,
    "-i", join(BUILD, "audio", seg.id + ".wav"),
    "-vf", "fps=" + FPS + ",format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-af", "apad", "-c:a", "aac", "-b:a", "192k", "-t", String(total),
    join(BUILD, "seg", seg.id + ".mp4")], { stdio: "ignore" });
  console.log("       " + seg.id + " 入场 " + animTotal.toFixed(2) + "s + 停留 " + hold.toFixed(2) + "s = " + total.toFixed(2) + "s");
});
console.log("[4/7] 分段视频完成");

// ── 6. 过黑场拼接 + 进度条 ──
const n = spec.segments.length;
let fc = "";
let prev = "[0:v]";
let cum = 0;
for (let i = 1; i < n; i++) {
  cum += durs[i - 1];
  const outLabel = (i === n - 1) ? "[vx]" : "[v" + i + "]";
  fc += prev + "[" + i + ":v]xfade=transition=fadeblack:duration=" + TRANS + ":offset=" + cum.toFixed(3) + outLabel + ";";
  prev = outLabel;
}
const audioLabels = [];
for (let i = 0; i < n; i++) audioLabels.push("[" + i + ":a]");
const totalAudio = durs.reduce(function (a, b) { return a + b; }, 0);
fc += audioLabels.join("") + "concat=n=" + n + ":v=0:a=1[aout]";
fc += ";[vx]drawbox=x=0:y=ih-7:w='iw*t/" + totalAudio.toFixed(3) + "':h=7:color=0xf0b429@0.9:t=fill[vbar]";
const args = ["-y"];
for (const seg of spec.segments) args.push("-i", join(BUILD, "seg", seg.id + ".mp4"));
args.push("-filter_complex", fc, "-map", "[vbar]", "-map", "[aout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k", "-t", String(totalAudio));
const outDir = join(ROOT, "成片");
mkdirSync(outDir, { recursive: true });
const finalPath = join(outDir, slug + ".mp4");
args.push(finalPath);
execFileSync(FF, args, { stdio: "ignore" });
console.log("[5/7] 过黑场拼接 + 进度条完成");
console.log("[6/7] 成片：" + finalPath);
console.log("       " + (statSync(finalPath).size / 1024 / 1024).toFixed(1) + " MB ｜ " + totalAudio.toFixed(1) + " 秒（" + (totalAudio / 60).toFixed(2) + " 分钟）｜ 1920x1080 ｜ " + FPS + "fps");
