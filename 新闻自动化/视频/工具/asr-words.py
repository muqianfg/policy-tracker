# -*- coding: utf-8 -*-
import sys, subprocess, json
import numpy as np
from faster_whisper import WhisperModel
FF = r"C:\Users\simpl\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
audio_path = sys.argv[1]
model = WhisperModel("small", device="cpu", compute_type="int8", download_root=r"D:\自动化任务\新闻自动化\视频\工具\asr-models")
raw = subprocess.run([FF,"-v","error","-i",audio_path,"-f","f32le","-ac","1","-ar","16000","-"], capture_output=True).stdout
audio = np.frombuffer(raw, dtype=np.float32).copy()
segments, info = model.transcribe(audio, language="zh", word_timestamps=True, beam_size=5)
out = []
for seg in segments:
    for w in seg.words or []:
        out.append({"t": round(w.start,2), "e": round(w.end,2), "w": w.word})
print("SEGMENTS:")
for seg in segments:
    print(f"  {seg.start:6.2f}-{seg.end:6.2f}  {seg.text}")
print("WORDS:")
print("  " + "  ".join(f"{x['w']}@{x['t']:.2f}" for x in out))
