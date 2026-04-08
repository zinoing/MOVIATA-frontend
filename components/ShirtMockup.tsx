import type { DesignConfig } from '../lib/poster/types';

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

  const backSrc =
    color === 'black' ? 'resources/black-tshirt-back.png' : 'resources/white-tshirt-back.png';

  const frontSrc =
    color === 'black' ? 'resources/black-tshirt-front.png' : 'resources/white-tshirt-front.png';

  if (!posterSnapshot) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl bg-neutral-100 py-16 text-sm text-neutral-400">
        No preview available
      </div>
    );
  }

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

          <img
            src={posterSnapshot}
            alt="Your design"
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{
              top: '14%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '42%',
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
              background: 'transparent',
              opacity: 1,
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
          className="block w-full select-none"
        />
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">Front</p>
      </div>
    </div>
  );
}
