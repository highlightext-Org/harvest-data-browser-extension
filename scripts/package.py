#!/usr/bin/env python3
"""Package the shared browser extension files for local distribution."""

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = (
    "manifest.json",
    "background.js",
    "content.js",
    "privacy-guard.js",
    "privacy-monitor.js",
    "popup.html",
    "popup.js",
    "style.css",
    "icons/icon-48.png",
    "icons/icon-128.png",
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--safari-app",
        type=Path,
        help="Optional built Highlightext.app directory to package as an unsigned Safari ZIP",
    )
    args = parser.parse_args()
    version = json.loads((ROOT / "manifest.json").read_text())["version"]
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)

    for name, suffix in (("chrome", ".zip"), ("brave", ".zip"), ("firefox", ".xpi")):
        archive = dist / f"highlightext-research-collector-{name}-{version}{suffix}"
        with ZipFile(archive, "w", compression=ZIP_DEFLATED) as bundle:
            for relative in PAYLOAD:
                source = ROOT / relative
                if not source.is_file():
                    raise SystemExit(f"Missing extension file: {relative}")
                bundle.write(source, relative)
        print(archive.relative_to(ROOT))

    if args.safari_app:
        app = args.safari_app.resolve()
        if not app.is_dir() or app.name != "Highlightext.app":
            raise SystemExit("--safari-app must point to a built Highlightext.app directory")
        embedded_manifest = (
            app / "Contents/PlugIns/Highlightext Extension.appex/Contents/Resources/manifest.json"
        )
        if not embedded_manifest.is_file():
            raise SystemExit("Safari app is missing the embedded extension manifest")
        if json.loads(embedded_manifest.read_text()) != json.loads((ROOT / "manifest.json").read_text()):
            raise SystemExit("Safari app is stale; rebuild it before packaging")
        if not shutil.which("ditto"):
            raise SystemExit("ditto is required to package the Safari app")
        archive = dist / f"highlightext-research-collector-safari-{version}-unsigned.zip"
        subprocess.run(
            ["ditto", "-c", "-k", "--sequesterRsrc", "--keepParent", str(app), str(archive)],
            check=True,
        )
        print(archive.relative_to(ROOT))


if __name__ == "__main__":
    main()
