import type { DesignConfig } from '../lib/poster/types';

type Props = {
  config: Readonly<DesignConfig>;
  posterSnapshot?: string | null;
  width?: number;
  productColor?: 'white' | 'black';
  initialView?: 'front' | 'back';
};

const OVERLAY_TOP = '11.8%';
const OVERLAY_CENTER = '50%';
const OVERLAY_WIDTH = '46.5%';

export default function ShirtMockup({
  config,
  posterSnapshot,
  width = 420,
  productColor,
}: Props) {
  const color = productColor ?? config.shirtColor ?? 'white';

  const backSrc =
    color === 'black' ? 'resources/black-tshirt-back.png' : 'resources/white-tshirt-back.png';

  const frontSrc =
    color === 'black' ? 'resources/black-tshirt-front.png' : 'resources/white-tshirt-front.png';

  if (!posterSnapshot) {
    return (
      <div
        style={{ width }}
        className="flex items-center justify-center rounded-2xl bg-neutral-100 py-16 text-sm text-neutral-400"
      >
        No preview available
      </div>
    );
  }

  return (
    <div style={{ width }} className="mx-auto flex flex-col gap-6">
      {/* BACK */}
      <div className="flex flex-col gap-2">
        <div style={{ position: 'relative', width: '100%' }}>
          <img
            src={backSrc}
            alt="T-shirt back"
            draggable={false}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              userSelect: 'none',
            }}
          />

          <img
            src={posterSnapshot}
            alt="Your design"
            draggable={false}
            style={{
              position: 'absolute',
              top: OVERLAY_TOP,
              left: OVERLAY_CENTER,
              transform: 'translateX(-50%)',
              width: OVERLAY_WIDTH,
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
              background: 'transparent',
              opacity: 1,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">Back</p>
      </div>

      {/* FRONT */}
      <div className="flex flex-col gap-2">
        <img
          src={frontSrc}
          alt="T-shirt front"
          draggable={false}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            userSelect: 'none',
          }}
        />
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">Front</p>
      </div>
    </div>
  );
}