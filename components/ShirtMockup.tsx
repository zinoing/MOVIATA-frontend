import { useEffect, useState } from 'react';
import type { DesignConfig } from '../lib/poster/types';
import { applyDisplacementMap } from '../lib/applyDisplacementMap';

type Props = {
  config: Readonly<DesignConfig>;
  posterSnapshot?: string | null;
  width?: number;
  productColor?: 'white' | 'black';
  initialView?: 'front' | 'back';
};

export default function ShirtMockup({
  config,
  posterSnapshot,
  width,
  productColor,
}: Props) {
  const color = productColor ?? config.shirtColor ?? 'white';
  const [warpedDesign, setWarpedDesign] = useState<string | null>(null);
  const [isWarping, setIsWarping] = useState(false);

  const backSrc =
    color === 'black'
      ? '/resources/black-tshirt-back.png'
      : '/resources/white-tshirt-back.png';

  const frontSrc =
    color === 'black'
      ? '/resources/black-tshirt-front.png'
      : '/resources/white-tshirt-front.png';

  // Preload displacement map as soon as the component mounts so it's
  // already cached by the time posterSnapshot arrives.
  useEffect(() => {
    const img = new Image();
    img.src = '/resources/tshirt-back-displacement-map.png';
  }, []);

  useEffect(() => {
    if (!posterSnapshot) {
      setWarpedDesign(null);
      return;
    }

    setIsWarping(true);

    const isWhite = color === 'white';

    applyDisplacementMap(
      posterSnapshot,
      '/resources/tshirt-back-displacement-map.png',
      15,
      2,
      isWhite
    )
      .then(setWarpedDesign)
      .catch((err) => {
        console.error('Displacement map 적용 실패:', err);
        setWarpedDesign(null); // fallback: 원본 사용
      })
      .finally(() => setIsWarping(false));
  }, [posterSnapshot, color]);

  if (!posterSnapshot) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl bg-neutral-100 py-16 text-sm text-neutral-400">
        No preview available
      </div>
    );
  }

  const displayDesign = warpedDesign ?? posterSnapshot;

  return (
    <div
      className="mx-auto flex w-full max-w-[340px] flex-col gap-6 lg:max-w-[580px]"
      style={width ? { maxWidth: width } : undefined}
    >
      {/* BACK */}
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <img
            src={backSrc}
            alt="T-shirt back"
            draggable={false}
            className="block w-full select-none"
          />

          {isWarping ? (
            // 변위맵 처리 중 로딩 표시
            <div
              className="pointer-events-none absolute flex items-center justify-center"
              style={{
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '35%',
                aspectRatio: '1',
              }}
            >
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
            </div>
          ) : (
            <img
              src={displayDesign}
              alt="Your design"
              draggable={false}
              className="pointer-events-none absolute select-none"
              style={{
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '35%',
                height: 'auto',
                display: 'block',
                objectFit: 'contain',
                background: 'transparent',
                opacity: color === 'black' ? 0.92 : 1,
                mixBlendMode: color === 'black' ? 'screen' : 'multiply',
              }}
            />
          )}
        </div>
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          Back
        </p>
      </div>

      {/* FRONT */}
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <img
            src={frontSrc}
            alt="T-shirt front"
            draggable={false}
            className="block w-full select-none"
          />
          <span
            className="pointer-events-none absolute select-none"
            style={{
              top: '30%',
              right: '30%',
              fontFamily: '"Inter", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(10px, 4.2%, 18px)',
              letterSpacing: '-0.03em',
              color: color === 'black' ? '#EDE8DC' : '#1A1A1A',
              whiteSpace: 'nowrap',
            }}
          >
            MOVIATA
          </span>
        </div>
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          Front
        </p>
      </div>
    </div>
  );
}