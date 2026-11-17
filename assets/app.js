/* UI Style Atlas — shared shell: i18n, theme, chrome, language picker, gallery. */
(function () {
  'use strict';

  const STORE_LANG = 'atlas:lang';
  const STORE_THEME = 'atlas:theme';
  const GITHUB_URL = 'https://github.com/PIKACHUIM/uitest';
  const STYLEKIT_URL = 'https://github.com/AnxForever/stylekit';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
  };

  const THEME_MODES = ['auto', 'light', 'dark'];

  /* ------------------------------------------------------------------ i18n */
  function detectLang() {
    const saved = storage.get(STORE_LANG);
    if (saved && window.I18N.dict[saved]) return saved;
    const wanted = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'])
      .map((x) => String(x).toLowerCase());
    for (const tag of wanted) {
      if (tag.startsWith('zh')) {
        if (/hant|tw|hk|mo/.test(tag)) return 'zh-TW';
        return 'zh-CN';
      }
      if (tag.startsWith('en')) return 'en';
      for (const code of ['ja', 'ko', 'de', 'es', 'pt', 'it', 'ar', 'ru', 'fr']) {
        if (tag.startsWith(code)) return code;
      }
    }
    return 'en';
  }

  const ATLAS = {
    lang: detectLang(),
    theme: storage.get(STORE_THEME) || 'auto',
    styles: [],
    t(key, vars) { return window.I18N.t(this.lang, key, vars); },
    locale() { return window.I18N.locales.find((l) => l.code === this.lang) || window.I18N.locales[2]; },
    dir() { return this.locale().dir || 'ltr'; }
  };
  window.ATLAS = ATLAS;

  // Optional deep-link overrides: ?lang=ja&theme=dark (not persisted)
  try {
    const boot = new URLSearchParams(location.search);
    const bootLang = boot.get('lang');
    if (bootLang && window.I18N.dict[bootLang]) ATLAS.lang = bootLang;
    const bootTheme = boot.get('theme');
    if (['auto', 'light', 'dark'].includes(bootTheme)) ATLAS.theme = bootTheme;
  } catch (e) { }

  /* --------------------------------------------------------------- colours */
  function parseColor(input) {
    if (!input || typeof input !== 'string') return null;
    let c = input.trim();
    let m = /^#([0-9a-f]{3,4})$/i.exec(c);
    if (m) c = '#' + m[1].split('').map((x) => x + x).join('');
    m = /^#([0-9a-f]{6})$/i.exec(c);
    if (m) {
      const n = parseInt(m[1], 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
    }
    m = /^rgba?\(([^)]+)\)$/i.exec(c);
    if (m) {
      const p = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v))) {
        return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined || Number.isNaN(p[3]) ? 1 : p[3] };
      }
    }
    return null;
  }
  const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  const toHex = (c) => '#' + hex2(c.r) + hex2(c.g) + hex2(c.b);
  const alpha = (c, a) => (c ? `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})` : 'transparent');
  function mix(a, b, t) {
    if (!a || !b) return toHex(a || b || { r: 128, g: 128, b: 128 });
    return toHex({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
  }
  function luminance(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function raiseContrast(c, bg, target) {
    let out = c;
    const dir = luminance(bg) > 0.5 ? { r: 0, g: 0, b: 0, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = 0; i < 14 && contrast(out, bg) < target; i++) {
      out = parseColor(mix(out, dir, 0.1)) || out;
    }
    return out;
  }
  function saturation(c) {
    const mx = Math.max(c.r, c.g, c.b) / 255, mn = Math.min(c.r, c.g, c.b) / 255;
    if (mx === 0) return 0;
    return (mx - mn) / mx;
  }

  /**
   * Turn a catalog entry into a coherent palette for previews.
   * Keeps the source tokens but repairs low-contrast / translucent pairs.
   */
  function palette(style, scheme) {
    const p = parseColor(style.colors && style.colors.p);
    const s = parseColor(style.colors && style.colors.s);
    const accents = (style.colors && style.colors.a ? style.colors.a : []).map(parseColor).filter(Boolean);
    const WHITE = { r: 250, g: 250, b: 248, a: 1 };
    const BLACK = { r: 11, g: 15, b: 14, a: 1 };

    let surface = s && s.a > 0.55 ? s : (p && luminance(p) > 0.5 ? WHITE : BLACK);
    if (scheme === 'dark') surface = parseColor(mix(surface, { r: 6, g: 9, b: 8, a: 1 }, 0.9)) || BLACK;
    if (scheme === 'light' && luminance(surface) < 0.12) surface = parseColor(mix(surface, { r: 255, g: 255, b: 255, a: 1 }, 0.88)) || WHITE;

    const inkBase = p && p.a > 0.5 ? p : { r: 20, g: 20, b: 20, a: 1 };
    let ink = inkBase;
    if (contrast(ink, surface) < 3) ink = luminance(surface) > 0.45 ? { r: 17, g: 22, b: 20, a: 1 } : { r: 244, g: 248, b: 246, a: 1 };

    const candidates = accents.map((c) => ({ c, score: contrast(c, surface) * 0.58 + saturation(c) * 0.42 }))
      .sort((a, b) => b.score - a.score);
    // Fills keep the signature hue; text gets a contrast-safe version of it.
    let accent = candidates.length ? candidates[0].c : ink;
    if (contrast(accent, surface) < 2.2) {
      const bySat = accents.slice().sort((a, b) => saturation(b) - saturation(a));
      if (bySat.length) accent = bySat[0];
    }
    const accentText = raiseContrast(accent, surface, 3.2);

    const onAccent = contrast(accent, surface) >= 4.5
      ? (luminance(accent) > 0.55 ? { r: 9, g: 14, b: 12, a: 1 } : { r: 255, g: 255, b: 255, a: 1 })
      : (luminance(surface) > 0.5 ? { r: 12, g: 16, b: 14, a: 1 } : { r: 255, g: 255, b: 255, a: 1 });

    return {
      surface: toHex(surface),
      ink: toHex(ink),
      accent: toHex(accent),
      accentText: toHex(accentText),
      onAccent: toHex(onAccent),
      accentRaw: accent,
      surfaceRaw: surface,
      inkRaw: ink,
      dark: luminance(surface) < 0.4,
      accents: accents.map(toHex)
    };
  }
  ATLAS.palette = palette;
  ATLAS.mix = mix;
  ATLAS.parseColor = parseColor;
  ATLAS.toHex = toHex;
  ATLAS.alpha = alpha;

  /* --------------------------------------------------------------- theme */
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  function resolvedTheme() {
    return ATLAS.theme === 'auto' ? (mql.matches ? 'dark' : 'light') : ATLAS.theme;
  }
  function applyTheme() {
    const resolved = resolvedTheme();
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#080b0a' : '#f6f8f7');
    updateThemeButton();
    document.dispatchEvent(new CustomEvent('atlas:theme', { detail: { resolved, mode: ATLAS.theme } }));
  }
  function updateThemeButton() {
    const btn = $('#themeBtn');
    if (!btn) return;
    const mode = ATLAS.theme;
    btn.innerHTML = icon(mode === 'auto' ? 'contrast' : resolvedTheme() === 'dark' ? 'moon' : 'sun');
    const label = ATLAS.t('themeToggle') + ': ' + ATLAS.t('theme' + mode[0].toUpperCase() + mode.slice(1));
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }
  ATLAS.toggleTheme = function () {
    const i = THEME_MODES.indexOf(ATLAS.theme);
    ATLAS.theme = THEME_MODES[(i + 1) % THEME_MODES.length];
    storage.set(STORE_THEME, ATLAS.theme);
    applyTheme();
  };
  mql.addEventListener('change', () => { if (ATLAS.theme === 'auto') applyTheme(); });

  /* ---------------------------------------------------------------- icons */
  const ICONS = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5Z"/></svg>',
    contrast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>',
    github: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>',
    check: '<svg class="check" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 8 14.5 16 6"/></svg>',
    search: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="9" r="6"/><path d="m13.5 13.5 3.5 3.5"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
    external: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h7v7M13 3 6.5 9.5M12 10v3H3V4h3"/></svg>',
    spark: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5 11.7 7l4.5 1.7-4.5 1.7L10 15l-1.7-4.6L3.8 8.7 8.3 7 10 2.5Z"/></svg>'
  };
  const icon = (name) => ICONS[name] || '';
  ATLAS.icon = icon;

  /* -------------------------------------------------------------- helpers */
  function styleName(style) {
    if (ATLAS.lang === 'zh-CN') return style.nz;
    if (ATLAS.lang === 'zh-TW') return style.nzt;
    return style.n;
  }
  function styleAltName(style) {
    return ATLAS.lang === 'zh-CN' || ATLAS.lang === 'zh-TW' ? style.n : style.nz;
  }
  function styleDesc(style) {
    if (ATLAS.lang === 'zh-CN') return style.d;
    if (ATLAS.lang === 'zh-TW') return style.dt || style.d;
    return style.de || style.d;
  }
  ATLAS.styleName = styleName;
  ATLAS.styleAltName = styleAltName;
  ATLAS.styleDesc = styleDesc;

  const CATS = ['minimal', 'expressive', 'modern', 'retro', 'art', 'layout', 'data', 'brand'];
  const CAT_KEY = { minimal: 'catMinimal', expressive: 'catExpressive', modern: 'catModern', retro: 'catRetro', art: 'catArt', layout: 'catLayout', data: 'catData', brand: 'catBrand' };
  const SOURCE_KEY = { original: 'sourceOriginal', stylekit: 'sourceStylekit', curated: 'sourceCurated' };

  /* ---------------------------------------------------------------- toast */
  let toastTimer;
  function toast(msg) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.dataset.show = 'true';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.dataset.show = 'false'; }, 2100);
  }
  ATLAS.toast = toast;

  /* -------------------------------------------------------------- chrome */
  function mountChrome() {
    const header = $('#siteHeader');
    if (header) {
      header.className = 'site-header';
      header.innerHTML = `
        <div class="wrap header-inner">
          <a class="brand" href="index.html">
            <span class="brand-mark">${ICONS.spark}</span>
            <span class="brand-text"><strong data-i18n="brand">UI Style Atlas</strong><small data-i18n="brandSub">StyleKit × UI/UX Pro Max</small></span>
          </a>
          <div class="header-actions">
            <a class="icon-btn" href="${GITHUB_URL}" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub">${ICONS.github}</a>
            <button class="lang-btn" id="langBtn" type="button" aria-haspopup="dialog" aria-controls="langModal">
              ${ICONS.globe}<span id="langLabel"></span>${ICONS.chev}
            </button>
            <button class="icon-btn" id="themeBtn" type="button"></button>
          </div>
        </div>`;
      $('#langBtn').addEventListener('click', openLangModal);
      $('#themeBtn').addEventListener('click', ATLAS.toggleTheme);
    }

    const footer = $('#siteFooter');
    if (footer) {
      footer.className = 'site-footer';
      footer.innerHTML = `
        <div class="wrap">
          <div class="footer-grid">
            <div>
              <a class="brand" href="index.html">
                <span class="brand-mark">${ICONS.spark}</span>
                <span class="brand-text"><strong data-i18n="brand">UI Style Atlas</strong><small data-i18n="brandSub">StyleKit × UI/UX Pro Max</small></span>
              </a>
              <p style="margin-top:14px;max-width:38ch;font-size:13px;color:var(--ink-3)" data-i18n="footerTagline"></p>
            </div>
            <div>
              <h4 data-i18n="footerColProject"></h4>
              <a href="index.html" data-i18n="navLibrary"></a>
              <a href="${GITHUB_URL}" target="_blank" rel="noopener" data-i18n="footerSource"></a>
            </div>
            <div>
              <h4 data-i18n="footerColSources"></h4>
              <a href="${STYLEKIT_URL}" target="_blank" rel="noopener">StyleKit · MIT</a>
              <a href="https://github.com/rdev/liquid-glass-react" target="_blank" rel="noopener">liquid-glass-react</a>
              <a href="https://dribbble.com/RonDesignLab" target="_blank" rel="noopener">Dribbble references</a>
            </div>
          </div>
          <div class="footer-bottom">
            <span data-i18n="footerLicense"></span>
            <span id="footerUpdated"></span>
            <span data-i18n="footerMade"></span>
          </div>
        </div>`;
    }
  }

  /* ------------------------------------------------------------ language */
  let lastFocus = null;
  function buildLangModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'langModal';
    modal.dataset.open = 'false';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'langModalTitle');
    modal.innerHTML = `
      <div class="modal-panel">
        <div class="modal-head">
          <h2 id="langModalTitle" data-i18n="modalLangTitle"></h2>
          <div class="modal-head-meta">
            <span class="current" id="langCurrent"></span>
            <button class="modal-close" type="button" data-close="1" aria-label="Close">${ICONS.close}</button>
          </div>
        </div>
        <div class="modal-body">
          <div class="lang-grid" role="radiogroup" aria-labelledby="langModalTitle" id="langGrid"></div>
          <p class="modal-note" data-i18n="modalLangNote"></p>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close]')) closeLangModal();
    });
    const grid = $('#langGrid', modal);
    window.I18N.locales.forEach((loc) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lang-opt';
      b.setAttribute('role', 'radio');
      b.dataset.code = loc.code;
      b.lang = loc.lang;
      b.innerHTML = `<span class="native">${loc.native}</span><span class="label">${loc.label}</span>${ICONS.check}`;
      b.addEventListener('click', () => {
        setLang(loc.code);
        closeLangModal();
        toast(ATLAS.t('toastLang'));
      });
      grid.appendChild(b);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.dataset.open === 'true') closeLangModal();
    });
  }

  function openLangModal() {
    const modal = $('#langModal');
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.dataset.open = 'true';
    document.body.style.overflow = 'hidden';
    syncLangModal();
    const current = $('#langGrid [aria-checked="true"]');
    (current || $('#langGrid button')).focus({ preventScroll: true });
  }
  function closeLangModal() {
    const modal = $('#langModal');
    if (!modal) return;
    modal.dataset.open = 'false';
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function syncLangModal() {
    const modal = $('#langModal');
    if (!modal) return;
    $('#langCurrent', modal).textContent = ATLAS.t('modalLangCurrent', { name: ATLAS.locale().label });
    const closeBtn = $('.modal-close', modal);
    if (closeBtn) closeBtn.setAttribute('aria-label', ATLAS.t('modalClose'));
    $$('#langGrid .lang-opt', modal).forEach((b) => {
      b.setAttribute('aria-checked', b.dataset.code === ATLAS.lang ? 'true' : 'false');
      b.tabIndex = b.dataset.code === ATLAS.lang ? 0 : -1;
    });
  }

  function setLang(code) {
    if (!window.I18N.dict[code]) return;
    ATLAS.lang = code;
    storage.set(STORE_LANG, code);
    applyLang();
    document.dispatchEvent(new CustomEvent('atlas:lang', { detail: { lang: code } }));
  }
  ATLAS.setLang = setLang;

  function applyLang() {
    const loc = ATLAS.locale();
    document.documentElement.lang = loc.lang;
    document.documentElement.dir = loc.dir;
    const label = $('#langLabel');
    if (label) label.textContent = loc.native;
    $$('[data-i18n]').forEach((el) => {
      const vars = el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : null;
      el.textContent = ATLAS.t(el.dataset.i18n, vars);
    });
    $$('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(',').forEach((pair) => {
        const [attr, key] = pair.split(':').map((x) => x.trim());
        if (attr && key) el.setAttribute(attr, ATLAS.t(key));
      });
    });
    if (document.body.dataset.titleKey) document.title = ATLAS.t(document.body.dataset.titleKey);
    syncLangModal();
    updateThemeButton();
  }
  ATLAS.applyLang = applyLang;

  /* -------------------------------------------------------------- cards */
  function sourceKey(style) { return SOURCE_KEY[style.src] || 'sourceStylekit'; }

  function cardPreviewVars(style) {
    const pal = palette(style, 'natural');
    const accent2 = pal.accents[1] || pal.accent;
    const accent3 = pal.accents[2] || accent2;
    return [
      `--cp-bg: radial-gradient(120% 130% at 88% 4%, ${alpha(pal.accentRaw, 0.42)}, transparent 58%), radial-gradient(90% 90% at 6% 100%, ${alpha(parseColor(accent2) || pal.accentRaw, 0.32)}, transparent 60%), linear-gradient(150deg, ${pal.surface}, ${mix(parseColor(pal.surface), parseColor(accent3), 0.18)})`,
      `--cp-ink: ${pal.ink}`,
      `--cp-surface: ${pal.surface}`,
      `--cp-accent: ${pal.accent}`,
      `--cp-accent-ink: ${pal.onAccent}`,
      `--cp-r: ${style.r || 12}px`,
      `--cp-shadow: ${style.vibe === 'hard' ? `4px 4px 0 ${pal.ink}` : '0 10px 22px rgba(0,0,0,.18)'}`
    ].join(';');
  }

  function cardHTML(style) {
    const pal = palette(style, resolvedTheme());
    const palette4 = [pal.accent, pal.ink, pal.surface].concat(pal.accents.slice(0, 2))
      .filter((c, i, arr) => arr.findIndex((x) => String(x).toLowerCase() === String(c).toLowerCase()) === i)
      .slice(0, 4);
    const swatches = palette4.map((c) => `<span class="sw" style="background:${c}"></span>`).join('');
    const no = style.no ? `<span class="cp-no">#${style.no}</span>` : `<span class="cp-no">${style.src === 'curated' ? ATLAS.t('cardNew') : 'SK'}</span>`;
    const src = `<span class="cp-no" style="opacity:.75">${ATLAS.t(sourceKey(style))}</span>`;
    return `
      <article class="card" data-id="${style.id}">
        <div class="card-preview" style="${cardPreviewVars(style)}">
          <div class="cp-row">${no}${src}</div>
          <div class="cp-foot">
            <span class="cp-type">Aa</span>
            <span class="cp-mini"><i class="dot"></i><i class="bar"></i><b class="cp-btn">Aa</b></span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title-row">
            <h3 class="card-title">${escapeHTML(styleName(style))}</h3>
            <span class="card-sub">${escapeHTML(styleAltName(style))}</span>
          </div>
          <p class="card-desc">${escapeHTML(styleDesc(style))}</p>
          <div class="card-meta">
            <span class="swatches">${swatches}</span>
            <span style="display:flex;gap:6px;align-items:center">
              <span class="tag">${ATLAS.t(CAT_KEY[style.cat] || 'catModern')}</span>
              ${style.demo ? `<a class="tag accent" href="${style.demo}" data-demo="1" title="${ATLAS.t('cardDemo')}">${ATLAS.t('cardDemo')}</a>` : ''}
            </span>
          </div>
        </div>
        <a class="card-open" href="style.html?s=${encodeURIComponent(style.id)}" aria-label="${escapeHTML(styleName(style))} — ${ATLAS.t('cardDetail')}"></a>
      </article>`;
  }

  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  ATLAS.escapeHTML = escapeHTML;

  /* --------------------------------------------------------------- gallery */
  const state = { q: '', cat: 'all', src: 'all', sort: 'curated' };

  function matches(style) {
    if (state.cat !== 'all' && style.cat !== state.cat) return false;
    if (state.src !== 'all' && style.src !== state.src) return false;
    if (!state.q) return true;
    const hay = [
      style.id, style.n, style.nz, style.nzt, style.d, style.de,
      ATLAS.t(CAT_KEY[style.cat] || 'catModern'),
      ATLAS.t(sourceKey(style)),
      (style.tags || []).join(' '),
      (style.colors ? [style.colors.p, style.colors.s].concat(style.colors.a || []).join(' ') : ''),
      style.demo || '', style.sk || ''
    ].join(' ').toLowerCase();
    return state.q.toLowerCase().split(/\s+/).filter(Boolean).every((term) => hay.includes(term));
  }

  function sorted(list) {
    const rank = { curated: 0, original: 1, stylekit: 2 };
    const arr = list.slice();
    if (state.sort === 'az') {
      arr.sort((a, b) => styleName(a).localeCompare(styleName(b), ATLAS.lang));
    } else if (state.sort === 'category') {
      arr.sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat) || styleName(a).localeCompare(styleName(b), ATLAS.lang));
    } else {
      arr.sort((a, b) => (rank[a.src] - rank[b.src]) || ((a.no || '99').localeCompare(b.no || '99')) || styleName(a).localeCompare(styleName(b), ATLAS.lang));
    }
    return arr;
  }

  function renderGallery() {
    const grid = $('#grid');
    if (!grid) return;
    const list = sorted(ATLAS.styles.filter(matches));
    grid.innerHTML = list.map(cardHTML).join('');
    const countEl = $('#resultCount');
    if (countEl) {
      countEl.innerHTML = `<strong>${ATLAS.t('resultCount', { n: list.length })}</strong>${state.q ? ' · ' + ATLAS.t('resultFor', { q: escapeHTML(state.q) }) : ''}`;
    }
    const empty = $('#empty');
    if (empty) empty.hidden = list.length > 0;
    $$('#catChips .chip').forEach((chip) => {
      const cat = chip.dataset.cat;
      const pool = ATLAS.styles.filter((s) => state.src === 'all' || s.src === state.src);
      const n = cat === 'all' ? pool.length : pool.filter((s) => s.cat === cat).length;
      const badge = chip.querySelector('.n');
      if (badge) badge.textContent = n;
      chip.setAttribute('aria-pressed', state.cat === cat ? 'true' : 'false');
    });
  }
  ATLAS.renderGallery = renderGallery;

  function buildToolbar() {
    const chips = $('#catChips');
    if (!chips) return;
    chips.innerHTML = ['all'].concat(CATS).map((cat) => {
      const label = cat === 'all' ? ATLAS.t('chipAll') : ATLAS.t(CAT_KEY[cat]);
      return `<button class="chip" type="button" data-cat="${cat}" aria-pressed="${cat === state.cat}">${label}<span class="n"></span></button>`;
    }).join('');
    chips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.cat = chip.dataset.cat;
      renderGallery();
    });

    const search = $('#searchInput');
    if (search) {
      let timer;
      search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = search.value.trim(); renderGallery(); }, 120);
      });
    }
    const srcSel = $('#sourceSelect');
    if (srcSel) {
      srcSel.innerHTML = [
        ['all', ATLAS.t('sourceAll')],
        ['original', ATLAS.t('sourceOriginal')],
        ['stylekit', ATLAS.t('sourceStylekit')],
        ['curated', ATLAS.t('sourceCurated')]
      ].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
      srcSel.value = state.src;
      srcSel.addEventListener('change', () => { state.src = srcSel.value; renderGallery(); });
    }
    const sortSel = $('#sortSelect');
    if (sortSel) {
      sortSel.innerHTML = [
        ['curated', ATLAS.t('sortCurated')],
        ['az', ATLAS.t('sortAz')],
        ['category', ATLAS.t('sortCategory')]
      ].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
      sortSel.value = state.sort;
      sortSel.addEventListener('change', () => { state.sort = sortSel.value; renderGallery(); });
    }
    const reset = $('#emptyReset');
    if (reset) {
      reset.addEventListener('click', () => {
        state.q = ''; state.cat = 'all'; state.src = 'all';
        if (search) search.value = '';
        if (srcSel) srcSel.value = 'all';
        renderGallery();
      });
    }
  }

  /* -------------------------------------------------------------- reveal */
  function observeReveals() {
    const items = $$('.reveal');
    if (!items.length || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach((el) => io.observe(el));
  }

  /* ----------------------------------------------------------------- init */
  function init() {
    ATLAS.styles = (window.CATALOG && window.CATALOG.styles) || [];
    mountChrome();
    buildLangModal();
    applyTheme();
    applyLang();
    buildToolbar();
    const stats = { styles: ATLAS.styles.length, categories: CATS.length, languages: window.I18N.locales.length, sources: 3 };
    $$('[data-stat]').forEach((el) => { el.textContent = String(stats[el.dataset.stat] || ''); });
    const upd = $('#footerUpdated');
    if (upd) {
      const d = (window.CATALOG && window.CATALOG.generatedAt || new Date().toISOString()).slice(0, 10);
      upd.textContent = ATLAS.t('footerUpdated', { date: d });
    }
    renderGallery();
    observeReveals();
    document.addEventListener('atlas:lang', () => {
      buildToolbarRefresh();
      renderGallery();
      const u = $('#footerUpdated');
      if (u) u.textContent = ATLAS.t('footerUpdated', { date: (window.CATALOG && window.CATALOG.generatedAt || '').slice(0, 10) });
    });
    let raf;
    document.addEventListener('atlas:theme', () => {
      if (!ATLAS.styles.length) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        renderGallery();
        if (window.ATLAS.onTheme) window.ATLAS.onTheme();
      });
    });
  }

  // rebuild select labels after a language switch without losing listeners
  function buildToolbarRefresh() {
    const srcSel = $('#sourceSelect');
    if (srcSel) {
      const v = srcSel.value;
      srcSel.innerHTML = [
        ['all', ATLAS.t('sourceAll')],
        ['original', ATLAS.t('sourceOriginal')],
        ['stylekit', ATLAS.t('sourceStylekit')],
        ['curated', ATLAS.t('sourceCurated')]
      ].map(([val, t]) => `<option value="${val}">${t}</option>`).join('');
      srcSel.value = v;
    }
    const sortSel = $('#sortSelect');
    if (sortSel) {
      const v = sortSel.value;
      sortSel.innerHTML = [
        ['curated', ATLAS.t('sortCurated')],
        ['az', ATLAS.t('sortAz')],
        ['category', ATLAS.t('sortCategory')]
      ].map(([val, t]) => `<option value="${val}">${t}</option>`).join('');
      sortSel.value = v;
    }
    const chips = $('#catChips');
    if (chips) {
      $$('.chip', chips).forEach((chip) => {
        const cat = chip.dataset.cat;
        const label = cat === 'all' ? ATLAS.t('chipAll') : ATLAS.t(CAT_KEY[cat]);
        chip.innerHTML = `${label}<span class="n"></span>`;
      });
    }
    const search = $('#searchInput');
    if (search) search.placeholder = ATLAS.t('searchPlaceholder');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
