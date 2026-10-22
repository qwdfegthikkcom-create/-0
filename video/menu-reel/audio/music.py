"""موسيقى ريل «منيوك بعده ورق؟» بالكود فقط (بلا مقاطع جاهزة)، على 100 ضربة بالدقيقة.
- قبل التحويل (0–6.0): نبض منخفض متوتر وساعة تتكتك، وصعود (riser) يوصل للتحويل.
- عند 6.0: ضربة (impact) ثم إيقاع دافي: كيك، تصفيق، هاي هات، وتر متقطع، ووسادة أوتار.
- مؤثرات: «ووش» على كل قطع، وصوت ورق بمشاهد الورق، و«دينگ» عند رقم الواتساب.
python3 audio/music.py out_dir
"""
import sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 100; B = 60 / BPM          # الضربة = 0.6 ثانية
DUR = 25.2
SWITCH = 6.0                      # لحظة التحويل من الورق للرقمي
CUTS = [2.4, 4.2, 7.8, 10.2, 12.0, 13.8, 15.6, 19.2]
N = int((DUR + .6) * SR); t = np.arange(N) / SR
rng = np.random.default_rng(3)

def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def add(buf, sig, at, g=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if i < N: buf[i:j] += sig[:j - i] * g
def env(n, a, d):
    e = np.exp(-np.arange(n) / SR / d); A = max(1, int(a * SR)); e[:A] *= np.linspace(0, 1, A); return e

music = np.zeros(N); sfx = np.zeros(N)

# ---------- أصوات ----------
def kick():
    n = int(.45 * SR); tt = np.arange(n) / SR
    f = 50 + 90 * np.exp(-tt * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 7) + .15 * hp(rng.standard_normal(n), 3000) * np.exp(-tt * 120)
def clap():
    n = int(.3 * SR); x = bp(rng.standard_normal(n), 900, 4000); e = np.zeros(n)
    for o in (0, .012, .024): e[int(o * SR):] += np.exp(-np.arange(n - int(o * SR)) / SR * 30)
    return x * e * .5
def hat(open_=False):
    n = int((.25 if open_ else .06) * SR); x = hp(rng.standard_normal(n), 7000)
    return x * np.exp(-np.arange(n) / SR * (12 if open_ else 60)) * .35
def pluck(m, d=.35):
    n = int(d * SR); tt = np.arange(n) / SR; f = hz(m)
    s = np.sin(2*np.pi*f*tt) + .5*np.sin(4*np.pi*f*tt) + .25*np.sin(6*np.pi*f*tt)
    return lp(s, 3500) * env(n, .004, .16)
def pad(ms, d):
    n = int(d * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        for det in (-.08, 0, .08):
            f = hz(m) * 2 ** (det / 12); s += np.sin(2*np.pi*f*tt) + .3*np.sin(4*np.pi*f*tt)
    e = np.minimum(1, tt / .5) * np.minimum(1, (d - tt) / .6)
    return lp(s, 1600) * e / (len(ms) * 3)
def sub(m, d):
    n = int(d * SR); tt = np.arange(n) / SR
    return np.sin(2*np.pi*hz(m)*tt) * np.minimum(1, tt / .01) * np.exp(-tt * 2.2)

# ---------- قبل: الورق (0–6) ----------
for i in range(int(SWITCH / B)):
    at = i * B
    add(music, sub(33, .5), at, .55)                    # نبض منخفض على كل ضربة
    add(music, hat(), at + B / 2, .5)                   # تكتكة
    add(sfx, bp(rng.standard_normal(int(.03 * SR)), 2500, 6000) * np.hanning(int(.03 * SR)), at, .35)
add(music, pad([45, 46, 52], SWITCH), 0, .5)            # وسادة متوترة (نصف درجة)
# صعود قبل التحويل
n = int(1.4 * SR); tt = np.arange(n) / SR
rz = bp(rng.standard_normal(n), 400, 6000) * (tt / 1.4) ** 2.2
rz += .3 * np.sin(2*np.pi*np.cumsum(200 + 900 * (tt / 1.4) ** 2) / SR) * (tt / 1.4) ** 2
add(sfx, rz, SWITCH - 1.4, .55)

# ---------- التحويل ----------
n = int(2.5 * SR); tt = np.arange(n) / SR
boom = np.sin(2*np.pi*np.cumsum(38 + 60*np.exp(-tt*6)) / SR) * np.exp(-tt * 1.6)
boom += lp(rng.standard_normal(n), 900) * np.exp(-tt * 3) * .6
add(sfx, boom, SWITCH, .9)
add(sfx, hp(rng.standard_normal(int(1.6 * SR)), 5000) * np.exp(-np.arange(int(1.6 * SR)) / SR * 2.5), SWITCH, .25)  # صنج خفيف

# ---------- بعد: الإيقاع الدافي (6–25) ----------
PROG = [[53, 57, 60, 64], [48, 52, 55, 60], [50, 53, 57, 62], [46, 50, 53, 58]]   # F  C  Dm  Bb
ROOT = [41, 36, 38, 34]
end_groove = DUR - 1.2
bar = 4 * B
k = 0; s = SWITCH
while s < end_groove:
    ch = PROG[k % 4]
    add(music, pad(ch, bar + .3), s, .55)
    add(music, sub(ROOT[k % 4], bar), s, .5)
    for i in range(4):
        at = s + i * B
        if at >= end_groove: break
        add(music, kick(), at, .85)
        if i % 2: add(music, clap(), at, .6)
        add(music, hat(), at + B / 2, .7); add(music, hat(), at, .35)
        if i == 3: add(music, hat(True), at + B / 2, .4)
        # وتر متقطع: أربع نوتات على كل ضربة
        for j, m in enumerate([ch[0] + 12, ch[2] + 12, ch[1] + 12, ch[3] + 12]):
            add(music, pluck(m), at + j * B / 4, .22 if j else .3)
    s += bar; k += 1
# الخاتمة: وتر أخير يطول
add(music, pad(PROG[0], 2.4), end_groove, .7)
add(music, kick(), end_groove, .9); add(sfx, boom[:int(1.2 * SR)], end_groove, .5)

# ---------- مؤثرات ----------
def whoosh(c, d=.5, g=.45):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); seg = 512
    for a in range(0, n, seg):
        p = a / n; f = 300 + 5000 * np.sin(np.pi * p) ** 2
        out[a:a+seg] = bp(x[a:a+seg], max(100, f * .6), min(20000, f * 1.4), 1)
    add(sfx, out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2, c - d * .6, g)
for c in CUTS: whoosh(c)
def paper(at, d=.7):   # صوت ورق يتكرمش
    n = int(d * SR); x = bp(rng.standard_normal(n), 1500, 9000)
    bursts = (rng.random(n // 400 + 1) > .55).repeat(400)[:n] * rng.random(n)
    add(sfx, x * lp(bursts, 60) * 3, at, .5)
paper(.15); paper(2.5); paper(4.3)
def ding(at):
    n = int(1.4 * SR); tt = np.arange(n) / SR
    s = sum(np.sin(2*np.pi*f*tt) * np.exp(-tt * dd) for f, dd in ((1318.5, 3), (1975.5, 4.5), (2637, 6)))
    add(sfx, s / 3, at, .35)
ding(19.3); ding(21.2)

out = sys.argv[1]
mx = max(np.abs(music).max(), 1e-9); music /= mx
sx = max(np.abs(sfx).max(), 1e-9); sfx /= sx
sf.write(f'{out}/music.wav', np.stack([music, music], 1).astype(np.float32), SR)
sf.write(f'{out}/sfx.wav', np.stack([sfx, sfx], 1).astype(np.float32), SR)
print('ok', round(N / SR, 2))
