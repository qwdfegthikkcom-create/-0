#!/usr/bin/env bash
# يبني الإعلان كاملاً: يفصل الصوت، يصوّر المشاهد، ويركّبهم بفيديو واحد.
# ./build.sh path/to/voice.mp3
# يحتاج: ffmpeg، Node مع playwright، وبايثون مع sherpa-onnx (شوف tools/README.md).
set -euo pipefail
cd "$(dirname "$0")"
SRC="${1:?اعطِ مسار ملف الصوت}"
mkdir -p out
python3 ../../tools/separate_voice.py "$SRC" out/voice.wav
rm -rf frames && node render.cjs
ffmpeg -v error -y -framerate 30 -i frames/f%05d.jpg -i out/voice.wav \
  -filter_complex "[1:a]highpass=f=70,afade=t=out:st=35.9:d=0.6,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -vf "noise=alls=2:allf=t,format=yuv420p" \
  -c:v libx264 -preset slow -crf 20 -c:a aac -b:a 192k -t 36.6 -movflags +faststart out/growth-ad.mp4
echo "done: out/growth-ad.mp4"
