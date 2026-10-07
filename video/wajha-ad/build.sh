#!/usr/bin/env bash
# يبني إعلان «واجهة»: يصوّر المشاهد، ويخلط الصوت (تعليق + موسيقى تنخفض تحته + مؤثرات).
# الصوت والتوقيت جاهزين بـ audio/ (voice.wav و timeline.json).
# ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
python3 audio/music.py audio/timeline.json audio
rm -rf frames && node render.cjs
ffmpeg -v error -y -i audio/voice.flac -i audio/music.wav -i audio/sfx.wav -filter_complex "
 [0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[v][vkey];
 [1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.32[m];
 [m][vkey]sidechaincompress=threshold=0.04:ratio=6:attack=40:release=450[md];
 [2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.5[s];
 [v][md][s]amix=inputs=3:normalize=0:duration=longest,
 afade=t=out:st=54.6:d=0.8,loudnorm=I=-14:TP=-1.5:LRA=11[a]" -map "[a]" -t 55.42 out/mix.wav
ffmpeg -v error -y -framerate 30 -i frames/f%05d.jpg -i out/mix.wav \
  -vf "noise=alls=3:allf=t,format=yuv420p" -c:v libx264 -preset slow -crf 20 \
  -c:a aac -b:a 192k -t 55.42 -movflags +faststart out/wajha-ad.mp4
echo "done: out/wajha-ad.mp4"
