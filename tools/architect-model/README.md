# Architect model builder — local prototype

This folder builds real 3D geometry, skinning, facial targets and animation.
It does **not** reconstruct the exact illustrated man from the triptych.
The face is a manually chosen MPFB phenotype; likeness remains incomplete.

## Reproduce

Use the project-local portable Blender executable, not a system install:

```powershell
& .\runtime\blender-4.5.9-windows-x64\blender.exe --background --factory-startup --disable-autoexec --python-exit-code 1 --python .\inspect_uv.py
& .\runtime\blender-4.5.9-windows-x64\blender.exe --background --factory-startup --disable-autoexec --python-exit-code 1 --python .\build_architect.py
& .\runtime\blender-4.5.9-windows-x64\blender.exe --background --factory-startup --disable-autoexec --python-exit-code 1 --python .\validate_model.py
```

Run from this folder. Each tested step completed in under one minute on this
computer. Rendering uses CPU, no cloud account or paid runtime. `-- --no-render`
skips the preview; `-- --smoke` only builds the body and skeleton.

The add-on is imported from the pinned source and registered only in the
background process. Add-on data/configuration is redirected to `isolated-user`.
The initial smoke test created MPFB logging files in Blender's user directory;
subsequent runs explicitly redirect that logging to this project. No system
add-on install or saved Blender preference change is required.

## Output and verification

- `output/architect-mpfb.glb`: eight anatomical/clothing meshes plus an open-neck
  shirt and a skinned light-grid mesh (the mesh count is recorded in the receipt).
- `output/architect-mpfb.blend`: editable authoring scene with render setup.
- `output/architect-preview.png`: actual CPU render, not the original portrait.
- `output/model-receipt.json`: GLB hash, exact shape-key names, source assets,
  skeleton count and exported animation names.
- `output/readback-validation.json`: a fresh GLB re-import verifies 52 joints,
  67 body morph targets, nonzero jaw/blink/smile/viseme deformation and movement
  in both presentation clips. It does not establish realistic motion or likeness.

The model uses Mixamo-compatible bone names from MakeHuman's own CC0 rig; no
Adobe upload or Mixamo service was used. Body clips: `Idle`, `PresentLeft`,
`PresentRight`. Facial targets: 52 ARKit-style names and 15 Meta-style visemes.
The nominal zero displacement `viseme_sil` is retained intentionally.

Facial weights must be applied to **all** meshes that carry the corresponding
morph name, not only to the body: eyebrows, eyes, teeth and tongue received
interpolated targets. There is no audio alignment or speech engine in this
artifact. Speaking requires the site's audio and phoneme/viseme scheduling.

`ArchitectOpenNeckShirt` should stay opaque/dark. `ArchitectSkin` stays opaque.
`ArchitectHolographicSuit` is partially transparent. `ArchitectLightGrid` is
actual skinned 3D geometry, with a modest emissive blue material. Avoid replacing
every material with the same hologram material: eye, hair and brow alpha maps
must be preserved, and the face should remain readable.

## Official source and licenses

- MPFB 2.0.18 source: https://github.com/makehumancommunity/mpfb2/tree/v2.0.18
- Pinned archive: https://codeload.github.com/makehumancommunity/mpfb2/zip/refs/tags/v2.0.18
- System assets: https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
- Face units: https://files.makehumancommunity.org/functional/faceunits01.zip
- Visemes: https://files.makehumancommunity.org/functional/visemes02.zip
- Upstream license statement: https://github.com/makehumancommunity/mpfb2/blob/v2.0.18/LICENSE.md

The program code is GPLv3. Bundled geometry, targets, rigs, textures, clothing
and generated exports use the separate CC0 asset policy. Each selected MHCLO
contains the explicit CC0 notice. The system pack manifest lists these assets
as CC0. Both functional-pack manifests list their targets as CC0, authored by
Mika Suominen. Copies of the applicable upstream license texts are retained in
`output/licenses`; provenance and archive hashes are in `output/provenance.json`.

## Remaining visual work

The supplied reference has a particular face, asymmetric swept wavy hair,
subtle stubble and natural expressive movement. This parameterized prototype
does not yet match those features exactly. Its authored gestures are short
skeletal clips, not motion capture. Test the final optimized GLB in the site
before accepting its appearance, animation or mobile budget.

## Textured variant used in the draft website

After building the base, open its saved authoring scene and apply the included
head-only candidate under the recorded UV mask:

```powershell
& .\runtime\blender-4.5.9-windows-x64\blender.exe --background .\output\architect-mpfb.blend --disable-autoexec --python-exit-code 1 --python .\apply_head_candidate.py
```

The base remains untouched. The masked candidate is retained in `texture-art/`;
its provenance describes generation, and `textured-model-receipt.json` records
that intermediate result. Codex inspected both the mapped full figure and a
close face render and accepted the added detail for the prototype. This does
not accept exact identity, hairstyle or natural performance.

The site assets were optimized with glTF Transform 4.5.1, Meshopt compression,
WebP, no flatten/join/simplification, maximum textures 2048 px desktop / 512 px mobile.
Mobile retains the 15 visemes plus jawOpen, eyeBlinkLeft/Right, four eyeLookIn/Out
shapes, browInnerUp and mouthSmileLeft/Right. Other mobile face targets are removed;
all 52 body/finger joints remain. Final hashes are in
`maestro/assets/models/ARCHITECT-HUMAN.md` at the repository root.
