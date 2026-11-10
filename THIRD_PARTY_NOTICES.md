# Third-party notices and source provenance

Project modifications: 2026-11-03–2026-11-04. Original authorship and licenses are retained; the new interface, dimensions, layout, connectors and panel-joint changes are additions to the upstream work, not a claim to authorship of its original designs.

| Component | Authors / source | License / local notice |
|---|---|---|
| Gridfinity Extended model and libraries | ostat and credited contributors; original drawer design credits include @monniasza. https://github.com/ostat/gridfinity_extended_openscad, reference checkout `94d5a3e2d39e0b90894c042a255fc487cfcc9197` | GPL v3, `LICENSE`; per-file library notices also apply |
| Web OpenSCAD Editor | Jonas Konrad, https://github.com/yawkat/web-openscad-editor, reference checkout `323ca329f12ea210428ed6407f57f870fba548b7` | `LICENSES/Web-OpenSCAD-Editor-MIT.txt` |
| dotSCAD functions, including Voronoi helpers | Justin Lin, https://github.com/JustinSDK/dotSCAD | LGPL v3; `LICENSES/LGPL-3.0.txt` and root GPL v3; source headers preserved |
| round-anything / polyround | IrevDev, TLC123, https://github.com/Irev-Dev/Round-Anything | `LICENSES/Round-Anything-MIT.txt` |
| Kumiko Patterns | froqstar, https://github.com/froqstar/kumikoPatterns | GPL v3, root `LICENSE`; source credit preserved |
| UB.scad helpers | Ulrich Baer, https://github.com/UBaer21/UB.scad | CC0, `LICENSES/UB-scad.txt`; source authorship retained |
| Liberation fonts | Google Corporation; Red Hat, Inc. | SIL OFL 1.1, `LICENSES/Liberation-fonts.txt`; embedded font notices also retained |
| DejaVu fonts | Bitstream, Inc.; Tavmjong Bah; DejaVu contributors | `LICENSES/DejaVu-fonts.txt`; includes Bitstream Vera and Arev terms |
| Three.js and OrbitControls 0.160.0 (external CDN) | three.js contributors, https://github.com/mrdoob/three.js | `LICENSES/Three-MIT.txt` |
| Bootstrap 5.3.8 (external CDN) | Bootstrap authors, https://github.com/twbs/bootstrap | `LICENSES/Bootstrap-MIT.txt` |
| model-viewer 4.0.0 (external CDN) | Google LLC, https://github.com/google/model-viewer | `LICENSES/model-viewer-Apache-2.0.txt` |
| OpenSCAD runtime (downloaded separately, not committed) | OpenSCAD contributors, https://github.com/openscad/openscad | GPL v2 or later with the notices/exceptions in `LICENSES/OpenSCAD-COPYING.txt`; linked dependencies retain their terms |

The deployed model inputs are reproduced in `deployed-source/` and their exact content hashes are listed in `snapshot.json`. The reference repository checkouts can differ from the deployed snapshot; the latter is the actual basis of the runnable model. Changes live in `model-source/`. Content-addressed blobs in `site/cas/` are data, fonts and readable model/library inputs, not an alternative source license.

## Compiler provenance and hosting boundary

The downloaded compiler is the official **OpenSCAD 2026.01.19 WebAssembly web** snapshot from https://files.openscad.org/snapshots/OpenSCAD-2026.01.19-WebAssembly-web.zip. Both files were compared byte-for-byte by SHA-256 against the existing runtime. Exact archive and file checksums are in `runtime-lock.json`. The download is unmodified.

The compiler binary is outside the Git source set and is obtained by checksum from its official download. Its corresponding source package is included locally under `third_party/openscad/`, including the application commit, submodules, library sources, original build patches, Emscripten runtime sources, readable notices and provenance evidence. The package explains recovered dependency revisions and the CGAL source-header overlay. A bit-for-bit rebuild has not been performed.

`build_release.py` produces a hosting directory containing the pinned binary and source downloads on the same host, exposed through a bilingual license/source page. Preserve those downloads when publishing. Source-distribution guidance: https://www.gnu.org/licenses/gpl-faq.en.html.
