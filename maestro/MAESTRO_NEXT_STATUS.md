# MAESTRO NEXT — current status

## 2026-10-28: owner pivot to the approved animated portrait

The owner explicitly asked to pause the separate human GLB and animate the
approved portrait. Live now defaults to the same blue-suit visual as the chosen
image. This is a 2.5D image layer with actual WebGL geometry for the carousel,
not a claim of a photoreal volumetric human.

Implemented:
- A transparent portrait over a separate glass-office backdrop; smaller framing,
  gentle head/body motion, localized arm deformation, blinking and subtle mouth
  movement connected to actual speech events.
- Wide translucent panels. Selection reaches, attaches a card to the hand point,
  carries it left, enlarges it and reveals the shared consultation panel. Desktop,
  tablet and mobile layouts keep forms, controls and lower diagrams separate.
- The owner-requested removal of the ARCHITECT title and 02 number.
- Stronger gold M logo in both home modes and six supporting pages. The canonical
  master, hashes and cross-platform rule are in brand/BRAND_CANON.md and AGENTS.md.
- Shared eleven-service catalog, Classic mode, consent and lead context retained.
- Opt-in Russian browser voice, with a bounded wait for local voices and preference
  for Pavel. Cancellation, switching modes and reduced motion clear mouth movement.
- Pause, reduced motion, offscreen/tab suspension, no GLB request on the default
  image path, and static portrait plus all eleven slides when WebGL is unavailable.
- The previous rigged GLB remains an optional sketch, loaded on explicit selection;
  its further appearance work is paused at the owner's request.

## Verification

Current local evidence: 97 desktop/mobile browser assertions, 86 structural
checks, 12 rig/timeline tests, two portrait-controller tests, and speech bridge
checks (25 synthetic events / eight utterances). Real in-app browser speech also
produced start/boundary/end callbacks for two full replies (7.356 s and 6.738 s);
local Russian Irina/Pavel voices were enumerated. This does not certify natural
human delivery or phoneme-level alignment.

Independent review found and resolved lost static portrait after WebGL loss,
keyboard access to an invisible moving panel, and a stale loading-status timer.
Final screenshots cover 1440, 780 and 390 px layouts. The source image received
Gemini visual review earlier in this task; the new cutout was inspected locally.

## Limits and external rollout

The image is animated with a mesh, not captured human performance. Arm range and
facial expression remain limited by one source photograph. Exact natural movement
and perfect speech-to-lip matching are not claimed. No paid service was used.

The consultant still answers from site rules/materials; the application form
prepares text for manual sending. No generative AI backend or production receiver
has been configured.

External profile logos have not been changed. The allowed gateway reports
ACCOUNT_REF_NOT_ALLOWLISTED for the known Telegram bot; other exact MAESTRO
profile targets need verified identification. ANIMA TACTUS and PRAXELTA Repair
profiles are excluded. Production publication is recorded only after PR checks,
merge/deployment and live read-back; local preview alone is not publication.
