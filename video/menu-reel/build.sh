#!/usr/bin/env bash
# يبني ريل «منيوك بعده ورق؟» (27.6 ثانية، 1080×1920) بصوت voice/raw/elevenlabs-2026-10-22-menu-reel.mp3.
# الموسيقى تنخفض تحت الصوت (sidechain). VOICE=0 يبني نسخة بلا صوت (موسيقى ومؤثرات فقط).
# FRAMES=0 يتخطى تصوير الإطارات إذا كانت جاهزة في frames/
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
python3 audio/music.py audio
if [ "${FRAMES:-1}" != "0" ]; then rm -rf frames && node render.cjs; fi
if [ "${VOICE:-1}" = "0" ]; then
ffmpeg -v error -y -i audio/music.wav -i audio/sfx.wav -filter_complex "
 [0:a]volume=0.85[m]; [1:a]volume=0.6[s];
 [m][s]amix=inputs=2:normalize=0:duration=longest,
 afade=t=out:st=27.0:d=0.6,loudnorm=I=-14:TP=-1.5:LRA=9[a]" -map "[a]" -t 27.6 out/mix.wav
else
ffmpeg -v error -y -i audio/voice.flac -i audio/music.wav -i audio/sfx.wav -filter_complex "
 [0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[v][vkey];
 [1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.17[m];
 [m][vkey]sidechaincompress=threshold=0.03:ratio=4:attack=25:release=350[md];
 [2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.22[s];
 [v][md][s]amix=inputs=3:normalize=0:duration=longest,
 afade=t=out:st=27.0:d=0.6,loudnorm=I=-14:TP=-1.5:LRA=11[a]" -map "[a]" -t 27.6 out/mix.wav
fi
ffmpeg -v error -y -framerate 30 -i frames/f%05d.jpg -i out/mix.wav \
  -vf "noise=alls=3:allf=t,format=yuv420p" -c:v libx264 -preset slow -crf 20 \
  -c:a aac -b:a 192k -t 27.6 -movflags +faststart out/menu-reel.mp4
echo "done: out/menu-reel.mp4 (VOICE=${VOICE:-1})"
