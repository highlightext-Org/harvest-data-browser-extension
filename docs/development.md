# Developer onboarding

## 1. Get a working checkout

Clone the repository, then load its root folder in Chrome or Brave using [installation and browser setup](installation.md). There are no JavaScript dependencies, generated assets, environment files, or package manager scripts. A text editor and a browser are enough for extension work; use Xcode for the Safari wrapper. Do not put an OpenAI API key in source files or commits.

Clone the repository with HTTPS:

```sh
git clone https://github.com/highlightext-Org/harvest-data-browser-extension.git
cd harvest-data-browser-extension
```

## 2. Know the files

| Path | Responsibility |
| --- | --- |
| `manifest.json` | Manifest V3 identity, permissions, browser panels, background entry point, and content script matches. |
| `popup.html`, `style.css`, `popup.js` | Panel UI, query controls, import/export, privacy controls, and status display. |
| `background.js` | Tab orchestration, query progression, URL storage and deduplication, and OpenAI privacy review. |
| `content.js` | Google search form interaction, organic result extraction, scrolling, and pagination. Runs only on supported Google domains. |
| `privacy-guard.js` | Main-world listener registration tracking, blocking, and restore logic on HTTP/HTTPS pages. |
| `privacy-monitor.js` | Automatic privacy review polling when the user enables it. |
| `icons/` | Extension icons. |
| `safari/Highlightext/` | Xcode app and Safari extension wrapper referencing the root extension files. |

The panel sends messages to `background.js`; the background script controls tabs and communicates with `content.js`. Collected records are stored in `chrome.storage.local` as `urls`, each with `url`, `query`, and `firstSeen`. Query and auto-run state also live in extension storage. Export uses those stored records; import merges normalized HTTP/HTTPS URLs and removes fragments before deduplication.

The privacy guard runs at document start in the page's main world. The monitor and background script coordinate reviews. Read [privacy guard and data handling](privacy-guard.md) before changing that flow.

## 3. Edit and reload

1. Change the source file in the repository root.
2. For `manifest.json`, `background.js`, `content.js`, `privacy-guard.js`, or `privacy-monitor.js`, reload the extension in the browser's extension management page, then refresh the page under test. This is needed for document-start scripts to run again.
3. Reopen the panel after editing `popup.html`, `popup.js`, or `style.css`. If the browser still shows old content, reload the extension.
4. For Safari's Xcode app, rebuild and run the wrapper after edits. For a temporary Safari install, reload it in Safari Extensions settings.

In Chrome or Brave, inspect the side panel for UI errors and use the extension card's service worker inspection link for background errors. Inspect the Google tab for content script errors. Firefox's `about:debugging` page provides the temporary add-on's debugging controls.

## 4. Quick checks

From the repository root, validate JavaScript and the manifest:

```sh
for file in background.js content.js popup.js privacy-guard.js privacy-monitor.js; do
  node --check "$file" || exit 1
done
python3 -m json.tool manifest.json >/dev/null
```

Node and Python are used only for these local checks; they are not extension runtime dependencies. To check the Safari wrapper, use the `xcodebuild` command in [installation and browser setup](installation.md#safari-xcode-app). The app and extension previously built successfully with signing disabled.

A short manual smoke test after changing behavior:

1. Search one query and check that the URL count rises on a supported Google results page.
2. Export CSV, import it, and confirm the count does not increase from duplicates.
3. If auto-run code changed, try **Auto-run from this page** and **Stop auto**.
4. If privacy code changed, test review and restore on a disposable page with a development API key. Reload the page between runs.

There is no automated test suite in this repository. Google result markup and browser permissions are the main areas to check when behavior changes.

## 5. Packaging browser builds

The Chrome, Brave, and Firefox archives contain the same extension payload; Brave uses the Chromium build. `scripts/package.py` reads the version from `manifest.json` and writes the archives to `dist/`:

```sh
python3 scripts/package.py
```

To include the Safari app ZIP, first build the Xcode project using the command in [installation](installation.md#safari-xcode-app), then run:

```sh
python3 scripts/package.py --safari-app /tmp/highlightext-derived-data/Build/Products/Debug/Highlightext.app
```

The Firefox XPI and Safari ZIP are unsigned development artifacts. Publishing a Firefox add-on requires Mozilla signing; running the Safari app extension requires local Xcode signing.

## 6. Making a change

- Keep the browser-specific manifest fields and Safari Xcode references aligned with renamed files.
- Update the version in `manifest.json` when preparing a release, then regenerate the `dist/` archives. Do not edit generated archives by hand.
- Preserve the user's stored data keys when possible; changing keys needs a migration or an explicit reset plan.
- Keep API keys in browser storage only. Document any new network request or permission in the README and privacy guide.
- Update the relevant guide when install steps, permissions, or browser behavior change.
