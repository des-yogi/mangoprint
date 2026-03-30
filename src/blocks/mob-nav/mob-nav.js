/*(function() {
  // Добавление/удаление модификаторов при клике на переключение видимости
  var toggler = document.getElementById('mob-nav-toggler');
  if (toggler) {
    toggler.addEventListener('click', mobNavVisibleToggle);

    function mobNavVisibleToggle(e) {
      e.preventDefault();
      toggler.classList.toggle('burger--close');
    }
  }
}());*/

/**
 * Mobile menu scroll area sizing for long menus inside fixed `.page-header__main`.
 *
 * Goal:
 * - Only the menu list scrolls: `ul#mobNavList`
 * - Keep 8px gap to bottom of viewport
 * - Use max-height (not height) so short menus don't get extra empty space
 * - Recalculate on:
 *    - menu open/close (Bootstrap Collapse events)
 *    - viewport resize (incl. mobile address bar) via visualViewport when available
 *    - window resize/orientation changes
 *
 * Assumptions (based on your DOM):
 * - Collapse container: `#mobNav` (class "mob-nav collapse")
 * - Scroll area: `#mobNavList` (ul)
 *
 * If your IDs differ, change selectors below.
 */

(function initMobMenuScrollSizing() {
  const collapseEl = document.getElementById('mobNav');     // <nav id="mobNav" class="mob-nav collapse">
  const listEl = document.getElementById('mobNavList');     // <ul id="mobNavList" ...>
  if (!collapseEl || !listEl) return;

  const BOTTOM_GAP_PX = 8;

  // CSS basics via JS (so you can copy-paste without hunting styles).
  // You can move these to SCSS if you prefer.
  listEl.style.overflowY = 'auto';
  listEl.style.webkitOverflowScrolling = 'touch';

  let rafId = 0;

  function getViewportHeight() {
    // visualViewport is more reliable on mobile when address bar collapses/expands
    if (window.visualViewport && typeof window.visualViewport.height === 'number') {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }

  function isCollapseShown() {
    // Bootstrap adds class "show" when expanded
    return collapseEl.classList.contains('show');
  }

  function setMaxHeightPx(px) {
    const v = Math.max(0, Math.floor(px));
    listEl.style.maxHeight = v ? `${v}px` : '';
  }

  function clearMaxHeight() {
    listEl.style.maxHeight = '';
  }

  function recalc() {
    rafId = 0;

    // If menu is closed, remove constraints (important for layout/measurement correctness)
    if (!isCollapseShown()) {
      clearMaxHeight();
      return;
    }

    const viewportH = getViewportHeight();
    const rect = listEl.getBoundingClientRect();

    // Distance from top of viewport to top of list
    const top = rect.top;

    // Available vertical space for the list
    const available = viewportH - top - BOTTOM_GAP_PX;

    // Use max-height so if content fits, it won't force empty space;
    // scrollbars appear only if content exceeds available height.
    setMaxHeightPx(available);
  }

  function scheduleRecalc() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(recalc);
  }

  // Bootstrap collapse events (if Bootstrap JS is present)
  // shown.bs.collapse - after opening animation completes (measurements stable)
  // hidden.bs.collapse - after closing animation completes
  collapseEl.addEventListener('shown.bs.collapse', scheduleRecalc);
  collapseEl.addEventListener('hidden.bs.collapse', scheduleRecalc);

  // Some browsers need recalculation during opening (optional, but helps if content shifts)
  collapseEl.addEventListener('show.bs.collapse', scheduleRecalc);

  // Recalc on viewport changes
  window.addEventListener('resize', scheduleRecalc);
  window.addEventListener('orientationchange', scheduleRecalc);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleRecalc);
    window.visualViewport.addEventListener('scroll', scheduleRecalc); // address bar show/hide can trigger this
  }

  // If accordion items expand/collapse inside the list, height needs recalculation.
  // Capture clicks inside menu and recalc next frame.
  collapseEl.addEventListener('click', scheduleRecalc);

  // Initial (in case menu is open by default)
  scheduleRecalc();
})();

/**
 * Body scroll lock for open mobile menu (Bootstrap Collapse).
 *
 * Features:
 * - Locks page scroll when #mobNav is open (class .show)
 * - Prevents layout shift on desktop by compensating scrollbar width
 * - Restores previous scroll position on unlock
 *
 * Assumptions:
 * - Collapse element: #mobNav
 * - Optional: you may also set `aria-expanded` on the toggler, but not required here.
 */

(function initBodyScrollLockForMobNav() {
  const collapseEl = document.getElementById('mobNav');
  if (!collapseEl) return;

  const LOCK_CLASS = 'is-scroll-locked';
  let savedScrollY = 0;
  let isLocked = false;

  function getScrollbarWidth() {
    // On mobile often 0; on desktop usually >0
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  }

  function lock() {
    if (isLocked) return;
    isLocked = true;

    savedScrollY = window.scrollY || window.pageYOffset || 0;

    const sbw = getScrollbarWidth();

    // Add class (optional hooks in CSS)
    document.documentElement.classList.add(LOCK_CLASS);
    document.body.classList.add(LOCK_CLASS);

    // Prevent layout shift from scrollbar disappearance
    if (sbw > 0) {
      document.body.style.paddingRight = sbw + 'px';
    }

    // Robust lock: fix body in place (best for iOS as well)
    document.body.style.position = 'fixed';
    document.body.style.top = (-savedScrollY) + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function unlock() {
    if (!isLocked) return;
    isLocked = false;

    document.documentElement.classList.remove(LOCK_CLASS);
    document.body.classList.remove(LOCK_CLASS);

    // Restore styles
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';

    // Restore scroll position
    window.scrollTo(0, savedScrollY);
  }

  // Bootstrap collapse events
  collapseEl.addEventListener('shown.bs.collapse', lock);
  collapseEl.addEventListener('hidden.bs.collapse', unlock);

  // Safety: if state changes without events (rare), sync on load
  if (collapseEl.classList.contains('show')) lock();
})();

/**
 * Dismiss mobile menu (#mobNav, Bootstrap Collapse) by:
 * 1) click/tap outside
 * 2) Escape key
 *
 * Plus: sync toggler icon state (burger <-> close) using `.burger--close`
 * based on REAL state of *#mobNav only* (ignores nested collapse events).
 */

(function initMobNavDismiss() {
  const collapseEl = document.getElementById('mobNav');
  if (!collapseEl) return;

  const TOGGLER_ACTIVE_CLASS = 'burger--close';

  function isShown() {
    return collapseEl.classList.contains('show');
  }

  function findToggler() {
    // Prefer strict ID if present
    return (
      document.getElementById('mob-nav-toggler') ||
      document.querySelector('[data-bs-target="#mobNav"]')
    );
  }

  function setTogglerState(open) {
    const toggler = findToggler();
    if (!toggler) return;

    if (open) toggler.classList.add(TOGGLER_ACTIVE_CLASS);
    else toggler.classList.remove(TOGGLER_ACTIVE_CLASS);
  }

  function getBsInstance() {
    const bs = window.bootstrap;
    if (!bs || !bs.Collapse) return null;
    return bs.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
  }

  function hideMenu() {
    const inst = getBsInstance();
    if (!inst) return;
    inst.hide();
  }

  function focusFirstInMenu() {
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const el = collapseEl.querySelector(focusableSelector);
    if (el) el.focus();
  }

  let lastToggler = null;

  collapseEl.addEventListener('shown.bs.collapse', (e) => {
    // IMPORTANT: ignore nested collapse events
    if (e.target !== collapseEl) return;

    lastToggler = findToggler();
    setTogglerState(true);
    focusFirstInMenu();

    document.addEventListener('pointerdown', onPointerDownCapture, true);
    document.addEventListener('keydown', onKeyDown);
  });

  collapseEl.addEventListener('hidden.bs.collapse', (e) => {
    if (e.target !== collapseEl) return;

    document.removeEventListener('pointerdown', onPointerDownCapture, true);
    document.removeEventListener('keydown', onKeyDown);

    setTogglerState(false);

    if (lastToggler && document.contains(lastToggler)) {
      lastToggler.focus();
    }
    lastToggler = null;
  });

  // Optional: instant icon switch during animation start (also must ignore nested)
  collapseEl.addEventListener('show.bs.collapse', (e) => {
    if (e.target !== collapseEl) return;
    setTogglerState(true);
  });
  collapseEl.addEventListener('hide.bs.collapse', (e) => {
    if (e.target !== collapseEl) return;
    setTogglerState(false);
  });

  function onPointerDownCapture(e) {
    if (!isShown()) return;

    const target = e.target;

    if (collapseEl.contains(target)) return;

    const toggler = findToggler();
    if (toggler && toggler.contains(target)) return;

    hideMenu();
  }

  function onKeyDown(e) {
    if (!isShown()) return;

    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      hideMenu();
    }
  }

  // Sync initial state on load
  setTogglerState(isShown());
})();
