# Release preparation

## Source repository

The publication set is the source repository, not the entire working folder. Exclude `.tools`, virtual environments, backups, generated reports, prototypes, nested repository metadata, editor instruction files, local settings and generated site outputs. The compiler runtime is a separately downloaded dependency and is not committed. No remotes, commits, tags, pushes or deployments are created by the build scripts.

Before making a commit, set the intended author's name and email locally. Do not use a guessed identity. Review `git diff --cached --stat` and `git diff --cached --check`; run the supported tests in README. Push only after the owner's explicit approval.

## Public web hosting

1. Run bootstrap and build from a clean source checkout.
2. Run the supported regression suite, including actual STL/ZIP downloads and both languages.
3. Verify the local OpenSCAD source package with `python prepare_openscad_sources.py --verify`. Run `python build_release.py --output dist/publication` to produce the hosting artifact with both source ZIPs and the license/source landing page. The output directory must be empty.
4. Publish the complete contents of the generated hosting directory, including `source/`, `LICENSES/`, `runtime-licenses/`, `licenses.html` and checksums. The compiler and generator source archives are provided together; keep both.
5. The packager selects the current worker/CAS inputs and excludes test harnesses, debug pages and old workers. Verify resource/source links and external CDN dependencies under the final hosting URL and subpath.
6. Confirm static server WebAssembly MIME support. Profile storage belongs to the browser origin; export local presets before changing origin or clearing storage.
7. Obtain the owner's approval before deployment or push.

Local application tests do not establish physical print fit. A small calibration coupon should be used before full panels.

The compiler source package includes reconstruction evidence and an untested Linux/Docker recompilation recipe. A bit-identical recompilation is not claimed; the served compiler itself is unchanged and its hash is checked.
