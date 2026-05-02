import { ReactNode, useMemo, useState } from 'react';

type ShirtColor = 'white' | 'black';
type PaymentMethod = 'kakaopay' | 'naverpay' | 'card' | null;
type ShirtSize = 'S' | 'M' | 'L' | 'XL';

type CheckoutViewProps = {
  shirtColor: ShirtColor;
  posterPreview: ReactNode;
  onBack: () => void;
};

const BASE_PRICE = 35000;

export default function CheckoutView({
  shirtColor,
  posterPreview,
  onBack,
}: CheckoutViewProps) {
  const [selectedSize, setSelectedSize] = useState<ShirtSize>('M');
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>(null);

  const shirtBaseClass = useMemo(() => {
    return shirtColor === 'black'
      ? 'bg-neutral-900 text-white'
      : 'bg-white text-neutral-900';
  }, [shirtColor]);

  const paymentButtonClass = (method: Exclude<PaymentMethod, null>) =>
    `w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
      selectedPaymentMethod === method
        ? 'border-neutral-900 bg-neutral-900 text-white'
        : 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500'
    }`;

  const sizeButtonClass = (size: ShirtSize) =>
    `rounded-xl border px-3 py-2 text-sm font-medium transition ${
      selectedSize === size
        ? 'border-neutral-900 bg-neutral-900 text-white'
        : 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500'
    }`;

  return (
    <section className="mx-auto grid w-full max-w-[1240px] items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,420px)] lg:gap-8">
      <div className="rounded-[32px] border border-neutral-200 bg-neutral-50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] lg:p-8">
        <div className="mb-5">
          <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-neutral-950">
            Review &amp; Order
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Your movement, printed on a T-shirt.
          </p>
        </div>

        <div className="flex min-h-[640px] items-center justify-center rounded-[28px] bg-white p-5 lg:p-6">
          <div className="relative w-full max-w-[500px]">
            <div
              className={`relative mx-auto min-h-[600px] w-full rounded-[40px] border border-neutral-200 shadow-[0_30px_80px_rgba(0,0,0,0.12)] ${shirtBaseClass}`}
            >
              <div
                className={`absolute left-1/2 top-0 h-[110px] w-[180px] -translate-x-1/2 rounded-b-[36px] border-x border-b border-neutral-200 ${
                  shirtColor === 'black' ? 'bg-neutral-900' : 'bg-white'
                }`}
              />

              <div
                className={`absolute left-[-20px] top-[110px] h-[140px] w-[90px] rotate-[-18deg] rounded-[28px] border border-neutral-200 ${
                  shirtColor === 'black' ? 'bg-neutral-900' : 'bg-white'
                }`}
              />
              <div
                className={`absolute right-[-20px] top-[110px] h-[140px] w-[90px] rotate-[18deg] rounded-[28px] border border-neutral-200 ${
                  shirtColor === 'black' ? 'bg-neutral-900' : 'bg-white'
                }`}
              />

              <div className="absolute inset-x-[16%] top-[22%] bottom-[16%] rounded-[24px] bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                <div className="h-full w-full overflow-hidden rounded-[18px] border border-neutral-200 bg-white">
                  {posterPreview}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] lg:sticky lg:top-6">
        <div className="border-b border-neutral-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Product
          </p>
          <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-neutral-950">
            MOVIATA T-shirt
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            Custom route poster printed on a premium tee.
          </p>
        </div>

        <div className="border-b border-neutral-200 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Price
          </p>
          <p className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-neutral-950">
            ₩{BASE_PRICE.toLocaleString()}
          </p>
        </div>

        <div className="border-b border-neutral-200 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Size
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(['S', 'M', 'L', 'XL'] as ShirtSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={sizeButtonClass(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Payment
          </p>

          <div className="mt-3 space-y-3">
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('kakaopay')}
              className={paymentButtonClass('kakaopay')}
            >
              KakaoPay
            </button>

            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('naverpay')}
              className={paymentButtonClass('naverpay')}
            >
              Naver Pay
            </button>

            <button
              type="button"
              onClick={() => setSelectedPaymentMethod('card')}
              className={paymentButtonClass('card')}
            >
              Pay with Card
            </button>
          </div>

          <p className="mt-3 text-xs text-neutral-400">
            Payments are currently in demo mode. Final integration is coming soon.
          </p>
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900"
          >
            Back
          </button>
        </div>
      </aside>
    </section>
  );
}
