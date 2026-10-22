# Highlightext Research Collector

A [Highlightext](https://highlightext.com/) browser extension for Chrome, Brave, Firefox, and Safari. Run editable Google searches, collect organic result URLs into local browser storage, and keep a deduplicated research list. The extension also includes the source project's optional privacy guard.

## Install

1. Clone or download this repository.
2. In Chrome, open `chrome://extensions`; in Brave, open `brave://extensions`. Enable **Developer mode**, choose **Load unpacked**, and select this repository folder.
3. In Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json`. Temporary add-ons must be reloaded after Firefox restarts. Permanent installation requires signing.
4. In Safari 26.5 or newer on macOS, open **Safari > Settings > Developer > Add Temporary Extension…** and select this repository folder. In **Safari > Settings > Extensions**, enable it and allow website access. Safari removes temporary extensions after 24 hours or when you quit Safari.
5. Pin the extension to your browser toolbar.

In Firefox, the collector opens in the browser sidebar when you click its toolbar icon. It also opens on a fresh install. In Chrome and Brave, the toolbar icon opens the side panel. Safari uses a toolbar popup.

### Safari app

The macOS wrapper is in `safari/Highlightext/Highlightext.xcodeproj`. It references the extension files in this repository, so edits to the shared JavaScript and manifest are included in its next build. Open the project in Xcode, choose **Sign to Run Locally** for both targets, then build and run the app. Enable the extension and Google site access in Safari Settings. App Store distribution requires your own signing identity.

## Collect research URLs

1. Enter one Google query per line. The starting queries are examples; replace them with your research terms.
2. Click **Start search**. The extension uses the search box in the active Google tab. If the active tab is elsewhere, it opens Google once. Result URLs are collected when the results page loads.
3. Check **Auto-run all queries and results pages** to scroll through each results page, follow Google's Next link, and enter the next query in the same tab. You can also click **Auto-run from this page** on an open results tab. Click **Stop auto** to stop.
4. Click **Download CSV** or **Download JSON** to export. Import CSV, JSON, or TXT files to merge with stored results. Duplicates are ignored after URL normalization.
5. On any supported Google results page, click **Collect this page** to collect its visible organic result links.

## Privacy guard

1. Open an HTTP or HTTPS page and reload it after installing or updating the extension. The guard records registrations for mouse, pointer, keyboard, and input event listeners. It does not record actual movements, clicks, or text. Search result collection remains limited to supported Google pages.
2. In the panel, paste an OpenAI API key and click **Save key**. The key stays in this browser profile's extension storage until you click **Remove key**. Extension storage is not encrypted.
3. On Firefox, click **Grant Firefox permission** and allow website content access. Click **Review and block tracking**. The extension sends up to 40 listener descriptions and up to 800 characters of each handler's source to the OpenAI Responses API per request. It accepts only known listener IDs and `keep` or `block` decisions; it never evaluates returned code.
4. Clearly identified tracking listeners are removed. Future registrations with the same event type and handler source are blocked for the life of the page. Click **Restore listeners** to undo those blocks on that page and turn off the continuous guard.
5. Enable **Keep privacy guard on** to review new listeners every 10 seconds while pages are open. It sends an API request only when new listeners need review. The setting persists across browser restarts and starts disabled.

The privacy guard is best effort. It sees listeners added through `addEventListener` after it loads in the top frame. It cannot reliably inspect inline handlers, listeners installed before it, other frames, or browser-level recording. Removing a listener can affect page behavior. Each review may incur OpenAI API charges. The extension does not send the API key to the page.

## Notes

- Google HTML can change, so result extraction may need selector updates. The collector captures organic links with recognizable H3 headings, not every link.
- Google may limit results or show CAPTCHA. The extension does not bypass restrictions. Auto mode stops when it cannot finish a results page or search.
- Firefox 142 or newer and Safari 26.5 or newer are supported by the source project. Grant Google site access if prompted.
- Local storage is not encrypted; avoid importing sensitive data.
