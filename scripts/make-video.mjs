#!/usr/bin/env node
/**
 * 视频流水线：口播稿 JSON → 幻灯片 → TTS → 合成 MP4
 *
 * 用法：node scripts/make-video.mjs video/scripts/xxx.json
 *
 * 依赖（本机已验证 2026-10-25）：
 *   · ffmpeg 9.0.2（winget 装的完整版，含 libx264 + aac）
 *   · Windows SAPI 中文语音（Microsoft Huihui Desktop）
 *   · Edge（headless 截图）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FF = "C:\\Users\\simpl\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe";
const FFPROBE = FF.replace("ffmpeg.exe", "ffprobe.exe");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const specPath = process.argv[2];
if (!specPath) { console.error("用法: node scripts/make-video.mjs <spec.json>"); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, "utf8").replace(/^\uFEFF/, ""));
const slug = basename(specPath, ".json");
const BUILD = join(ROOT, "video", "_build", slug);
for (const d of ["html", "png", "audio", "seg"]) {
  const p = join(BUILD, d);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  mkdirSync(p, { recursive: true });
}

// ── 幻灯片样式 ──
const CSS = `
:root{--bg:#0d1117;--fg:#e6edf3;--accent:#f0b429;--dim:#8b949e;--line:#21262d}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1920px;height:1080px;background:var(--bg);color:var(--fg);font-family:"Microsoft YaHei","PingFang SC",sans-serif;position:relative;overflow:hidden}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:110px 150px}
.kicker{font-size:34px;letter-spacing:.22em;color:var(--dim);margin-bottom:60px}
h1{font-size:150px;line-height:1.12;font-weight:900;letter-spacing:-.02em}
h2{font-size:86px;line-height:1.22;font-weight:800;color:var(--accent)}
.sub{font-size:50px;color:var(--dim);line-height:1.65;margin-top:52px}
.big{font-size:320px;font-weight:900;line-height:1;color:var(--accent);letter-spacing:-.04em}
.unit{font-size:74px;color:var(--dim);margin-left:22px;font-weight:600}
.label{font-size:54px;line-height:1.5;margin-top:6px}
ul{list-style:none;margin-top:18px}
li{font-size:60px;line-height:1.72;padding-left:54px;position:relative}
li:before{content:"";position:absolute;left:0;top:.62em;width:24px;height:24px;background:var(--accent);border-radius:50%}
.quote{font-size:74px;line-height:1.55;border-left:10px solid var(--accent);padding-left:58px;white-space:pre-line;font-weight:700}
.source{font-size:38px;color:var(--dim);margin-top:52px;padding-left:68px}
.footer{position:absolute;left:150px;right:150px;bottom:70px;border-top:2px solid var(--line);padding-top:26px;font-size:30px;color:#484f58}
`;

function htmlFor(seg) {
  const v = seg.visual || {};
  const kicker = (v.kicker || "") ? '<div class="kicker">' + v.kicker + "</div>" : "";
  let body = "";
  if (v.type === "title") {
    body = kicker + "<h1>" + (v.main || "") + "</h1>" + ((v.sub) ? '<div class="sub">' + v.sub + "</div>" : "");
  } else if (v.type === "number") {
    body = kicker + '<div><span class="big">' + (v.value || "") + '</span><span class="unit">' + (v.unit || "") + "</span></div>"
      + ((v.label) ? '<div class="label">' + v.label + "</div>" : "")
      + ((v.sub) ? '<div class="sub">' + v.sub + "</div>" : "");
  } else if (v.type === "points") {
    body = kicker + ((v.title) ? "<h2>" + v.title + "</h2>" : "")
      + "<ul>" + (v.points || []).map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul>";
  } else if (v.type === "quote") {
    body = kicker + '<div class="quote">' + (v.quote || "") + "</div>"
      + ((v.source) ? '<div class="source">' + v.source + "</div>" : "");
  }
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>' + CSS + '</style></head><body><div class="wrap">'
    + body + '</div><div class="footer">以上是我个人观点，不构成任何投资建议</div></body></html>';
}

// ── 第一步：写 HTML ──
for (const seg of spec.segments) {
  writeFileSync(join(BUILD, "html", seg.id + ".html"), "\uFEFF" + htmlFor(seg), "utf8");
}
console.log("[1/5] HTML 已生成：" + spec.segments.length + " 页");

// ── 第二步：配音（支持 mimo / sapi 两种）──
const ttsCfg = spec.tts || { provider: "sapi" };
if (ttsCfg.provider === "mimo") {
  const { synth: mimoSynth } = await import("./tts-mimo.mjs");
  const voice = ttsCfg.voice || "冰糖";
  for (const seg of spec.segments) {
    const out = join(BUILD, "audio", seg.id + ".wav");
    const r = await mimoSynth({ text: seg.tts, out, voice, instruction: ttsCfg.instruction || "", style: ttsCfg.style || "" });
    console.log("       " + seg.id + "  " + (r.bytes / 1024).toFixed(0) + " KB");
  }
  console.log("[2/5] 配音已生成（小米 MiMo · " + voice + "）");
} else {
  const ttsLines = spec.segments.map(function (sg) {
    const txt = sg.tts.replace(/'/g, "''");
    const out = join(BUILD, "audio", sg.id + ".wav").replace(/\\/g, "\\\\");
    return "$s.SetOutputToWaveFile('" + out + "'); $s.Speak('" + txt + "');";
  });
  const psScript = [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$s.SelectVoice('" + (spec.voice || "Microsoft Huihui Desktop") + "')",
    "$s.Rate = 0",
  ].concat(ttsLines).concat(["$s.Dispose()", "'TTS_DONE'"]).join("; ");
  writeFileSync(join(BUILD, "tts.ps1"), "\uFEFF" + psScript, "utf8");
  execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(BUILD, "tts.ps1")], { stdio: "inherit" });
  console.log("[2/5] 配音已生成（Windows SAPI）");
}
// ── 第三步：截图 ──
for (const seg of spec.segments) {
  const htmlPath = join(BUILD, "html", seg.id + ".html");
  const pngPath = join(BUILD, "png", seg.id + ".png");
  execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--screenshot=" + pngPath, "--window-size=1920,1080",
    "--force-device-scale-factor=1", "file:///" + htmlPath.replace(/\\/g, "/")],
    { stdio: "ignore", timeout: 60000 });
}
console.log("[3/5] 截图已完成");

// ── 第四步：测时长 + 生成分段 mp4 ──
function dur(wav) {
  return parseFloat(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString().trim());
}
let total = 0;
for (const seg of spec.segments) {
  const wav = join(BUILD, "audio", seg.id + ".wav");
  const png = join(BUILD, "png", seg.id + ".png");
  const out = join(BUILD, "seg", seg.id + ".mp4");
  const d = dur(wav);
  total += d;
  console.log("       " + seg.id + " 时长 " + d.toFixed(2) + " 秒");
  execFileSync(FF, ["-y", "-loop", "1", "-i", png, "-i", wav,
    "-c:v", "libx264", "-tune", "stillimage", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k", "-pix_fmt", "yuv420p", "-r", "30",
    "-t", String(d), "-shortest", out], { stdio: "ignore" });
}
console.log("[4/5] 分段视频已完成，总时长 " + total.toFixed(1) + " 秒（" + (total / 60).toFixed(2) + " 分钟）");

// ── 第五步：拼接 ──
const listFile = join(BUILD, "list.txt");
writeFileSync(listFile, spec.segments.map(function (s) {
  return "file '" + join(BUILD, "seg", s.id + ".mp4").replace(/\\/g, "/") + "'";
}).join("\n"), "utf8");
const outDir = join(ROOT, "video", "成片");
mkdirSync(outDir, { recursive: true });
const finalPath = join(outDir, slug + ".mp4");
execFileSync(FF, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", finalPath], { stdio: "ignore" });
const size = (statSync(finalPath).size / 1024 / 1024).toFixed(1);
console.log("[5/5] 成片输出：" + finalPath);
console.log("       大小 " + size + " MB ｜ 时长 " + total.toFixed(1) + " 秒 ｜ 1920x1080");