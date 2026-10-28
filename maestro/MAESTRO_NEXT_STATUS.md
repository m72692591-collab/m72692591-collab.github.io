# MAESTRO NEXT 3D — current status

## 2026-10-28 revision: PARTIAL, draft branch

The public site remains at main/PR #9 (`452d6c3e9915630a58462e6317ae21b28268e699`).
This revision is on `feat/architect-gesture-scene`; it is not a production release.
The home page still defaults to Classic. Choosing Live now opens the genuine
rigged human; the portrait is an explicitly separate fallback/view.

Implemented in the draft:
- A newly built MPFB human with a 52-joint body/finger skeleton, 67 facial shapes,
  detailed skin and a translucent blue suit. Real GLB: 3.03 MB desktop / 1.58 MB mobile.
- Broad slides orbit at chest height. Selection interpolates through one timed
  hand sweep, carousel turn and light contact. Drag turns the model and carousel.
- Arm reach uses shoulder/elbow/wrist IK. Idle includes subtle breathing, gaze,
  blinking and a left-hand presentation pose; finger bones participate in gestures.
- Opt-in browser speech connects real start/boundary/end/cancel callbacks to the
  face. Mouth movement is approximate because browser boundaries are words,
  not phonemes. There is no paid speech API or connected generative AI backend.
- Shared eleven-direction catalog and shared lead/consultant context are retained.
- Mobile has a reduced face-shape set, smaller textures and pixel ratio. Pause,
  reduced motion, tab visibility and Classic mode suspend movement appropriately.
- GLB failure falls back to the portrait; WebGL failure/loss exposes all eleven
  static slides. No primitive mannequin is substituted for the requested man.

## Evidence

- 76 structural checks and 90 Chrome desktop/mobile assertions passed locally.
- Nine real-Three.js rig/motion regression tests passed, including cancelled speech
  while paused, transformed-parent arm IK and shortest carousel turns.
- Speech bridge tests passed: 21 synthetic lifecycle events / six utterances.
  This is event handling evidence, not a claim of perfect audible lip sync.
- Raw GLB re-import verified facial deformation and both arm presentation clips.
  Compressed variants were decoded and rendered in the browser.
- Independent code review found and resolved RAF completion, late model/speech,
  pause-mouth reset and fallback selection defects. Independent visual review
  found and corrected eye alpha, shirt intersection and the cut jacket shoulder.
- Gemini reviewed the supplied central reference through the authorized web route:
  https://gemini.google.com/app/45f310fc5a677316 . Its contribution was visual
  analysis of face, proportions, materials and placement, not model generation.
- HUMANITY_PASS after independent review and final editing: view/status/voice copy
  states the actual behavior and does not claim live AI or exact likeness.

## Unfinished acceptance criteria

The model is still a different, parameterized face. The exact identity, wavy
side-part hairstyle, photoreal quality and natural human performance requested
by the owner are **not achieved**. A reference-matched sculpt, hair asset and
performance/phoneme animation remain required; there is no verified free
one-image-to-exact-rigged-human dependency available in this environment.

The consultant still answers from site rules/materials. The application form
prepares text for manual sending; its production receiver is not configured.
No money was spent, no Yandex/Amvera service was used, and this draft has not
replaced production. See `assets/models/ARCHITECT-HUMAN.md` for source/license
information, exact hashes and the distinction between CC0 assets and generated
head texture.
