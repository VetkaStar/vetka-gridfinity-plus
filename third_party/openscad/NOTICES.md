# OpenSCAD runtime notices

The WebAssembly compiler is an unmodified official OpenSCAD build. It remains separately licensed from the generator. All original per-file copyright notices are retained in the source archives. The descriptions below do not replace those notices or relicense third-party code.

| Component | Original project | License information |
|---|---|---|
| OpenSCAD | https://github.com/openscad/openscad | GPL v2 or later and the exceptions in its COPYING file |
| OpenSCAD WASM build scripts | https://github.com/openscad/openscad-wasm | GPL v2; COPYING retained |
| CGAL | https://github.com/CGAL/cgal | GPL v3 or later / LGPL v3 or later by package; per-file terms retained |
| Eigen | https://gitlab.com/libeigen/eigen | MPL 2.0 and separately identified third-party files |
| Boost | https://github.com/boostorg/boost | Boost Software License 1.0; additional notices retained |
| GMP / MPFR | https://gmplib.org / https://www.mpfr.org | LGPL v3 or later; GMP also offers GPL v2 or later |
| GLib / GVDB | https://github.com/kleisauke/glib / https://gitlab.gnome.org/GNOME/gvdb | LGPL v2.1 or later and per-file notices |
| PCRE2 / Meson build adaptation | https://github.com/PCRE2Project/pcre2 / https://github.com/mesonbuild/wrapdb | BSD-style terms in LICENCE and LICENSE.build |
| Fontconfig | https://gitlab.freedesktop.org/fontconfig/fontconfig | MIT-style license; COPYING retained |
| FreeType / dlg | https://github.com/freetype/freetype / https://github.com/nyorain/dlg | FreeType License or GPL v2; dlg's Boost license retained |
| HarfBuzz | https://github.com/harfbuzz/harfbuzz | MIT-style licenses and per-file notices |
| libffi / libxml2 | https://github.com/libffi/libffi / https://gitlab.gnome.org/GNOME/libxml2 | MIT-style licenses |
| zlib / libzip | https://github.com/madler/zlib / https://github.com/nih-at/libzip | zlib license / BSD-style license |
| double-conversion | https://github.com/google/double-conversion | BSD-style license |
| lib3mf and its submodules | https://github.com/3MFConsortium/lib3mf | BSD-style license; bundled components keep their own terms |
| Clipper2 / Manifold / mimalloc | https://github.com/AngusJohnson/Clipper2 / https://github.com/elalish/manifold / https://github.com/microsoft/mimalloc | Boost 1.0 / Apache 2.0 / MIT |
| MCAD / OpenCSG / sanitizers-cmake | Repositories recorded in source-lock.json | Original LGPL/GPL/MIT notices retained; optional checkout components are included even when not linked |
| Emscripten / emsdk and bundled C/C++ runtimes | https://github.com/emscripten-core | Emscripten's MIT/UIUC terms, LLVM runtime terms and other bundled notices retained |

liblzma and test/tool submodules are included to preserve the source checkout/build inputs. Inclusion in this package does not imply they are linked into the served binary. Their original notices also remain in the archives.

Source provenance and reconstruction details are in README.md and provenance/. The WebAssembly file and JavaScript loader checksums are in the generator's runtime-lock.json. Public distributions built by build_release.py provide the source downloads next to those binaries.
