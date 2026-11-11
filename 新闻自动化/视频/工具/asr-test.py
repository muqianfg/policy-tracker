# -*- coding: utf-8 -*-
import sys, json, time
from faster_whisper import WhisperModel
model_size = sys.argv[1]
audio = sys.argv[2]
t0 = time.time()
model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=r"D:\自动化任务\新闻自动化\视频\工具\asr-models")
t1 = time.time()
segments, info = model.transcribe(audio, language="zh", word_timestamps=True, vad_filter=False)
segs = []
words = []
for seg in segments:
    segs.append({"start": round(seg.start,2), "end": round(seg.end,2), "text": seg.text})
    for w in seg.words or []:
        words.append({"start": round(w.start,2), "end": round(w.end,2), "word": w.word})
t2 = time.time()
print(json.dumps({"model": model_size, "load_s": round(t1-t0,1), "transcribe_s": round(t2-t1,1), "lang_prob": round(info.language_probability,3), "segments": segs, "words": words}, ensure_ascii=False, indent=1))
