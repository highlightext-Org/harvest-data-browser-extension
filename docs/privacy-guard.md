# Privacy guard and data handling

The privacy guard is optional. URL collection works without an OpenAI API key. Its purpose is to review event listener registrations on ordinary HTTP and HTTPS pages and block handlers that are clearly used to track mouse coordinates or typed input.

## What runs on pages

`privacy-guard.js` loads at document start in the page's main JavaScript world. It wraps `addEventListener` and records registrations for selected mouse, pointer, keyboard, and input event types. It records event type, a coarse target description, and the handler's source. It does **not** collect the event stream, actual clicks, mouse movements, or typed text. `privacy-monitor.js` runs separately and checks for new listeners when automatic review is enabled.

The guard only sees registrations made after it loads in the top frame. It cannot reliably inspect inline handlers, earlier registrations, other frames, or browser-level recording. A page can interfere with code running in its own world. Blocking a listener can break site behavior; **Restore listeners** or a page reload reverses the page-level block.

## Review flow

1. The user saves an OpenAI API key in extension local storage. Firefox users grant the optional `websiteContent` permission before review.
2. A manual review snapshots up to 300 registrations and selects up to 40 for the API request. Automatic review checks up to 40 new registrations every 10 seconds when enabled.
3. `background.js` sends listener descriptions and at most 800 characters of each handler's source to the OpenAI Responses API.
4. The response must use the expected JSON schema. The extension accepts only listener IDs present in the request and `keep` or `block` actions. It does not execute returned code.
5. Clearly identified tracking listeners are removed. Matching future registrations are blocked until restore or page reload.

Every manual or automatic review with new listeners can make an API request and incur charges. **Keep privacy guard on** starts disabled and persists across browser restarts when enabled. **Restore listeners** also turns off automatic review.

## Storage and network access

- `chrome.storage.local` holds the collected URL list, search queries and auto-run state, the API key, and privacy settings/status. Browser extension storage is not encrypted.
- Google searches use the active Google tab or open `https://www.google.com/`. URL collection is limited to the four Google domains listed in [installation](installation.md#requirements).
- Privacy review calls `https://api.openai.com/v1/responses` from the extension background script. The API key is sent to that endpoint in the authorization header and is not sent to the visited page.
- Exported CSV and JSON files are created locally in the panel. Import reads a file the user selects and merges its URLs into extension storage.

Avoid importing sensitive URLs or using the guard on sensitive pages unless you are comfortable with the above storage and API behavior. Remove a saved API key with **Remove key** when it is no longer needed.
