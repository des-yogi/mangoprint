(function () {
  const SELECTOR_ROOT = '.gallery-marquee';
  const SELECTOR_ROW = '.gallery-marquee__top, .gallery-marquee__bottom';
  const SELECTOR_TRACK = '.gallery-marquee__track';
  const SELECTOR_ORIGINAL = '[data-original="true"]';

  /**
   * Wait until all images inside root are loaded/errored OR until timeout.
   * Important when <img loading="lazy"> is used (it may not start loading immediately).
   */
  function waitForImages(root, timeoutMs = 500) {
    const imgs = Array.from(root.querySelectorAll('img'));
    if (!imgs.length) return Promise.resolve();

    const imgPromises = imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    });

    const timeoutPromise = new Promise((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    });

    // Wait for either: all images OR timeout (whatever comes first)
    return Promise.race([Promise.all(imgPromises).then(() => undefined), timeoutPromise]);
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function rafNextFrame() {
    return new Promise((r) => requestAnimationFrame(() => r()));
  }

  class MarqueeRow {
    constructor(rowEl, opts) {
      this.rowEl = rowEl;
      this.trackEl = rowEl.querySelector(SELECTOR_TRACK);
      if (!this.trackEl) throw new Error('MarqueeRow: track not found');

      this.direction = opts.direction; // +1 = move right, -1 = move left (phase differs)
      this.speed = Math.max(0, Number(opts.speedPxPerSec) || 0);

      this.isPaused = false;
      this.baseSetWidth = 0;
      this.offset = 0;

      this._lastTs = null;
      this._rafId = null;

      this._onEnter = this.pause.bind(this);
      this._onLeave = this.resume.bind(this);
      this._onFocusIn = this.pause.bind(this);
      this._onFocusOut = this.resume.bind(this);
    }

    setSpeed(pxPerSec) {
      this.speed = Math.max(0, Number(pxPerSec) || 0);
    }

    pause() {
      this.isPaused = true;
    }

    resume() {
      this.isPaused = false;
    }

    /**
     * Add decoding="async" for all images that are not originals (clones)
     */
    _markCloneImagesAsyncDecoding(cloneEl) {
      const imgs = cloneEl.querySelectorAll('img');
      imgs.forEach((img) => {
        // decoding is only a hint; safe in modern browsers
        img.decoding = 'async';
      });
    }

    rebuild() {
      // remove clones
      const clones = Array.from(this.trackEl.children).filter(
        (el) => el.nodeType === 1 && el.getAttribute('data-original') !== 'true'
      );
      clones.forEach((el) => el.remove());

      const originals = Array.from(this.trackEl.querySelectorAll(SELECTOR_ORIGINAL));
      if (!originals.length) return;

      // measure base set width (only originals)
      this.baseSetWidth = this.trackEl.scrollWidth;

      const viewportWidth = this.rowEl.clientWidth;

      // how much we overfill viewport with repeated content (2..N)
      const fillMultiplier = Math.max(2, Number(this.rowEl.dataset.fill || 2));
      const minWidth = Math.max(viewportWidth * fillMultiplier, this.baseSetWidth * 2);

      let currentWidth = this.trackEl.scrollWidth;
      let safety = 0;

      while (currentWidth < minWidth && safety < 80) {
        for (const orig of originals) {
          const clone = orig.cloneNode(true);
          clone.removeAttribute('data-original');

          // requested: add decoding="async" for clone images
          this._markCloneImagesAsyncDecoding(clone);

          this.trackEl.appendChild(clone);
        }
        currentWidth = this.trackEl.scrollWidth;
        safety++;
      }

      // normalize offset after rebuild
      if (this.baseSetWidth > 0) {
        this.offset = mod(this.offset, this.baseSetWidth);
      } else {
        this.offset = 0;
      }

      this._applyTransform();
    }

    _applyTransform() {
      this.trackEl.style.willChange = 'transform';

      if (this.baseSetWidth <= 0) {
        this.trackEl.style.transform = 'translate3d(0, 0, 0)';
        return;
      }

      // offset is always 0..baseSetWidth
      // We always use negative translate to avoid visual gaps.
      // bottom (right->left):  -offset
      // top (left->right):     -(baseSetWidth - offset)
      const x =
        this.direction === -1
          ? -this.offset
          : -(this.baseSetWidth - this.offset);

      // Improvement: reduce subpixel jitter on some GPUs/zooms
      const dpr = window.devicePixelRatio || 1;
      const xRounded = Math.round(x * dpr) / dpr;

      this.trackEl.style.transform = `translate3d(${xRounded}px, 0, 0)`;
    }

    _tick = (ts) => {
      if (this._lastTs == null) this._lastTs = ts;
      const dt = (ts - this._lastTs) / 1000;
      this._lastTs = ts;

      if (!this.isPaused && this.speed > 0 && this.baseSetWidth > 0) {
        // offset always increases; direction affects only phase in _applyTransform
        this.offset += this.speed * dt;
        this.offset = mod(this.offset, this.baseSetWidth);
        this._applyTransform();
      }

      this._rafId = requestAnimationFrame(this._tick);
    };

    start() {
      // Pause on hover and when keyboard focus is inside (useful for <a>)
      this.rowEl.addEventListener('mouseenter', this._onEnter);
      this.rowEl.addEventListener('mouseleave', this._onLeave);
      this.rowEl.addEventListener('focusin', this._onFocusIn);
      this.rowEl.addEventListener('focusout', this._onFocusOut);

      this._lastTs = null;
      this._rafId = requestAnimationFrame(this._tick);
    }

    stop() {
      this.rowEl.removeEventListener('mouseenter', this._onEnter);
      this.rowEl.removeEventListener('mouseleave', this._onLeave);
      this.rowEl.removeEventListener('focusin', this._onFocusIn);
      this.rowEl.removeEventListener('focusout', this._onFocusOut);

      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = null;
      this._lastTs = null;
    }
  }

  /**
   * Pause/resume whole marquee by visibility (IntersectionObserver)
   */
  function setupVisibilityPausing(rootEl, instances) {
    // If browser doesn't support IO, do nothing (marquee will always run)
    if (!('IntersectionObserver' in window)) return null;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== rootEl) continue;

          if (entry.isIntersecting) {
            instances.forEach((i) => i.resume());
          } else {
            instances.forEach((i) => i.pause());
          }
        }
      },
      {
        // Start animating when ~10% is visible; pause when fully offscreen
        threshold: 0.1,
      }
    );

    io.observe(rootEl);
    return io;
  }

  async function initGalleryMarquee(root = document) {
    const rootEl = root.querySelector(SELECTOR_ROOT) || root;
    const rows = Array.from(root.querySelectorAll(SELECTOR_ROW));
    if (!rows.length) return null;

    // Don't hang on lazy images: wait a bit, then proceed
    await waitForImages(root, 500);
    // Ensure layout is calculated
    await rafNextFrame();

    const instances = rows.map((rowEl) => {
      const speed = Number(rowEl.dataset.speed || 0);
      const isTop = rowEl.classList.contains('gallery-marquee__top');

      return new MarqueeRow(rowEl, {
        direction: isTop ? +1 : -1,
        speedPxPerSec: speed,
      });
    });

    instances.forEach((i) => i.rebuild());
    instances.forEach((i) => i.start());

    // NOTE: we intentionally removed "rebuild after 1200ms" to avoid micro-jumps.
    // If you really need it later, we can make a smoother version.

    let t = null;
    const onResize = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        instances.forEach((i) => i.rebuild());
      }, 150);
    };
    window.addEventListener('resize', onResize);

    // Pause animation when marquee is not visible
    const io = setupVisibilityPausing(rootEl, instances);

    // optional debug API
    return {
      instances,
      destroy() {
        window.removeEventListener('resize', onResize);
        if (io) io.disconnect();
        instances.forEach((i) => i.stop());
      },
      setSpeedTop(pxPerSec) {
        const top = instances.find((i) => i.rowEl.classList.contains('gallery-marquee__top'));
        if (top) top.setSpeed(pxPerSec);
      },
      setSpeedBottom(pxPerSec) {
        const bottom = instances.find((i) => i.rowEl.classList.contains('gallery-marquee__bottom'));
        if (bottom) bottom.setSpeed(pxPerSec);
      },
    };
  }

  function boot() {
    initGalleryMarquee(document).then((api) => {
      window.galleryMarqueeApi = api; // можно убрать, если не нужно
    });
  }

  // DOMContentLoaded might have already fired
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
