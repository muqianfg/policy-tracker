#!/usr/bin/env node
/**
 * 小米 MiMo TTS 客户端（接口已摸清，只需一个有效的 MiMo API Key）
 *
 * 接口：POST https://api.xiaomimimo.com/v1/chat/completions（OpenAI 兼容）
 * 认证：请求头 api-key: <KEY> 或 Authorization: Bearer <KEY>
 * 模型：
 *   mimo-v2.5-tts            —— 用内置音色
 *   mimo-v2.5-tts-voiceclone —— 用你提供的音频样本克隆音色
 *   mimo-v2.5-tts-voicedesign—— 用文字描述设计一个音色
 * 内置音色：mimo_default / 冰糖 / 茉莉 / 苏打 / 白桦 / Mia / Chloe / Milo / Dean
 *
 * 用法：
 *   1) 把 key 写进 D:\自动化任务\.mimo-key（一行，不要提交到 git）
 *   2) import { synth } from "./tts-mimo.mjs";
 *      await synth({ text, out, voice: "冰糖" });
 *
 * 命令行：node scripts/tts-mimo.mjs "文字" out.wav [voice]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY_FILE = join(ROOT, "..", "..", ".mimo-key");

export function loadKey() {
  if (process.env.MIMO_API_KEY) return process.env.MIMO_API_KEY.trim();
  if (existsSync(KEY_FILE)) return readFileSync(KEY_FILE, "utf8").trim();
  return "";
}

export async function synth(opts, _attempt = 1) {
  const { text, out, voice = "苏打", model = "mimo-v2.5-tts", format = "wav", instruction = "", style = "", speed = "" } = opts;
  const key = loadKey();
  if (!key) throw new Error("未找到 MiMo API Key：请写入 .mimo-key 或设置环境变量 MIMO_API_KEY");

  // assistant = 要念的正文（可在开头加 (风格) 标签、中间插 [停顿] 等标签）
  // user     = 语气指令（不会被念出来），用于控制情绪、节奏、角色感
  const spoken = (style ? "(" + style + ")" : "") + text;
  const messages = [];
  if (instruction) messages.push({ role: "user", content: instruction });
  messages.push({ role: "assistant", content: spoken });

  const body = { model, messages, audio: { format, voice } };
  if (speed) body.speed = speed;

  const base = key.startsWith("tp-") || key.startsWith("ttp-")
    ? "https://token-plan-cn.xiaomimimo.com/v1"
    : "https://api.xiaomimimo.com/v1";
  const r = await fetch(base + "/chat/completions", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const txt = await r.text();
  if (!r.ok) {
    let msg = txt.slice(0, 300);
    try { msg = JSON.parse(txt)?.error?.message ?? msg; } catch {}
    throw new Error("MiMo TTS 失败 HTTP " + r.status + "（" + base + "）：" + msg);
  }

  const j = JSON.parse(txt);
  const b64 = j?.choices?.[0]?.message?.audio?.data;
  if (!b64) {
    const reason = j?.choices?.[0]?.finish_reason || "unknown";
    // content_filter 多为连发风控，非内容问题 —— 退避重试
    if (_attempt < 4) {
      const wait = _attempt * 3000;
      await new Promise((res) => setTimeout(res, wait));
      return synth(opts, _attempt + 1);
    }
    throw new Error("第 " + _attempt + " 次仍失败（" + reason + "）：" + txt.slice(0, 200));
  }

  const buf = Buffer.from(b64, "base64");
  writeFileSync(out, buf);
  await new Promise((res) => setTimeout(res, 800));
  return { bytes: buf.length, voice, model, attempts: _attempt };
}

const isMain = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isMain) {
  const [, , text, out, voice] = process.argv;
  if (!text || !out) { console.error("用法: node scripts/tts-mimo.mjs \"文字\" out.wav [voice]"); process.exit(1); }
  synth({ text, out, voice }).then((r) => console.log("✅ " + out + "  " + (r.bytes / 1024).toFixed(1) + " KB  voice=" + r.voice)).catch((e) => { console.error("❌ " + e.message); process.exit(1); });
}
