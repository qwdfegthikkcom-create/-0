#!/usr/bin/env bash
# يبني ريل «منيوك بعده ورق؟» (25.2 ثانية، 1080×1920، بلا تعليق صوتي: موسيقى ومؤثرات والكلام مكتوب).
# FRAMES=0 يتخطى تصوير الإطارات إذا كانت جاهزة في frames/
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
python3 audio/music.py audio
if [ "${FRAMES:-1}" != "0" ]; then rm -rf frames && node render.cjs; fi
ffmpeg -v error -y -i audio/music.wav -i audio/sfx.wav -filter_complex "
 [0:a]volume=0.85[m]; [1:a]volume=0.6[s];
 [m][s]amix=inputs=2:normalize=0:duration=longest,
 afade=t=out:st=24.6:d=0.6,loudnorm=I=-14:TP=-1.5:LRA=9[a]" -map "[a]" -t 25.2 out/mix.wav
ffmpeg -v error -y -framerate 30 -i frames/f%05d.jpg -i out/mix.wav \
  -vf "noise=alls=3:allf=t,format=yuv420p" -c:v libx264 -preset slow -crf 20 \
  -c:a aac -b:a 192k -t 25.2 -movflags +faststart out/menu-reel.mp4
echo "done: out/menu-reel.mp4"
