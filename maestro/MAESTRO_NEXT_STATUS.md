# MAESTRO NEXT — current status

## 2026-10-31: one MAESTRO entry and substantive service pages

Current owner correction supersedes the factory description in the dated record
below. The standalone factory UI and generator are removed; its legacy URL is a
noindex redirect to the Sites topic within MAESTRO. The production checklist is
internal, and the existing brief builder remains available.

- "Позвать Маэстро" opens the approved live portrait from Classic. The live
  question action stays separate. Current service context survives the mode
  change, while a general new enquiry does not inherit a stale locked category.
- All eleven topics now have a relevant existing local illustration, examples of
  customer tasks, working stages, deliverables, preparation and a relevant CTA.
  Both modes use one shared source. Existing authored cards and prices remain.
- Strategy explains launch, positioning, growth choices and advertising audit.
  Sites explains landing pages, company sites, catalogues, blogs, design approaches
  and the choice of a content editing system in ordinary language.
- Rear screens retain at least .88 opacity, with full label opacity and a larger
  minimum scale. A subtle 2px background blur and transparent blue tint soften the
  glass without fading its text. The 24px clearance above lower diagrams remains.

Current local evidence: 157 original-scene browser assertions, 49 service journey
assertions, 147 structural/SEO checks, 38 service content checks, 12 rig and two
portrait checks pass. Browser screenshots were inspected on desktop and mobile.
Separate reviewers found and helped resolve heading contrast, side text sizing
and stale enquiry context. Eleven prepared Russian neural introductions replace
the old system voice. Audio loads only after opt-in; other consultant answers stay
in text. Speech checks cover 17 lifecycle assertions, all eleven MP3 decodes,
text/hash agreement and advancing playback. The service journey also verifies
unmuted playback after the actual visitor button click. Clip URLs include content
hashes to prevent stale cached narration after a text update.

Listening quality remains unverified: the available runtime cannot hear audio.
The new voice is a working trial, not approved natural speech. Licensing and
generation evidence are in `assets/audio/maestro/README.md`.

The feature branch is not a production release. Natural movement, exact lip-sync,
live application delivery and generative consultant integration are not claimed.

## 2026-10-30: wide topic pages and full-page cube preview

Latest owner corrections are implemented in the feature branch:
- The side page uses 43vw (up to 680px), with the fixed lower diagrams shifted
  clear of its right edge. At 1440px the page is 619px wide instead of 446px.
- Topic pictures preserve their natural proportions. Side pictures fit within
  the reading panel; full-page pictures can use the complete content column.
- "На весь экран" replays the hand/card/cube sequence into a full topic page
  below the site header. "Рядом с Маэстро", the return control and Escape restore
  the scene. Only the selected topic is rendered. The full page has keyboard
  focus containment, background inert state and reduced-motion support.
- The consultant stays inside the full page. Both the common CTA and the
  consultant's enquiry action release the modal before reaching the shared form.
- Current main changes through 84027cf were merged, preserving the portfolio
  and the eight-stage site factory. The live Sites topic links to that factory.
  The approved gold logo is applied to portfolio.html and site-factory.html.
- The seven owner-supplied review prompts are applied in design-qa.md and the
  existing SITE_FACTORY_STANDARD.md, including acceptance checks. All 13
  public pages have titles, descriptions and canonical URLs; root sitemap.xml
  and robots.txt agree with those URLs. This is not evidence of search indexing.

Final local validation on 2026-10-31: 154 desktop/mobile browser assertions pass
in one run, including full-page chat, both lead handoffs, touch dragging, Escape
during cube travel, modal focus, reduced motion and fallback. The structural/SEO
suite passes 150 checks; the rig/timeline suite passes 12 and the portrait
controller passes 2. The merged factory passes 31 structural and 12 browser
checks. Receipts and remote CI status are linked in PR #10.
Local screenshots confirm the 1440x780 full-page bounds (0,72,1440,708), mobile
bounds (0,60,390,784), complete image proportions and no horizontal overflow.
The full browser suite also checks modal cancellation, chat and lead handoff.

## Portrait and orbit implementation

The owner explicitly asked to pause the separate human GLB and animate the
approved portrait. Live now defaults to the same blue-suit visual as the chosen
image. This is a 2.5D image layer with actual WebGL geometry for the carousel,
not a claim of a photoreal volumetric human.

Implemented:
- A transparent portrait over a separate glass-office backdrop; smaller framing,
  gentle head motion, a rigid shoulder/forearm chain, blinking and subtle mouth
  movement connected to actual speech events.
- Wide translucent panels (380 x 280 px on desktop). The visitor can drag the orbit;
  it also rotates slowly in idle, as requested in the latest correction. Hover,
  keyboard focus, dragging, an open topic, Pause and reduced motion stop rotation.
  The complete ellipse is raised to leave 24 px above the fixed lower diagrams.
  Selection reaches, attaches a card to the hand point,
  folds it into a WebGL cube, carries it to the upper left and unfolds the side
  panel. Each selection opens its own topic page, using only the relevant
  original card texts. Entire service directories are no longer embedded.
  Classic sections remain in place; copied presentation content carries no IDs,
  forms or inactive interactive controls. Desktop,
  tablet and mobile layouts keep forms, controls and lower diagrams separate.
- The owner-requested removal of the ARCHITECT title and 02 number.
- Stronger gold M logo in both home modes and eight supporting pages. The canonical
  master, hashes and cross-platform rule are in brand/BRAND_CANON.md and AGENTS.md.
- Shared eleven-service catalog, Classic mode, consent and lead context retained.
- Opt-in prepared Russian neural narration for each topic, replacing the former
  Pavel browser voice. Cancellation and switching modes clear mouth movement;
  reduced motion keeps the portrait still. Individual answers remain text-only.
- Pause, reduced motion, offscreen/tab suspension, no GLB request on the default
  image path, and static portrait plus all eleven slides when WebGL is unavailable.
- The previous rigged GLB remains an optional sketch, loaded on explicit selection;
  its further appearance work is paused at the owner's request.

## Verification

Earlier topic-page revision: 126 desktop/mobile browser assertions passed, including
slow idle rotation, hover/focus/drag holds, resume after closing a topic, a minimum
12 px clearance at 1440x780, scoped topic contents and unchanged classic sections.
Visual measurement at 1440x780 gives 24 px clearance and no topic-panel horizontal
overflow. Independent checks cover all 11 topic sources, original section identity,
unique IDs, working topic links and form-interest continuity. Short screen labels
passed independent language review.

The previous revision (982be1d) passed 117 desktop/mobile browser assertions and
all three GitHub Actions jobs in run 40955267206. That revision covered manual
dragging, the earlier whole-section panel, hidden-tab completion, reduced motion
and fallback.
Also passed:
86 structural checks, 12 rig/timeline tests, two portrait-controller tests, and
the speech bridge (25 synthetic events / eight utterances). Browser console
checks include WebGL shader compilation errors. No such errors were found.

Independent visual review inspected rest/reach/half-carry/full-carry arm poses
and 1440x780 / 1583x780 windows. Both lower screens end at y=768, within the
viewport. The old palm sliver and rubber sleeve deformation are removed; a small
angular transition inside the shoulder remains at extreme poses. The test camera
was corrected to avoid clipping the rotated plane before those pose checks.
Independent code review found a lost hidden-tab completion event and narrow-panel
grid/contrast problems; both were corrected. Current full-section visual checks
cover solutions, products, AI, portfolio, pricing and documents.

Previous local baseline: 99 desktop/mobile browser assertions, 86 structural
checks, 12 rig/timeline tests, two portrait-controller tests, and speech bridge
checks (25 synthetic events / eight utterances). Real in-app browser speech also
produced start/boundary/end callbacks for two full replies (7.356 s and 6.738 s);
local Russian Irina/Pavel voices were enumerated. This does not certify natural
human delivery or phoneme-level alignment.

Independent review found and resolved lost static portrait after WebGL loss,
keyboard access to an invisible moving panel, and a stale loading-status timer.
Final screenshots cover 1440, 780 and 390 px layouts. The source image received
Gemini visual review earlier in this task; the new cutout was inspected locally.

Owner visual correction: the hand-derived dock covered the torso, and the glass
slides were too opaque. The expanded panel now stays in the left column; its
traveling screen clears the palm and settles into that column. Orbit screens use
8–10% tint, fine borders, flat corners and no backdrop blur. Wider spacing avoids
overprinted labels on narrow displays; screens behind the side panel are hidden.
Lower screens cover the portrait's waist crop and remain stable during selection.
On mobile they precede the navigation controls and the consultation panel.
Independent screenshot review caught the mobile chin overlap and colliding slide
text; both were corrected before the 99-assertion browser pass. One earlier local
run timed out loading the portrait in the failed-model scenario; the immediate
diagnostic rerun completed all scenarios. The earlier GitHub speech-job failure
was an absent Playwright dependency, resolved by running it in the browser job.

## Limits and external rollout

The image uses articulated 2.5D parts, not captured human performance. Arm range and
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


## Current correction and acceptance evidence

Task: eliminate stretched hand/sleeve pixels, restore a front/rear orbit around
an unchanged approved portrait, and double virtual-screen height. Completion
requires joint-pose visual inspection and browser navigation/fallback checks.

Implemented: rigid shoulder and forearm polygons, reconstructed torso underlay,
draggable 3D ellipse with rear screens occluded by the portrait, and 280 px
screen height on desktop (240 tablet, 232 mobile). Screen text fades when the
screen turns edge-on. The selected screen remains
prominent during a gesture; other orbit screens are dimmed. Existing text is kept.

Visual inspection: rest/reach/half-carry/full-carry renderer snapshots found a
residual old palm sliver, corrected in the silhouette mask. Independent review
then found no gross warping, duplicate palm or detached elbow in those four
poses. A small angular transition inside the shoulder remains in the extreme
pose. These stills are not proof of fully natural movement or facial acting.

Current gesture was recorded in a local browser; approved portrait appearance
is preserved, with bounded arm motion and a small whole-silhouette turn. This is
not a reconstructed volumetric torso or captured human biomechanics. The 3-second
selection uses elapsed wall time so a slow renderer does not prolong the sequence.
Speech starts after the selected section opens, only when voice is enabled.
No production deployment is performed by
this correction. Gemini review for this revision: ROUTE_UNAVAILABLE (no verified
active Gemini review session available); local independent visual critic used.
