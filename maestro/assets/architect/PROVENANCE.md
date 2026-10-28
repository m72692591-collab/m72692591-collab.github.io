# Architect portrait artwork

The owner supplied the triptych “Триптих интерфейсов «Маэстро Business».png” and explicitly selected its center Architect panel for this website.

- Source SHA-256: `952BA078A675CEA37FA2253875934155D6E6AEA7E9722692EA431222A2C6134B`.
- `architect-office.webp`: generated with the built-in Image Gen editing tool on 2026-10-28 using that source. The requested edit retained the central man's appearance, blue translucent suit and glass office while removing baked-in interface elements and expanding the background. WebP quality 90, 1536 × 1024, 208,818 bytes.
- Output SHA-256: `CA62EABCDEB1AB1F3A8BF48356D49574560283A1C0241D893FE364BE78B107B6`.
- This file is a flat portrait backdrop, explicitly described in the interface as “Портрет и объёмная карусель”. It is not a GLB and is not presented as a rotatable human. The separate “3D-модель” control reveals the licensed GLB documented in `../models/LICENSE.txt`.
- No stock-asset purchase or paid API was used. This generated derivative is not described as a pixel-identical copy of the reference.

- `architect-mark.webp`: Image Gen derivative of the gold twin-peak emblem in the supplied reference, resized for the live header. 128 × 128 RGBA, lossless WebP, 4,118 bytes; SHA-256 `34CA6312F01B58AC9894A3928210190A69F3E79E79E72133203A68C08FF64E28`. Approximation of the supplied mark, not a claimed exact vector extraction.

- `architect-orb.webp`: Image Gen derivative of the blue luminous orb in the supplied reference, resized for the consultant control. 128 × 128 RGBA, 7,712 bytes; SHA-256 `9EB1A68748D3E3BCAB76B640D8776735EA383B837AD3F9844738038D0837BD32`. This is a decorative button image, not a 3D object.

## Owner-selected animated portrait revision, 2026-10-28

The owner explicitly paused further human GLB work and asked to animate the
approved portrait instead. The default Live view now uses an alpha image on a
subdivided WebGL plane with localized head/arm/face deformation. This is 2.5D
raster animation, not a volumetric person, motion capture or phoneme-accurate lip sync.
The original portrait above remains the static fallback. The optional GLB is
labelled `3D-эскиз` and is loaded only when requested.

- `architect-office-empty.webp`: built-in imagegen background-extraction edit of
  the approved office portrait, removing the person. 1536 × 1024, 141,262 bytes.
  SHA-256 `773ED5769BE7A7AF610CE48BE34B610D5411A2BFD824EB34489C7BA94936BD7E`.
  Visual inspection found no remaining person, text or baked interface.
- `architect-portrait-cutout.webp`: built-in imagegen background-extraction edit
  of that same approved portrait. Prompt: remove only the office; preserve the
  clothed man, identity, pose, hand, circuitry and alignment on a 1536 × 1024
  transparent canvas. Output checked as RGBA with genuine alpha. PNG-to-WebP
  conversion only, quality 93; no code-generated replacement person.
  SHA-256 `0F79B8A74F65CE79B10C2C2ED05799E19B8D38CBC4F8031568E5E762E7B3F87F`.
  The image-generation edit is visually close, not certified pixel-identical.
- `architect-mark.webp` above was superseded by the owner's brighter primary
  logo. Current hash: `C3F7D832B12B0D92207F5DA9463CB5085CA3ABDB128587B5174ABFAFA7FEF2E1`.
  See `../../brand/BRAND_CANON.md` for master files and approved cross-platform use.
