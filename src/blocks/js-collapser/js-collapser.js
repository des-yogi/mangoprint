(() => {
  const SELECTOR_ROOT = '.js-collapser';
  const SELECTOR_FOOTER = '.js-collapser-footer';
  const SELECTOR_TOGGLE = '.js-collapser-toggle';
  const SELECTOR_TOGGLE_TEXT = '.js-collapser-toggle-text';

  const DEFAULT_HEIGHT = 500;
  const DEFAULT_SPEED_HEIGHT = 280; // ms
  const DEFAULT_SPEED_OPACITY = 220; // ms
  const DEFAULT_HEIGHT_THRESHOLD = 8; // px

  const CLASS_ANIMATING = 'is-animating';
  const CLASS_COLLAPSED = 'is-collapsed';

  const TOGGLER_CLASS_COLLAPSED = 'is-collapsed';
  const TOGGLER_CLASS_EXPANDED = 'is-expanded';

  // ---------- utils ----------
  function toPxInt(value, fallback) {
    const n = parseInt(String(value || ''), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function toBool(value, fallback = false) {
    if (value === undefined) return fallback;
    const v = String(value).trim().toLowerCase();
    if (v === '1' || v === 'true' || v === 'yes' || v === 'y') return true;
    if (v === '0' || v === 'false' || v === 'no' || v === 'n') return false;
    return fallback;
  }

  function rafThrottle(fn) {
    let rafId = 0;
    return (...args) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        fn(...args);
      });
    };
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // ---------- config ----------
  function getLimitHeight(root) {
    return toPxInt(root.dataset.height, DEFAULT_HEIGHT);
  }
  function getSpeedHeight(root) {
    return toPxInt(root.dataset.speedAnimation, DEFAULT_SPEED_HEIGHT);
  }
  function getSpeedOpacity(root) {
    return toPxInt(root.dataset.speedOpacity, DEFAULT_SPEED_OPACITY);
  }
  function getHeightThreshold(root) {
    return toPxInt(root.dataset.heightThreshold, DEFAULT_HEIGHT_THRESHOLD);
  }

  // Rows-based mode (catalog cards, etc.)
  // data-lines="2" + data-line-item=".product-card"
  function getLines(root) {
    return toPxInt(root.dataset.lines, 0); // 0 => disabled
  }
  function getLineItemSelector(root) {
    return String(root.dataset.lineItem || '').trim();
  }
  function getLineExtra(root) {
    return toPxInt(root.dataset.lineExtra, 0);
  }

  /**
   * Returns:
   * - number > 0 : computed max-height for N rows, in px
   * - 0 : "collapse not needed" (not enough rows)
   * - null : rows-mode not enabled / cannot compute -> fallback to data-height
   */
  function computeLimitByRows(root) {
    const lines = getLines(root);
    const itemSel = getLineItemSelector(root);
    if (!lines || lines < 1 || !itemSel) return null;

    const items = Array.from(root.querySelectorAll(itemSel));
    if (items.length === 0) return null;

    // stabilize order
    items.sort((a, b) => (a.offsetTop - b.offsetTop) || (a.offsetLeft - b.offsetLeft));

    // collect distinct row tops (offsetTop is equal for items in same row)
    const rowTops = [];
    for (const el of items) {
      const t = el.offsetTop;
      if (rowTops.length === 0 || rowTops[rowTops.length - 1] !== t) rowTops.push(t);
    }

    // If number of rows <= requested lines => no need to collapse
    if (rowTops.length <= lines) return 0;

    const top0 = rowTops[0];
    const topN = rowTops[lines]; // start of (lines + 1)-th row
    const extra = getLineExtra(root);

    return Math.max(0, (topN - top0) + extra);
  }

  function getEffectiveLimitHeight(root) {
    const byRows = computeLimitByRows(root);
    if (byRows === null) return getLimitHeight(root); // default height mode
    return byRows; // may be 0 (no collapse needed) or >0 (computed)
  }

  // Controls scope
  function getControlsScope(root) {
    const raw = String(root.dataset.collapserScope || '').trim();
    if (!raw) return root;

    if (raw === 'parent') return root.parentElement || root;

    if (raw.startsWith('closest:')) {
      const sel = raw.slice('closest:'.length).trim();
      return root.closest(sel) || root;
    }

    if (raw.startsWith('selector:')) {
      const sel = raw.slice('selector:'.length).trim();
      return document.querySelector(sel) || root;
    }

    return root.closest(raw) || root;
  }

  function queryFooter(root) {
    const scope = getControlsScope(root);
    return root.querySelector(SELECTOR_FOOTER) || scope.querySelector(SELECTOR_FOOTER);
  }

  function queryToggle(root) {
    const scope = getControlsScope(root);
    return root.querySelector(SELECTOR_TOGGLE) || scope.querySelector(SELECTOR_TOGGLE);
  }

  function queryToggleText(root) {
    const scope = getControlsScope(root);
    return root.querySelector(SELECTOR_TOGGLE_TEXT) || scope.querySelector(SELECTOR_TOGGLE_TEXT);
  }

  function setFooterVisible(root, visible) {
    const footer = queryFooter(root);
    if (!footer) return;
    footer.hidden = !visible;
  }

  function getButtonTexts(root) {
    const textEl = queryToggleText(root);
    const fallbackShow = 'Показати все';
    const fallbackHide = 'Згорнути';

    if (!textEl) return { show: fallbackShow, hide: fallbackHide, textEl: null };

    const showRaw =
      (textEl.dataset.showText || textEl.getAttribute('data-show-text') || '').trim();
    const hideRaw =
      (textEl.dataset.hideText || textEl.getAttribute('data-hide-text') || '').trim();

    return {
      show: showRaw || fallbackShow,
      hide: hideRaw || fallbackHide,
      textEl,
    };
  }

  function setButtonText(root, expanded) {
    const btn = queryToggle(root);
    if (!btn) return;

    const { show, hide, textEl } = getButtonTexts(root);
    const next = expanded ? hide : show;

    if (textEl) textEl.textContent = next;
    else btn.textContent = next;
  }

  function setTogglerState(root, expanded) {
    const btn = queryToggle(root);
    if (!btn) return;

    btn.classList.toggle(TOGGLER_CLASS_EXPANDED, expanded);
    btn.classList.toggle(TOGGLER_CLASS_COLLAPSED, !expanded);
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function setAnimating(root, on) {
    if (on) root.classList.add(CLASS_ANIMATING);
    else root.classList.remove(CLASS_ANIMATING);
  }

  function applyTransitionSpeeds(root) {
    const h = getSpeedHeight(root);
    const o = getSpeedOpacity(root);
    root.style.transition = `max-height ${h}ms ease, opacity ${o}ms ease`;
  }

  // ---------- smooth scroll ----------
  function isScrollEnabled(root) {
    return toBool(root.dataset.scroll, true);
  }
  function getScrollMode(root) {
    const mode = String(root.dataset.scrollMode || 'start').trim().toLowerCase();
    return mode === 'footer' ? 'footer' : 'start';
  }
  function getScrollOffset(root) {
    return toPxInt(root.dataset.scrollOffset, 0);
  }
  function getScrollTarget(root) {
    const mode = getScrollMode(root);
    if (mode === 'footer') return queryFooter(root) || root;
    return root;
  }
  function smoothScrollTo(root) {
    if (!isScrollEnabled(root)) return;
    if (prefersReducedMotion()) return;

    const target = getScrollTarget(root);
    if (!target) return;

    const offset = getScrollOffset(root);
    const rect = target.getBoundingClientRect();
    const top = window.pageYOffset + rect.top - offset;

    window.scrollTo({ top, behavior: 'smooth' });
  }

  // ---------- guard against auto-refresh interfering with user animation ----------
  function setUserAnimating(root, on) {
    root._collapserUserAnimating = !!on;
  }
  function isUserAnimating(root) {
    return !!root._collapserUserAnimating;
  }

  function cleanupTransitionEnd(root) {
    if (typeof root._collapserCleanupTransitionEnd === 'function') {
      root._collapserCleanupTransitionEnd();
    }
    root._collapserCleanupTransitionEnd = null;
  }

  function animateTo(root, toMaxHeightPx, { onEnd } = {}) {
    applyTransitionSpeeds(root);
    setAnimating(root, true);

    root.offsetHeight; // force reflow
    root.style.maxHeight = `${toMaxHeightPx}px`;

    const handler = (e) => {
      if (e.target !== root) return;
      if (e.propertyName !== 'max-height') return;

      root.removeEventListener('transitionend', handler);
      root._collapserCleanupTransitionEnd = null;

      if (typeof onEnd === 'function') onEnd();
    };

    root.addEventListener('transitionend', handler);
    root._collapserCleanupTransitionEnd = () => root.removeEventListener('transitionend', handler);
  }

  function applyState(root, { collapsed, animate }) {
    cleanupTransitionEnd(root);

    const limit = getEffectiveLimitHeight(root);
    applyTransitionSpeeds(root);

    // If limit is 0 in rows-mode => nothing to collapse, force expanded (but do not overwrite state)
    if (limit === 0) {
      setFooterVisible(root, false);
      forceExpandedNoClamp(root, { preserveState: true });
      return;
    }

    if (!animate) {
      setAnimating(root, false);

      if (collapsed) {
        root.classList.add(CLASS_COLLAPSED);
        root.style.maxHeight = `${limit}px`;
        setButtonText(root, false);
        setTogglerState(root, false);
      } else {
        root.classList.remove(CLASS_COLLAPSED);
        root.style.maxHeight = 'none';
        setButtonText(root, true);
        setTogglerState(root, true);
      }
      return;
    }

    setUserAnimating(root, true);

    if (collapsed) {
      if (root.style.maxHeight === '' || root.style.maxHeight === 'none') {
        root.style.maxHeight = `${root.scrollHeight}px`;
        root.offsetHeight;
      }

      root.classList.add(CLASS_COLLAPSED);
      setButtonText(root, false);
      setTogglerState(root, false);

      animateTo(root, limit, {
        onEnd: () => {
          setUserAnimating(root, false);
          setAnimating(root, false);
          smoothScrollTo(root);
        },
      });
    } else {
      root.classList.remove(CLASS_COLLAPSED);

      if (root.style.maxHeight === '' || root.style.maxHeight === 'none') {
        root.style.maxHeight = `${limit}px`;
        root.offsetHeight;
      }

      const full = root.scrollHeight;
      if (full <= 0) {
        root.style.maxHeight = 'none';
        setButtonText(root, true);
        setTogglerState(root, true);
        setUserAnimating(root, false);
        setAnimating(root, false);
        return;
      }

      setButtonText(root, true);
      setTogglerState(root, true);

      animateTo(root, full, {
        onEnd: () => {
          root.style.maxHeight = 'none';
          setUserAnimating(root, false);
          setAnimating(root, false);
          smoothScrollTo(root);
        },
      });
    }
  }

  // Hard reset when there's nothing to collapse
  function forceExpandedNoClamp(root, { preserveState = false } = {}) {
    setAnimating(root, false);
    root.classList.remove(CLASS_COLLAPSED);
    root.style.maxHeight = 'none';

    // IMPORTANT: do not overwrite user state on auto refreshes (tabs/resizes)
    if (!preserveState) root.dataset.state = 'expanded';

    setButtonText(root, true);
    setTogglerState(root, true);
  }

  // Robust "needsCollapse": measure natural scrollHeight with max-height temporarily removed
  function computeNeedsCollapse(root, limit, threshold) {
    const prevTransition = root.style.transition;
    const prevMaxHeight = root.style.maxHeight;
    const prevAnimating = root.classList.contains(CLASS_ANIMATING);

    root.style.transition = 'none';
    root.classList.remove(CLASS_ANIMATING);

    root.style.maxHeight = 'none';
    root.offsetHeight; // reflow

    const full = root.scrollHeight;

    root.style.maxHeight = prevMaxHeight;
    root.style.transition = prevTransition;
    if (prevAnimating) root.classList.add(CLASS_ANIMATING);

    return full > (limit + threshold);
  }

  function refresh(root, { keepUserState = true } = {}) {
    if (isUserAnimating(root)) return;

    const footer = queryFooter(root);
    const toggle = queryToggle(root);
    if (!footer || !toggle) return;

    applyTransitionSpeeds(root);

    const limit = getEffectiveLimitHeight(root);

    // rows-mode says "no collapse needed"
    if (limit === 0) {
      setFooterVisible(root, false);
      forceExpandedNoClamp(root, { preserveState: true });
      return;
    }

    const threshold = getHeightThreshold(root);
    const needsCollapse = computeNeedsCollapse(root, limit, threshold);

    if (!needsCollapse) {
      setFooterVisible(root, false);
      // Do not overwrite state during auto refreshes (tabs etc.)
      forceExpandedNoClamp(root, { preserveState: true });
      return;
    }

    setFooterVisible(root, true);

    const hasExplicitInitial = root.dataset.collapsed === '1' || root.dataset.collapsed === '0';
    const hasUserState = root.dataset.state === 'collapsed' || root.dataset.state === 'expanded';

    let collapsed;
    if (hasExplicitInitial) {
      collapsed = root.dataset.collapsed === '1';
      root.dataset.state = collapsed ? 'collapsed' : 'expanded';
    } else if (keepUserState && hasUserState) {
      collapsed = root.dataset.state === 'collapsed';
    } else {
      collapsed = true;
      root.dataset.state = 'collapsed';
    }

    applyState(root, { collapsed, animate: false });
  }

  // ---------- auto refresh ----------
  function setupAutoRefresh(root) {
    if (root.dataset.collapserAutoRefresh === '1') return;
    root.dataset.collapserAutoRefresh = '1';

    const safeRefresh = rafThrottle(() => refresh(root, { keepUserState: true }));

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => safeRefresh());
      ro.observe(root);
      root._collapserResizeObserver = ro;
    }

    const imgs = root.querySelectorAll('img');
    imgs.forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', safeRefresh, { once: true });
      img.addEventListener('error', safeRefresh, { once: true });
    });

    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      document.fonts.ready.then(() => safeRefresh()).catch(() => {});
    }
  }

  // ---------- bind/init ----------
  function bind(root) {
    if (root.dataset.collapserBound === '1') return;

    const toggle = queryToggle(root);
    const footer = queryFooter(root);
    if (!toggle || !footer) return;

    root.dataset.collapserBound = '1';

    toggle.addEventListener('click', () => {
      const isCollapsed = root.classList.contains(CLASS_COLLAPSED);
      const nextCollapsed = !isCollapsed;

      // click is explicit user intent -> update persisted state
      root.dataset.state = nextCollapsed ? 'collapsed' : 'expanded';

      // collapse/expand with animation. Here preserveState is irrelevant.
      applyState(root, { collapsed: nextCollapsed, animate: true });
    });

    setupAutoRefresh(root);
  }

  function initOne(root) {
    bind(root);
    refresh(root, { keepUserState: true });
  }

  function initAll(scope = document) {
    scope.querySelectorAll(SELECTOR_ROOT).forEach((root) => initOne(root));
  }

  function setupBootstrapTabsHook() {
    document.addEventListener('shown.bs.tab', (event) => {
      const targetSelector = event.target?.getAttribute('data-bs-target');
      if (!targetSelector) return;

      const pane = document.querySelector(targetSelector);
      if (!pane) return;

      initAll(pane);
    });
  }

  function setupResizeHook() {
    const onResize = rafThrottle(() => initAll());
    window.addEventListener('resize', onResize);
  }

  window.addEventListener('DOMContentLoaded', () => {
    initAll();
    setupBootstrapTabsHook();
    setupResizeHook();
  });

  window.Collapser = {
    refreshAll: () => initAll(),
    refreshWithin: (el) => el && initAll(el),
    refreshOne: (el) => el && initOne(el),
  };
})();
