# OpenSCAD 2026.01.19 source distribution

This directory accompanies the unmodified official WebAssembly runtime identified by `../../runtime-lock.json`. It contains local archives, not links to moving upstream branches. Nothing is uploaded by these tools.

## Contents and provenance

- OpenSCAD commit `6df8653d514cd099503ed53bc603dc1ba13eb2ab`, confirmed by the running binary's `--info` output.
- Its exact Git submodules and the nested library submodules, including Clipper2, Manifold, mimalloc, MCAD, lib3mf dependencies, GVDB and FreeType's dlg.
- The libraries used by the official build environment, their build patches, and PCRE2's pinned Meson source/build files.
- Emscripten/emsdk 4.0.10, including the C/C++ runtime sources and the toolchain's test submodules. The SDK downloads general-purpose compiler tools; these are not an OpenSCAD source modification.
- Original licenses in the archives, with readable copies in `licenses/`. See `NOTICES.md`.

`source-lock.json` records every archive's SHA-256, size, upstream revision and restoration destination. `provenance/` retains the binary's version report, the official build-image manifest/configuration and the measured header comparisons.

The official CI configuration selects `openscad/wasm-base-release`. Its retained image digest is `sha256:f73d33d5f2fd4c7ae4d3aaacb1e2e2deb193b878b38bb80c8235c933ac340c66`, created on 2025-06-14. The dependency branch revisions were recovered against that date and checked against installed headers and reported library versions. These recovered dependency revisions are not claimed to come from a nonexistent upstream dependency lockfile. Eigen's 598 headers and Boost's 15,881 headers match byte-for-byte. Generated configuration headers are recorded separately.

CGAL's official release archive expands `$Id$`/`$URL$` comments and omits some installed test headers. Its code headers match after those expansions are normalized. The additional `cgal-git-header-overlay.tar.gz` restores all 3,603 original source headers from the pinned official image, including `version.h` and retained license notices. This is source code, not precompiled libraries. Apply it after the release source archive, as the preparation script does.

No bit-for-bit recompilation claim is made. The source archives, their closure and build patches are verified locally; compiling the C++ application again requires a Linux Docker build environment.

## Verify or restore locally

From the project root, with Python 3.12+:

```sh
python prepare_openscad_sources.py --verify
python prepare_openscad_sources.py --unpack work-openscad
```

The output directory must be empty. The script verifies all archives, restores submodules and overlays, and applies the original fontconfig/lib3mf/Boost WebAssembly patches. It never modifies the running application's compiler. Missing upstream archives can be downloaded again with `--download`; the committed CGAL source-header overlay must be retained with this package.

## Rebuild the application with the official environment

On Linux with Docker, from the unpacked `openscad` directory:

```sh
docker run --rm --platform linux/amd64 \
  -v "$PWD:/src" -w /src \
  openscad/wasm-base-release@sha256:f73d33d5f2fd4c7ae4d3aaacb1e2e2deb193b878b38bb80c8235c933ac340c66 \
  sh -c 'emcmake cmake -G Ninja -B build-web . \
    -DCMAKE_BUILD_TYPE=Release -DWASM_BUILD_TYPE=web \
    -DOPENSCAD_COMMIT=6df8653d -DOPENSCAD_VERSION=2026.01.19 \
    -DSNAPSHOT=ON -DEXPERIMENTAL=ON && cmake --build build-web'
```

The original build settings are also preserved in OpenSCAD's `.circleci/config.yml` and `wasm-build/Dockerfile.base`. To rebuild the library environment from the restored sources, run from `work-openscad/wasm-build`:

```sh
DOCKER_BUILDKIT=1 docker build --platform linux/amd64 \
  -f Dockerfile.base -t gridfinity-openscad-wasm-base:2026.01.19 \
  --build-arg EMSCRIPTEN_SDK_TAG=emscripten/emsdk:4.0.10 \
  --build-arg CMAKE_BUILD_TYPE=Release \
  --build-arg MESON_BUILD_TYPE=release \
  --build-arg "EMSCRIPTEN_FLAGS=-fexceptions -O3" libs
```

Then use that local image name in place of the official image in the application build command above. The cross-file, patched library inputs and local GLib subprojects are already restored. Docker may download normal distribution/build tools. Rebuilding the entire SDK itself is outside this application build.

On Windows without permission to create symbolic links, the unpacker materializes ordinary linked files and records two SDK-only test directory links in `windows-test-symlinks.json`. It does not recursively copy directory links. Linux restores the original links directly. These fixtures are not used to compile OpenSCAD; the unmodified archives always retain them.

## Publish together

Run `python build_release.py --output dist/publication` from a Git checkout of the generator. The generated site contains the exact compiler, this complete source package, the generator's source package and a bilingual license/source landing page. Keep these files together when copying the site to a host. The build does not deploy or push anything.
