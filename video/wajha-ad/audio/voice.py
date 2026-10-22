"""يولّد التعليق الصوتي من lines.txt (كل سطر: نص|وقفة بالثواني) ويكتب voice.flac و timeline.json.
الصوت: Piper ar_JO-kareem-medium عبر sherpa-onnx (يتحمّل من GitHub أول مرة).
python3 voice.py
"""
import json, pathlib, subprocess, tarfile, urllib.request
import numpy as np, sherpa_onnx as so, soundfile as sf

SR = 44100
HERE = pathlib.Path(__file__).resolve().parent
CACHE = pathlib.Path.home() / '.cache' / 'wajha-asr'
MD = CACHE / 'vits-piper-ar_JO-kareem-medium'
URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-ar_JO-kareem-medium.tar.bz2'
# تنظيف + سرعة 1.18 + دفء ووضوح + ضغط خفيف
CHAIN = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,'
         'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,'
         'atempo=1.18,highpass=f=85,equalizer=f=160:t=q:w=1:g=2.5,equalizer=f=420:t=q:w=1.2:g=-2.5,'
         'equalizer=f=3400:t=q:w=1:g=3,equalizer=f=7500:t=q:w=1:g=-2,'
         'acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,aresample=44100')

if not MD.exists():
    CACHE.mkdir(parents=True, exist_ok=True)
    a = CACHE / 'kareem.tar.bz2'; urllib.request.urlretrieve(URL, a)
    with tarfile.open(a) as t: t.extractall(CACHE, filter='data')
    a.unlink()
tts = so.OfflineTts(so.OfflineTtsConfig(model=so.OfflineTtsModelConfig(vits=so.OfflineTtsVitsModelConfig(
    model=str(MD / 'ar_JO-kareem-medium.onnx'), tokens=str(MD / 'tokens.txt'), data_dir=str(MD / 'espeak-ng-data'),
    noise_scale=0.6, noise_scale_w=0.75), num_threads=4)))

rows = [l.rstrip('\n').split('|') for l in open(HERE / 'lines.txt', encoding='utf-8') if l.strip()]
t = .4; segs = [np.zeros(int(.4 * SR))]; out = []
for i, (txt, gap) in enumerate(rows):
    a = tts.generate(txt, sid=0, speed=1.0)
    sf.write('/tmp/_line.wav', np.array(a.samples), a.sample_rate)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '/tmp/_line.wav', '-af', CHAIN, '-ac', '1', '/tmp/_line2.wav'], check=True)
    y, _ = sf.read('/tmp/_line2.wav'); d = len(y) / SR
    g = float(gap) * (0.8 if i < len(rows) - 1 else 1)
    out.append({'i': i, 'start': round(t, 3), 'end': round(t + d, 3), 'text': txt})
    segs += [y, np.zeros(int(g * SR))]; t += d + g
v = np.concatenate(segs)
sf.write('/tmp/_voice_dry.wav', v, SR)
# صدى غرفة خفيف
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '/tmp/_voice_dry.wav', '-af', 'aecho=0.8:0.5:28|47:0.12|0.07',
                '-c:a', 'flac', str(HERE / 'voice.flac')], check=True)
tl_path = HERE / 'timeline.json'
tl = json.load(open(tl_path)) if tl_path.exists() else {}
tl.update({'dur': round(t, 3), 'lines': out})
json.dump(tl, open(tl_path, 'w'), ensure_ascii=False, indent=1)
print('voice', round(t, 2), 's')
