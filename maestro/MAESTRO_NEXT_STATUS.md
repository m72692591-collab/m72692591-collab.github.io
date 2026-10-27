# MAESTRO NEXT 3D — status

The new experience is additive to the current homepage and defaults to Classic. Live mode changes the whole homepage presentation while retaining the existing lead form.

## Implemented

- Shared catalog of eleven real site directions for Classic and Live views.
- Lazy loaded Three.js WebGL scene with a genuine rigged GLB man in a business suit, blue translucent material, orbiting selectable 3D panels, light touch effect, drag rotation and a programmed arm gesture.
- Clicking a 3D panel or its accessible text control opens that direction beside the scene. Questions open the site's existing MAESTRO text consultant with the selected direction, and the existing lead form receives the same direction.
- Mobile uses a separate 6.7 MB GLB, smaller render scale and simpler orbit layout. A 2D direction list is available when WebGL fails; reduced motion is respected.
- Three.js 0.180.0 and its GLTFLoader are vendored under the MIT license in `assets/vendor/`.

## Model provenance

- Source: `https://grab3d.com/models/characters/businessman/`
- Download: `https://grab3d.com/dl/businessman-rigged/businessman-rigged.glb`
- License: CC0 1.0, preserved in `assets/models/LICENSE.txt`. The source discloses AI-assisted creation.
- Imported file: `assets/models/architect-rigged.glb`, SHA-256 `F50A22D464F1A5A4D72422D5DB5EDD82B6F709C59D94789FC560E31C1BDFF19B`.
- Mobile file: `assets/models/architect-mobile.glb`, SHA-256 `E6107DAAF41AD4CE9B949D661BDA452CC7D49A47AB41CC1EAF751C241F659BCA`.

## Remaining limitations

The source model is stylized and the programmed gesture is a prototype. This is an interpretation of the approved blue translucent Architect, not a frame-for-frame reconstruction of the reference. The lighter mobile model has no arm rig. There is no lip sync or connected AI consultant; the existing scripted text consultant can optionally use browser speech synthesis. No production deployment is part of this branch.

## Verification

`check_public_site.py` passed for 58 pages. The repository Playwright suite passed 56 assertions in local Chrome, including desktop/mobile GLB loading, Automation/Strategy consultant-to-form handoffs and isolation of a later Classic consultation. Separate local Chrome runs at 1440x900 and 390x844 selected a 3D panel and a text control, retained `?interest=Бот` until explicit selection, switched entire page modes, and had no page errors or horizontal overflow. The reduced-motion path and the 2D fallback were also exercised. Desktop and mobile screenshots and a gesture frame were inspected.
