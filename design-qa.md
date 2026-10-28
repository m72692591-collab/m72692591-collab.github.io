# Architect reference implementation — 2026-10-28

## Acceptance criteria

Use the owner's middle blue Architect reference as the visual target, retain Classic, present all eleven real directions as broad carousel slides, preserve consultation/form context, and verify desktop/mobile, reduced motion and fallback before release. The strict request for a pixel-identical photoreal animated man is not met by a generated still or by the current stylized GLB.

## Reference and evidence

- Reference: owner-supplied `Триптих интерфейсов «Маэстро Business».png`, middle panel. SHA-256 `952BA078A675CEA37FA2253875934155D6E6AEA7E9722692EA431222A2C6134B`.
- Imported visual assets and their hashes: `maestro/assets/architect/PROVENANCE.md`. MIT icon provenance: `maestro/assets/icons/provenance.json`. CC0 GLB: `maestro/assets/models/LICENSE.txt`.
- Reviewed task screenshots: `outputs/architect-desktop-v2.png` and `outputs/architect-mobile-v2.png`. Browser suite also writes `test-artifacts/maestro/`; CI uploads those images as `maestro-browser-screenshots`.
- Desktop 1440 px; mobile 390 px. Source and rendered views were inspected together. The mobile scene is deliberately taller so the wide slides, readable consultation and all actions remain usable.

## Findings and corrections

- Retained old module filenames/content for cached HTML; new composition uses new module names.
- Primitive model appears only after a genuine GLB failure; it is not flashed while loading.
- Selection recenters the active carousel slide after dragging.
- Mobile question expansion and consultant overlay do not cover carousel controls.
- Fixed undecoded screenshot icon, abrupt mobile image edge and overlapping mode switches.
- Narrowed mobile introduction to 116 px to keep it clear of the portrait hair.
- Added the gold reference-inspired emblem and blue orb. The orb opens the existing consultant and carries the selected service.
- Wide slides are hidden until their first 3D positions are ready, preventing an initial stack at the edge. The static fallback remains visible on failure.
- Separated keyboard focus from pointer hover so leaving a focused card with the pointer does not restart motion.
- Made the scene a clipping surface rather than a hidden scroll container. Opening the orb scrolls only the main viewport; returning from the consultant no longer shifts the composition sideways.

## Verification

75 structural checks and 84 desktop/mobile browser assertions passed locally, including the final orb handoff, keyboard-focus regression and mobile scene alignment. The final visual recheck and CI result are recorded in PR #9 before merge. Core coverage includes both modes, both character views, all-direction selection, context into the form, pause/resume, reduced motion, module-failure fallback, legacy status compatibility, no horizontal overflow and no uncaught browser errors. A CI run exposed an unreliable 350 ms movement observation; the test now waits for a real position change with a bounded 10-second timeout, while still requiring motion to occur.

## Fidelity and remaining dependencies

Broad glass slides, central blue-suited man, office, serif heading, gold emblem and blue consultant orb follow the chosen composition. These slides intentionally replace the narrow reference menu at the owner's request. The bottom cards link to real planning/automation tools; no illustrative growth percentage is presented as a real business result.

The portrait is a generated 2D backdrop and differs in face/pose/crop from the source. The separate rotatable view uses a genuine licensed GLB but is stylized; natural photoreal motion and lip sync require a suitable rigged character asset. The consultant is scripted. The application form prepares text for manual sending; no production receiver is configured. Therefore full reference/animation acceptance is **PARTIAL**, not 100% complete.

Gemini visual review: `ROUTE_UNAVAILABLE` (`Debugger unattached` in the authorized browser route). Independent local code, copy and visual review were used; no Gemini contribution is claimed.

HUMANITY_PASS: existing catalog/service copy retained; new view labels describe the actual portrait/GLB distinction, the consultant's source and the manual application. No invented outcomes or growth figures. Codex performed final editing after independent review.
