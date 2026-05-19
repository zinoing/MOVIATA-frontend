import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import ShirtMockup from '../components/ShirtMockup';

type ProductSize = 'S' | 'M' | 'L' | 'XL';
type ProductColor = 'white' | 'black';

const sizeOptions: ProductSize[] = ['S', 'M', 'L', 'XL'];

const sizeGuideMap: Record<ProductSize, { length: string; shoulder: string; chest: string; sleeve: string }> = {
  S: { length: '66', shoulder: '44', chest: '49', sleeve: '19' },
  M: { length: '70', shoulder: '47', chest: '52', sleeve: '20' },
  L: { length: '74', shoulder: '50', chest: '55', sleeve: '22' },
  XL: { length: '78', shoulder: '53', chest: '58', sleeve: '24' },
};

const UNIT_PRICE = 30000;

function Bullet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-neutral-600">• {children}</p>;
}

export default function ProductPreviewPage() {
  const router = useRouter();
  const { type } = router.query;
  const [productColor, setProductColor] = useState<ProductColor>('white');

  function handleDesignAndBuy() {
    const activityType = type === 'motion' ? 'motion' : 'path';
    sessionStorage.setItem('activityType', activityType);
    void router.push(activityType === 'motion' ? '/motion/upload' : '/start');
  }

  return (
    <Layout title="Custom Running Tee — MOVIATA">
      <div className="min-h-screen bg-white px-5 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-[1440px] pb-6">
          <p className="text-sm text-neutral-500">Product</p>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => void router.back()}
              className="text-sm text-neutral-500 transition hover:text-neutral-900"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 lg:flex-row lg:items-start">
          {/* LEFT */}
          <section className="flex min-w-0 flex-1">
            <div className="flex w-full flex-col gap-6 rounded-[20px] bg-[#F2F2F7] px-6 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)] lg:px-10 lg:py-8">
              <div className="flex items-center justify-center py-2">
                <ShirtMockup productColor={productColor} />
              </div>

              <div className="rounded-[28px] border border-neutral-200 bg-white px-5 py-5 lg:px-6 lg:py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Product Information
                </p>

                <div className="mt-5 space-y-8">
                  <section>
                    <p className="text-sm font-semibold text-neutral-900">About this product</p>
                    <div className="mt-3 space-y-2">
                      <Bullet>100% premium cotton, 260gsm heavyweight fabric</Bullet>
                      <Bullet>Your route printed on the back via eco-friendly water-based ink</Bullet>
                      <Bullet>Designed and printed in-house for each order</Bullet>
                    </div>
                  </section>

                  <section className="border-t border-neutral-200 pt-6">
                    <p className="text-sm font-semibold text-neutral-900">Returns & exchanges</p>
                    <div className="mt-3 text-sm leading-7 text-neutral-600">
                      <p>Printed-to-order items cannot be returned or exchanged due to the custom nature of the product.</p>
                      <p className="mt-4">If there is a defect in the product, please contact us within 7 days of receipt.</p>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT */}
          <aside className="w-full shrink-0 rounded-[36px] bg-white px-7 py-8 shadow-[0_18px_50px_rgba(0,0,0,0.06)] lg:sticky lg:top-8 lg:w-[430px]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-400">MOVIATA</p>
              <h1 className="mt-3 text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950">
                Custom Running Tee
              </h1>
              <p className="mt-4 text-sm leading-6 text-neutral-500">
                Upload your route. Get a shirt. Wear your journey.
              </p>
            </div>

            {/* Color selector */}
            <div className="mt-8 border-t border-neutral-200 pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Color</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(['white', 'black'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setProductColor(c)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                      productColor === c
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
                    }`}
                  >
                    {c === 'white' ? 'White' : 'Black'}
                  </button>
                ))}
              </div>
            </div>

            {/* Size guide */}
            <div className="mt-5 border-t border-neutral-200 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Size Guide (cm)</p>

              <div className="mt-4 overflow-hidden rounded-[24px] border border-neutral-200 bg-white">
                <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Measurements
                  </p>
                </div>

                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-white text-neutral-500">
                      <th className="border-b border-neutral-200 px-3 py-3 text-left font-medium">Size</th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">Length</th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">Shoulder</th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">Chest</th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">Sleeve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeOptions.map((size) => {
                      const guide = sizeGuideMap[size];
                      return (
                        <tr key={size} className="bg-white">
                          <td className="border-b border-neutral-200 px-3 py-3 font-medium text-neutral-900">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-neutral-200 px-2 text-[11px] font-semibold text-neutral-700">
                              {size}
                            </span>
                          </td>
                          <td className="border-b border-neutral-200 px-2 py-3 text-center text-neutral-600">{guide.length}</td>
                          <td className="border-b border-neutral-200 px-2 py-3 text-center text-neutral-600">{guide.shoulder}</td>
                          <td className="border-b border-neutral-200 px-2 py-3 text-center text-neutral-600">{guide.chest}</td>
                          <td className="border-b border-neutral-200 px-2 py-3 text-center text-neutral-600">{guide.sleeve}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="px-4 py-4">
                  <p className="text-xs leading-5 text-neutral-400">
                    Measurements are in centimeters. We recommend sizing up if between sizes.
                  </p>
                </div>
              </div>
            </div>

            {/* Price + CTA */}
            <div className="mt-5 rounded-[28px] bg-neutral-50 px-5 py-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Price</p>
                  <p className="mt-1 text-[32px] font-semibold tracking-[-0.03em] text-neutral-950">
                    {UNIT_PRICE.toLocaleString()}원
                  </p>
                </div>
                <p className="text-right text-xs leading-5 text-neutral-400">
                  Free shipping
                  <br />
                  Ships in 7–14 business days
                </p>
              </div>

              <button
                type="button"
                onClick={handleDesignAndBuy}
                className="mt-5 w-full rounded-2xl bg-neutral-900 py-4 text-sm font-semibold text-white transition hover:bg-[#FF5A1F]"
              >
                Design & Buy
              </button>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
