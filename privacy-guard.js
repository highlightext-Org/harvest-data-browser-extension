(() => {
  if (window.__highlightextPrivacyGuard) return;

  const watched = new Set(['click', 'mousedown', 'mouseup', 'mousemove', 'pointerdown', 'pointerup', 'pointermove', 'keydown', 'keyup', 'keypress', 'beforeinput', 'input', 'change', 'paste']);
  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;
  const records = new Map();
  const blockedSignatures = new Set();
  const pageToken = crypto.randomUUID();
  let nextId = 1;

  function captureOf(options) {
    return typeof options === 'boolean' ? options : !!options?.capture;
  }

  function sourceOf(listener) {
    try {
      const fn = typeof listener === 'function' ? listener : listener?.handleEvent;
      return typeof fn === 'function' ? Function.prototype.toString.call(fn) : '';
    } catch { return ''; }
  }

  function signature(type, source) {
    let hash = 2166136261;
    const value = `${type}\0${source}`;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return `${type}:${(hash >>> 0).toString(16)}`;
  }

  function targetKind(target) {
    if (target === window) return 'window';
    if (target === document) return 'document';
    if (target instanceof Element) {
      const tag = target.tagName.toLowerCase();
      return `${tag}${target.id ? '#'+target.id.slice(0, 40) : ''}`;
    }
    return 'other';
  }

  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (!watched.has(type) || !listener) return originalAdd.call(this, type, listener, options);
    const capture = captureOf(options);
    for (const record of records.values()) {
      if (record.target === this && record.type === type && record.listener === listener && record.capture === capture) {
        return;
      }
    }
    const source = sourceOf(listener);
    const record = {id: nextId++, target: this, type, listener, options, capture, source, signature: signature(type, source), blocked: false};
    records.set(record.id, record);
    if (blockedSignatures.has(`${type}\0${source}`)) record.blocked = true;
    else originalAdd.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function(type, listener, options) {
    if (watched.has(type)) {
      const capture = captureOf(options);
      for (const [id, record] of records) {
        if (record.target === this && record.type === type && record.listener === listener && record.capture === capture) records.delete(id);
      }
    }
    return originalRemove.call(this, type, listener, options);
  };

  Object.defineProperty(window, '__highlightextPrivacyGuard', {
    configurable: false,
    value: Object.freeze({
      snapshot(afterId = 0, limit = 300) {
        return {pageToken, listeners: [...records.values()].filter(record => record.id > afterId).slice(0, limit).map(record => ({
          id: record.id, type: record.type, target: targetKind(record.target),
          signature: record.signature, source: record.source.slice(0, 800), blocked: record.blocked
        }))};
      },
      block(ids, expectedToken) {
        if (expectedToken !== pageToken) return {error: 'Page changed during review. Run the review again.'};
        const applied = [];
        for (const id of ids) {
          const record = records.get(id);
          if (!record || record.blocked) continue;
          blockedSignatures.add(`${record.type}\0${record.source}`);
          originalRemove.call(record.target, record.type, record.listener, record.capture);
          record.blocked = true;
          applied.push(id);
        }
        return applied;
      },
      restore() {
        blockedSignatures.clear();
        for (const record of records.values()) {
          if (!record.blocked) continue;
          originalAdd.call(record.target, record.type, record.listener, record.options);
          record.blocked = false;
        }
      }
    })
  });
})();
