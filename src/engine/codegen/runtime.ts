/**
 * buildRuntimeJs — one defensive, dependency-free IIFE that powers the
 * shared interactive layer of page-like generated apps:
 *
 *   • scroll-reveal for [data-reveal] via IntersectionObserver
 *     (stagger via [data-reveal-delay]; everything is instantly visible
 *     when prefers-reduced-motion is set or IO is unsupported)
 *   • ease-out animated counters for [data-count-to], run once on reveal
 *   • mobile nav toggle ([data-nav-toggle] ↔ [data-nav-menu]) with
 *     aria-expanded sync and Escape-to-close
 *   • smooth in-page anchor scrolling
 *   • optional testimonial auto-rotate ([data-rotator]) that pauses on
 *     hover/focus and never runs under reduced motion
 *
 * The generated code is plain ES2020, makes no network requests and never
 * logs. CSS hooks (.js-reveal on <html>, .is-revealed, .nav-open,
 * .js-rotate) are emitted by shared.ts per archetype.
 */

export interface RuntimeOptions {
  /** Include the [data-rotator] auto-rotate block (default false). */
  rotator?: boolean;
}

export function buildRuntimeJs(opts: RuntimeOptions = {}): string {
  const rotatorBlock = opts.rotator === true
    ? `
  // Testimonial auto-rotate: fade-cycle children, pause on hover/focus.
  if (!reduceMotion) {
    document.querySelectorAll('[data-rotator]').forEach(function (rotator) {
      var slides = Array.prototype.slice.call(rotator.children);
      if (slides.length < 2) return;
      docEl.classList.add('js-rotate');
      var index = 0;
      var paused = false;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-current', i === 0);
      });
      rotator.addEventListener('mouseenter', function () { paused = true; });
      rotator.addEventListener('mouseleave', function () { paused = false; });
      rotator.addEventListener('focusin', function () { paused = true; });
      rotator.addEventListener('focusout', function () { paused = false; });
      window.setInterval(function () {
        if (paused || document.hidden) return;
        index = (index + 1) % slides.length;
        slides.forEach(function (slide, i) {
          slide.classList.toggle('is-current', i === index);
        });
      }, 5000);
    });
  }
`
    : '';

  return `(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {
    reduceMotion = false;
  }
  var hasIO = typeof window.IntersectionObserver === 'function';

  // Animated counters: ease-out count-up, run once when revealed.
  var formatCount = function (value, decimals, grouped) {
    var text = value.toFixed(decimals);
    if (grouped) {
      var parts = text.split('.');
      parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
      text = parts.join('.');
    }
    return text;
  };

  var startCounter = function (el) {
    if (el.getAttribute('data-count-done') === '1') return;
    el.setAttribute('data-count-done', '1');
    var target = parseFloat(el.getAttribute('data-count-to') || '');
    if (!isFinite(target)) return;
    var finalText = el.textContent;
    if (reduceMotion || typeof window.requestAnimationFrame !== 'function') {
      el.textContent = finalText;
      return;
    }
    var decimals = parseInt(el.getAttribute('data-count-decimals') || '0', 10) || 0;
    var grouped = el.getAttribute('data-count-group') === '1';
    var prefix = el.getAttribute('data-count-prefix') || '';
    var suffix = el.getAttribute('data-count-suffix') || '';
    var duration = 1200;
    var startTime = null;
    var step = function (now) {
      if (startTime === null) startTime = now;
      var t = Math.min(1, (now - startTime) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      if (t >= 1) {
        el.textContent = finalText;
        return;
      }
      el.textContent = prefix + formatCount(target * eased, decimals, grouped) + suffix;
      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  };

  // Scroll reveal. The .js-reveal class arms the hidden initial states in
  // CSS, so without JS (or with reduced motion) everything stays visible.
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var counterTargets = Array.prototype.slice.call(document.querySelectorAll('[data-count-to]'));

  if (!reduceMotion && hasIO && revealTargets.length > 0) {
    docEl.classList.add('js-reveal');
    revealTargets.forEach(function (el) {
      var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10) || 0;
      if (delay > 0) el.style.transitionDelay = delay + 'ms';
    });
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        entry.target.querySelectorAll('[data-count-to]').forEach(startCounter);
        if (entry.target.hasAttribute('data-count-to')) startCounter(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (el) { revealObserver.observe(el); });

    // Counters that live outside any reveal group still animate on sight.
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        startCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    counterTargets.forEach(function (el) { counterObserver.observe(el); });
  } else {
    // Reduced motion or no IntersectionObserver: show final states now.
    revealTargets.forEach(function (el) { el.classList.add('is-revealed'); });
    counterTargets.forEach(function (el) { el.setAttribute('data-count-done', '1'); });
  }

  // Mobile nav toggle with aria-expanded sync and Escape to close.
  var navToggle = document.querySelector('[data-nav-toggle]');
  var navMenu = document.querySelector('[data-nav-menu]');
  if (navToggle && navMenu) {
    // Arm the collapsed mobile state only once the toggle is functional.
    docEl.classList.add('js-nav');
    var setNav = function (open) {
      navMenu.classList.toggle('nav-open', open);
      docEl.classList.toggle('has-nav-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    navToggle.addEventListener('click', function () {
      setNav(!navMenu.classList.contains('nav-open'));
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navMenu.classList.contains('nav-open')) {
        setNav(false);
        navToggle.focus();
      }
    });
    navMenu.addEventListener('click', function (event) {
      var target = event.target;
      if (target && target.closest && target.closest('a')) setNav(false);
    });
  }

  // Smooth in-page anchor scrolling (instant under reduced motion).
  document.addEventListener('click', function (event) {
    var origin = event.target;
    if (!origin || !origin.closest) return;
    var link = origin.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href').slice(1);
    if (!id) return;
    var section = document.getElementById(id);
    if (!section) return;
    event.preventDefault();
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });
${rotatorBlock}})();`;
}
