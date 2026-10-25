#!/usr/bin/env node
/**
 * Edge TTS 客户端（免费、无需 API Key，微软神经网络音色）
 *
 * 为什么用它：Windows 自带的 SAPI（Huihui）音色机械；Edge TTS 用的是微软
 * 在线神经语音（晓晓、云希、云扬等），自然度高得多，且不需要任何密钥。
 *
 * 用法：
 *   import { synth } from "./tts-edge.mjs";
 *   await synth({ text, out, voice: "zh-CN-XiaoxiaoNeural" });
 *
 * 命令行：node scripts/tts-edge.mjs "要念的文字" out.wav [voice]
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const WS = require("ws");
import { randomUUID, createHash } from "node:crypto";

const TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=" + TOKEN;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0";

function ts() { return new Date().toUTCString(); }

/**
 * 生成 Sec-MS-GEC 反滥用令牌
 * 算法（微软 edge-tts 的实现）：
 *   1. ticks = (Unix 秒 + 11644473600) 向下取整到 300 秒的倍数
 *   2. ticks *= 10^7（换算成 1601 纪元的 100 纳秒单位）
 *   3. sha256(ticks + TRUSTED_CLIENT_TOKEN) 转大写十六进制
 */
function secMsGec() {
  const WIN_EPOCH = 11644473600;
  const S_TO_NS = 1e9;
  let ticks = Date.now() / 1000 + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;
  const str = String(Math.floor(ticks)) + TOKEN;
  return createHash("sha256").update(str, "ascii").digest("hex").toUpperCase();
}

export function synth(opts) {
  const { text, out, voice = "zh-CN-XiaoxiaoNeural", rate = "+0%", pitch = "+0Hz", format = "riff-24khz-16bit-mono-pcm" } = opts;
  return new Promise((resolve, reject) => {
    const id = randomUUID().replace(/-/g, "");
    const fullUrl = WS_URL + "&Sec-MS-GEC=" + secMsGec() + "&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId=" + id;
    const ws = new WS(fullUrl, {
      headers: {
        "User-Agent": UA,
        "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Sec-MS-GEC": secMsGec(),
        "Sec-MS-GEC-Version": "1-130.0.2849.68",
      },
    });
    const chunks = [];
    let done = false;
    const fail = (e) => { if (done) return; done = true; try { ws.close(); } catch {} reject(e); };
    const finish = () => {
      if (done) return; done = true;
      try {
        const buf = Buffer.concat(chunks);
        writeFileSync(out, buf);
        try { ws.close(); } catch {}
        resolve({ bytes: buf.length, voice });
      } catch (e) { reject(e); }
    };
    ws.on("open", () => {
      ws.send(
        "X-Timestamp:" + ts() + "\r\n" +
        "Content-Type:application/json; charset=utf-8\r\n" +
        "Path:speech.config\r\n\r\n" +
        JSON.stringify({ context: { synthesis: { audio: {
          metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
          outputFormat: format,
        } } } })
      );
      const esc = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      ws.send(
        "X-RequestId:" + id + "\r\n" +
        "Content-Type:application/ssml+xml\r\n" +
        "X-Timestamp:" + ts() + "Z\r\n" +
        "Path:ssml\r\n\r\n" +
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>" +
        "<voice name='" + voice + "'><prosody rate='" + rate + "' pitch='" + pitch + "'>" + esc + "</prosody></voice></speak>"
      );
    });
    ws.on("message", (data, isBinary) => {
      const d = data;
      if (typeof d === "string") {
        if (d.includes("Path:turn.end")) finish();
        return;
      }
      const buf = Buffer.from(d);
      // 二进制帧：前 2 字节 = 头长度（大端），之后是头文本，再之后是音频
      const hlen = buf.readUInt16BE(0);
      const header = buf.slice(2, 2 + hlen).toString("utf8");
      if (header.includes("Path:audio")) chunks.push(buf.slice(2 + hlen));
    });
    ws.on("error", (e) => fail(new Error("WebSocket 错误: " + (e && e.message ? e.message : String(e)))));
    ws.on("close", (code, reason) => { if (!done) { if (chunks.length) finish(); else fail(new Error("连接关闭 code=" + code + " reason=" + reason)); } });
    setTimeout(() => fail(new Error("超时 60 秒")), 60000);
  });
}

// 命令行入口
const isMain = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isMain) {
  const [, , text, out, voice] = process.argv;
  if (!text || !out) { console.error("用法: node scripts/tts-edge.mjs \"文字\" out.wav [voice]"); process.exit(1); }
  synth({ text, out, voice }).then((r) => console.log("✅ " + out + "  " + (r.bytes / 1024).toFixed(1) + " KB  voice=" + r.voice)).catch((e) => { console.error("❌ " + e.message); process.exit(1); });
}
