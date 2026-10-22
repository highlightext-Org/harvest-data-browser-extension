(() => {
  const isResultsPage = () => /\/search$/.test(location.pathname);
  if (window.__highlightextResearchCollector) {
    if (isResultsPage()) window.__highlightextResearchCollector.collect();
    return;
  }

  let pageUrl = location.href;
  const seen = new Set();
  let running = false;
  let stopped = false;
  let searching = false;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const pause = (min, max) => delay(min + Math.floor(Math.random() * (max - min + 1)));
  const refreshPageState = () => {
    if (location.href === pageUrl) return false;
    pageUrl = location.href;
    seen.clear();
    return true;
  };

  async function collect() {
    refreshPageState();
    if (!isResultsPage()) return;
    const query = new URLSearchParams(location.search).get('q') || '';
    const urls = [];
    for (const h of document.querySelectorAll('div.MjjYud h3, div.g h3, #search h3')) {
      const a = h.closest('a[href]');
      if (!a) continue;
      let target = a.href;
      try {
        const u = new URL(target, location.href);
        if (u.pathname === '/url' && u.searchParams.get('q')) target = u.searchParams.get('q');
        const dest = new URL(target);
        if (!['https:', 'http:'].includes(dest.protocol)) continue;
        if (/(^|\.)google\.[a-z.]+$/i.test(dest.hostname)) continue;
        dest.hash = '';
        target = dest.toString();
        if (seen.has(target)) continue;
        seen.add(target);
        urls.push({url: target, query});
      } catch {}
    }
    if (urls.length) await chrome.runtime.sendMessage({type: 'COLLECT', urls}).catch(() => {});
  }

  function nextLink() {
    if (!isResultsPage()) return null;
    const candidates = document.querySelectorAll('a#pnnext, a[rel="next"], a[aria-label="Next"], a[aria-label="Next page"], #foot a[href]');
    for (const a of candidates) {
      if (!a.matches('a#pnnext, a[rel="next"], a[aria-label="Next"], a[aria-label="Next page"]') && !/^next(?: page)?$/i.test(a.textContent.trim())) continue;
      if (!a.href || a.getAttribute('aria-disabled') === 'true') continue;
      const url = new URL(a.href, location.href);
      if (url.origin === location.origin && url.pathname === '/search' && url.href !== location.href) return a;
    }
    return null;
  }

  function searchField() {
    return [...document.querySelectorAll('textarea[name="q"], input[name="q"]')]
      .find(field => field.getClientRects().length && !field.disabled);
  }

  function setFieldValue(field, value, character) {
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value);
    field.dispatchEvent(new InputEvent('input', {bubbles: true, data: character, inputType: 'insertText'}));
  }

  async function submitSearch(text, field, form, index) {
    try {
      field.focus();
      setFieldValue(field, '', null);
      await pause(350, 700);
      let value = '';
      for (const character of text) {
        if (!document.contains(field)) {
          field = searchField();
          if (!field) throw new Error('Google removed the search box.');
          form = field.closest('form');
          field.focus();
        }
        value += character;
        setFieldValue(field, value, character);
        await pause(70, 160);
      }
      field.dispatchEvent(new Event('change', {bubbles: true}));
      await pause(900, 1600);
      const button = [...form.querySelectorAll('button[type="submit"], button[aria-label="Search"], button[aria-label="Google Search"], input[type="submit"][name="btnK"]')]
        .find(element => element.getClientRects().length && !element.disabled);
      if (button) button.click();
      else form.requestSubmit();
    } catch (error) {
      chrome.runtime.sendMessage({type: 'SEARCH_FAILED', index, error: error.message}).catch(() => {});
    } finally {
      searching = false;
    }
  }

  function startSearch(text, index) {
    if (searching) return {error: 'A search is already being entered.'};
    if (typeof text !== 'string' || !text.trim()) return {error: 'Enter a search query first.'};
    const field = searchField();
    const form = field?.closest('form');
    if (!field || !form) return {error: 'Google search box was not found on this page.'};
    searching = true;
    submitSearch(text, field, form, index);
    return {started: true};
  }

  async function autoCollect() {
    if (!isResultsPage() || running) return;
    running = true;
    stopped = false;
    const runPage = location.href;
    try {
      let stableBottom = 0;
      for (let step = 0; step < 100 && !stopped; step++) {
        if (location.href !== runPage) return;
        await collect();
        const {active} = await chrome.runtime.sendMessage({type: 'GET_AUTO_STATE'});
        if (!active) return;
        const before = window.scrollY;
        window.scrollBy({top: Math.max(350, Math.floor(window.innerHeight * 0.55)), behavior: 'smooth'});
        await pause(1400, 2400);
        if (location.href !== runPage) return;
        const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
        stableBottom = atBottom && window.scrollY === before ? stableBottom + 1 : 0;
        if (stableBottom >= 2) break;
      }
      if (stopped || location.href !== runPage) return;
      await collect();
      const {active} = await chrome.runtime.sendMessage({type: 'GET_AUTO_STATE'});
      if (!active || stopped) return;
      if (stableBottom < 2) {
        await chrome.runtime.sendMessage({type: 'AUTO_FINISHED', reason: 'scroll_limit'});
        return;
      }
      const next = nextLink();
      if (!next) {
        await chrome.runtime.sendMessage({type: 'AUTO_FINISHED', reason: 'end_of_results'});
        return;
      }
      await pause(2500, 4500);
      if (location.href !== runPage) return;
      const state = await chrome.runtime.sendMessage({type: 'GET_AUTO_STATE'});
      if (state.active && !stopped) {
        next.click();
        await pause(12000, 16000);
        if (location.href === runPage && !stopped) {
          await chrome.runtime.sendMessage({type: 'AUTO_FINISHED', reason: 'navigation_failed', error: 'Google’s Next link did not open another results page.'});
        }
      }
    } catch (error) {
      await chrome.runtime.sendMessage({type: 'AUTO_FINISHED', reason: 'error', error: error.message}).catch(() => {});
    } finally {
      running = false;
      if (location.href !== runPage && isResultsPage()) {
        pause(1000, 1500).then(() => chrome.runtime.sendMessage({type: 'GET_AUTO_STATE'}))
          .then(({active}) => {if (active) autoCollect();}).catch(() => {});
      }
    }
  }

  window.__highlightextResearchCollector = {collect, autoCollect};
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'START_AUTO') autoCollect();
    if (message.type === 'STOP_AUTO') stopped = true;
    if (message.type === 'SEARCH_QUERY') sendResponse(startSearch(message.query, message.index));
    if (message.type === 'NEXT_PAGE') {
      const next = nextLink();
      if (!next) sendResponse({error: 'No Next link on this results page.'});
      else {
        (async () => {await pause(1500, 2500); next.click();})();
        sendResponse({started: true});
      }
    }
  });
  collect();
  if (isResultsPage()) chrome.runtime.sendMessage({type: 'GET_AUTO_STATE'}).then(({active}) => {if (active) autoCollect();}).catch(() => {});
  setInterval(async () => {
    if (!refreshPageState()) return;
    await pause(1000, 1500);
    await collect();
    if (isResultsPage() && !running) chrome.runtime.sendMessage({type: 'GET_AUTO_STATE'})
      .then(({active}) => {if (active) autoCollect();}).catch(() => {});
  }, 750);
})();
