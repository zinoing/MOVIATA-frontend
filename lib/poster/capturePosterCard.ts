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
 *   Wait for all <img> elements inside captureTarget to fully load before
 *   capture. html-to-image serialises the DOM at call time — if an avatar
 *   <img> is still decoding, the wrong cached image or a blank box appears
 *   in the snapshot.
 *
 * Layer 2 — Map snapshot:
 *   The pre-captured map PNG is drawn directly onto the output canvas at the
 *   map container's position relative to the card, measured at runtime via
 *   getBoundingClientRect.
 */

/** Wait for every <img> inside el to finish loading (best-effort, 3s timeout). */
async function waitForImages(el: HTMLElement, timeoutMs = 3000): Promise<void> {
  const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
  if (!imgs.length) return;

  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          // Already loaded or no src
          if (img.complete || !img.src) {
            resolve();
            return;
          }

          const timer = setTimeout(resolve, timeoutMs);

          img.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
          img.addEventListener('error', () => { clearTimeout(timer); resolve(); }, { once: true });
        }),
    ),
  );
}

export async function capturePosterCard(
  el: HTMLElement,
  mapDataUrl: string | null,
  zoomScale: number = 1,
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

  // Step 4: wait for all avatar <img> elements to finish loading
  // html-to-image serialises the DOM at call time — if an avatar is still
  // decoding, the wrong cached image or a blank box appears in the snapshot.
  await waitForImages(captureTarget);

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
    // Restore captureTarget styles
    captureTarget.style.backgroundColor = savedBg;
    captureTarget.style.boxShadow = savedShadow;
    captureTarget.style.position = savedPosition;
    captureTarget.style.left = savedLeft;
    captureTarget.style.top = savedTop;
    captureTarget.style.zIndex = savedZIndex;
    captureTarget.style.width = savedWidth;

    // Restore h1
    if (h1 && savedH1Html !== null) {
      h1.innerHTML = savedH1Html;
      h1.style.whiteSpace = savedH1WhiteSpace;
    }

    // Restore map
    if (mapContainer) mapContainer.style.display = savedMapDisplay;
    if (webglCanvas) webglCanvas.style.display = '';
    controls.forEach((o) => { o.style.display = ''; });
  }
}