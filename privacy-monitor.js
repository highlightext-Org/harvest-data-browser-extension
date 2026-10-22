(() => {
  if (window.__highlightextPrivacyMonitor) return;
  window.__highlightextPrivacyMonitor = true;

  let lastReviewedId = 0;
  let pageToken = '';
  let busy = false;

  async function checkForNewListeners() {
    if (busy) return;
    busy = true;
    try {
      const {autoPrivacyEnabled, openaiApiKey} = await chrome.storage.local.get(['autoPrivacyEnabled', 'openaiApiKey']);
      if (!autoPrivacyEnabled || !openaiApiKey) {
        lastReviewedId = 0;
        return;
      }
      const result = await chrome.runtime.sendMessage({type: 'PRIVACY_AUTO_TICK', lastReviewedId});
      if (result?.error) throw new Error(result.error);
      if (result?.disabled) return;
      if (pageToken && result.pageToken !== pageToken) lastReviewedId = 0;
      else if (Number.isInteger(result.lastReviewedId)) lastReviewedId = result.lastReviewedId;
      pageToken = result.pageToken || '';
    } catch (error) {
      await chrome.storage.local.set({privacyStatus: `Privacy review stopped: ${error.message}`}).catch(() => {});
    } finally {
      busy = false;
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.autoPrivacyEnabled) {
      lastReviewedId = 0;
      if (changes.autoPrivacyEnabled.newValue) checkForNewListeners();
    }
  });
  setTimeout(checkForNewListeners, 2000);
  setInterval(checkForNewListeners, 10000);
})();
