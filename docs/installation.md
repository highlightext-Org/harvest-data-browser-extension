# Installation and browser setup

The repository root is the extension package. It contains `manifest.json`, the JavaScript source, `popup.html`, `style.css`, and icons. Chrome, Brave, Firefox, and temporary Safari installs use these files directly. No `npm install` or bundling step is required.

Prebuilt archives are also available in `dist/`. The Chrome and Brave ZIPs can be extracted and loaded as unpacked extensions. The Firefox XPI is unsigned and intended for **Load Temporary Add-on** during development. The Safari ZIP contains an unsigned macOS app build for inspection; use a locally signed Xcode build to run its app extension.

## Requirements

- Chrome or Brave with Manifest V3 extension support; Firefox 142 or newer; or Safari 26.5 or newer on macOS.
- Access to the supported Google result domains for collection: `www.google.com`, `www.google.co.uk`, `www.google.ca`, and `www.google.com.au`.
- Xcode only if building the Safari macOS wrapper.
- An OpenAI API key only if using the optional privacy guard review.

## Chrome and Brave

1. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose the repository root, the folder containing `manifest.json`. You can also extract the matching Chrome or Brave ZIP from `dist/` and choose the extracted folder.
4. Pin **Highlightext Research Collector** to the toolbar and click its icon. The panel should open.
5. If prompted, allow access to the Google search pages you plan to collect. The privacy guard's page listener monitoring needs access to the sites where you use it.

For local edits to `manifest.json`, `background.js`, or content scripts, click **Reload** on the extension card and refresh the affected tab. Panel HTML and CSS changes may appear when the panel is reopened; reload the extension if they do not.

Chrome's [unpacked extension guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) and [reload guidance](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#reload) describe the same development flow. Brave supports Chromium extensions; see [Brave's extension help](https://support.brave.com/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave).

## Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select this repository's `manifest.json` or the unsigned Firefox XPI in `dist/`.
3. Click the toolbar icon to open the sidebar. If prompted, allow Google site access.
4. To use privacy review, click **Grant Firefox permission** in the sidebar and approve website content access.

Use **Reload** on the add-on's debugging card after source changes, then refresh any open pages whose content scripts changed. A temporary add-on is removed when Firefox restarts; repeat the installation. Permanent distribution requires Mozilla signing. See Mozilla's [temporary installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

## Safari: temporary extension

1. In Safari, open **Safari > Settings > Advanced** and enable web developer features if the **Developer** tab is hidden.
2. In **Safari > Settings > Developer**, allow unsigned extensions if requested, then click **Add Temporary Extension…**.
3. Select the repository root and enable the extension in **Safari > Settings > Extensions**.
4. Allow Google website access before collecting results. Safari uses the toolbar popup.

Use Safari's extension settings to reload after changes. Safari removes a temporary extension after 24 hours or when Safari quits. Apple's [running a Safari web extension](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension) guide covers temporary installation and developer settings.

## Safari: Xcode app

Open `safari/Highlightext/Highlightext.xcodeproj` in Xcode. Select the **Highlightext** scheme, configure **Sign to Run Locally** for the app and extension targets, then build and run the app. Enable the extension and site access in Safari Settings. The Xcode project references the root extension files, so source edits are included in the next app build.

To compile the wrapper from a terminal without signing:

```sh
xcodebuild -project safari/Highlightext/Highlightext.xcodeproj \
  -scheme Highlightext \
  -configuration Debug \
  -destination 'generic/platform=macOS' \
  -derivedDataPath /tmp/highlightext-derived-data \
  CODE_SIGNING_ALLOWED=NO build
```

This checks the build; the resulting unsigned app is for local build validation. Use Xcode signing to run and enable the app extension in Safari. Distribution requires your own signing identity and store setup.

## First run

1. Click the toolbar icon and replace the three example queries with one topic you want to research.
2. Click **Start search** and wait for the Google result page to load. The panel should show a count of collected URLs.
3. Try **Download CSV** and inspect the `url`, `query`, and `firstSeen` columns. Import that file to confirm duplicates are ignored.
4. Use **Clear saved URLs** only when you want to remove the stored collection from this browser profile.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Extension will not load | Select the repository root containing `manifest.json`; reload after manifest edits. |
| No links collected | Use a supported Google domain, grant site access, and check for an ordinary results page with organic links. |
| Auto mode stops | Google may change pagination, limit searches, or show CAPTCHA. The panel status gives the stop reason. |
| Privacy review cannot start | Save an API key, reload the page after installation, and grant Firefox's website content permission when applicable. |
| Safari extension does not appear | Enable it in Safari Settings and check signing for the Xcode app or unsigned extension settings for a temporary install. |
