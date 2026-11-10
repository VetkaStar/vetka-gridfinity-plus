# VETKA Gridfinity Plus

An improved, independent version of the Gridfinity Extended drawer generator, with a bilingual RU/EN interface, custom cabinet sizes and printable panel assemblies.

[Project site](https://vetkastar.github.io/vetka-gridfinity-plus/) · [Open generator](https://vetkastar.github.io/vetka-gridfinity-plus/generator/) · [Русское описание](README.ru.md) · [Licenses and credits](THIRD_PARTY_NOTICES.md)

## Features

- Gridfinity grid units or custom outer cabinet dimensions in millimetres.
- Individual drawer heights, perforation per surface, frames and diagonal bracing.
- Glued tongue-and-slot panels, plywood inserts and SVG/CSV cutting outlines.
- Multi-cabinet layouts in both dimension systems, with adjustable cabinets per row.
- Matching feet and sockets, removable guides and butterfly connector keys.
- Complete assembly view with distinct part colours, hiding and exploded views.
- Separate print/export controls, individual STL files and project-wide ZIP export.
- Small fit-test coupons, including the bottom-to-wall tongue and closed window.
- Browser presets, JSON import/export and compatibility with earlier profiles.

This fork is not an official Gridfinity or OpenSCAD release. It extends [Gridfinity Extended](https://github.com/ostat/gridfinity_extended_openscad) and [web-openscad-editor](https://github.com/yawkat/web-openscad-editor); original authors and notices are preserved.

## Run locally

Requires Python 3.12+ and a current Chromium-based browser. On Windows, double-click `Запустить.cmd`, or run:

```sh
python bootstrap_runtime.py
python build_ru.py
python launch.py
```

Open http://127.0.0.1:8342/. Geometry is computed in your browser. No Python packages are needed to run or build the app. First launch downloads the checksum-pinned official OpenSCAD runtime; internet is also needed for Bootstrap, model-viewer and Three.js CDN dependencies. This is not an offline application.

Settings are stored in the URL and browser storage. Export presets to JSON before clearing browser data. Depth excludes protruding handles. Panel assemblies are glued permanently; grid-unit panel assembly is planned and remains disabled. A small fit test is recommended before printing full panels; physical fit depends on the printer and material.

## Development and tests

The editable model is in `model-source/`; deployed upstream model/library sources are in `deployed-source/`. `ui/` contains the application and translation dictionary. `original-page.html`, `original-static/` and `snapshot.json` preserve the pinned upstream editor inputs. `build_ru.py` generates `site/`; its historical filename now builds both languages.

```sh
python -m pip install -r requirements-dev.txt
python bootstrap_runtime.py
python build_ru.py
# Start a server in another terminal:
python -m http.server 8342 --bind 127.0.0.1 --directory site
# Tests use installed Microsoft Edge through Playwright:
python -m unittest -q test_localization
python test_assembly_math.py
python test_settings_geometry.py
python test_settings_ui.py
python test_settings_project.py
python -m unittest -q test_source_package
```

`tests/fixtures/panels/` contains the reference panel meshes for regression checks. Generated test evidence goes to ignored `reports/`. The supported suite checks geometry, real downloads, multi-cabinet layouts, legacy profiles, languages and mobile layout. Historical local scripts and backups are not part of the publication source set.

## Publication

The compiler's source archives, submodules, library sources, build patches and original notices are included in [third_party/openscad/](third_party/openscad/README.md). The exact official binary remains checksum-pinned in `runtime-lock.json`. The package records how dependency revisions and installed source headers were recovered; no bit-for-bit rebuild claim is made.

Build a local hosting directory, including the compiler and both source downloads:

```sh
python prepare_openscad_sources.py --verify
python build_release.py --output dist/publication
```

Packaging requires Git and the reviewed source index. The output contains a bilingual license/source page, the current application assets, compiler sources, generator sources and SHA-256 checksums. It excludes debug pages and old workers. See [RELEASE.md](RELEASE.md). These commands do not deploy, commit or push anything.

## License

The combined derivative and project additions are distributed under GNU GPL v3; see [LICENSE](LICENSE). Separately licensed upstream components retain their original licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No warranty is provided.
