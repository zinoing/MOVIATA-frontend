import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import ShirtMockup from '../components/ShirtMockup';
import { useDesignConfig } from '../context/DesignConfigContext';

type ProductSize = 'S' | 'M' | 'L' | 'XL';
type ProductColor = 'white' | 'black';

const sizeOptions: ProductSize[] = ['S', 'M', 'L', 'XL'];

const sizeGuideMap: Record<
  ProductSize,
  {
    length: string;
    shoulder: string;
    chest: string;
    sleeve: string;
  }
> = {
  S: { length: '68', shoulder: '45', chest: '49', sleeve: '21' },
  M: { length: '71', shoulder: '47', chest: '52', sleeve: '22' },
  L: { length: '74', shoulder: '49', chest: '55', sleeve: '23' },
  XL: { length: '77', shoulder: '51', chest: '58', sleeve: '24' },
};

function formatPriceKRW(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

export default function ConfirmPage() {
  const router = useRouter();
  const { config, posterSnapshot } = useDesignConfig();
  const [selectedSize, setSelectedSize] = useState<ProductSize>('M');

  useEffect(() => {
    if (!config || !posterSnapshot) {
      void router.replace('/strava/activities');
    }
  }, [config, posterSnapshot, router]);

  if (!config || !posterSnapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-neutral-500">Redirecting…</p>
      </div>
    );
  }

  const safeProduct = {
    color: config.shirtColor as ProductColor,
    size: selectedSize,
    price: 39000,
  };

  const totalLabel = useMemo(
    () => formatPriceKRW(safeProduct.price),
    [safeProduct.price],
  );

  const handleBackToDesign = () => {
    void router.push(`/design/${config.activityId}`);
  };

  const handleBuyNow = () => {
    console.log('Proceed to checkout', {
      config,
      product: safeProduct,
      hasPosterSnapshot: Boolean(posterSnapshot),
    });
  };

  return (
    <Layout title="Confirm Your Order">
    <div className="min-h-screen bg-white px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-[1440px] pb-6">
        <p className="text-sm text-neutral-500">Preview</p>

        <div className="mt-2">
          <button
            type="button"
            onClick={handleBackToDesign}
            className="text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            ← Back to design
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 lg:flex-row lg:items-start">
        {/* LEFT */}
        <section className="flex min-w-0 flex-1">
          <div className="flex w-full flex-col gap-6 rounded-[20px] bg-[#F2F2F7] px-6 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)] lg:px-10 lg:py-8">
            <div className="flex items-center justify-center py-2">
              <div className="flex w-full items-center justify-center">
                <ShirtMockup
                  config={config}
                  posterSnapshot={posterSnapshot}
                  width={640}
                  productColor={safeProduct.color}
                />
              </div>
            </div>

            {/* PRODUCT INFORMATION */}
            <div className="rounded-[28px] border border-neutral-200 bg-white px-5 py-5 lg:px-6 lg:py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Product Information
              </p>

              <div className="mt-5 space-y-8">
                <section>
                  <p className="text-sm font-semibold text-neutral-900">
                    Product Description
                  </p>

                  <div className="mt-3 text-sm leading-7 text-neutral-600">
                    <p>
                      This shirt transforms your movement into a minimal visual
                      record. Each design is generated from your real activity
                      data, including your route, distance, and date.
                    </p>

                    <div className="mt-4 space-y-2">
                      <Bullet>Premium 100% polyester fabric</Bullet>
                      <Bullet>Lightweight and breathable feel</Bullet>
                      <Bullet>High-resolution custom print</Bullet>
                      <Bullet>Designed for everyday wear</Bullet>
                    </div>
                  </div>
                </section>

                <section className="border-t border-neutral-200 pt-6">
                  <p className="text-sm font-semibold text-neutral-900">
                    Refund & Exchange
                  </p>

                  <div className="mt-3 text-sm leading-7 text-neutral-600">
                    <p>
                      Each item is made to order based on your custom activity
                      design, so refunds or exchanges are not available for
                      change of mind or incorrect size selection.
                    </p>

                    <p className="mt-4">
                      If your item arrives damaged or defective, please contact
                      us within 7 days of delivery with photos. After review, we
                      will provide a replacement or refund.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="w-full shrink-0 rounded-[36px] bg-white px-7 py-8 shadow-[0_18px_50px_rgba(0,0,0,0.06)] lg:sticky lg:top-8 lg:w-[430px]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-400">
              MOVIATA
            </p>

            <h1 className="mt-3 text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950">
              Get your movement on a shirt
            </h1>

            <p className="mt-4 text-sm leading-6 text-neutral-500">
              A minimal wearable record of your route, distance, and day.
            </p>
          </div>

          <div className="mt-8 border-t border-neutral-200 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Activity Details
            </p>

            <div className="mt-5 space-y-4 text-sm">
              <DetailRow label="Activity" value={config.title} />
              <DetailRow label="Date" value={config.date} />
              <DetailRow label="Distance" value={config.distance} />
              <DetailRow label="Duration" value={config.duration} />
              {config.location ? (
                <DetailRow label="Location" value={config.location} />
              ) : null}
            </div>
          </div>

          <div className="mt-8 border-t border-neutral-200 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Product
            </p>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">Size</p>
                <p className="text-xs text-neutral-400">Selected: {selectedSize}</p>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {sizeOptions.map((size) => {
                  const isSelected = safeProduct.size === size;

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                        isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Size Guide
                </p>
              </div>

              {/* overflow-x-auto 제거, min-w 제거 → 모바일에서 가로 스크롤 없앰 */}
              <div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-white text-neutral-500">
                      <th className="border-b border-neutral-200 px-3 py-3 text-left font-medium">
                        Size
                      </th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">
                        Length
                      </th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">
                        Shoulder
                      </th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">
                        Chest
                      </th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">
                        Sleeve
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sizeOptions.map((size) => {
                      const guide = sizeGuideMap[size];
                      const isSelected = selectedSize === size;

                      return (
                        <tr
                          key={size}
                          className={`transition ${
                            isSelected ? 'bg-black/[0.05]' : 'bg-white'
                          }`}
                        >
                          <td className="border-b border-neutral-200 px-3 py-3 font-medium text-neutral-900">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold ${
                                  isSelected
                                    ? 'bg-black text-white'
                                    : 'bg-neutral-200 text-neutral-700'
                                }`}
                              >
                                {size}
                              </span>
                            </div>
                          </td>

                          <td className={`border-b border-neutral-200 px-2 py-3 text-center ${isSelected ? 'font-semibold text-neutral-950' : 'text-neutral-600'}`}>
                            {guide.length}
                          </td>
                          <td className={`border-b border-neutral-200 px-2 py-3 text-center ${isSelected ? 'font-semibold text-neutral-950' : 'text-neutral-600'}`}>
                            {guide.shoulder}
                          </td>
                          <td className={`border-b border-neutral-200 px-2 py-3 text-center ${isSelected ? 'font-semibold text-neutral-950' : 'text-neutral-600'}`}>
                            {guide.chest}
                          </td>
                          <td className={`border-b border-neutral-200 px-2 py-3 text-center ${isSelected ? 'font-semibold text-neutral-950' : 'text-neutral-600'}`}>
                            {guide.sleeve}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-4">
                <p className="text-xs leading-5 text-neutral-400">
                  Measurements may vary by 1–2 cm depending on production.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] bg-neutral-50 px-5 py-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-500">Total</p>
                <p className="mt-1 text-[32px] font-semibold tracking-[-0.03em] text-neutral-950">
                  {totalLabel}
                </p>
              </div>

              <p className="text-right text-xs leading-5 text-neutral-400">
                Estimated delivery
                <br />
                5–10 business days
              </p>
            </div>

            <button
              type="button"
              onClick={handleBuyNow}
              className="mt-5 w-full rounded-2xl bg-black py-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Buy now
            </button>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                className="rounded-2xl bg-yellow-400 py-3 text-sm font-medium text-neutral-900"
              >
                KakaoPay
              </button>
              <button
                type="button"
                className="rounded-2xl bg-green-500 py-3 text-sm font-medium text-white"
              >
                NaverPay
              </button>
              <button
                type="button"
                className="rounded-2xl bg-neutral-200 py-3 text-sm font-medium text-neutral-900"
              >
                Card
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
    </Layout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-neutral-400">{label}</span>
      <span className="max-w-[210px] text-right font-medium text-neutral-900">
        {value}
      </span>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-neutral-600">• {children}</p>;
}