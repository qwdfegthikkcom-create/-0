"""يولّد موسيقى خلفية هادئة ومؤثرات انتقال، بالكود فقط، بلا مقاطع جاهزة.
python3 music.py timeline.json out_dir
"""
import json, sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 44100
tl = json.load(open(sys.argv[1])); out = sys.argv[2]
DUR = tl['dur'] + 0.6
N = int(DUR * SR); t = np.arange(N) / SR
rng = np.random.default_rng(7)

def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def note(m): return 440 * 2 ** ((m - 69) / 12)

def env(n, a, r):
    e = np.ones(n); A = min(int(a * SR), n // 2); R = min(int(r * SR), n // 2)
    e[:A] = np.linspace(0, 1, A) ** 2; e[n - R:] *= np.linspace(1, 0, R) ** 2; return e

# --- pad: Dm  Bb  F  C  (i VI III VII) ---
CH = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [41, 53, 57, 60, 65], [48, 55, 60, 64, 67]]
SEG = 6.9
pad = np.zeros(N)
k = 0; s = 0.0
while s < DUR:
    n0 = int(s * SR); n = min(int((SEG + 1.5) * SR), N - n0)
    if n <= 0: break
    tt = np.arange(n) / SR; sig = np.zeros(n)
    for m in CH[k % 4]:
        for det in (-0.07, 0.0, 0.07):
            f = note(m) * 2 ** (det / 12)
            # موجة ناعمة (أساسي + توافقيات قليلة)
            sig += (np.sin(2*np.pi*f*tt) + .35*np.sin(4*np.pi*f*tt + .3) + .12*np.sin(6*np.pi*f*tt + 1)) / 3
    sig = lp(sig, 1800) * env(n, 1.6, 1.6)
    pad[n0:n0 + n] += sig; s += SEG; k += 1
pad /= np.abs(pad).max() + 1e-9

# --- bass ---
bass = np.zeros(N); s = 0.0; k = 0
while s < DUR:
    n0 = int(s * SR); n = min(int(SEG * SR), N - n0)
    if n <= 0: break
    tt = np.arange(n) / SR; f = note(CH[k % 4][0] - 12)
    bass[n0:n0 + n] += np.sin(2*np.pi*f*tt) * env(n, .4, .8); s += SEG; k += 1

# --- نبض خفيف: نوتات قصيرة على الثُمن (100bpm) ---
pulse = np.zeros(N); step = 60 / 100 / 2; i = 0
while i * step < DUR - .2:
    st = i * step; ch = CH[int(st // SEG) % 4]; m = ch[[2, 3, 4, 3][i % 4]] + 12
    n = int(.35 * SR); n0 = int(st * SR)
    if n0 + n < N:
        tt = np.arange(n) / SR
        pulse[n0:n0 + n] += np.sin(2*np.pi*note(m)*tt) * np.exp(-tt * 11) * (.55 if i % 2 else 1)
    i += 1
# النبض يبدي بعد الهوك ويختفي بالخاتمة
pmask = np.clip((t - 3.2) / 2, 0, 1) * np.clip((tl['dur'] - 3.5 - t) / 1.5, 0, 1)
pulse *= pmask

music = .55 * pad + .35 * bass + .16 * pulse
music *= np.clip(t / 1.2, 0, 1) * np.clip((DUR - t) / 2.5, 0, 1)

# --- مؤثرات ---
sfx = np.zeros(N)
def boom(at, g=1.0):
    n = int(2.2 * SR); n0 = int(at * SR)
    if n0 + n > N: n = N - n0
    tt = np.arange(n) / SR
    f = 55 * np.exp(-tt * 1.5) + 32
    b = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt * 2.2)
    b += lp(rng.standard_normal(n), 900) * np.exp(-tt * 9) * .25
    sfx[n0:n0 + n] += b * g
def whoosh(center, d=.55, g=.5):
    n = int(d * SR); n0 = int((center - d * .6) * SR)
    if n0 < 0 or n0 + n > N: return
    x = rng.standard_normal(n); tt = np.linspace(0, 1, n)
    y = np.zeros(n)
    for j in range(8):  # فلتر يتحرك من الواطي للعالي
        a, b = j * n // 8, (j + 1) * n // 8; fc = 400 + 5200 * (j / 7) ** 1.6
        y[a:b] = bp(x, fc * .6, min(fc * 1.6, 16000))[a:b]
    y *= np.sin(np.pi * tt) ** 2
    sfx[n0:n0 + n] += y * g
def shine(at, g=.25):
    n = int(1.4 * SR); n0 = int(at * SR)
    if n0 + n > N: return
    tt = np.arange(n) / SR; y = np.zeros(n)
    for m in (86, 90, 93, 98):
        y += np.sin(2*np.pi*note(m)*tt) * np.exp(-tt * 3.5)
    sfx[n0:n0 + n] += y * g / 4

for c in tl.get('booms', []): boom(*c) if isinstance(c, list) else boom(c)
for c in tl.get('whooshes', []): whoosh(c)
for c in tl.get('shines', []): shine(c)

sf.write(f'{out}/music.wav', music / (np.abs(music).max() + 1e-9) * .8, SR)
sf.write(f'{out}/sfx.wav', sfx / (np.abs(sfx).max() + 1e-9) * .8, SR)
print('ok', round(DUR, 2))
