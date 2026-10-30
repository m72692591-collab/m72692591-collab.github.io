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

## Human-rig revision — 2026-10-28, draft / PARTIAL

Acceptance requested: the exact illustrated Architect, chest-level wide carousel,
real gestures, expression and speech. Technical acceptance passed; exact visual
identity and lifelike performance remain unfulfilled. This revision is not deployed.

Source: supplied central triptych panel, SHA-256
952ba078a675cea37fa2253875934155d6e6aea7e9722692ea431222a2c6134b.
The source is a single illustrated view, not an existing rigged model.

Independent Gemini reference review was actually completed at
https://gemini.google.com/app/45f310fc5a677316 : defined jaw/cheekbones, light
stubble, swept wavy brown hair, opaque face/neck, blue translucent jacket,
shoulder/head width around 2.7–3.0, clear face above the chest cards. These are
visual guidance, not measured biometric reconstruction. The earlier unavailable
Gemini route above is historical and does not describe this run.

Implemented: CC0-based MPFB human, 52 joints including fingers, 67 facial targets,
separate detailed face texture, arm IK, timed selection/contact, genuine browser
speech callbacks, chest orbit, smaller mobile GLB. Corrected eye alpha, cloth
intersections and a shoulder cut identified in the prototype renders.

76 structural / 90 browser assertions, 9 rig tests and speech lifecycle tests
passed locally. Browser coverage now also tests failed GLB and lost WebGL context.
Desktop/mobile final screenshots are produced in test-artifacts/maestro and CI.
No uncaught page errors or horizontal overflow were observed. The source GLB
read-back confirms real morph deformation; it does not certify natural movement.

HUMANITY_PASS: retained catalog and owner copy; new controls/statuses independently
reviewed and corrected so failed speech does not claim an active fallback, and
model failure describes the automatic portrait switch. Senior edit: Codex.

Open visual gap: another face/hairstyle, procedural motion, approximate mouth
poses. The head texture improves detail without establishing exact identity.
This gap blocks a claim of 100% match and blocks automatic production replacement.


## 2026-10-28: approved portrait animation supersedes GLB appearance work

Owner-directed pivot: pause human GLB work, animate the approved portrait. The new
alpha cutout and empty office are separate imagegen-derived assets. Real WebGL
carousel panels follow the deformed hand point, expand, then reveal the shared
consultation. The image layer is explicitly 2.5D, not a new 3D human. Removed
ARCHITECT/02; brighter gold M is the canonical project logo.

Current validation: 97 browser assertions, 86 structural checks, 12 rig/timeline
checks, two portrait checks, speech lifecycle 25 events/eight utterances. Independent
review resolved static fallback portrait loss, moving-panel focus and status-timer
defects. Three responsive viewport screenshots inspected; panel/control overlap
was found and corrected. HUMANITY_PASS: new labels identify a live image and a
3D sketch; diagrams describe project stages without fabricated growth metrics.

External profile rollout is incomplete: Telegram gateway account is not allowlisted;
other exact MAESTRO profiles are not currently verified. No profile write is claimed.

## 2026-10-30: applying the seven website review prompts

The owner's seven prompts are review lenses for the existing site, not a reason
to restart it or replace approved copy and identity. Keep the shared catalog,
Classic/Live context, gold twin-peak mark and approved blue-suit portrait.

| Review lens | Existing source and acceptance check |
| --- | --- |
| Strategy and page structure | The shared catalog and existing brief builder already collect the task, goal, constraints and next action. Each topic must show only its own materials and retain its lead interest. |
| Identity and voice | `maestro/brand/BRAND_CANON.md` is the brand source. Preserve owner-authored text; review only new labels for a clear action, natural Russian and accurate scope. |
| Home hierarchy | Topic title, summary, relevant evidence and the existing request action must remain readable in order. Do not invent client logos, testimonials, conversion rates or growth figures. |
| Copy | Keep authored service text and price values unchanged. A demo, prototype and configured live integration must not be described as equivalent results. |
| Visual design | Extend the current gold/blue palette and existing typography. Inspect the opened topic beside the portrait and in full-page layout; keep complete image proportions, visible controls and readable contrast. |
| Responsive implementation | Retain semantic HTML and working links. Check desktop/mobile, keyboard focus, reduced motion, WebGL failure, the form context and return to Classic. |
| Search basics | Keep distinct existing titles/descriptions and headings. Use absolute canonical URLs consistent with the sitemap; list public pages without mode/query duplicates or the server admin page. |

Search discovery changes: supporting pages now have self-referencing canonical
URLs; `sitemap.xml` lists the 12 public MAESTRO pages; root `robots.txt` points to
it without blocking assets or pages. The portfolio's existing social title and
description remain unchanged, with its canonical URL, site name, locale and type
added. No fabricated `lastmod` values, keyword stuffing or unverified structured
data were added. These are local source changes, not proof of indexing or ranking.
The saved check compares each supporting page's body hash before and after.

Primary references read on 2026-10-30:
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): descriptive content, useful links and user comprehension come before mechanical SEO work.
- [Google canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): self-referencing canonical links and consistent preferred URLs.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): absolute URLs, canonical pages and accurate optional metadata.
- [Google robots.txt guidance](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt): the file belongs at the host root; its sitemap directive supports discovery.
