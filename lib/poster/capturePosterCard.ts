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
 * The card is centered via mx-auto so its left varies by viewport width,
 * shifting all content right and clipping the design.
 *
 * Fix: after swapping the WebGL canvas for a static placeholder, hide the
 * entire MapLibre container (display:none) so MapLibre cannot receive resize
 * events. Then apply position:fixed + left:0 to captureTarget for capture.
 * Restore everything in the finally block.
 */
export async function capturePosterCard(
  el: HTMLElement,
  mapDataUrl: string | null,
): Promise<string> {
  const webglCanvas = el.querySelector<HTMLCanvasElement>('.maplibregl-canvas');
  const mapContainer = el.querySelector<HTMLElement>('.maplibregl-map');

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

  // Step 1: replace WebGL canvas with static <img> placeholder
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

  // Step 2: hide the MapLibre container entirely so it cannot receive resize
  // events when we later change captureTarget's position. Without this,
  // MapLibre detects the layout change, re-renders the canvas, and clears
  // the WebGL drawing buffer — causing a blank map in the capture.
  const savedMapContainerDisplay = mapContainer?.style.display ?? '';
  if (mapContainer) {
    mapContainer.style.display = 'none';
  }

  const controls = el.querySelectorAll<HTMLElement>(
    '.maplibregl-ctrl-top-left, .maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right',
  );
  controls.forEach((o) => { o.style.display = 'none'; });

  const cardRoot = el.firstElementChild as HTMLElement | null;
  const captureTarget = cardRoot ?? el;

  // Measure dimensions before changing position
  const captureWidth = captureTarget.offsetWidth;
  const captureHeight = captureTarget.offsetHeight;

  // Save styles
  const savedBg = captureTarget.style.backgroundColor;
  const savedShadow = captureTarget.style.boxShadow;
  const savedPosition = captureTarget.style.position;
  const savedLeft = captureTarget.style.left;
  const savedTop = captureTarget.style.top;
  const savedZIndex = captureTarget.style.zIndex;
  const savedWidth = captureTarget.style.width;

  // Step 3: fix captureTarget at (0,0) so getBoundingClientRect().left === 0
  captureTarget.style.backgroundColor = 'transparent';
  captureTarget.style.boxShadow = 'none';
  captureTarget.style.position = 'fixed';
  captureTarget.style.left = '0';
  captureTarget.style.top = '0';
  captureTarget.style.width = `${captureWidth}px`;
  captureTarget.style.zIndex = '-1';

  // Replace the map area with placeholder img at correct size
  // so html-to-image sees a static image instead of the hidden GL canvas
  if (placeholder && mapContainer) {
    placeholder.style.position = 'absolute';
    placeholder.style.top = '0';
    placeholder.style.left = '0';
    placeholder.style.width = '100%';
    placeholder.style.height = '100%';
    placeholder.style.display = 'block';
    mapContainer.style.display = 'block';
    mapContainer.style.position = 'relative';
  }

  try {
    const { toPng } = await import('html-to-image');

    return await toPng(captureTarget, {
      pixelRatio: 3,
      width: captureWidth,
      height: captureHeight,
    });
  } finally {
    // Restore all styles
    captureTarget.style.backgroundColor = savedBg;
    captureTarget.style.boxShadow = savedShadow;
    captureTarget.style.position = savedPosition;
    captureTarget.style.left = savedLeft;
    captureTarget.style.top = savedTop;
    captureTarget.style.zIndex = savedZIndex;
    captureTarget.style.width = savedWidth;

    if (mapContainer) {
      mapContainer.style.display = savedMapContainerDisplay;
    }
    if (webglCanvas) webglCanvas.style.display = '';
    placeholder?.remove();
    controls.forEach((o) => { o.style.display = ''; });
  }
}