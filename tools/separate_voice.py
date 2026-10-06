"""يفصل صوت المتكلّم عن الموسيقى ويطلّعه بملف وحده.

التشغيل:
    pip install --break-system-packages sherpa-onnx numpy soundfile
    python3 tools/separate_voice.py input.mp3 voice.wav [music.wav]

أول مرة يحمّل نموذج UVR-MDX-NET Voc_FT (~65MB) من GitHub إلى ~/.cache/wajha-asr.
"""
import pathlib, subprocess, sys, urllib.request

import numpy as np
import sherpa_onnx as so
import soundfile as sf

SR = 44100
URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/source-separation-models/UVR-MDX-NET-Voc_FT.onnx'
MODEL = pathlib.Path.home() / '.cache' / 'wajha-asr' / 'UVR-MDX-NET-Voc_FT.onnx'


def main():
    src, voice_out = sys.argv[1], sys.argv[2]
    music_out = sys.argv[3] if len(sys.argv) > 3 else None
    if not MODEL.exists():
        MODEL.parent.mkdir(parents=True, exist_ok=True)
        print('downloading model...', file=sys.stderr)
        urllib.request.urlretrieve(URL, MODEL)
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(pcm, np.float32).reshape(-1, 2).T.copy()
    sep = so.OfflineSourceSeparation(so.OfflineSourceSeparationConfig(model=so.OfflineSourceSeparationModelConfig(
        uvr=so.OfflineSourceSeparationUvrModelConfig(model=str(MODEL)), num_threads=4)))
    out = sep.process(sample_rate=SR, samples=y)
    stems = [np.array([np.array(c.data) for c in st.data]) for st in out.stems]
    # النموذج يطلع مقطعين: الصوت أولاً، وبعده الموسيقى
    sf.write(voice_out, stems[0].T, out.sample_rate)
    if music_out:
        sf.write(music_out, stems[1].T, out.sample_rate)


if __name__ == '__main__':
    main()
