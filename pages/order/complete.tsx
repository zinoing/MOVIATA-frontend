import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Layout from '../../components/Layout';

interface CartItem {
  id: number;
  size: string;
  qty: number;
}

interface Order {
  id: string;
  paymentId: string;
  buyerName: string;
  recipientName: string;
  address: string;
  addressDetail: string;
  postcode: string;
  cartItems: CartItem[];
  totalAmount: number;
  imageUrl: string;
  createdAt: string;
}

export default function OrderCompletePage() {
  const router = useRouter();
  const t = useTranslations('orderComplete');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { paymentId } = router.query;
    if (typeof paymentId !== 'string') {
      setError(t('invalidAccess'));
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
    fetch(`${backendUrl}/api/orders/${encodeURIComponent(paymentId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(t('orderNotFound'));
        return res.json() as Promise<{ success: boolean; order: Order }>;
      })
      .then((data) => setOrder(data.order))
      .catch((err: Error) => setError(err.message));
  }, [router.isReady, router.query]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <Layout title={t('errorTitle')}>
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-sm text-[#FF3B30]">{error}</p>
            <Link href="/" className="mt-4 inline-block text-sm text-[#6B7280] underline">
              {t('home')}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout title={t('title')}>
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-[#6B7280]">{t('loading')}</p>
        </div>
      </Layout>
    );
  }

  const shortId = order.paymentId.replace(/-/g, '').slice(0, 12).toUpperCase();
  const cartItems = order.cartItems as CartItem[];

  return (
    <Layout title={t('title')}>
      <div className="min-h-screen bg-[#F2F2F7] px-5 py-12">
        <div className="mx-auto w-full max-w-[480px] space-y-4">

          {/* 성공 헤더 */}
          <div className="rounded-[28px] bg-white px-6 py-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FF5A1F]/10">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 16L13 23L26 9" stroke="#FF5A1F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-4 text-[22px] font-bold tracking-[-0.03em] text-[#111111]">
              {t('successHeading')}
            </h1>
            <p className="mt-2 text-[14px] text-[#6B7280]">
              {t('orderNumber')} <span className="font-semibold text-[#111111]">{shortId}</span>
            </p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              {t('shippingNotice')}
            </p>
          </div>

          {/* 주문 상품 */}
          <div className="rounded-[28px] bg-white px-6 py-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">{t('orderedItems')}</p>
            <div className="mt-4 space-y-3">
              {cartItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#111111] text-[12px] font-semibold text-white">
                      {item.size}
                    </span>
                    <span className="text-[14px] text-[#111111]">{t('productName')}</span>
                  </div>
                  <span className="text-[14px] font-medium text-[#111111]">
                    {(item.qty * 30000).toLocaleString()}원 × {item.qty}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-[#E5E7EB] pt-4 flex justify-between">
              <span className="text-[14px] font-semibold text-[#111111]">{t('total')}</span>
              <span className="text-[17px] font-bold tracking-[-0.02em] text-[#111111]">
                {order.totalAmount.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 배송지 */}
          <div className="rounded-[28px] bg-white px-6 py-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">{t('shippingAddress')}</p>
            <div className="mt-4 space-y-1.5">
              <p className="text-[15px] font-semibold text-[#111111]">{order.recipientName}</p>
              <p className="text-[14px] text-[#6B7280]">
                ({order.postcode}) {order.address}
              </p>
              {order.addressDetail && (
                <p className="text-[14px] text-[#6B7280]">{order.addressDetail}</p>
              )}
            </div>
          </div>

          {/* 홈으로 버튼 */}
          <Link
            href="/"
            className="block w-full rounded-[14px] bg-[#111111] py-4 text-center text-[15px] font-semibold text-white transition hover:bg-[#333333]"
          >
            {t('backToHome')}
          </Link>

        </div>
      </div>
    </Layout>
  );
}
