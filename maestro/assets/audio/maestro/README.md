# MAESTRO prepared narration — 2026-10-31

Eleven short Russian topic introductions generated offline for the service
screens. This replaces the former system-voice fallback; it is not a live voice
assistant. Dynamic answers stay in text. Playback is opt-in, and the browser
downloads only the selected recording. No visitor text is sent to a TTS service.

## Source and permissions

- Engine: [OHF-Voice Piper](https://github.com/OHF-Voice/piper1-gpl), Python
  package `piper-tts==1.8.0`, GPL-3.0. Engine and model binaries are **not** shipped
  with the website. [Engine license](https://github.com/OHF-Voice/piper1-gpl/blob/main/COPYING).
- Voice: `ru_RU-dmitri-medium`, 22,050 Hz, one speaker. The author's
  [model card](https://huggingface.co/rhasspy/piper-voices/blob/main/ru/ru_RU/dmitri/medium/MODEL_CARD)
  identifies its training dataset as CC0. The
  [OHF voice dataset repository](https://github.com/OHF-Voice/voice-datasets)
  independently identifies the contributed datasets, including Dmitri, as CC0.
  Source model repository metadata identifies its license as MIT; individual
  voice cards take precedence. This is why the BY-NC-SA Ruslan voice was excluded.
- Text: the current MAESTRO catalog heading plus `serviceDetails[id].lead`.
  The text, request match, file SHA-256 and duration are in `manifest.json`.
  No celebrity imitation, private voice recording or identity cloning was used.
- Model SHA-256:
  `f073356ebc4bd0f80c5af58df2953a5988bd5bdab1eb38635ce960b071fbefcb`.
- Model configuration SHA-256:
  `667ef3117bc642c2892dff7690d8bdc8ca4228aeaa783b2dc1416df632855e0d`.

## Production and verification

Generated on Windows using Python 3.12.10, ONNX Runtime 1.31.1 (CPU), Piper
length scale 1.0. FFmpeg 8.1.2 encoded mono MP3, 22,050 Hz, 64 kbit/s, with
`loudnorm=I=-18:TP=-2:LRA=7`. No cloud generation, API keys or paid credits.
The 11 recordings total about 1.18 MB; each is approximately 12–15 seconds.

`node tests/maestro-speech.mjs` checks all content matches, hashes, browser MP3
decoding/duration, actual playback progress, opt-in, cancellation, stale-event
isolation and missing-audio behavior. Playback events report only real starts
and ends. There are no fabricated word or phoneme timestamps.

**Quality limit:** this runtime cannot listen to audio. Technical decoding and
playback are verified, but pronunciation, timbre and naturalness have not had a
listening review. Do not describe the recordings as approved natural speech or
human recordings. They are an opt-in neural voice trial, pending that review.

Regenerate a clip when its heading or lead changes; the speech test rejects
stale text. The build stores only prepared recordings, not a synthesis server.
