# -*- coding: utf-8 -*-
import sys, subprocess, re, json
import numpy as np
from faster_whisper import WhisperModel
FF = r"C:\Users\simpl\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
toolDir = r"D:\自动化任务\新闻自动化\视频\工具"
model = WhisperModel("small", device="cpu", compute_type="int8", download_root=toolDir + r"\asr-models")
def analyze(path):
    raw = subprocess.run([FF,"-v","error","-i",path,"-f","f32le","-ac","1","-ar","16000","-"], capture_output=True).stdout
    audio = np.frombuffer(raw, dtype=np.float32).copy()
    dur = len(audio)/16000
    segs,_ = model.transcribe(audio, language="zh", word_timestamps=False, beam_size=1)
    text = "".join(s.text for s in segs)
    chars = len(re.findall(r"[\u4e00-\u9fff]", text))
    return {"path": path.split("\\")[-1], "duration_s": round(dur,1), "chars": chars, "chars_per_min": round(chars/dur*60,1)}
print(json.dumps([analyze(toolDir+r"\rate-audio\ref-guance.wav"), analyze(toolDir+r"\rate-audio\ours-ep02.wav")], ensure_ascii=False))
