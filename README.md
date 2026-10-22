# Highlightext Research Collector

A [Highlightext](https://highlightext.com/) browser extension for collecting Google research result URLs. It runs in Chrome, Brave, Firefox, and Safari. Search from the extension panel, collect organic results, deduplicate URLs in local browser storage, and import or export CSV, JSON, or TXT data. An optional privacy guard can review page event listeners with an OpenAI API key.

Ready-to-load browser archives are in [`dist/`](dist/): separate Chrome and Brave ZIPs, a Firefox XPI for temporary development installs, and an unsigned Safari app ZIP. All are built from the same extension source in this repository. See [installation and browser setup](docs/installation.md) for how to use each format.

## Get started

There is no package install or JavaScript build step. Clone the repository and load its root folder as an unpacked extension:

```sh
git clone https://github.com/highlightext-Org/harvest-data-browser-extension.git
cd harvest-data-browser-extension
```

- **Chrome:** Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this folder.
- **Brave:** Open `brave://extensions` and follow the same steps.
- **Firefox:** Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json` in this folder.
- **Safari:** Open **Safari > Settings > Developer > Add Temporary Extension…** and select this folder, or build the macOS app in `safari/Highlightext/Highlightext.xcodeproj`.

See [installation and browser setup](docs/installation.md) for permissions, reload steps, and Safari signing.

## Use the collector

1. Click the toolbar icon. Chrome and Brave open a side panel, Firefox opens a sidebar, and Safari opens a popup.
2. Replace the example queries with your own Google searches, one per line, and click **Start search**. If the active tab is not Google, the extension opens Google.
3. Use **Collect this page** on a supported Google results page, or enable **Auto-run all queries and results pages** to continue through result pages and queries. **Stop auto** ends the run.
4. Export CSV or JSON, or import CSV, JSON, or TXT. Stored URLs are deduplicated after URL normalization.

Google collection currently supports `www.google.com`, `www.google.co.uk`, `www.google.ca`, and `www.google.com.au`. It collects organic results with recognizable heading markup. Google may change that markup, limit pagination, or show CAPTCHA; the extension does not bypass restrictions.

## Privacy guard

The privacy guard records registrations for mouse, pointer, keyboard, and input listeners on HTTP and HTTPS pages. It does not record actual movements, clicks, or typed text. You can manually review listeners, block clearly identified tracking handlers, restore them, or enable recurring review every 10 seconds.

Review requires an OpenAI API key entered in the panel. The key is stored in this browser profile's extension storage, which is not encrypted. Listener metadata and up to 800 characters of each handler's source are sent to the OpenAI Responses API; requests may incur charges. Firefox also requires the optional website content permission. See [privacy guard details](docs/privacy-guard.md) before using it on sensitive pages.

## Develop

Start with the [developer onboarding guide](docs/development.md). It maps the source files, explains the reload workflow and local build checks, and includes a short smoke test. The Safari Xcode project shares the root extension files.

Run `python3 scripts/package.py` to rebuild the Chrome, Brave, and Firefox archives. Pass `--safari-app /path/to/Highlightext.app` to include a built Safari app ZIP. See [packaging](docs/development.md#packaging-browser-builds) for the full workflow.

## Documentation

- [Installation and browser setup](docs/installation.md)
- [Developer onboarding](docs/development.md)
- [Privacy guard and data handling](docs/privacy-guard.md)
