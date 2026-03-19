document.addEventListener('DOMContentLoaded', function () {
  const ROOT = '.js-review-clamp';
  const FOOTER = '.js-collapser-footer';
  const TOGGLE = '.js-collapser-toggle';
  const TOGGLE_TEXT = '.js-collapser-toggle-text';

  const DEFAULT_LINES = 4;
  const DEFAULT_ANIM_MS = 220;
  const DEFAULT_THRESHOLD_PX = 2;

  function toInt(v, fallback) {
    const n = parseInt(String(v || ''), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function debounce(fn, wait = 180) {
    let t = 0;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function getScope(root) {
    const raw = String(root.dataset.collapserScope || '').trim();
    if (!raw) return root;

    if (raw.startsWith('closest:')) return root.closest(raw.slice(8).trim()) || root;
    if (raw === 'parent') return root.parentElement || root;
    if (raw.startsWith('selector:')) return document.querySelector(raw.slice(9).trim()) || root;
    return root.closest(raw) || root;
  }

  function qFooter(root) {
    const scope = getScope(root);
    return scope.querySelector(FOOTER);
  }

  function qToggle(root) {
    const scope = getScope(root);
    return scope.querySelector(TOGGLE);
  }

  function qToggleText(root) {
    const scope = getScope(root);
    return scope.querySelector(TOGGLE_TEXT);
  }

  function setFooterVisible(root, visible) {
    const f = qFooter(root);
    if (!f) return;
    f.hidden = !visible;
  }

  function setToggleText(root, expanded) {
    const t = qToggleText(root);
    const btn = qToggle(root);
    if (!t && !btn) return;

    const show = (t?.dataset.showText || 'Розгорнути').trim();
    const hide = (t?.dataset.hideText || 'Згорнути').trim();
    const next = expanded ? hide : show;

    if (t) t.textContent = next;
    else btn.textContent = next;
  }

  function setToggleState(root, expanded) {
    const btn = qToggle(root);
    if (!btn) return;
    btn.classList.toggle('is-expanded', expanded);
    btn.classList.toggle('is-collapsed', !expanded);
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function setClamp(el, lines) {
    el.style.webkitLineClamp = String(lines);
    el.style.setProperty('-webkit-line-clamp', String(lines));
  }

  function clearClamp(el) {
    el.style.webkitLineClamp = 'unset';
    el.style.setProperty('-webkit-line-clamp', 'unset');
  }

  function getLineHeightPx(el) {
    const cs = getComputedStyle(el);
    const lh = cs.lineHeight;
    if (lh === 'normal') {
      const fs = parseFloat(cs.fontSize) || 16;
      return fs * 1.2;
    }
    return parseFloat(lh) || 16;
  }

  function getFullLines(root) {
    // temporarily expand to measure full height
    const wasCollapsed = root.classList.contains('is-collapsed');
    const prevClamp = root.style.webkitLineClamp;

    root.classList.remove('is-collapsed');
    clearClamp(root);
    root.offsetHeight; // reflow

    const fullHeight = root.scrollHeight;
    const lh = getLineHeightPx(root);
    const lines = Math.max(1, Math.ceil(fullHeight / lh));

    // restore previous visual state (caller will set final)
    if (wasCollapsed) root.classList.add('is-collapsed');
    root.style.webkitLineClamp = prevClamp;

    return lines;
  }

  function isOverflowingWhenClamped(root, collapsedLines, thresholdPx = DEFAULT_THRESHOLD_PX) {
    // Apply collapsed style and compare scrollHeight vs clientHeight
    root.classList.add('is-collapsed');
    setClamp(root, collapsedLines);
    root.offsetHeight; // reflow

    return root.scrollHeight > root.clientHeight + thresholdPx;
  }

  async function animateClamp(root, from, to, totalMs) {
    if (from === to) return;

    const dir = to > from ? 1 : -1;
    const steps = Math.abs(to - from);
    const frameMs = Math.max(16, Math.floor(totalMs / steps));

    let cur = from;
    for (let i = 0; i < steps; i += 1) {
      cur += dir;
      setClamp(root, cur);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, frameMs));
    }
  }

  function applyCollapsed(root, lines) {
    root.classList.add('is-collapsed');
    setClamp(root, lines);
    root.dataset.state = 'collapsed';
    setToggleText(root, false);
    setToggleState(root, false);
  }

  function applyExpanded(root) {
    root.classList.remove('is-collapsed');
    clearClamp(root);
    root.dataset.state = 'expanded';
    setToggleText(root, true);
    setToggleState(root, true);
  }

  async function toggle(root) {
    if (root.dataset.animating === '1') return;
    root.dataset.animating = '1';

    const collapsedLines = toInt(root.dataset.lines, DEFAULT_LINES);
    const animMs = toInt(root.dataset.animMs, DEFAULT_ANIM_MS);

    const isCollapsedNow = root.dataset.state !== 'expanded';

    try {
      if (isCollapsedNow) {
        // Expand
        const fullLines = getFullLines(root);

        if (fullLines <= collapsedLines) {
          setFooterVisible(root, false);
          applyExpanded(root);
          return;
        }

        setFooterVisible(root, true);

        // Ensure we start from collapsed clamp
        root.classList.add('is-collapsed');
        setClamp(root, collapsedLines);
        root.offsetHeight;

        setToggleText(root, true);
        setToggleState(root, true);
        root.dataset.state = 'expanded';

        await animateClamp(root, collapsedLines, fullLines, animMs);

        applyExpanded(root);
      } else {
        // Collapse
        const fullLines = getFullLines(root);

        root.classList.add('is-collapsed');
        setClamp(root, fullLines);
        root.offsetHeight;

        setToggleText(root, false);
        setToggleState(root, false);
        root.dataset.state = 'collapsed';

        await animateClamp(root, fullLines, collapsedLines, animMs);

        applyCollapsed(root, collapsedLines);
      }
    } finally {
      root.dataset.animating = '0';
    }
  }

  function refresh(root) {
    // Do not interfere during step animation / user click
    if (root.dataset.animating === '1') return;

    const btn = qToggle(root);
    const footer = qFooter(root);
    if (!btn || !footer) return;

    const collapsedLines = toInt(root.dataset.lines, DEFAULT_LINES);

    // If not overflowing => hide footer and expand
    const needs = isOverflowingWhenClamped(root, collapsedLines);

    setFooterVisible(root, needs);

    if (!needs) {
      applyExpanded(root);
      return;
    }

    // Needs overflow: keep current state
    if (root.dataset.state === 'expanded') applyExpanded(root);
    else applyCollapsed(root, collapsedLines);
  }

  function bind(root) {
    if (root.dataset.bound === '1') return;

    const btn = qToggle(root);
    const footer = qFooter(root);
    if (!btn || !footer) return;

    root.dataset.bound = '1';

    // Click handler
    btn.addEventListener('click', () => toggle(root));

    // Initial compute
    refresh(root);

    // Debounced resize refresh (prevents breakpoint “thrash”)
    const onResize = debounce(() => refresh(root), 180);
    window.addEventListener('resize', onResize);

    // ResizeObserver refresh (also debounced)
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(debounce(() => refresh(root), 80));
      ro.observe(root);
      root._reviewClampRO = ro;
    }
  }

  function initAll(scope = document) {
    scope.querySelectorAll(ROOT).forEach(bind);
  }

  window.addEventListener('DOMContentLoaded', () => initAll());

  // Public API
  window.ReviewClamp = {
    refreshAll: () => initAll(),
    refreshWithin: (el) => el && initAll(el),
  };
});
