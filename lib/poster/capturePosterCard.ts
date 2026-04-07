/**
 * Captures the #poster-card DOM element as a PNG data URL using html-to-image.
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
 */
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
  }

  const controls = el.querySelectorAll<HTMLElement>(
    '.maplibregl-ctrl-top-left, .maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right',
  );
  controls.forEach((o) => { o.style.display = 'none'; });

  // Strip card background and shadow so the PNG has transparent areas
  const cardRoot = el.firstElementChild as HTMLElement | null;
  const savedBg = cardRoot?.style.backgroundColor ?? '';
  const savedShadow = cardRoot?.style.boxShadow ?? '';
  if (cardRoot) {
    cardRoot.style.backgroundColor = 'transparent';
    cardRoot.style.boxShadow = 'none';
  }

  try {
    const { toPng } = await import('html-to-image');
    return await toPng(el, { pixelRatio: 2 });
  } finally {
    if (cardRoot) {
      cardRoot.style.backgroundColor = savedBg;
      cardRoot.style.boxShadow = savedShadow;
    }
    if (webglCanvas) webglCanvas.style.display = '';
    placeholder?.remove();
    controls.forEach((o) => { o.style.display = ''; });
  }
}
