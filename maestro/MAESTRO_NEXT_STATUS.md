# MAESTRO NEXT 3D — status

The new experience is additive to the current homepage and defaults to Classic.

## Implemented

- Shared catalog of eleven existing site directions for Classic and Live views.
- Lazy loaded Three.js WebGL scene with volumetric geometry, orbiting panels, selectable directions, light, drag rotation and a gesture prototype.
- A local text consultant bound to the selected direction and the existing lead form.
- Smaller mobile render scale, 2D direction list when WebGL fails, and reduced motion support.
- Three.js 0.180.0 vendored under its MIT license in `assets/vendor/`.

## Incomplete

The central figure is procedural geometry. It is **not** the approved realistic, translucent business person, and no licensed GLB/glTF human model has been integrated. Gesture and speech are illustrative, not lifelike animation or voice. The existing site remains the default while these are unresolved. No production deployment is part of this branch.

## Verification

`check_public_site.py` passed for 58 pages. Local Chrome tests at 1440x900 and 390x844 loaded WebGL, selected Automation, produced a local plan, had no page errors or horizontal overflow. Screenshots were inspected. Recheck after adding the final model.
