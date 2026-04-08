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
 * LEFT-OFFSET FIX:
 * html-to-image uses getBoundingClientRect().left as the SVG x-origin.
 * The card is centered via mx-auto so its left offset varies by viewport
 * (~256px on mobile, ~734px on wide desktop), shifting all content right.
 *
 * Fix: temporarily set position:fixed + left:0 + top:0 on captureTarget
 * AFTER the WebGL canvas has already been replaced with a static <img>
 * placeholder. Since the live WebGL context is already hidden at this point,
 * moving captureTarget in the stacking context does not cause context loss.
 * After toPng completes, all styles are restored in the finally block.
 */
export async function capturePosterCard(
  el: HTMLElement,
  mapDataUrl: string | null,
): Promise<string> {
  const webglCanvas = el.querySelector<HTMLCanvasElement>('.maplibregl-canvas');

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

  // Replace WebGL canvas with a static <img> BEFORE any style changes.
  // This must happen first so that when we later apply position:fixed to
  // captureTarget, the WebGL context is already detached from rendering.
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

  const cardRoot = el.firstElementChild as HTMLElement | null;
  const captureTarget = cardRoot ?? el;

  // Save all styles we are about to mutate
  const savedBg = captureTarget.style.backgroundColor;
  const savedShadow = captureTarget.style.boxShadow;
  const savedPosition = captureTarget.style.position;
  const savedLeft = captureTarget.style.left;
  const savedTop = captureTarget.style.top;
  const savedZIndex = captureTarget.style.zIndex;
  const savedWidth = captureTarget.style.width;

  const captureWidth = captureTarget.offsetWidth;
  const captureHeight = captureTarget.offsetHeight;

  // Apply styles for capture
  captureTarget.style.backgroundColor = 'transparent';
  captureTarget.style.boxShadow = 'none';
  // Fix at (0,0) so getBoundingClientRect().left === 0 for html-to-image.
  // Safe to do here because the WebGL canvas is already replaced with a
  // static <img> — no live GL context will be disrupted.
  captureTarget.style.position = 'fixed';
  captureTarget.style.left = '0';
  captureTarget.style.top = '0';
  captureTarget.style.width = `${captureWidth}px`;
  captureTarget.style.zIndex = '-1';

  try {
    const { toPng } = await import('html-to-image');

    return await toPng(captureTarget, {
      pixelRatio: 3,
      width: captureWidth,
      height: captureHeight,
    });
  } finally {
    // Restore all mutated styles
    captureTarget.style.backgroundColor = savedBg;
    captureTarget.style.boxShadow = savedShadow;
    captureTarget.style.position = savedPosition;
    captureTarget.style.left = savedLeft;
    captureTarget.style.top = savedTop;
    captureTarget.style.zIndex = savedZIndex;
    captureTarget.style.width = savedWidth;

    if (webglCanvas) webglCanvas.style.display = '';
    placeholder?.remove();
    controls.forEach((o) => { o.style.display = ''; });
  }
}