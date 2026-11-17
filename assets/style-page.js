/* UI Style Atlas — style detail page.
 * Renders every section for any catalog entry: AI implementation (text / MD / code),
 * rating & feedback, component preview, pointer interactions, FAQ.
 */
(function () {
  'use strict';
  const A = window.ATLAS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  let style = null;
  let tab = 'text';
  let scheme = null;             // preview surface (light / dark)
  const draft = { score: 0, chips: [], note: '' };

  const SECTION_IDS = ['preview', 'pointer', 'rating', 'ai', 'faq'];

  /* ------------------------------------------------------------- utilities */
  const codeCache = new Map();

  function uniqColors(list) {
    return list.filter((c, i, arr) => c && arr.findIndex((x) => String(x).toLowerCase() === String(c).toLowerCase()) === i);
  }

  function rgbs(hex, alpha) {
    const c = A.parseColor(hex);
    return c ? A.alpha(c, alpha) : hex;
  }

  function shadowOf(style, pal) {
    const ink = pal.ink;
    switch (style.vibe) {
      case 'hard': return `6px 6px 0 ${ink}`;
      case 'soft': return '12px 12px 26px rgba(0,0,0,.12), -10px -10px 24px rgba(255,255,255,.85)';
      case 'glass': return '0 24px 60px -24px rgba(0,0,0,.45)';
      case 'neon': return `0 0 26px ${rgbs(pal.accent, 0.35)}, inset 0 0 0 1px ${rgbs(pal.accent, 0.3)}`;
      case 'clay': return 'inset -4px -4px 10px rgba(0,0,0,.10), 0 14px 26px rgba(0,0,0,.12)';
      default: return '0 6px 20px rgba(0,0,0,.08)';
    }
  }

  function motionOf(style) {
    switch (style.vibe) {
      case 'hard': return '150ms ease-out, snap to the pressed state (no spring)';
      case 'soft': return '260ms cubic-bezier(.22,.8,.2,1), gentle lift';
      case 'glass': return '300ms ease, highlight follows the pointer';
      case 'neon': return '180ms ease-out, glow intensifies on hover';
      case 'clay': return '240ms cubic-bezier(.34,1.56,.64,1), playful bounce';
      default: return '200ms ease-out, minimal movement';
    }
  }

  function spec(style) {
    const light = A.palette(style, 'light');
    const dark = A.palette(style, 'dark');
    const r = style.r == null ? 12 : style.r;
    const bw = style.bw == null ? 1 : style.bw;
    return {
      light, dark, r, bw,
      line: rgbs(light.ink, 0.16),
      accents: (style.colors.a || []).slice(0, 4),
      shadow: shadowOf(style, light),
      motion: motionOf(style),
      radius: r >= 999 ? '999' : r
    };
  }

  function rulesOf(style, sp) {
    const doo = (style.do && style.do.length) ? style.do.slice(0, 4) : [
      `Keep every corner at ${sp.radius}px — cards, inputs, buttons, badges`,
      `Use ${sp.light.accent} for the one primary action in a view`,
      `Keep body text on ${sp.light.surface} at 4.5:1 contrast or better`,
      `Animate state changes in 150–250ms with an ease-out curve`
    ];
    const dont = (style.dont && style.dont.length) ? style.dont.slice(0, 3) : [
      'Do not introduce a second radius language inside one screen',
      'Do not add a second accent hue for decoration',
      'Do not rely on colour alone to signal state'
    ];
    return { doo, dont };
  }

  function sourceLabel(style) {
    if (style.src === 'original') return A.t('detailOriginalSet');
    if (style.src === 'curated') return A.t('detailCuratedSet');
    return A.t('detailStylekitSet');
  }
  function sourceHost(style) {
    try { return new URL(sourceURL(style)).hostname.replace(/^www\./, ''); } catch { return A.t('detailSource'); }
  }
  function sourceURL(style) {
    if (style.link) return style.link;
    if (style.sk) return 'https://www.stylekit.top/en/styles/' + style.sk;
    return 'https://github.com/PIKACHUIM/uitest';
  }

  /* ------------------------------------------------------------ generators */
  function tokensBlock(style, sp, langLabel) {
    return [
      `surface: ${sp.light.surface}   (dark: ${sp.dark.surface})`,
      `ink:     ${sp.light.ink}   (dark: ${sp.dark.ink})`,
      `accent:  ${sp.light.accent}  ·  on-accent: ${sp.light.onAccent}`,
      `palette: ${sp.accents.join(', ') || '—'}`,
      `radius:  ${sp.radius}px   ·  border: ${sp.bw}px ${sp.line}`,
      `shadow:  ${sp.shadow}`,
      `motion:  ${sp.motion}`,
      `scheme:  ${sp.light.dark ? 'dark-first' : 'light-first'}  ·  vibe: ${style.vibe}`
    ].join('\n');
  }

  function promptText(style) {
    const sp = spec(style);
    const rules = rulesOf(style, sp);
    return [
      `You are a senior product designer and front-end engineer.`,
      `Build a production-ready interface in the "${style.n}" style.`,
      '',
      '## Design tokens',
      tokensBlock(style, sp),
      '',
      '## Rules — do',
      ...rules.doo.map((r, i) => `${i + 1}. ${r}`),
      '',
      "## Rules — don't",
      ...rules.dont.map((r, i) => `${i + 1}. ${r}`),
      '',
      '## Components',
      `- Button: background ${sp.light.accent}, text ${sp.light.onAccent}, radius ${Math.max(0, Math.round(sp.r * 0.8))}px, padding 11px 18px, hover lift 1px, focus ring 3px ${rgbs(sp.light.accent, 0.35)}.`,
      `- Card: background ${sp.light.surface}, border ${sp.bw}px ${sp.line}, radius ${sp.radius}px, padding 22px, shadow ${sp.shadow}.`,
      `- Input: background ${sp.light.dark ? sp.light.surface : '#ffffff'}, border ${sp.bw}px ${sp.line}, radius ${Math.round(sp.r * 0.7)}px, 36px height, focus border ${sp.light.accent}.`,
      `- Badge: ${rgbs(sp.light.accent, 0.14)} background, ${sp.light.accent} text, pill radius.`,
      `- Data: tabular numerals, ${sp.light.ink} for values, muted for labels.`,
      '',
      '## Requirements',
      '- Responsive: 360 / 768 / 1280 with a mobile-first cascade.',
      '- Accessibility: WCAG AA (4.5:1 body copy), visible focus, prefers-reduced-motion honoured.',
      '- Ship both light and dark surfaces from the same tokens.',
      '- Realistic copy, no lorem ipsum, no placeholder images.',
      '- Return one self-contained HTML file with embedded CSS and no build step.',
      '',
      `Reference: ${sourceLabel(style)} — ${sourceURL(style)}`
    ].join('\n');
  }

  function mdText(style) {
    const sp = spec(style);
    const rules = rulesOf(style, sp);
    const base = Math.max(0, Math.round(sp.r * 0.8));
    return [
      `# ${style.n} — DESIGN.md`,
      '',
      `> ${style.de || ''}`,
      '',
      `- Category: ${A.t('cat' + style.cat[0].toUpperCase() + style.cat.slice(1))}`,
      `- Source: ${sourceLabel(style)}`,
      `- Reference: ${sourceURL(style)}`,
      `- Vibe: ${style.vibe} · ${sp.light.dark ? 'dark-first' : 'light-first'}`,
      '',
      '## Palette',
      '',
      '| Token | Light | Dark |',
      '| --- | --- | --- |',
      `| surface | \`${sp.light.surface}\` | \`${sp.dark.surface}\` |`,
      `| ink | \`${sp.light.ink}\` | \`${sp.dark.ink}\` |`,
      `| accent | \`${sp.light.accent}\` | \`${sp.dark.accent}\` |`,
      `| accent-ink | \`${sp.light.onAccent}\` | \`${sp.dark.onAccent}\` |`,
      '',
      '## Tokens',
      '',
      '~~~css',
      ':root {',
      `  --sk-surface: ${sp.light.surface};`,
      `  --sk-ink: ${sp.light.ink};`,
      `  --sk-accent: ${sp.light.accent};`,
      `  --sk-accent-ink: ${sp.light.onAccent};`,
      `  --sk-line: ${sp.line};`,
      `  --sk-radius: ${sp.radius}px;`,
      `  --sk-radius-sm: ${base}px;`,
      `  --sk-border: ${sp.bw}px;`,
      `  --sk-shadow: ${sp.shadow};`,
      `  --sk-motion: ${sp.motion};`,
      '}',
      '',
      '@media (prefers-color-scheme: dark) {',
      '  :root {',
      `    --sk-surface: ${sp.dark.surface};`,
      `    --sk-ink: ${sp.dark.ink};`,
      `    --sk-accent: ${sp.dark.accent};`,
      `    --sk-accent-ink: ${sp.dark.onAccent};`,
      '  }',
      '}',
      '~~~',
      '',
      '## Typography',
      '',
      '| Role | Size | Weight | Notes |',
      '| --- | --- | --- | --- |',
      '| Display | clamp(2rem, 5vw, 3.5rem) | 650 | tracking -0.03em |',
      '| H2 | clamp(1.25rem, 2.4vw, 1.75rem) | 650 | tracking -0.02em |',
      '| Body | 0.9375rem | 400 | line-height 1.6 |',
      '| Label | 0.75rem | 600 | uppercase, 0.06em tracking |',
      '| Numeric | 0.9375rem | 600 | tabular-nums |',
      '',
      '## Components',
      '',
      '~~~css',
      `.btn {`,
      `  background: var(--sk-accent);`,
      `  color: var(--sk-accent-ink);`,
      `  border-radius: var(--sk-radius-sm);`,
      `  padding: 11px 18px;`,
      `  border: 0;`,
      `  font-weight: 600;`,
      `  transition: transform 180ms ease-out, filter 180ms ease-out;`,
      `}`,
      `.btn:hover { transform: translateY(-1px); }`,
      '',
      `.card {`,
      `  background: var(--sk-surface);`,
      `  color: var(--sk-ink);`,
      `  border: var(--sk-border) solid var(--sk-line);`,
      `  border-radius: var(--sk-radius);`,
      `  box-shadow: var(--sk-shadow);`,
      `  padding: 22px;`,
      `}`,
      '',
      `.input {`,
      `  height: 36px;`,
      `  border-radius: var(--sk-radius-sm);`,
      `  border: var(--sk-border) solid var(--sk-line);`,
      `  background: color-mix(in srgb, var(--sk-surface) 92%, var(--sk-ink));`,
      `  padding-inline: 11px;`,
      `}`,
      `.input:focus-visible {`,
      `  outline: 3px solid color-mix(in srgb, var(--sk-accent) 35%, transparent);`,
      `  outline-offset: 1px;`,
      `}`,
      '~~~',
      '',
      '## Motion',
      '',
      `- ${sp.motion}`,
      '- Press states compress first, then release; no bounce longer than 320ms.',
      '- Wrap non-essential motion in `@media (prefers-reduced-motion: no-preference)`.',
      '',
      '## Do',
      '',
      ...rules.doo.map((r) => `- ${r}`),
      '',
      "## Don't",
      '',
      ...rules.dont.map((r) => `- ${r}`),
      '',
      '## Checklist',
      '',
      '- [ ] Radius, border and shadow tokens are reused verbatim',
      '- [ ] Exactly one primary accent action per view',
      '- [ ] Body copy ≥ 4.5:1, large text ≥ 3:1',
      '- [ ] Focus-visible ring present on every interactive element',
      '- [ ] Light and dark surfaces both pass contrast',
      '- [ ] Layout reflows at 360, 768 and 1280 without horizontal scroll',
      '- [ ] prefers-reduced-motion path removes transforms only',
      '',
      `_Generated from the ${style.n} catalog entry._`
    ].join('\n');
  }

  function tailwindText(style) {
    const sp = spec(style);
    const r = sp.radius;
    const rs = Math.max(0, Math.round(sp.r * 0.8));
    const b = Math.max(1, sp.bw);
    return [
      '<!-- Tailwind: copy-paste card + action row -->',
      `<div class="rounded-[${r}px] border-[${b}px] border-[${sp.line}] bg-[${sp.light.surface}] p-6 shadow-[${sp.shadow.replace(/ /g, '_')}]">`,
      '  <div class="flex items-start justify-between gap-4">',
      `    <div class="text-sm font-semibold text-[${sp.light.ink}]/70">Monthly revenue</div>`,
      `    <span class="rounded-full bg-[${rgbs(sp.light.accent, 0.14)}] px-2.5 py-0.5 text-[11px] font-semibold text-[${sp.light.accent}]">New</span>`,
      '  </div>',
      '  <div class="mt-2 flex items-baseline gap-2">',
      `    <span class="text-3xl font-semibold tracking-tight text-[${sp.light.ink}] tabular-nums">$48,290</span>`,
      `    <span class="text-xs font-semibold text-[${sp.light.accent}]">+12.4%</span>`,
      '  </div>',
      `  <p class="mt-2 text-sm text-[${sp.light.ink}]/60">Net of refunds, updated hourly.</p>`,
      '  <div class="mt-5 flex flex-wrap items-center gap-2">',
      `    <button class="rounded-[${rs}px] bg-[${sp.light.accent}] px-4 py-2.5 text-sm font-semibold text-[${sp.light.onAccent}] transition hover:-translate-y-px">Primary action</button>`,
      `    <button class="rounded-[${rs}px] border border-[${sp.line}] px-4 py-2.5 text-sm font-semibold text-[${sp.light.ink}]">Secondary</button>`,
      '  </div>',
      '</div>',
      '',
      '<!-- Dark surface: swap bg-[...] for their dark counterparts from DESIGN.md -->'
    ].join('\n');
  }

  function reactText(style) {
    const sp = spec(style);
    const rs = Math.max(0, Math.round(sp.r * 0.8));
    return [
      "import { useState } from 'react';",
      '',
      'const tokens = {',
      `  surface: '${sp.light.surface}',`,
      `  ink: '${sp.light.ink}',`,
      `  accent: '${sp.light.accent}',`,
      `  onAccent: '${sp.light.onAccent}',`,
      `  line: '${sp.line}',`,
      `  radius: ${sp.r},`,
      `  radiusSm: ${rs},`,
      `  border: ${sp.bw},`,
      '};',
      '',
      'export function StyleCard() {',
      '  const [live, setLive] = useState(false);',
      '  return (',
      '    <section',
      '      style={{',
      '        background: tokens.surface,',
      '        color: tokens.ink,',
      `        border: \`\${tokens.border}px solid \${tokens.line}\`,`,
      '        borderRadius: tokens.radius,',
      '        padding: 22,',
      "        boxShadow: '" + sp.shadow.replace(/'/g, "\\'") + "',",
      "        fontFamily: 'Inter, system-ui, sans-serif',",
      '      }}',
      '    >',
      '      <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>',
      '        <h3 style={{ fontSize: 14, fontWeight: 600, opacity: 0.7, margin: 0 }}>Monthly revenue</h3>',
      '        <span',
      '          style={{',
      `            background: '${rgbs(sp.light.accent, 0.14)}',`,
      '            color: tokens.accent,',
      '            borderRadius: 999,',
      '            padding: "3px 9px",',
      '            fontSize: 11,',
      '            fontWeight: 600,',
      '          }}',
      '        >',
      '          New',
      '        </span>',
      '      </header>',
      '      <p style={{ fontSize: 30, fontWeight: 600, margin: "8px 0 0", letterSpacing: "-0.03em" }}>',
      '        $48,290 <span style={{ fontSize: 12, color: tokens.accent }}>+12.4%</span>',
      '      </p>',
      '      <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.65 }}>Net of refunds, updated hourly.</p>',
      '      <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>',
      '        <button',
      '          style={{',
      '            background: tokens.accent,',
      '            color: tokens.onAccent,',
      '            border: 0,',
      '            borderRadius: tokens.radiusSm,',
      '            padding: "10px 16px",',
      '            fontWeight: 600,',
      '            cursor: "pointer",',
      '          }}',
      '        >',
      '          Primary action',
      '        </button>',
      '        <button',
      '          onClick={() => setLive((v) => !v)}',
      '          style={{',
      '            background: "transparent",',
      '            color: tokens.ink,',
      `            border: \`\${tokens.border}px solid \${tokens.line}\`,`,
      '            borderRadius: tokens.radiusSm,',
      '            padding: "10px 16px",',
      '            fontWeight: 600,',
      '            cursor: "pointer",',
      '          }}',
      '        >',
      '          {live ? "Live: on" : "Live: off"}',
      '        </button>',
      '      </div>',
      '    </section>',
      '  );',
      '}'
    ].join('\n');
  }

  function codeFor(kind) {
    if (codeCache.has(kind)) return codeCache.get(kind);
    const map = { text: () => promptText(style), md: () => mdText(style), tailwind: () => tailwindText(style), react: () => reactText(style) };
    const val = (map[kind] || map.text)();
    codeCache.set(kind, val);
    return val;
  }

  /* ------------------------------------------------------------- kit vars */
  function kitVars(style, mode) {
    const pal = A.palette(style, mode);
    const ink = A.parseColor(pal.ink);
    const acc = A.parseColor(pal.accent);
    const r = style.r == null ? 12 : Math.min(style.r, 40);
    const bw = style.bw == null ? 1 : Math.max(1, style.bw);
    const line = A.alpha(ink, pal.dark ? 0.24 : 0.16);
    const vibe = style.vibe;
    // A dark-only style seen on the light surface should read as paper, not as a grey slab.
    const surf = A.parseColor(pal.surface);
    const spread = surf ? Math.max(surf.r, surf.g, surf.b) - Math.min(surf.r, surf.g, surf.b) : 99;
    const mean = surf ? (surf.r + surf.g + surf.b) / 3 : 255;
    const surface = !pal.dark && spread <= 12 && mean < 236
      ? A.mix(surf, { r: 255, g: 255, b: 255, a: 1 }, 0.62)
      : pal.surface;
    let panel = surface;
    let blur = 'none';
    let sh = shadowOf(style, pal);
    let btnSh = 'none';
    let btnLine = line;
    let input = A.mix(A.parseColor(surface), ink, 0.04);

    if (vibe === 'glass') {
      panel = pal.dark ? 'rgba(255,255,255,.075)' : 'rgba(255,255,255,.58)';
      blur = 'blur(18px) saturate(150%)';
      sh = '0 18px 44px -22px rgba(0,0,0,.5)';
      btnSh = '0 10px 24px -12px ' + A.alpha(acc, 0.7);
    } else if (vibe === 'hard') {
      panel = A.mix(A.parseColor(surface), ink, 0.02);
      sh = `${Math.max(4, bw * 2)}px ${Math.max(4, bw * 2)}px 0 ${pal.ink}`;
      btnSh = `${Math.max(3, bw * 2)}px ${Math.max(3, bw * 2)}px 0 ${pal.ink}`;
      btnLine = pal.ink;
    } else if (vibe === 'neon') {
      panel = pal.dark
        ? A.alpha(A.parseColor(A.mix(A.parseColor(surface), { r: 0, g: 0, b: 0, a: 1 }, 0.35)), 0.72)
        : A.alpha(A.parseColor(A.mix(A.parseColor(surface), { r: 0, g: 0, b: 0, a: 1 }, 0.03)), 0.94);
      sh = `0 0 26px ${A.alpha(acc, 0.35)}, inset 0 0 0 1px ${A.alpha(acc, 0.3)}`;
      btnSh = `0 0 18px ${A.alpha(acc, 0.5)}`;
      btnLine = A.alpha(acc, 0.55);
    } else if (vibe === 'clay') {
      panel = surface;
      sh = 'inset -4px -4px 10px rgba(0,0,0,.10), inset 3px 3px 8px rgba(255,255,255,.6), 0 14px 26px rgba(0,0,0,.12)';
      btnSh = '0 6px 0 ' + A.alpha(ink, 0.18);
      btnLine = 'transparent';
    } else if (vibe === 'soft') {
      sh = pal.dark
        ? '10px 10px 22px rgba(0,0,0,.45), -8px -8px 20px rgba(255,255,255,.04)'
        : '10px 10px 22px rgba(0,0,0,.12), -8px -8px 20px rgba(255,255,255,.9)';
      btnSh = pal.dark ? '4px 4px 12px rgba(0,0,0,.5)' : '4px 4px 12px rgba(0,0,0,.14)';
      btnLine = 'transparent';
    } else {
      btnSh = '0 4px 12px ' + A.alpha(acc, 0.22);
    }

    return [
      `--kp:${pal.accent}`,
      `--ka1:${pal.accents[0] || pal.accent}`,
      `--ka2:${pal.accents[1] || pal.accents[0] || pal.accent}`,
      `--kptext:${pal.accentText || pal.accent}`,
      `--kp-ink:${pal.onAccent}`,
      `--ki:${pal.ink}`,
      `--ks:${surface}`,
      `--kl:${line}`,
      `--kr:${r}px`,
      `--kbw:${bw}px`,
      `--ksh:${sh}`,
      `--kpanel:${panel}`,
      `--kinput:${input}`,
      `--kbtnline:${btnLine}`,
      `--kbtnsh:${btnSh}`,
      `--kblur:${blur}`
    ].join(';');
  }

  /* --------------------------------------------------------------- pieces */
  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.6 9.7l5.8-.8L12 3.6Z"/></svg>';
  const PLUS = '<svg class="ic" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M9 3.5v11M3.5 9h11"/></svg>';

  function kitHTML() {
    const bars = [42, 61, 38, 74, 52, 88, 66, 96, 58, 79, 70, 91];
    return `
      <div class="kit-stage" style="${kitVars(style, scheme)}">
        <div class="kit">
          <div class="kit-card">
            <div class="kit-row" style="justify-content:space-between;align-items:flex-start">
              <h4>${A.t('previewCardTitle')}</h4>
              <span class="kit-badge">${A.t('previewBadgeNew')}</span>
            </div>
            <div class="kit-metric"><b>${A.t('previewMetric')}</b><span class="kit-trend">${A.t('previewTrend')}</span></div>
            <p class="kit-desc">${A.t('previewCardDesc')}</p>
            <div class="kit-spark" aria-hidden="true">${bars.map((h) => `<i style="height:${h}%"></i>`).join('')}</div>
            <div class="kit-row" style="margin-top:16px">
              <button class="kit-btn" type="button">${A.t('previewPrimary')}</button>
              <button class="kit-btn" type="button" data-variant="soft">${A.t('previewSecondary')}</button>
              <button class="kit-btn" type="button" data-variant="ghost">${A.t('previewGhost')}</button>
            </div>
          </div>
          <div class="kit-side">
            <div class="kit-card">
              <div class="kit-field">
                <label for="kitEmail">${A.t('previewEmail')}</label>
                <input id="kitEmail" type="email" placeholder="${A.t('previewEmailPh')}" autocomplete="off">
              </div>
              <div class="kit-row" style="margin-top:12px">
                <span class="kit-badge">${A.t('previewBadgePro')}</span>
                <span class="kit-badge">${A.t('previewBadgeNew')}</span>
              </div>
              <div class="kit-tabs" role="tablist" aria-label="Preview tabs" style="margin-top:14px">
                <button type="button" role="tab" aria-selected="true">${A.t('previewTab1')}</button>
                <button type="button" role="tab" aria-selected="false">${A.t('previewTab2')}</button>
                <button type="button" role="tab" aria-selected="false">${A.t('previewTab3')}</button>
              </div>
            </div>
            <div class="kit-card">
              <div class="kit-switch" data-on="false" role="switch" tabindex="0" aria-checked="false">
                <span>${A.t('previewSwitch')}</span><span class="track"></span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function pointerHTML() {
    const vars = kitVars(style, scheme);
    return `
      <div class="pointer-grid">
        <div class="px px-spot" style="${vars}">
          <div>
            <h4>${A.t('pxSpotTitle')}</h4>
            <p>${A.t('pxSpotDesc')}</p>
          </div>
          <div class="px-demo"><div class="px-target">${A.t('previewCardTitle')} · ${A.t('previewMetric')}</div></div>
          <span class="px-note">${A.icon('spark')}${A.t('pxHint')}</span>
        </div>
        <div class="px px-magnet" style="${vars}">
          <div>
            <h4>${A.t('pxMagnetTitle')}</h4>
            <p>${A.t('pxMagnetDesc')}</p>
          </div>
          <div class="px-demo"><button class="magnet" type="button">${A.t('pxMagnetBtn')}</button></div>
          <span class="px-note">${A.icon('arrow')}${A.t('sec2')}</span>
        </div>
        <div class="px px-tilt" style="${vars}">
          <div>
            <h4>${A.t('pxTiltTitle')}</h4>
            <p>${A.t('pxTiltDesc')}</p>
          </div>
          <div class="px-demo">
            <div class="tilt-card"><div class="tl"><i></i><span>${A.t('previewTab1')}</span></div><div class="tb"></div><div class="tb s"></div></div>
          </div>
          <span class="px-note">${A.icon('spark')}${A.t('pxHint')}</span>
        </div>
        <div class="px px-ripple" style="${vars}">
          <div>
            <h4>${A.t('pxRippleTitle')}</h4>
            <p>${A.t('pxRippleDesc')}</p>
          </div>
          <div class="px-demo"><button class="ripple-btn" type="button">${A.t('pxRippleBtn')}</button></div>
          <span class="px-note">${A.icon('arrow')}${A.t('sec2')}</span>
        </div>
      </div>`;
  }

  /* -------------------------------------------------------------- ratings */
  const ratingKey = () => 'atlas:rating:' + style.id;
  function ratingLog() {
    try {
      const raw = JSON.parse(localStorage.getItem(ratingKey()) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  }
  function saveRating(entry) {
    const all = ratingLog();
    all.unshift(entry);
    try { localStorage.setItem(ratingKey(), JSON.stringify(all.slice(0, 20))); } catch { /* ignore */ }
  }

  function ratingHTML() {
    const log = ratingLog();
    const last = log[0] || null;
    const score = draft.score || (last && last.score) || 0;
    const chips = draft.chips.length ? draft.chips : (last && last.chips) || [];
    const note = draft.note || (last && last.note) || '';
    const chipLabels = [A.t('rateChip1'), A.t('rateChip2'), A.t('rateChip3')];
    return `
      <div class="rating-wrap">
        <div class="panel rate-card">
          <h3 style="font-size:15px;font-weight:650">${A.t('rateTitle')}</h3>
          <p class="rate-hint" style="margin-top:4px">${A.t('rateDesc')}</p>
          <div class="rate-stars" role="group" aria-label="${A.t('rateTitle')}">
            ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-score="${n}" data-on="${n <= score}" aria-label="${n} / 5" aria-pressed="${n <= score}">${STAR}</button>`).join('')}
          </div>
          <div class="fb-chips" role="group">
            ${chipLabels.map((c, i) => `<button type="button" data-chip="${i}" aria-pressed="${chips.includes(i)}">${c}</button>`).join('')}
          </div>
          <textarea class="fb-text" id="fbNote" placeholder="${A.t('ratePh')}" maxlength="280">${A.escapeHTML(note)}</textarea>
          <div class="rate-foot">
            <span class="rate-log" id="rateLog">${last ? A.t('rateThanks') : A.t('rateVotes')}</span>
            <span style="display:flex;gap:8px">
              <button class="btn btn-ghost btn-sm" type="button" id="rateReset">${A.t('rateReset')}</button>
              <button class="btn btn-primary btn-sm" type="button" id="rateSave">${A.t('rateSubmit')}</button>
            </span>
          </div>
        </div>
        <div class="panel rate-card">
          <span class="sec-index">LOCAL LOG</span>
          <div style="display:flex;align-items:baseline;gap:10px;margin-top:12px">
            <b style="font-size:40px;font-weight:650;letter-spacing:-0.03em;line-height:1">${score ? score.toFixed(1) : '—'}</b>
            <span class="rate-log">${A.t('rateAvg')}</span>
          </div>
          <p class="rate-log" style="margin-top:6px">${A.t('rateSavedCount', { n: log.length })}</p>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
            ${log.length ? '' : `<div style="border:1px dashed var(--line-strong);border-radius:12px;padding:14px 14px;font-size:12px;color:var(--ink-3);line-height:1.5">${A.t('rateEmpty')}</div>`}
            ${log.slice(0, 3).map((r) => `
              <div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface-2)">
                <div style="font-size:12px;font-weight:600">${'★'.repeat(r.score || 0)}${'☆'.repeat(5 - (r.score || 0))} <span style="color:var(--ink-3);font-weight:400">${(r.chips || []).map((i) => chipLabels[i]).filter(Boolean).join(' · ')}</span></div>
                ${r.note ? `<div style="font-size:12px;color:var(--ink-2);margin-top:4px">${A.escapeHTML(r.note)}</div>` : ''}
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  }

  /* ---------------------------------------------------------------- render */
  function renderHead() {
    const sp = spec(style);
    const swatches = uniqColors([sp.light.accent, sp.light.ink, sp.light.surface].concat(sp.accents.slice(0, 2)))
      .map((c) => `<span class="sw" style="background:${c}" title="${c}"></span>`).join('');
    return `
      <div class="detail-head">
        <div class="wrap">
          <div class="crumbs">
            <a href="index.html">${A.t('detailBack')}</a>
            ${A.icon('chev')}
            <span>${A.t('cat' + style.cat[0].toUpperCase() + style.cat.slice(1))}</span>
            ${A.icon('chev')}
            <span>${A.escapeHTML(A.styleName(style))}</span>
          </div>
          <div class="detail-title-row">
            <div class="detail-title">
              <h1>${A.escapeHTML(A.styleName(style))}</h1>
              <div class="alt">${A.escapeHTML(A.styleAltName(style))}${style.no ? ' · #' + style.no : ''}</div>
              <p class="detail-desc">${A.escapeHTML(A.styleDesc(style))}</p>
              <div class="detail-chips">
                <span class="tag accent">${A.t('cat' + style.cat[0].toUpperCase() + style.cat.slice(1))}</span>
                <span class="tag">${sourceLabel(style)}</span>
                <span class="tag">${style.vibe} · ${sp.radius}px</span>
                <a class="tag" href="${sourceURL(style)}" target="_blank" rel="noopener">${sourceHost(style)} ↗</a>
                ${style.demo ? `<a class="tag accent" href="${style.demo}">${A.t('detailDemo')} ↗</a>` : ''}
              </div>
            </div>
            <aside class="detail-side">
              <div class="palette">${swatches}</div>
              <div class="mono" style="font-size:11.5px;color:var(--ink-3);line-height:1.9;text-align:end">
                surface ${sp.light.surface}<br>
                ink ${sp.light.ink} · accent ${sp.light.accent}<br>
                radius ${sp.radius}px · border ${sp.bw}px
              </div>
              <div class="detail-actions">
                <button class="btn btn-ghost btn-sm" type="button" id="copyPrompt">${A.icon('spark')}${A.t('aiCopy')} ${A.t('aiTabText')}</button>
                ${style.demo ? `<a class="btn btn-primary btn-sm" href="${style.demo}">${A.t('detailDemo')}${A.icon('external')}</a>` : ''}
              </div>
            </aside>
          </div>
        </div>
      </div>`;
  }

  function renderSubnav() {
    const items = [
      ['preview', A.t('sec1')],
      ['pointer', A.t('sec2')],
      ['rating', A.t('sec3')],
      ['ai', A.t('sec4')],
      ['faq', A.t('sec5')]
    ];
    return `<nav class="subnav" aria-label="Sections"><div class="wrap subnav-inner">
      ${items.map(([id, label]) => `<a href="#sec-${id}" data-target="${id}">${label}</a>`).join('')}
    </div></nav>`;
  }

  function renderPreview() {
    return `
      <section class="section" id="sec-preview" data-section="preview">
        <div class="section-head">
          <div>
            <span class="sec-index">01 / 05</span>
            <h2>${A.t('sec1')}</h2>
            <p>${A.t('sec1Desc')}</p>
          </div>
          <div class="seg" role="group" aria-label="${A.t('previewSurface')}">
            <button type="button" data-scheme="light" aria-pressed="${scheme === 'light'}">${A.t('previewLight')}</button>
            <button type="button" data-scheme="dark" aria-pressed="${scheme === 'dark'}">${A.t('previewDark')}</button>
          </div>
        </div>
        <div class="panel" id="previewPanel">${kitHTML()}</div>
      </section>`;
  }

  function renderPointer() {
    return `
      <section class="section" id="sec-pointer" data-section="pointer">
        <div class="section-head">
          <div>
            <span class="sec-index">02 / 05</span>
            <h2>${A.t('sec2')}</h2>
            <p>${A.t('sec2Desc')}</p>
          </div>
        </div>
        ${pointerHTML()}
      </section>`;
  }

  function renderRating() {
    return `
      <section class="section" id="sec-rating" data-section="rating">
        <div class="section-head">
          <div>
            <span class="sec-index">03 / 05</span>
            <h2>${A.t('sec3')}</h2>
            <p>${A.t('sec3Desc')}</p>
          </div>
        </div>
        ${ratingHTML()}
      </section>`;
  }

  function renderAI() {
    const sp = spec(style);
    const tabs = [
      ['text', A.t('aiTabText')],
      ['md', A.t('aiTabMd')],
      ['tailwind', A.t('aiTabTailwind')],
      ['react', A.t('aiTabReact')]
    ];
    return `
      <section class="section" id="sec-ai" data-section="ai">
        <div class="section-head">
          <div>
            <span class="sec-index">04 / 05</span>
            <h2>${A.t('sec4')}</h2>
            <p>${A.t('sec4Desc')}</p>
          </div>
        </div>
        <div class="panel">
          <div class="panel-bar">
            <div class="ai-tabs" role="tablist" aria-label="${A.t('sec4')}">
              ${tabs.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}">${label}</button>`).join('')}
            </div>
            <div class="code-actions">
              <button class="btn btn-ghost btn-sm" type="button" id="dlMd">${A.t('aiDownload')}</button>
              <button class="btn btn-primary btn-sm" type="button" id="copyCode">${A.t('aiCopy')}</button>
            </div>
          </div>
          <div class="code-wrap">
            <pre class="code" id="codeBlock" tabindex="0" aria-label="${A.t('sec4')}">${A.escapeHTML(codeFor(tab))}</pre>
          </div>
          <div class="panel-pad" style="padding-top:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;border-top:1px solid var(--line)">
            <span class="tag accent">${sp.radius}px radius</span>
            <span class="tag">${sp.bw}px border</span>
            <span class="tag">${sp.light.surface}</span>
            <span class="tag">${sp.light.accent}</span>
            <span class="rate-log" style="font-size:12px">${A.t('aiNote')}</span>
          </div>
        </div>
      </section>`;
  }

  function renderFAQ() {
    const sp = spec(style);
    const qa = [
      [A.t('faqQ1', { name: style.n }), A.t('faqA1', {
        name: style.n,
        cat: A.t('cat' + style.cat[0].toUpperCase() + style.cat.slice(1)).toLowerCase(),
        bg: sp.light.surface,
        ink: sp.light.ink,
        n: (style.colors.a || []).length,
        r: sp.radius,
        bw: sp.bw
      })],
      [A.t('faqQ2'), A.t('faqA2')],
      [A.t('faqQ3'), A.t('faqA3')],
      [A.t('faqQ4'), A.t('faqA4')],
      [A.t('faqQ5'), A.t('faqA5', { source: sourceLabel(style), link: sourceURL(style) })]
    ];
    return `
      <section class="section" id="sec-faq" data-section="faq">
        <div class="section-head">
          <div>
            <span class="sec-index">05 / 05</span>
            <h2>${A.t('sec5')}</h2>
            <p>${A.t('sec5Desc')}</p>
          </div>
        </div>
        <div class="faq">
          ${qa.map(([q, a], i) => `
            <details ${i === 0 ? 'open' : ''}>
              <summary>${q}${PLUS}</summary>
              <div class="ans">${a}</div>
            </details>`).join('')}
        </div>
      </section>`;
  }

  function renderPager() {
    const list = A.styles;
    const i = list.findIndex((s) => s.id === style.id);
    const prev = list[(i - 1 + list.length) % list.length];
    const next = list[(i + 1) % list.length];
    return `
      <div class="pager">
        <a href="style.html?s=${encodeURIComponent(prev.id)}"><small>← ${A.t('prev')}</small><b>${A.escapeHTML(A.styleName(prev))}</b></a>
        <a class="next" href="style.html?s=${encodeURIComponent(next.id)}"><small>${A.t('next')} →</small><b>${A.escapeHTML(A.styleName(next))}</b></a>
      </div>`;
  }

  function render() {
    const root = $('#detailRoot');
    if (!root || !style) return;
    root.innerHTML = renderHead() + renderSubnav() + `<div class="wrap">
      ${renderPreview()}${renderPointer()}${renderRating()}${renderAI()}${renderFAQ()}${renderPager()}
    </div>`;
    bind();
    document.title = `${A.styleName(style)} — ${A.t('brand')}`;
  }

  /* ----------------------------------------------------------------- bind */
  function bind() {
    // surface switch
    $$('#sec-preview [data-scheme]').forEach((b) => {
      b.addEventListener('click', () => {
        scheme = b.dataset.scheme;
        $$('#sec-preview [data-scheme]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        $('#previewPanel').innerHTML = kitHTML();
        bindKit();
        const pointerSec = $('#sec-pointer');
        if (pointerSec) {
          pointerSec.outerHTML = renderPointer();
          bindPointer();
        }
      });
    });

    bindKit();
    bindPointer();
    bindRating();
    bindAI();
    bindCopyButtons();
    observeSections();
  }

  function bindKit() {
    const sw = $('#previewPanel .kit-switch');
    if (sw) {
      const toggle = () => {
        const on = sw.dataset.on !== 'true';
        sw.dataset.on = String(on);
        sw.setAttribute('aria-checked', String(on));
      };
      sw.addEventListener('click', toggle);
      sw.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      });
    }
    $$('#previewPanel .kit-btn').forEach((b) => {
      b.addEventListener('click', () => A.toast(A.t('previewPrimary')));
    });
    $$('#previewPanel .kit-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        $$('#previewPanel .kit-tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      });
    });
  }

  function bindPointer() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const spot = $('.px-spot');
    if (spot) {
      spot.addEventListener('pointermove', (e) => {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        spot.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    }

    const magnetWrap = $('.px-magnet');
    const magnet = magnetWrap && magnetWrap.querySelector('.magnet');
    if (magnet) {
      magnetWrap.addEventListener('pointermove', (e) => {
        const r = magnet.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / 6;
        const dy = (e.clientY - (r.top + r.height / 2)) / 6;
        magnet.style.transform = `translate(${Math.max(-14, Math.min(14, dx))}px, ${Math.max(-14, Math.min(14, dy))}px)`;
      });
      magnetWrap.addEventListener('pointerleave', () => { magnet.style.transform = ''; });
    }

    const tiltWrap = $('.px-tilt');
    const tilt = tiltWrap && tiltWrap.querySelector('.tilt-card');
    if (tilt) {
      tiltWrap.addEventListener('pointermove', (e) => {
        const r = tiltWrap.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = `rotateX(${(-py * 12).toFixed(2)}deg) rotateY(${(px * 14).toFixed(2)}deg)`;
      });
      tiltWrap.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
    }

    const rippleBtn = $('.ripple-btn');
    if (rippleBtn) {
      rippleBtn.addEventListener('pointerdown', (e) => {
        const r = rippleBtn.getBoundingClientRect();
        const size = Math.max(r.width, r.height) * 2.2;
        const span = document.createElement('span');
        span.className = 'rp';
        span.style.width = span.style.height = size + 'px';
        span.style.left = e.clientX - r.left + 'px';
        span.style.top = e.clientY - r.top + 'px';
        rippleBtn.appendChild(span);
        setTimeout(() => span.remove(), 700);
      });
    }
  }

  function bindRating() {
    $$('.rate-stars button').forEach((b) => {
      b.addEventListener('click', () => {
        draft.score = Number(b.dataset.score);
        $$('.rate-stars button').forEach((x) => {
          const on = Number(x.dataset.score) <= draft.score;
          x.dataset.on = String(on);
          x.setAttribute('aria-pressed', String(on));
        });
        const big = $('#sec-rating .rate-card b');
        if (big) big.textContent = draft.score.toFixed(1);
      });
    });
    $$('.fb-chips button').forEach((b) => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.chip);
        if (draft.chips.includes(i)) draft.chips = draft.chips.filter((x) => x !== i);
        else draft.chips.push(i);
        b.setAttribute('aria-pressed', String(draft.chips.includes(i)));
      });
    });
    const note = $('#fbNote');
    if (note) note.addEventListener('input', () => { draft.note = note.value; });

    const save = $('#rateSave');
    if (save) {
      save.addEventListener('click', () => {
        if (!draft.score) { A.toast(A.t('rateNeed')); return; }
        saveRating({ score: draft.score, chips: draft.chips.slice(), note: draft.note.trim(), at: Date.now() });
        draft.note = '';
        A.toast(A.t('rateThanks'));
        const sec = $('#sec-rating');
        if (sec) {
          sec.querySelector('.rating-wrap').outerHTML = ratingHTML();
          bindRating();
        }
      });
    }
    const reset = $('#rateReset');
    if (reset) {
      reset.addEventListener('click', () => {
        try { localStorage.removeItem(ratingKey()); } catch { /* ignore */ }
        draft.score = 0; draft.chips = []; draft.note = '';
        const sec = $('#sec-rating');
        if (sec) {
          sec.querySelector('.rating-wrap').outerHTML = ratingHTML();
          bindRating();
        }
      });
    }
  }

  function bindAI() {
    $$('.ai-tabs [data-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        tab = b.dataset.tab;
        $$('.ai-tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
        const code = $('#codeBlock');
        if (code) code.textContent = codeFor(tab);
      });
    });
    const dl = $('#dlMd');
    if (dl) {
      dl.addEventListener('click', () => {
        const blob = new Blob([mdText(style)], { type: 'text/markdown;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = style.id + '-DESIGN.md';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        return true;
      } catch { return false; }
    }
  }

  function bindCopyButtons() {
    const copyBtn = $('#copyCode');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const ok = await copy(codeFor(tab));
        if (ok) A.toast(A.t('toastCopied'));
      });
    }
    const cp = $('#copyPrompt');
    if (cp) {
      cp.addEventListener('click', async () => {
        const ok = await copy(promptText(style));
        if (ok) A.toast(A.t('toastCopied'));
      });
    }
  }

  /* -------------------------------------------------------------- spy/nav */
  function observeSections() {
    const links = $$('.subnav a');
    if (!links.length) return;
    const secs = SECTION_IDS.map((id) => $('#sec-' + id)).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.dataset.section;
        links.forEach((l) => l.dataset.active = String(l.dataset.target === id));
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    secs.forEach((s) => io.observe(s));
  }

  /* ----------------------------------------------------------------- init */
  function pickStyle() {
    const params = new URLSearchParams(location.search);
    const id = params.get('s');
    const list = (window.CATALOG && window.CATALOG.styles) || [];
    style = list.find((s) => s.id === id) || list.find((s) => s.sk === id) || list[0];
    if (!style) return false;
    if (id !== style.id) {
      try { history.replaceState(null, '', 'style.html?s=' + encodeURIComponent(style.id)); } catch { }
    }
    scheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    return true;
  }

  function start() {
    if (!pickStyle()) return;
    render();
    document.addEventListener('atlas:lang', () => {
      // preserve typed feedback, rebuild everything else
      const note = $('#fbNote');
      if (note) draft.note = note.value;
      codeCache.clear();
      render();
    });
    document.addEventListener('atlas:theme', () => {
      if (!style) return;
      const pointerSec = $('#sec-pointer');
      if (pointerSec) pointerSec.outerHTML = renderPointer();
      bindPointer();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

})();
