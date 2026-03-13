/**
 * Sticky `.page-header__main` (ONE fixed element only)
 *
 * Behavior:
 * - Initial: headerMain in normal flow, visible.
 * - When scrollY >= data-scroll: headerMain becomes fixed with top = stickyTop (default 8px),
 *   left/right = sideGap (default 16px). Uses spacer to avoid content jump.
 * - While fixed: always visible (no hide on scroll direction).
 * - Disable fixed (O2): when user scrolls back above threshold AND the spacer (anchor)
 *   reaches the same top position (spacerRectTop >= stickyTop). Then we return headerMain
 *   to normal flow without flicker/jump.
 * - Animation: only slide-in from above on enabling fixed (transform). No opacity.
 * - Duration configurable via data-sticky-duration (ms).
 *
 * HTML:
 *  <div class="page-header__main"
 *       data-scroll="500"
 *       data-sticky-duration="220"
 *       data-sticky-top="8"
 *       data-sticky-side="16"></div>
 */

(function initHeaderSticky() {
  const headerMain = document.querySelector('.page-header__main');
  if (!headerMain) return;

  const threshold = parseInt(headerMain.getAttribute('data-scroll') || '0', 10) || 0;
  const duration = parseInt(headerMain.getAttribute('data-sticky-duration') || '200', 10) || 200;

  // ABSOLUTE top from viewport in fixed mode
  const stickyTop = (() => {
    const v = headerMain.getAttribute('data-sticky-top');
    if (v == null || v === '') return 8;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 8;
  })();

  // Left/right gaps (per side)
  const sideGap = (() => {
    const v = headerMain.getAttribute('data-sticky-side');
    if (v == null || v === '') return 16;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 16;
  })();

  // Spacer (anchor) right before headerMain
  const spacer = document.createElement('div');
  spacer.className = 'page-header__main-spacer';
  spacer.style.height = '0px';
  spacer.style.pointerEvents = 'none';
  spacer.hidden = true;
  headerMain.parentNode.insertBefore(spacer, headerMain);

  // Transition only for transform
  headerMain.style.willChange = 'transform';
  headerMain.style.transitionProperty = 'transform';
  headerMain.style.transitionTimingFunction = 'ease';
  headerMain.style.transitionDuration = `${duration}ms`;

  let isFixed = false;
  let isEnabling = false;
  let rafId = 0;

  function measureHeaderHeight() {
    const rect = headerMain.getBoundingClientRect();
    return Math.max(0, rect.height || headerMain.offsetHeight || 0);
  }

  function enableSpacer() {
    const h = measureHeaderHeight();
    spacer.hidden = false;
    spacer.style.height = `${h}px`;
  }

  function disableSpacer() {
    spacer.style.height = '0px';
    spacer.hidden = true;
  }

  function applyFixedPosition() {
    headerMain.style.position = 'fixed';
    headerMain.style.top = `${stickyTop}px`;
    headerMain.style.left = `${sideGap}px`;
    headerMain.style.right = `${sideGap}px`;
    headerMain.style.zIndex = '1000';
  }

  function clearFixedPosition() {
    headerMain.style.position = '';
    headerMain.style.top = '';
    headerMain.style.left = '';
    headerMain.style.right = '';
    headerMain.style.zIndex = '';
  }

  function shouldEnableFixed() {
    return window.scrollY >= threshold;
  }

  function shouldDisableFixedO2() {
    // Disable only when:
    // - user is above threshold (so we are on the way back)
    // - anchor reached the same visual top as the fixed header
    const spacerTop = spacer.getBoundingClientRect().top;
    return (!shouldEnableFixed()) && (spacerTop >= stickyTop);
  }

  function enableFixedAnimated() {
    if (isFixed || isEnabling) return;
    isEnabling = true;
    isFixed = true;

    enableSpacer();
    applyFixedPosition();
    headerMain.classList.add('is-fixed');

    const h = measureHeaderHeight();

    // 2-frame transition trigger to avoid "kick"
    const prevDuration = headerMain.style.transitionDuration;

    // Frame 1: place above without transition
    headerMain.style.transitionDuration = '0ms';
    headerMain.style.transform = `translateY(${-h}px)`;
    // Force layout
    // eslint-disable-next-line no-unused-expressions
    headerMain.offsetHeight;

    // Frame 2: restore transition
    requestAnimationFrame(() => {
      headerMain.style.transitionDuration = prevDuration;

      // Frame 3: animate into place
      requestAnimationFrame(() => {
        headerMain.style.transform = 'translateY(0)';
        isEnabling = false;
      });
    });
  }

  function disableFixedNoFlicker() {
    if (!isFixed) return;
    isFixed = false;

    // Ensure stable visual state (no hide)
    headerMain.style.transform = 'translateY(0)';

    headerMain.classList.remove('is-fixed');
    clearFixedPosition();
    disableSpacer();
  }

  function tick() {
    rafId = 0;

    if (!isFixed) {
      if (shouldEnableFixed()) enableFixedAnimated();
      return;
    }

    // Keep geometry on resize
    applyFixedPosition();

    if (shouldDisableFixedO2()) {
      disableFixedNoFlicker();
    }
  }

  function scheduleTick() {
    if (rafId) return;
    rafId = requestAnimationFrame(tick);
  }

  // Keep spacer height in sync with responsive header height changes
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      if (isFixed) enableSpacer();
      scheduleTick();
    });
    ro.observe(headerMain);
  }

  window.addEventListener('scroll', scheduleTick, { passive: true });
  window.addEventListener('resize', scheduleTick);

  scheduleTick();
})();
