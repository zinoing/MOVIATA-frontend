/**
 * Captures the PosterCard element as a PNG data URL using html-to-image.
 *
 * html-to-image renders via SVG foreignObject, which delegates all CSS layout
 * (flexbox, explicit heights, font metrics, rem units) to the browser's own
 * engine — so the captured image matches what the browser shows exactly.
 *
 * html-to-image cannot read WebGL canvases (MapLibre). Before capturing, the live
 * MapLibre canvas is physically replaced in the DOM with a plain <img> holding a
 * pre-snapshotted copy of the map pixels, then restored after capture completes.
 *
 * The card's background color and box-shadow are stripped before capture so the
 * resulting PNG has a transparent background — only the actual design content
 * (text, map, avatars) is rendered, making it compositable over any shirt color
 * without needing a blend mode.
 *
 * RESOLUTION-INDEPENDENCE:
 * We capture el.firstElementChild (the PosterCard root div) rather than el
 * (#poster-card wrapper) to avoid the viewport-relative left offset that
 * html-to-image bakes into the SVG foreignObject x-origin.
 *
 * Width and height are derived from the card root's natural offsetWidth (always
 * 420px on desktop, may be smaller on narrow mobile). We intentionally do NOT
 * divide by zoomScale here — because we are capturing firstElementChild, which
 * is a direct child of #poster-card and is NOT affected by the page-level zoom
 * applied to the outer wrapper. The card root always renders at its true CSS
 * size regardless of ancestor zoom.
 */

/** Natural CSS width of PosterCard — must match w-[420px] in PosterCard.tsx */
const POSTER_NATURAL_WIDTH = 420;

export async function capturePosterCard(
  el: HTMLElement,
  mapDataUrl: string | null,
): Promise<string> {
  const webglCanvas = el.querySelector<HTMLCanvasElement>('.maplibregl-canvas');

  // If no pre-snapshotted data URL, try to read the WebGL canvas directly at
  // capture time. This is a fallback for mobile where the idle-event snapshot
  // may not have been captured yet (e.g. slow tile load, context loss race).
  const effectiveMapDataUrl =
    mapDataUrl ??
    (webglCanvas
      ? (() => {
          try {
            return webglCanvas.toDataURL('image/png');
          } catch {
            return null;
          }
        })()
      : null);

  let placeholder: HTMLImageElement | null = null;
  if (effectiveMapDataUrl && webglCanvas?.parentElement) {
    placeholder = document.createElement('img');
    placeholder.src = effectiveMapDataUrl;
    placeholder.style.position = webglCanvas.style.position || 'absolute';
    placeholder.style.top = webglCanvas.style.top || '0';
    placeholder.style.left = webglCanvas.style.left || '0';
    placeholder.style.width = webglCanvas.style.width || `${webglCanvas.offsetWidth}px`;
    placeholder.style.height = webglCanvas.style.height || `${webglCanvas.offsetHeight}px`;
    webglCanvas.parentElement.insertBefore(placeholder, webglCanvas);
    webglCanvas.style.display = 'none';

    // Wait for the placeholder image to fully decode before capture.
    // Data URLs are technically sync but browsers still schedule the paint
    // asynchronously — html-to-image would see a blank image otherwise.
    await new Promise<void>((resolve) => {
      if (placeholder!.complete && placeholder!.naturalWidth > 0) { resolve(); return; }
      placeholder!.onload = () => resolve();
      placeholder!.onerror = () => resolve();
    });
  }

  const controls = el.querySelectorAll<HTMLElement>(
    '.maplibregl-ctrl-top-left, .maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right',
  );
  controls.forEach((o) => { o.style.display = 'none'; });

  // Capture the PosterCard root div (firstElementChild of #poster-card) rather
  // than #poster-card itself. This avoids the viewport-relative left offset
  // that html-to-image uses as the SVG x-origin, which would shift content
  // right and clip the right edge when the card is centered in a wide grid.
  const cardRoot = el.firstElementChild as HTMLElement | null;
  const captureTarget = cardRoot ?? el;

  const savedBg = captureTarget.style.backgroundColor;
  const savedShadow = captureTarget.style.boxShadow;
  captureTarget.style.backgroundColor = 'transparent';
  captureTarget.style.boxShadow = 'none';

  try {
    const { toPng } = await import('html-to-image');

    // Use the element's actual rendered width (capped at POSTER_NATURAL_WIDTH)
    // as the capture width. On desktop this is always 420px. On narrow mobile
    // viewports it may be smaller due to max-w-full — we use the actual value
    // so the capture matches what the user sees.
    //
    // We do NOT apply zoomScale here because captureTarget is firstElementChild,
    // which sits inside #poster-card (not the zoomed page wrapper), so it always
    // renders at its true CSS size independent of ancestor zoom.
    const captureWidth = Math.min(captureTarget.offsetWidth, POSTER_NATURAL_WIDTH);
    const captureHeight = captureTarget.offsetHeight;

    return await toPng(captureTarget, {
      pixelRatio: 3, // Higher pixel ratio for sharper print quality
      width: captureWidth,
      height: captureHeight,
    });
  } finally {
    captureTarget.style.backgroundColor = savedBg;
    captureTarget.style.boxShadow = savedShadow;

    if (webglCanvas) webglCanvas.style.display = '';
    placeholder?.remove();
    controls.forEach((o) => { o.style.display = ''; });
  }
}