# Architect human — 2026-10-28 prototype

This is an actual skinned GLB with editable body/facial geometry. It is a manually
shaped interpretation of the approved reference, **not an exact reconstruction
of the pictured man**. Photoreal likeness and natural performance are not accepted.

## Files

| File | Bytes | SHA-256 |
|---|---:|---|
| architect-human.glb | 3030832 | 9e3058bc5e48bf05ece096fccf838f1d91bee111f8dad5a0dbb6c06da205079a |
| architect-human-mobile.glb | 1578500 | 88134e3fad64dfe2ceff1f67de3ab563d973cfa5737dd75ca6d78ca82a7c3a66 |

Both variants retain the 52-joint body/finger skeleton. The desktop body has
52 ARKit-named face shapes and 15 Meta-named visemes. Mobile retains 25 shapes
used for speech, blinking, gaze, eyebrows and smile, with smaller textures.
Facial targets also affect the relevant eyes, brows, teeth and tongue meshes.
The three authored clips are Idle, PresentLeft and PresentRight. The site uses
its own procedural arm IK and speech event adapter rather than playing those clips.

## Source and rights

- MPFB 2.0.18: https://github.com/makehumancommunity/mpfb2/tree/v2.0.18
- System assets: https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
- Facial targets: https://files.makehumancommunity.org/functional/faceunits01.zip
- Visemes: https://files.makehumancommunity.org/functional/visemes02.zip
- The underlying model, clothes, hair, rig, skin and targets are CC0. Upstream
  license texts and exact source hashes are in `../../../tools/architect-model/`.
  MPFB program code is GPLv3; that is distinct from the CC0 export policy.
- A project-generated head-only texture adds skin detail and light stubble.
  It was generated with imagegen from the supplied reference and a head-only UV
  panel, then mapped and inspected on the actual mesh. It is not a third-party
  scan or a claim of identity reconstruction. The generated PNG SHA-256 is
  `ec098fce35597a6828848a4ad7cc9f22c1e82a8e52f1eaae4a1b8bb01fadfbba`.
  This project-generated texture is recorded separately from the CC0 foundation.
- No Adobe/Mixamo service, paid avatar service, external TTS API or billing was used.
  The compatible bone naming comes from MakeHuman's own rig.

## Build and validation

Portable Blender 4.5.9 LTS, MPFB 2.0.18, glTF Transform 4.5.1 and meshoptimizer 1.2.0.
The pinned MIT meshopt decoder is vendored locally; its license is next to it.
Meshopt + WebP compression retains mesh/bone/morph structure. Desktop textures
are capped at 2048 px; mobile at 512 px. No remote decoder/CDN is required.

Authoring and read-back scripts: `../../../tools/architect-model/`.
The raw source's read-back verified nonzero jaw, blink, smile and viseme
deformation and both presentation clips. The compressed assets loaded with
body/face controls in desktop and mobile Chrome. The glTF validator reports no
errors; it warns about nested skinned nodes and does not validate the meshopt
extension itself. Browser decoding and rendering were tested separately.

## Performance and visual limits

Speech is opt-in browser synthesis. Word-boundary events drive approximate
mouth poses; these events do not provide phonemes or sample-accurate lip sync.
Movements are authored/procedural, not recorded human motion. The face and hair
still differ from the reference. The old stock assets remain for cached legacy
pages, but the new scene loads these human assets.
