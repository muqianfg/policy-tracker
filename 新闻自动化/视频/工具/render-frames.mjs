#!/usr/bin/env node
/**
 * 用 CDP（Chrome DevTools Protocol）连续截帧
 *
 * 为什么不用多次启动 Edge --screenshot：
 *   每次启动约 13 秒，22 帧 × 7 页 = 154 帧 → 35 分钟，不可接受。
 *   CDP 只启动一次浏览器，之后每帧约 100~300ms。
 *
 * 用法：node scripts/render-frames.mjs <buildDir> <segIds逗号分隔> <帧数> <fps>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const [, , buildDir, idsArg, nFramesArg, fpsArg] = process.argv;
if (!buildDir || !idsArg) { console.error("用法: node scripts/render-frames.mjs <buildDir> <ids> <frames> <fps>"); process.exit(1); }
const ids = idsArg.split(",");
const N = parseInt(nFramesArg || "22", 10);
const FPS = parseFloat(fpsArg || "15");
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 启动 Edge（带远程调试）──
const proc = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(buildDir, "_edgeprofile"),
  "--window-size=1920,1080", "--force-device-scale-factor=1",
  "about:blank",
], { stdio: "ignore", detached: false });

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch("http://127.0.0.1:" + PORT + "/json/list");
      const j = await r.json();
      const page = j.find((x) => x.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(300);
  }
  throw new Error("Edge 调试端口未就绪");
}

const url = await wsUrl();
const ws = new WebSocket(url);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const events = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id !== undefined && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) { const h = events.get(m.method); if (h) { events.delete(m.method); h(m); } }
};
function send(method, params) {
  const id = ++msgId;
  return new Promise((res) => { pending.set(id, res); ws.send(JSON.stringify({ id, method, params: params || {} })); });
}
function once(method) { return new Promise((res) => events.set(method, res)); }

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

const t0 = Date.now();
for (const id of ids) {
  const dir = join(buildDir, "frames", id);
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < N; i++) {
    const t = (i / FPS).toFixed(3);
    const fileUrl = "file:///" + join(buildDir, "html", id + ".html").replace(/\\/g, "/") + "?t=" + t;
    const loaded = once("Page.loadEventFired");
    await send("Page.navigate", { url: fileUrl });
    await Promise.race([loaded, sleep(4000)]);
    await sleep(80);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(join(dir, String(i).padStart(3, "0") + ".png"), Buffer.from(shot.result.data, "base64"));
  }
  console.log("       " + id + "  截帧 " + N + " 张  （累计 " + ((Date.now() - t0) / 1000).toFixed(0) + " 秒）");
}

ws.close();
try { proc.kill(); } catch {}
console.log("✅ 全部截帧完成，用时 " + ((Date.now() - t0) / 1000).toFixed(0) + " 秒");
