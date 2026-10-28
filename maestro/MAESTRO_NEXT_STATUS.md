# MAESTRO NEXT 3D — status

The new experience is additive to the current homepage and defaults to Classic. Live mode changes the whole homepage presentation while retaining the existing lead form.

## Implemented

- Shared catalog of eleven real site directions for Classic and Live views.
- Live mode now opens the selected Architect composition: a generated portrait backdrop matching the supplied central panel, overlaid with the real Three.js carousel. The interface explicitly identifies this as portrait + 3D carousel. The separate 3D-model control shows the genuine rigged GLB, blue material, drag rotation and programmed arm gesture.
- Clicking a 3D panel or its accessible text control opens that direction beside the scene. Questions open the site's existing MAESTRO text consultant with the selected direction, and the existing lead form receives the same direction.
- Mobile uses a separate 1.30 MB GLB, smaller render scale and simpler orbit layout. A 2D direction list is available when WebGL fails; reduced motion is respected.
- Three.js 0.180.0 and its GLTFLoader are vendored under the MIT license in `assets/vendor/`.

## Model provenance

- Source: `https://grab3d.com/models/characters/businessman/`
- Download: `https://grab3d.com/dl/businessman-rigged/businessman-rigged.glb`
- License: CC0 1.0, preserved in `assets/models/LICENSE.txt`. The source discloses AI-assisted creation.
- Imported file: `assets/models/architect-rigged.glb`, 3.17 MB, SHA-256 `16E0EDAC8E6E4AFC6F2863ED9795B628656E4BDFDAB2554A0E5F0937219401B4`.
- Mobile file: `assets/models/architect-mobile.glb`, 1.30 MB, SHA-256 `FD9758C9647F19EBD9B7944F849BBC12366DFBF895139C5E90F0CB3C98D906D2`.
- Both are locally optimized derivatives of the CC0 source with glTF Transform 4.5.1: `quantize` followed by `simplify --ratio 0.25 --error 0.003`. The desktop skin and arm bones remain present. Both derivatives passed glTF validation with zero errors and loaded in Chrome through the current Three.js scene; the desktop rig preserved its programmed gesture. The `NODE_SKINNED_MESH_NON_ROOT` warning was already present in the source GLB.

## Remaining limitations

The portrait artwork is static and does not have facial animation. The separate source GLB model is stylized and its programmed gesture is a prototype. This full-body model is a simpler interpretation of the approved blue translucent, photoreal, waist-up Architect in the triptych. The lighter mobile model has no arm rig. There is no lip sync or connected AI consultant; the existing scripted text consultant can optionally use browser speech synthesis. The current lead form prepares a copyable application for the visitor to send manually; its server endpoint is not configured.

## Verification

The reference composition adds broad content slides (300 px desktop / 260 px mobile), a consultant orb, a gold emblem and an explicitly labelled portrait view. `design-qa.md` records the reference comparison and remaining fidelity gap. The implementation is not claimed to be a pixel-identical or fully animated reproduction.

The repository Playwright suite covered desktop/mobile GLB loading, the initial Strategy lead action, Automation/Strategy consultant-to-form handoffs and isolation of a later Classic consultation. Separate local Chrome runs at 1440x900 and 390x844 selected a 3D panel and a text control, retained `?interest=Бот` until explicit selection, switched entire page modes, and had no page errors or horizontal overflow. The reduced-motion path and the 2D fallback were also exercised. Desktop and mobile screenshots and a gesture frame were inspected.

## Live release — 2026-10-28

- Main commit `63dff496d33d1464c728d8d34be2de4031e151bd` includes PRs #3, #6 and #7. The repository suite passed 70 structural checks and 64 Chrome browser assertions; all three CI jobs passed on the final model PR.
- `https://m72692591-collab.github.io/maestro/` opens Classic by default; `https://m72692591-collab.github.io/maestro/?mode=live` opens Live 3D. Live desktop and mobile Chrome checks loaded the optimized GLBs (3,168,856 and 1,299,128 bytes), exercised the panels, form context and mode switch, and found no page errors or horizontal overflow. These observations establish publication, not a server-side lead receipt.
- Independent Russian-copy review corrected three misleading/awkward phrases. Gemini multimodal review is `ROUTE_UNAVAILABLE` for this run: its Chrome tab did not attach to browser automation (`Debugger unattached`), so no Gemini output is claimed or used.
