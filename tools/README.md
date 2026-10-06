# أدوات الفيديو

## `transcribe.py` — استخراج الكلام من الصوت

يقرأ ملف صوت أو فيديو، ويطلّع الكلام اللي بيه مقسّماً على الوقفات، ويه وقت كل مقطع بالثواني.
نكتب سكربت الفيديو على هالنتيجة، حتى كل لقطة تجي ويه الكلام مالها.

```
pip install --break-system-packages sherpa-onnx numpy scipy
python3 tools/transcribe.py voice.mp3 > voice.json
```

- يشتغل على الجهاز بدون إنترنت، بعد أول مرة يحمّل بيها نموذج Whisper Turbo (~560MB) من GitHub.
- النص يطلع تقريبي، خصوصاً باللهجات وأسماء العلامات التجارية، فلازم يتراجع قبل كتابة السكربت.

## `separate_voice.py` — فصل صوت المتكلّم عن الموسيقى

```
python3 tools/separate_voice.py input.mp3 voice.wav [music.wav]
```

يستخدم نموذج UVR-MDX-NET (~65MB، يتحمّل من GitHub أول مرة). النتيجة صوت المتكلّم وحده، وتكدر تطلّع الموسيقى بملف ثاني.
