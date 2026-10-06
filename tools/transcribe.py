"""يطلّع الكلام من ملف صوت (أو فيديو) ويقسّمه على الوقفات، حتى نكتب سكربت الفيديو عليه.

التشغيل:
    pip install --break-system-packages sherpa-onnx numpy scipy
    python3 tools/transcribe.py voice.mp3 > voice.json

النتيجة: قائمة مقاطع [{start, end, text}] بالثواني، كل مقطع بين وقفتين.
أول مرة يحمّل نموذج Whisper Turbo (~560MB) من GitHub إلى ~/.cache/wajha-asr.
"""
import json, pathlib, subprocess, sys, tarfile, urllib.request

import numpy as np
import sherpa_onnx
from scipy.ndimage import uniform_filter1d

SR = 16000
MODEL_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2'
CACHE = pathlib.Path.home() / '.cache' / 'wajha-asr'
MODEL = CACHE / 'sherpa-onnx-whisper-turbo'


def ensure_model():
    if (MODEL / 'turbo-encoder.int8.onnx').exists():
        return
    CACHE.mkdir(parents=True, exist_ok=True)
    archive = CACHE / 'turbo.tar.bz2'
    print('downloading model...', file=sys.stderr)
    urllib.request.urlretrieve(MODEL_URL, archive)
    with tarfile.open(archive) as t:
        t.extractall(CACHE, filter='data')
    archive.unlink()


def load(path):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.float32)


def pauses(y):
    """أهدأ النقاط بالصوت، كل وحدة تبعد عن الثانية 1.8 ثانية على الأقل."""
    hop = SR // 100
    frames = y[:len(y) // hop * hop].reshape(-1, hop)
    db = 20 * np.log10(np.sqrt(uniform_filter1d((frames ** 2).mean(1), 40)) + 1e-9)
    dur = len(y) / SR
    cands = sorted((i for i in range(1, len(db) - 1) if db[i] < db[i - 1] and db[i] <= db[i + 1]), key=lambda i: db[i])
    cuts = []
    for i in cands:
        t = i / 100
        if 1.2 < t < dur - 1.0 and db[i] < np.median(db) - 4 and all(abs(t - c) > 1.8 for c in cuts):
            cuts.append(t)
    return [0.0] + sorted(cuts) + [dur]


def main():
    ensure_model()
    y = load(sys.argv[1])
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(MODEL / 'turbo-encoder.int8.onnx'), decoder=str(MODEL / 'turbo-decoder.int8.onnx'),
        tokens=str(MODEL / 'turbo-tokens.txt'), language='ar', task='transcribe', num_threads=4)
    cuts = pauses(y)
    # Whisper يغلط بالمقاطع القصيرة، فنقرأ مجموعات طولها لحد 16 ثانية،
    # وبعدين نوزّع كلماتها على المقاطع الصغيرة حسب طول كل مقطع.
    groups, cur = [], [cuts[0]]
    for c in cuts[1:]:
        if c - cur[0] > 16 and len(cur) > 1:
            groups.append(cur); cur = [cur[-1]]
        cur.append(c)
    groups.append(cur)
    out = []
    for g in groups:
        s = rec.create_stream()
        s.accept_waveform(SR, y[int(g[0] * SR):int(g[-1] * SR)])
        rec.decode_stream(s)
        words = s.result.text.split()
        total = g[-1] - g[0]
        k = 0
        for i, (a, b) in enumerate(zip(g, g[1:])):
            n = len(words) - k if i == len(g) - 2 else round(len(words) * (b - g[0]) / total) - k
            out.append({'start': round(a, 2), 'end': round(b, 2), 'text': ' '.join(words[k:k + n])})
            k += n
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
