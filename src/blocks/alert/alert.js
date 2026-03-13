/**
 * Top-bar alert close behavior with localStorage persistence (30 days)
 *
 * Fix: Treat ANY content change as a new "version", even if it later returns
 * to an old text. (A -> B -> A will show again.)
 *
 * Storage model:
 * - topAlert:lastHash      : last seen hash of signature (text+href)
 * - topAlert:closedAt      : timestamp when user closed the CURRENT version
 */

(function initTopAlert() {
  const alertEl = document.querySelector('.alert.alert--top');
  if (!alertEl) return;

  const closeBtn = alertEl.querySelector('.alert__close');
  if (!closeBtn) return;

  const linkEl = alertEl.querySelector('.alert__text');

  const TTL_DAYS = 30;
  const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

  const KEY_LAST = 'topAlert:lastHash';
  const KEY_CLOSED_AT = 'topAlert:closedAt';

  function getRawText() {
    // Use link text if present, else whole alert text
    return (linkEl ? linkEl.textContent : alertEl.textContent) || '';
  }

  function getHref() {
    const href = linkEl?.getAttribute('href');
    return href == null ? '' : String(href);
  }

  function getSignature() {
    // IMPORTANT: do NOT over-normalize; any char change should matter.
    // We still normalize line breaks to avoid accidental CMS formatting noise.
    const text = String(getRawText()).replace(/\r\n/g, '\n');
    const href = getHref();
    return `${text}||${href}`;
  }

  function hashString(str) {
    // Stable non-crypto hash
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function getCurrentHash() {
    return hashString(getSignature());
  }

  function hideAlert() {
    alertEl.style.display = 'none';
  }

  function showAlert() {
    alertEl.style.display = '';
  }

  function moveFocusAfterClose() {
    const topBar = document.querySelector('.top-bar');
    if (!topBar) return;

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const candidate = topBar.querySelector('.top-bar__service ' + focusableSelector);
    if (candidate && candidate.offsetParent !== null) {
      candidate.focus();
      return;
    }
    document.body.focus?.();
  }

  function getClosedAt() {
    try {
      const raw = localStorage.getItem(KEY_CLOSED_AT);
      if (!raw) return null;
      const ts = parseInt(raw, 10);
      return Number.isFinite(ts) ? ts : null;
    } catch {
      return null;
    }
  }

  function setClosedAtNow() {
    try {
      localStorage.setItem(KEY_CLOSED_AT, String(Date.now()));
    } catch {
      // ignore
    }
  }

  function clearClosedAt() {
    try {
      localStorage.removeItem(KEY_CLOSED_AT);
    } catch {
      // ignore
    }
  }

  function getLastHash() {
    try {
      return localStorage.getItem(KEY_LAST) || '';
    } catch {
      return '';
    }
  }

  function setLastHash(v) {
    try {
      localStorage.setItem(KEY_LAST, v);
    } catch {
      // ignore
    }
  }

  // ----- Version change detection (core fix) -----
  const currentHash = getCurrentHash();
  const lastHash = getLastHash();

  if (lastHash !== currentHash) {
    // Any change (including returning to old text) re-opens the alert
    clearClosedAt();
    setLastHash(currentHash);
  }

  // ----- Apply closed TTL -----
  const closedAt = getClosedAt();
  const isClosedRecently = closedAt != null && (Date.now() - closedAt) < TTL_MS;

  if (isClosedRecently) {
    hideAlert();
  } else {
    showAlert();
  }

  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    setClosedAtNow();
    hideAlert();
    moveFocusAfterClose();
  });
})();
