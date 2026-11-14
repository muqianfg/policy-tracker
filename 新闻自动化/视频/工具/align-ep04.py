# -*- coding: utf-8 -*-
import sys, json, subprocess, re
import numpy as np
from faster_whisper import WhisperModel

FF = r"C:\Users\simpl\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
demo = r"D:\自动化任务\新闻自动化\视频\成片\第04期-1113联播"
toolDir = r"D:\自动化任务\新闻自动化\视频\工具"
spec = json.load(open(demo + r"\script.json", encoding="utf-8"))
sentences = spec["segments"]

def decode(path):
    raw = subprocess.run([FF,"-v","error","-i",path,"-f","f32le","-ac","1","-ar","16000","-"], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

GAP = 0.2
parts, starts, durs = [], [], []
cur = 0.0
for s in sentences:
    a = decode(demo + r"\audio\\" + s["id"] + ".wav")
    d = len(a) / 16000.0
    starts.append(cur); durs.append(d)
    parts.append(a); cur += d + GAP
total = cur - GAP
audio = np.concatenate([np.concatenate([p, np.zeros(int(GAP*16000), dtype=np.float32)]) if i < len(parts)-1 else p for i,p in enumerate(parts)])

DIG = "零一二三四五六七八九"
def cn_int(n):
    if n == 0: return "零"
    units = ["", "十", "百", "千", "万", "十万", "百万", "千万", "亿"]
    s = str(n); out = ""; L = len(s)
    for i, ch in enumerate(s):
        d = int(ch); pos = L - 1 - i
        if d == 0:
            if out and not out.endswith("零") and pos > 0: out += "零"
        else:
            if d == 1 and pos == 1 and i == 0: out += "十"
            else: out += DIG[d] + units[pos]
    return out.rstrip("零") or "零"
def cn_num_str(tok):
    if "." in tok:
        a, b = tok.split(".", 1)
        return cn_int(int(a)) + "点" + "".join(DIG[int(c)] for c in b if c.isdigit())
    return cn_int(int(tok))
def normalize(text):
    t = re.sub(r"\s+", "", text)
    t = re.sub(r"(\d+(?:\.\d+)?)", lambda m: cn_num_str(m.group(1)), t)
    t = t.replace("%", "").replace("％", "")
    return "".join(ch for ch in t if not re.match(r"[，。！？、；：:,.!?\-\"'\u201c\u201d\u2014（）()《》]", ch))

model = WhisperModel("small", device="cpu", compute_type="int8", download_root=toolDir + r"\asr-models")
segments, _ = model.transcribe(audio, language="zh", word_timestamps=True, beam_size=5)
asr = []
for seg in segments:
    for w in seg.words or []:
        txt = normalize(w.word)
        if not txt: continue
        n = len(txt); d = (w.end - w.start) / max(n,1)
        for k, ch in enumerate(txt):
            asr.append((ch, w.start + k*d, w.start + (k+1)*d))

out = {"total": round(total,2), "sentences": []}
for idx, s in enumerate(sentences):
    chars = list(normalize(s["text"]))
    s_start, s_end = starts[idx], starts[idx] + durs[idx]
    sub = [(c,t,e) for (c,t,e) in asr if t >= s_start - 0.05 and t <= s_end + 0.05]
    n, m = len(chars), len(sub)
    INF = 10**9
    dp = [[INF]*(m+1) for _ in range(n+1)]
    back = [[None]*(m+1) for _ in range(n+1)]
    for i in range(n+1): dp[i][0] = i; back[i][0] = "del"
    for j in range(m+1): dp[0][j] = j; back[0][j] = "ins"
    for i in range(1,n+1):
        for j in range(1,m+1):
            cost = 0 if chars[i-1] == sub[j-1][0] else 1
            opts = [(dp[i-1][j-1]+cost, "diag"), (dp[i-1][j]+1, "del"), (dp[i][j-1]+1, "ins")]
            best = min(opts, key=lambda x: x[0])
            dp[i][j] = best[0]; back[i][j] = best[1]
    i, j = n, m; assign = [None]*(n+1)
    while i > 0 or j > 0:
        b = back[i][j]
        if b == "diag":
            if chars[i-1] == sub[j-1][0]: assign[i] = sub[j-1][1]
            i -= 1; j -= 1
        elif b == "del": i -= 1
        else: j -= 1
    times = [None]*(n+2)
    for k in range(1,n+1): times[k] = assign[k]
    known = [k for k in range(1,n+1) if times[k] is not None]
    for k in range(1,n+1):
        if times[k] is None:
            prev = max([x for x in known if x < k], default=None)
            nxt = min([x for x in known if x > k], default=None)
            if prev and nxt: times[k] = times[prev] + (times[nxt]-times[prev])*(k-prev)/(nxt-prev)
            elif prev: times[k] = times[prev] + (k-prev)*0.12
            elif nxt: times[k] = times[nxt] - (nxt-k)*0.12
            else: times[k] = s_start + (s_end-s_start)*k/max(n,1)
    chars_out = [{"c": chars[k-1], "t": round(times[k],3)} for k in range(1,n+1)]
    out["sentences"].append({"id": s["id"], "text": s["text"], "start": round(s_start,2), "end": round(s_end,2), "chars": chars_out})
json.dump(out, open(demo + r"\timeline.json", "w", encoding="utf-8"), ensure_ascii=False)
print(json.dumps({"total": out["total"], "sentences": len(out["sentences"]), "first": out["sentences"][0]["start"], "last_end": out["sentences"][-1]["end"]}, ensure_ascii=False))
