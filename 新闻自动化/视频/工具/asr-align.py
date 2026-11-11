# -*- coding: utf-8 -*-
import sys, json, time, subprocess
import numpy as np
from faster_whisper import WhisperModel
FF = r"C:\Users\simpl\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
model_size = sys.argv[1]
audio_path = sys.argv[2]
t0 = time.time()
model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=r"D:\自动化任务\新闻自动化\视频\工具\asr-models")
t1 = time.time()
raw = subprocess.run([FF,"-v","error","-i",audio_path,"-f","f32le","-ac","1","-ar","16000","-"], capture_output=True).stdout
audio = np.frombuffer(raw, dtype=np.float32).copy()
segments, info = model.transcribe(audio, language="zh", word_timestamps=True, vad_filter=False, beam_size=5)
segs, words = [], []
for seg in segments:
    segs.append({"start": round(seg.start,2), "end": round(seg.end,2), "text": seg.text})
    for w in seg.words or []:
        words.append({"start": round(w.start,2), "end": round(w.end,2), "word": w.word})
print(json.dumps({"model": model_size, "audio_s": round(len(audio)/16000,2), "load_s": round(t1-t0,1), "transcribe_s": round(time.time()-t1,1), "lang_prob": round(info.language_probability,3), "segments": segs, "words": words}, ensure_ascii=False, indent=1))
