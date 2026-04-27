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
 * Layer 2 — Map snapshot:
 *   The pre-captured map PNG is drawn directly onto the output canvas at the
 *   map container's position relative to the card, measured at runtime via
 *   getBoundingClientRect.
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
        // src 교체 후 완전히 decode될 때까지 기다려야 toPng()에서 빠지지 않음
        await img.decode().catch(() => {});
      } catch {
        // fetch 실패 시 이미 브라우저에 캐시된 이미지를 canvas로 직접 변환
        try {
          await new Promise<void>((resolve, reject) => {
            if (img.complete && img.naturalWidth > 0) { resolve(); return; }
            img.onload = () => resolve();
            img.onerror = reject;
          });
          const cvs = document.createElement('canvas');
          cvs.width = img.naturalWidth;
          cvs.height = img.naturalHeight;
          cvs.getContext('2d')!.drawImage(img, 0, 0);
          img.src = cvs.toDataURL('image/png');
        } catch {
          // canvas 변환도 실패 시 원본 src 유지
          saved.delete(img);
        }
      }
    }),
  );

  return saved;
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

  // Measure all positions BEFORE touching the DOM
  const cardRoot = el.firstElementChild as HTMLElement | null;
  const captureTarget = cardRoot ?? el;
  const cardRect = captureTarget.getBoundingClientRect();
  const mapRect = mapContainer?.getBoundingClientRect() ?? null;

  const mapRelX = mapRect ? mapRect.x - cardRect.x : 0;
  const mapRelY = mapRect ? mapRect.y - cardRect.y : 0;
  const mapW = mapRect?.width ?? 0;
  const mapH = mapRect?.height ?? 0;
  const cardW = Math.round(cardRect.width);
  const cardH = Math.round(cardRect.height);

  // Step 1: hide map container FIRST so MapLibre cannot receive resize events
  // when we later change captureTarget's position
  const savedMapDisplay = mapContainer?.style.display ?? '';
  if (mapContainer) mapContainer.style.display = 'none';

  const controls = el.querySelectorAll<HTMLElement>(
    '.maplibregl-ctrl-top-left, .maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right',
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

  captureTarget.style.backgroundColor = 'transparent';
  captureTarget.style.boxShadow = 'none';
  captureTarget.style.position = 'fixed';
  captureTarget.style.left = '0';
  captureTarget.style.top = '0';
  captureTarget.style.width = `${cardW}px`;
  captureTarget.style.zIndex = '-1';

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

  await document.fonts.ready;

  // Step 4: pre-fetch all avatar <img> srcs and replace with base64 data URLs.
  // html-to-image fetches images in parallel internally — without this step,
  // concurrent proxy URL responses can arrive out of order and the wrong avatar
  // ends up in the wrong <img> slot (race condition).
  const savedImgSrcs = await inlineImages(captureTarget);

  try {
    // Layer 1: capture card UI with html-to-image at full pixel ratio
    const uiPng = await toPng(captureTarget, {
      pixelRatio: PIXEL_RATIO,
      width: cardW,
      height: cardH,
    });

    // Build output canvas
    const out = document.createElement('canvas');
    out.width = cardW * PIXEL_RATIO;
    out.height = cardH * PIXEL_RATIO;
    const ctx = out.getContext('2d')!;

    // Draw Layer 1: card UI
    const uiImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = uiPng;
    });
    ctx.drawImage(uiImg, 0, 0);

    // Draw Layer 2: map snapshot at measured position
    if (effectiveMapDataUrl && mapRect) {
      const mapImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
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

    return out.toDataURL('image/png');
  } finally {
    // Restore inlined img srcs
    savedImgSrcs.forEach((src, img) => { img.src = src; });

    // Restore h1
    if (h1 && savedH1Html !== null) {
      h1.innerHTML = savedH1Html;
      h1.style.whiteSpace = savedH1WhiteSpace;
    }

    // Restore captureTarget styles
    captureTarget.style.backgroundColor = savedBg;
    captureTarget.style.boxShadow = savedShadow;
    captureTarget.style.position = savedPosition;
    captureTarget.style.left = savedLeft;
    captureTarget.style.top = savedTop;
    captureTarget.style.zIndex = savedZIndex;
    captureTarget.style.width = savedWidth;

    // Restore map
    if (mapContainer) mapContainer.style.display = savedMapDisplay;
    if (webglCanvas) webglCanvas.style.display = '';
    controls.forEach((o) => { o.style.display = ''; });
  }
}