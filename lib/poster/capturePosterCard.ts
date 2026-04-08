/**
 * Captures the PosterCard as a PNG by compositing two layers:
 *
 * Layer 1 — Card UI (text, stats, avatars):
 *   dom-to-image-more captures captureTarget with the map container hidden.
 *   Imported dynamically to avoid SSR issues (dom-to-image-more references
 *   browser globals like Node at module evaluation time).
 *
 * Layer 2 — Map snapshot:
 *   The pre-captured map PNG (mapDataUrl) is drawn directly onto the output
 *   canvas at the map container's position relative to the card, measured at
 *   runtime via getBoundingClientRect. Always accurate regardless of browser,
 *   viewport, or zoom level.
 */
export async function capturePosterCard(
  el: HTMLElement,
  mapDataUrl: string | null,
): Promise<string> {
  const PIXEL_RATIO = 3;

  // Dynamic import so this module is never evaluated on the server.
  // dom-to-image-more references browser globals (Node, window) at the
  // top level of its bundle, causing "ReferenceError: Node is not defined"
  // when Next.js tries to SSR any page that imports this file statically.
  const domtoimage = (await import('dom-to-image-more')).default;

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

  // Hide map container so dom-to-image-more captures card UI only
  const savedMapDisplay = mapContainer?.style.display ?? '';
  if (mapContainer) mapContainer.style.display = 'none';

  const controls = el.querySelectorAll<HTMLElement>(
    '.maplibregl-ctrl-top-left, .maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right',
  );
  controls.forEach((o) => { o.style.display = 'none'; });

  const savedBg = captureTarget.style.backgroundColor;
  const savedShadow = captureTarget.style.boxShadow;
  captureTarget.style.backgroundColor = 'transparent';
  captureTarget.style.boxShadow = 'none';

  try {
    // Layer 1: capture card UI (no map)
    const uiPng = await domtoimage.toPng(captureTarget, {
      width: cardW * PIXEL_RATIO,
      height: cardH * PIXEL_RATIO,
      style: {
        transform: `scale(${PIXEL_RATIO})`,
        transformOrigin: 'top left',
      },
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
    captureTarget.style.backgroundColor = savedBg;
    captureTarget.style.boxShadow = savedShadow;
    if (mapContainer) mapContainer.style.display = savedMapDisplay;
    if (webglCanvas) webglCanvas.style.display = '';
    controls.forEach((o) => { o.style.display = ''; });
  }
}