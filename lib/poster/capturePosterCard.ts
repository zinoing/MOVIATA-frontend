/**
 * Captures the PosterCard as a PNG by compositing two layers:
 *
 * Layer 1 — Card UI (text, stats, avatars):
 *   html-to-image captures captureTarget at pixelRatio:3 for sharp output.
 *
 *   LEFT-OFFSET FIX:
 *   html-to-image uses getBoundingClientRect().left as SVG x-origin.
 *   Fix: hide map container first (so MapLibre can't resize), then apply
 *   position:fixed + left:0 to captureTarget so its left === 0.
 *   Safe because map is already hidden — no WebGL resize event fires.
 *
 *   TITLE LINE-BREAK FIX:
 *   Replace \n in h1 with block spans before capture so SVG renders the
 *   same line break regardless of font metrics in foreignObject context.
 *
 *   AVATAR IMAGE FIX:
 *   html-to-image fetches all <img> srcs in parallel and re-encodes them as
 *   base64. When two proxy URLs are fetched concurrently, response ordering
 *   is not guaranteed — the second avatar's data can end up in the first
 *   <img> slot (race condition). Fix: pre-fetch every avatar URL ourselves,
 *   replace each img.src with its base64 data URL before calling toPng, then
 *   restore the original srcs afterwards.
 *
 *   KOREAN FONT FIX:
 *   NanumSonPyeonjiche is 2.6 MB WOFF2 (~3.5 MB base64). Embedding it in the
 *   SVG foreignObject (as html-to-image requires for custom fonts) makes the
 *   SVG too large and causes silent failure — the same problem noted for Inter.
 *   Fix: hide the h1 during html-to-image capture (visibility:hidden preserves
 *   layout), then re-draw the title on the output canvas with Canvas 2D, which
 *   can use document.fonts directly without base64 embedding.
 *
 * Layer 2 — Map snapshot:
 *   The pre-captured map PNG is drawn directly onto the output canvas at the
 *   map container's position relative to the card, measured at runtime via
 *   getBoundingClientRect.
 *
 * Layer 3 — Korean title overlay (only when title contains Korean):
 *   Canvas 2D fillText with NanumSonPyeonjiche / Belmonte per script segment.
 */

/**
 * Fetches every <img> inside el, converts each to a base64 data URL, and
 * replaces img.src in-place. Returns a Map of img → original src so the
 * caller can restore them after capture.
 *
 * Images that already have a data: src or have no src are skipped.
 * Fetch failures are silently ignored (original src left unchanged).
 */
async function inlineImages(el: HTMLElement): Promise<Map<HTMLImageElement, string>> {
  const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
  const saved = new Map<HTMLImageElement, string>();

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.src;
      if (!src || src.startsWith('data:')) return;

      saved.set(img, src);

      try {
        const res = await fetch(src, { credentials: 'omit' });
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.src = dataUrl;
        await img.decode().catch(() => {});
      } catch {
        // fetch 실패 시 원본 src 유지, Map에서 제거해 복원 대상에서 제외
        saved.delete(img);
      }
    }),
  );

  return saved;
}

import { POSTER_W, POSTER_H } from './dimensions';

// Fetches the poster's custom fonts and returns @font-face CSS with base64
// data URLs. This bypasses html-to-image's own font-fetching which silently
// fails on first page load when the font file is not yet in the HTTP cache,
// causing the SVG foreignObject to fall back to a wider system font and
// truncate text that fits only with the custom font.
async function buildEmbeddedFontCSS(): Promise<string> {
  // Only embed Belmonte Ballpoint Print — the font that causes visible
  // truncation when missing. Inter and NanumSonPyeonjiche are both large
  // enough to bloat the SVG and cause html-to-image to produce a blank layer.
  // Korean titles are handled by Canvas 2D overlay (Layer 3) instead.
  const fontDefs = [
    {
      family: 'Belmonte Ballpoint Print',
      weight: '400',
      style: 'normal',
      url: '/fonts/Belmonte_Ballpoint/Webfonts/Woff2/Belmonte-Ballpoint-Print.woff2',
      format: 'woff2',
    },
  ];

  const rules = await Promise.all(
    fontDefs.map(async ({ family, weight, style, url, format }) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return '';
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return `@font-face{font-family:'${family}';src:url('${dataUrl}')format('${format}');font-weight:${weight};font-style:${style};}`;
      } catch {
        return '';
      }
    }),
  );

  return rules.filter(Boolean).join('\n');
}

// --- Korean title canvas overlay helpers ---

function isKoreanChar(ch: string) {
  return /[가-힣]/.test(ch);
}

type TitleSegment = { text: string; korean: boolean };

function splitByScript(text: string): TitleSegment[] {
  if (!text) return [];
  const segs: TitleSegment[] = [];
  let cur = text[0]!;
  let curKorean = isKoreanChar(text[0]!);
  for (let i = 1; i < text.length; i++) {
    const k = isKoreanChar(text[i]!);
    if (k === curKorean) {
      cur += text[i];
    } else {
      segs.push({ text: cur, korean: curKorean });
      cur = text[i]!;
      curKorean = k;
    }
  }
  segs.push({ text: cur, korean: curKorean });
  return segs;
}

// Draws the poster title directly onto an existing canvas with the correct
// per-segment fonts (NanumSonPyeonjiche for Korean, Belmonte for Latin).
// Called after html-to-image capture when the h1 was hidden (visibility:hidden).
async function drawMixedTitle(
  ctx: CanvasRenderingContext2D,
  titleText: string,
  h1El: HTMLElement,
  cardRect: DOMRect,
  displayScale: number,
  pixelRatio: number,
): Promise<void> {
  const computed = window.getComputedStyle(h1El);
  // fontSize is in CSS px at zoom:1 scale; scale to canvas pixels
  const fontSizePx = (parseFloat(computed.fontSize) / displayScale) * pixelRatio;
  const color = computed.color;

  // Ensure NanumSonPyeonjiche is loaded via FontFace API.
  // document.fonts.load was already called earlier; this is a fast no-op if ready.
  if (!document.fonts.check(`400 ${fontSizePx}px "NanumSonPyeonjiche"`)) {
    try {
      const face = new FontFace(
        'NanumSonPyeonjiche',
        'url(/fonts/NanumSonPyeonjiche/NanumSonPyeonjiche.woff2)',
      );
      await face.load();
      document.fonts.add(face);
    } catch {
      // If font load fails, canvas falls back to system Korean font — acceptable.
    }
  }

  const segs = splitByScript(titleText);

  const setSegFont = (seg: TitleSegment) => {
    if (seg.korean) {
      ctx.font = `400 ${fontSizePx}px "NanumSonPyeonjiche"`;
    } else {
      ctx.font = `700 ${fontSizePx}px "Belmonte Ballpoint Print"`;
    }
  };

  const segText = (seg: TitleSegment) =>
    seg.korean ? seg.text : seg.text.toUpperCase();

  // Measure total rendered width for centering
  let totalWidth = 0;
  for (const seg of segs) {
    setSegFont(seg);
    totalWidth += ctx.measureText(segText(seg)).width;
  }

  // Vertical center: midpoint of h1 bounding box, converted to canvas coords
  const h1Rect = h1El.getBoundingClientRect();
  const centerY =
    ((h1Rect.top - cardRect.top + h1Rect.height / 2) / displayScale) * pixelRatio;

  ctx.save();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';

  let x = (ctx.canvas.width - totalWidth) / 2;
  for (const seg of segs) {
    setSegFont(seg);
    const t = segText(seg);
    ctx.fillText(t, x, centerY);
    x += ctx.measureText(t).width;
  }

  ctx.restore();
}

export async function capturePosterCard(
  el: HTMLElement,
  mapDataUrl: string | null,
): Promise<string> {
  const PIXEL_RATIO = 3;

  const { toPng } = await import('html-to-image');

  const webglCanvas = el.querySelector<HTMLCanvasElement>('.maplibregl-canvas');
  const mapContainer = el.querySelector<HTMLElement>('.maplibregl-map');

  const effectiveMapDataUrl =
    mapDataUrl ??
    (webglCanvas
      ? (() => {
          try { return webglCanvas.toDataURL('image/png'); } catch { return null; }
        })()
      : null);

  const cardRoot = el.firstElementChild as HTMLElement | null;
  const captureTarget = cardRoot ?? el;
  const cardW = POSTER_W;
  const cardH = POSTER_H;

  // Step 1: hide map container FIRST so MapLibre cannot receive resize events
  // when we later change captureTarget's position
  const savedMapDisplay = mapContainer?.style.display ?? '';
  if (mapContainer) mapContainer.style.display = 'none';

  const controls = el.querySelectorAll<HTMLElement>(
    '.maplibregl-ctrl-top-left, .maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right, [data-no-capture]',
  );
  controls.forEach((o) => { o.style.display = 'none'; });

  // Step 2: fix captureTarget at (0,0) so getBoundingClientRect().left === 0
  // Safe now because map is hidden and WebGL can't detect the layout change
  const savedBg = captureTarget.style.backgroundColor;
  const savedShadow = captureTarget.style.boxShadow;
  const savedPosition = captureTarget.style.position;
  const savedLeft = captureTarget.style.left;
  const savedTop = captureTarget.style.top;
  const savedZIndex = captureTarget.style.zIndex;
  const savedWidth = captureTarget.style.width;
  const savedZoom = captureTarget.style.zoom;

  captureTarget.style.backgroundColor = 'transparent';
  captureTarget.style.boxShadow = 'none';
  captureTarget.style.position = 'fixed';
  captureTarget.style.left = '0';
  captureTarget.style.top = '0';
  captureTarget.style.width = `${cardW}px`;
  captureTarget.style.zIndex = '-1';
  // Override any inherited CSS zoom (e.g. from mobile zoom-out on pageRef).
  // In Safari, a child's explicit zoom: 1 overrides the ancestor's value,
  // so html-to-image sees the element at its natural POSTER_W width.
  captureTarget.style.zoom = '1';

  // Step 3: replace \n in h1 with block spans for consistent line breaks
  const h1 = captureTarget.querySelector<HTMLElement>('h1');
  const savedH1Html = h1?.innerHTML ?? null;
  const savedH1WhiteSpace = h1?.style.whiteSpace ?? '';

  if (h1 && h1.textContent?.includes('\n')) {
    const lines = h1.textContent.split('\n');
    h1.innerHTML = lines
      .map((line) => `<span style="display:block">${line}</span>`)
      .join('');
    h1.style.whiteSpace = 'normal';
  }

  // Step 4: measure positions NOW — after card is forced to POSTER_W width
  // with zoom cancelled (≈ natural CSS pixels). getBoundingClientRect() forces
  // synchronous layout recomputation, so we get the 428px layout coordinates.
  //
  // mapContainer is already display:none, so we measure its grandparent
  // (ActivityMap outer div) which stays visible and keeps its aspect-ratio size.
  const captureCardRect = captureTarget.getBoundingClientRect();
  const mapFrameEl = mapContainer?.parentElement?.parentElement ?? null;
  const mapFrameRect = mapFrameEl?.getBoundingClientRect() ?? null;
  // With zoom cancelled, captureCardRect.width ≈ cardW, so displayScale ≈ 1.
  const displayScale = captureCardRect.width > 0 ? captureCardRect.width / cardW : 1;
  const mapRelX = mapFrameRect ? (mapFrameRect.x - captureCardRect.x) / displayScale : 0;
  const mapRelY = mapFrameRect ? (mapFrameRect.y - captureCardRect.y) / displayScale : 0;
  const mapW = mapFrameRect ? mapFrameRect.width / displayScale : 0;
  const mapH = mapFrameRect ? mapFrameRect.height / displayScale : 0;

  // Detect Korean in title. If present:
  //   • hide h1 so html-to-image skips it (visibility:hidden preserves layout)
  //   • draw title on canvas after capture via Layer 3
  const h1Text = h1?.textContent ?? '';
  const hasKorean = /[가-힣]/.test(h1Text);
  const savedH1Visibility = h1?.style.visibility ?? '';

  // Build embedded font CSS and trigger browser font loads in parallel.
  // NanumSonPyeonjiche is intentionally excluded from SVG embedding — its
  // 2.6 MB WOFF2 (~3.5 MB base64) exceeds the safe SVG size limit.
  const fontLoads: Promise<unknown>[] = [
    buildEmbeddedFontCSS(),
    document.fonts.load('500 15px "EB Garamond"').catch(() => {}),
    document.fonts.load('400 16px "Belmonte Ballpoint Print"').catch(() => {}),
  ];
  if (hasKorean) {
    fontLoads.push(document.fonts.load('400 16px "NanumSonPyeonjiche"').catch(() => {}));
  }
  const [fontEmbedCSS] = await Promise.all(fontLoads);
  await document.fonts.ready;

  // Hide h1 for Korean titles so html-to-image leaves a clean background gap
  // that Layer 3 will fill with correctly-fonted canvas text.
  if (hasKorean && h1) {
    h1.style.visibility = 'hidden';
  }

  // Step 5: pre-fetch all avatar <img> srcs and replace with base64 data URLs.
  // html-to-image fetches images in parallel internally — without this step,
  // concurrent proxy URL responses can arrive out of order and the wrong avatar
  // ends up in the wrong <img> slot (race condition).
  const savedImgSrcs = await inlineImages(captureTarget);

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  try {
    // Warm-up call: populates html-to-image's internal resource cache with
    // font files. If fontEmbedCSS fetch succeeded, this is a no-op safety net.
    // If fontEmbedCSS is empty (fetch failed), this call fetches the @font-face
    // files and caches them so the real capture below always finds them.
    await toPng(captureTarget, {
      width: cardW,
      height: cardH,
      pixelRatio: 1,
      cacheBust: false,
      fontEmbedCSS: fontEmbedCSS as string,
    }).catch(() => {});

    // Layer 1: capture card UI with html-to-image at full pixel ratio
    const uiPng = await toPng(captureTarget, {
      pixelRatio: PIXEL_RATIO,
      width: cardW,
      height: cardH,
      cacheBust: false,
      fontEmbedCSS: fontEmbedCSS as string,
    });

    // Build output canvas
    const out = document.createElement('canvas');
    out.width = cardW * PIXEL_RATIO;
    out.height = cardH * PIXEL_RATIO;
    const ctx = out.getContext('2d')!;

    // Draw Layer 1: card UI
    const uiImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => img.naturalWidth === 0 ? reject(new Error('UI image broken')) : resolve(img);
      img.onerror = reject;
      img.src = uiPng;
    });
    ctx.drawImage(uiImg, 0, 0);

    // Draw Layer 2: map snapshot at measured position
    if (effectiveMapDataUrl && mapFrameRect) {
      const mapImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => img.naturalWidth === 0 ? reject(new Error('Map image broken')) : resolve(img);
        img.onerror = reject;
        img.src = effectiveMapDataUrl;
      });
      ctx.drawImage(
        mapImg,
        0, 0,
        mapImg.naturalWidth, mapImg.naturalHeight,
        Math.round(mapRelX * PIXEL_RATIO),
        Math.round(mapRelY * PIXEL_RATIO),
        Math.round(mapW * PIXEL_RATIO),
        Math.round(mapH * PIXEL_RATIO),
      );
    }

    // Layer 3: draw Korean (mixed-script) title directly on canvas.
    // Canvas 2D can use document.fonts without base64-embedding the font file,
    // bypassing the SVG size limit that makes html-to-image fail for large fonts.
    if (hasKorean && h1) {
      await drawMixedTitle(ctx, h1Text, h1, captureCardRect, displayScale, PIXEL_RATIO);
    }

    return out.toDataURL('image/png');
  } finally {
    // Restore inlined img srcs
    savedImgSrcs.forEach((src, img) => { img.src = src; });

    // Restore h1
    if (h1 && savedH1Html !== null) {
      h1.innerHTML = savedH1Html;
      h1.style.whiteSpace = savedH1WhiteSpace;
    }
    if (h1) h1.style.visibility = savedH1Visibility;

    // Restore captureTarget styles
    captureTarget.style.backgroundColor = savedBg;
    captureTarget.style.boxShadow = savedShadow;
    captureTarget.style.position = savedPosition;
    captureTarget.style.left = savedLeft;
    captureTarget.style.top = savedTop;
    captureTarget.style.zIndex = savedZIndex;
    captureTarget.style.width = savedWidth;
    captureTarget.style.zoom = savedZoom;

    // Restore map
    if (mapContainer) mapContainer.style.display = savedMapDisplay;
    if (webglCanvas) webglCanvas.style.display = '';
    controls.forEach((o) => { o.style.display = ''; });
  }
}
