/* WOSNIAK — Minimal Signal */
(function () {
  'use strict';
  window.__wsk = true;

  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktopMQ = matchMedia('(min-width: 900px) and (orientation: landscape)');
  var VIDEO_DIR = 'assets/video/';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- relógio (America/Sao_Paulo) ---------- */
  var clock = $('[data-clock]');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- vídeos ---------- */
  // injeta <source> só quando necessário (economiza dados no 4G)
  function attach(video, name, formats) {
    if (video.dataset.ready) return;
    video.dataset.ready = '1';
    (formats || ['webm', 'mp4']).forEach(function (ext) {
      var s = document.createElement('source');
      s.src = VIDEO_DIR + name + '.' + ext;
      s.type = ext === 'webm' ? 'video/webm; codecs="vp9"' : 'video/mp4';
      video.appendChild(s);
    });
    video.muted = true;
    video.load();
  }
  function isShown(el) { return el.offsetParent !== null || getComputedStyle(el).position === 'fixed'; }
  function play(video) {
    if (!video.dataset.ready || !isShown(video)) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  // hero: mobile = 1 vídeo cobrindo; desktop = fundo borrado + 1–3 janelas
  var hero = $('[data-hero]');
  var heroVideos = $$('[data-hero] video[data-video]');
  var heroInView = true;

  function setupHero() {
    if (reduced) return; // só poster
    heroVideos.forEach(function (v) {
      if (isShown(v)) attach(v, v.dataset.video);
    });
    syncHero();
  }
  function syncHero() {
    heroVideos.forEach(function (v) {
      if (heroInView && isShown(v)) play(v); else v.pause();
    });
  }
  setupHero();
  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(setupHero, 200);
  });

  // telão + logo 3D: carregam perto da tela, pausam fora
  var lazyVideos = $$('video[data-lazy-video]');
  if (!reduced && 'IntersectionObserver' in window) {
    var lazyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { attach(v, v.dataset.lazyVideo, ['mp4']); play(v); }
        else v.pause();
      });
    }, { rootMargin: '250px 0px' });
    lazyVideos.forEach(function (v) { lazyIO.observe(v); });
  }

  /* ---------- nav / barra mobile ---------- */
  var nav = $('[data-nav]');
  var mbar = $('[data-mbar]');
  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (entries) {
      heroInView = entries[0].isIntersecting;
      if (mbar) mbar.classList.toggle('is-visible', !heroInView);
      syncHero();
    }, { threshold: 0 }).observe(hero);
  }

  /* ---------- telão: liga ao entrar ---------- */
  var led = $('[data-led]');
  if (led && 'IntersectionObserver' in window) {
    var ledIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { led.classList.add('is-on'); ledIO.disconnect(); }
    }, { threshold: 0.35 });
    ledIO.observe(led);
  }

  /* ---------- marquee: duplica a faixa para loop contínuo ---------- */
  $$('[data-marquee]').forEach(function (row) {
    var track = $('.marquee__track', row);
    var inner = document.createElement('div');
    inner.className = 'marquee__inner';
    row.insertBefore(inner, track);
    inner.appendChild(track);
    var clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    inner.appendChild(clone);
    // velocidade constante (~40px/s), independente da largura
    var setDur = function () { inner.style.setProperty('--dur', Math.max(30, track.offsetWidth / 40) + 's'); };
    setDur();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setDur);
  });

  /* ---------- forma de onda (puramente visual) ---------- */
  $$('[data-wave]').forEach(function (wave, wi) {
    var n = 28, seed = wi * 7 + 3;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (var i = 0; i < n; i++) {
      var b = document.createElement('i');
      var env = Math.sin((i / (n - 1)) * Math.PI); // envelope suave
      b.style.setProperty('--h', (0.18 + env * 0.62 + rnd() * 0.2).toFixed(2));
      b.style.setProperty('--d', (-rnd() * 1.2).toFixed(2) + 's');
      wave.appendChild(b);
    }
  });

  /* ---------- scroll suave + animações ---------- */
  function scrollToHash(hash) {
    var target = hash === '#top' ? 0 : $(hash);
    if (target === null) return false;
    if (lenis) lenis.scrollTo(target, { offset: hash === '#top' ? 0 : -8, duration: 1.4 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (hash.length > 1 && scrollToHash(hash)) {
      e.preventDefault();
      if (hash !== '#top') history.replaceState(null, '', hash);
    }
  });

  var lenis = null;
  var gsap = window.gsap;
  var motion = root.classList.contains('motion');

  if (!motion) return;
  if (!gsap || !window.ScrollTrigger) { root.classList.remove('motion'); return; }

  gsap.registerPlugin(window.ScrollTrigger);
  var ST = window.ScrollTrigger;

  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // entrada do hero: logo "sendo escrita" (clip da esquerda p/ direita) + fade-up do resto
  var tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 });
  tl.to('[data-hero-logo]', { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.out' }, 0.1)
    .to('[data-hero-fade]', { opacity: 1, y: 0, duration: 0.9, stagger: 0.06 }, 0.35);

  // títulos com máscara
  $$('.sec-title, .booking__title').forEach(function (title) {
    gsap.to($$('.mask > span', title), {
      y: 0, yPercent: 0, duration: 1, ease: 'power3.out', stagger: 0.06,
      scrollTrigger: { trigger: title, start: 'top 88%', once: true }
    });
  });

  // reveals discretos em blocos
  ST.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: function (els) {
      gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, overwrite: true });
    }
  });

  // garante que nada fica escondido se a página abrir no meio (âncora/refresh)
  window.addEventListener('load', function () { ST.refresh(); });
})();
