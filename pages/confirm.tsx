import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import PortOne from '@portone/browser-sdk/v2';
import Layout from '../components/Layout';
import ShirtMockup from '../components/ShirtMockup';
import { useDesignConfig } from '../context/DesignConfigContext';

type ProductSize = 'S' | 'M' | 'L' | 'XL';
type ProductColor = 'white' | 'black';
type CartItem = { id: number; size: ProductSize; qty: number };
type PaymentMethod = 'kakaopay' | 'card';

const PENDING_CARD_KEY = 'moviata-pending-card-payment';

const sizeOptions: ProductSize[] = ['S', 'M', 'L', 'XL'];

const sizeGuideMap: Record<ProductSize, { length: string; shoulder: string; chest: string; sleeve: string }> = {
  S: { length: '66', shoulder: '44', chest: '49', sleeve: '19' },
  M: { length: '70', shoulder: '47', chest: '52', sleeve: '20' },
  L: { length: '74', shoulder: '50', chest: '55', sleeve: '22' },
  XL: { length: '78', shoulder: '53', chest: '58', sleeve: '24' },
};

export default function ConfirmPage() {
  const router = useRouter();
  const { config, posterSnapshot, isHydrated } = useDesignConfig();
  const [cartItems, setCartItems] = useState<CartItem[]>([{ id: Date.now(), size: 'M', qty: 1 }]);
  const [paymentState, setPaymentState] = useState<'idle' | 'paying' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [modalMethod, setModalMethod] = useState<PaymentMethod | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const t = useTranslations('confirm');

  const UNIT_PRICE = 30000;
  const totalQty = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = totalQty * UNIT_PRICE;

  // 디자인 페이지 리다이렉트
  useEffect(() => {
    if (!isHydrated || !router.isReady) return;
    if (config && posterSnapshot) return;
    if (router.query.paymentId) return; // 카드 모바일 리다이렉트 복귀

    if (!config) {
      void router.replace('/strava/activities');
    } else {
      void router.replace(
        config.activityId === 'motion' ? '/motion/design' : `/design/${config.activityId}`,
      );
    }
  }, [isHydrated, router.isReady, config, posterSnapshot, router]);

  // 카드 결제 모바일 리다이렉트 복귀 처리
  useEffect(() => {
    if (!router.isReady) return;
    const { paymentId, code, message } = router.query;
    if (typeof paymentId !== 'string') return;

    if (code) {
      setPaymentError(typeof message === 'string' ? message : '결제가 취소되었습니다.');
      setPaymentState('error');
      void router.replace('/confirm', undefined, { shallow: true });
      return;
    }

    const pendingRaw = sessionStorage.getItem(PENDING_CARD_KEY);
    if (!pendingRaw) return;
    const pending = JSON.parse(pendingRaw) as { paymentId: string; imageUrl: string; cartItems: CartItem[] };
    sessionStorage.removeItem(PENDING_CARD_KEY);

    setPaymentState('paying');
    fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: pending.paymentId, imageUrl: pending.imageUrl, cartItems: pending.cartItems }),
    })
      .then((res) => { if (!res.ok) throw new Error('결제 검증에 실패했습니다.'); })
      .then(() => { void router.push('/order/complete'); })
      .catch((err: Error) => {
        setPaymentError(err.message);
        setPaymentState('error');
        void router.replace('/confirm', undefined, { shallow: true });
      });
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isHydrated || !router.isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-neutral-500">{t('redirecting')}</p>
      </div>
    );
  }

  if (router.query.paymentId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-neutral-500">결제 결과 확인 중...</p>
      </div>
    );
  }

  if (!config || !posterSnapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-neutral-500">{t('redirecting')}</p>
      </div>
    );
  }

  const productColor = config.shirtColor as ProductColor;

  const addCartItem = () => {
    setCartItems((prev) => [...prev, { id: Date.now(), size: 'M', qty: 1 }]);
  };

  const removeCartItem = (id: number) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateCartSize = (id: number, size: ProductSize) => {
    setCartItems((prev) => prev.map((i) => (i.id === id ? { ...i, size } : i)));
  };

  const updateCartQty = (id: number, delta: number) => {
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)),
    );
  };

  const handleBackToDesign = () => {
    sessionStorage.setItem('design-return-from-confirm', '1');
    if (config.activityId === 'motion') {
      void router.push('/motion/design');
    } else {
      void router.push(`/design/${config.activityId}`);
    }
  };

  const uploadDesignImage = async (retryCount = 0): Promise<string> => {
    if (!posterSnapshot) throw new Error('posterSnapshot이 없습니다.');

    const base64Data = posterSnapshot.replace(/^data:image\/\w+;base64,/, '');
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });

    const formData = new FormData();
    formData.append('image', blob, 'design.png');
    formData.append('designType', config.activityId === 'motion' ? 'motion' : 'route');
    formData.append('title', config.title);
    formData.append('shirtColor', config.shirtColor);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:4000';
    const res = await fetch(`${apiBase}/api/orders/capture`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      if (retryCount < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
        return uploadDesignImage(retryCount + 1);
      }
      const text = await res.text();
      throw new Error(`업로드 실패 (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { success: boolean; imageUrl: string; orderId: string };
    return data.imageUrl;
  };

  const handlePayment = async (method: PaymentMethod) => {
    if (paymentState === 'paying') return;

    if (!buyerName.trim()) { setPaymentError('이름을 입력해주세요.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) { setPaymentError('올바른 이메일을 입력해주세요.'); return; }
    if (!/^01[0-9]{8,9}$/.test(buyerPhone.replace(/-/g, ''))) { setPaymentError('올바른 전화번호를 입력해주세요. (예: 01012345678)'); return; }

    setPaymentState('paying');
    setPaymentError(null);

    let imageUrl: string;
    try {
      imageUrl = await uploadDesignImage();
    } catch (err) {
      setPaymentError((err as Error).message);
      setPaymentState('error');
      return;
    }

    const paymentId = crypto.randomUUID();
    const customer = { fullName: buyerName, email: buyerEmail, phoneNumber: buyerPhone };

    if (method === 'card') {
      sessionStorage.setItem(PENDING_CARD_KEY, JSON.stringify({ paymentId, imageUrl, cartItems }));
    }

    const paymentRequest =
      method === 'kakaopay'
        ? {
            storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
            channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAO!,
            paymentId,
            orderName: '커스텀 티셔츠',
            totalAmount,
            currency: 'KRW',
            payMethod: 'EASY_PAY',
            easyPay: { easyPayProvider: 'KAKAOPAY' },
            customer,
          }
        : {
            storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
            channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_CARD!,
            paymentId,
            orderName: '커스텀 티셔츠',
            totalAmount,
            currency: 'KRW',
            payMethod: 'CARD',
            redirectUrl: `${window.location.origin}/confirm`,
            customer,
          };

    const response = await PortOne.requestPayment(
      paymentRequest as Parameters<typeof PortOne.requestPayment>[0],
    );

    // 카드 모바일: requestPayment가 resolve되지 않고 리다이렉트됨
    if (response === undefined) return;

    if (response.code !== undefined) {
      if (method === 'card') sessionStorage.removeItem(PENDING_CARD_KEY);
      setPaymentError(response.message ?? '결제가 취소되었습니다.');
      setPaymentState('error');
      return;
    }

    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, imageUrl, cartItems }),
      });
      if (!verifyRes.ok) throw new Error('결제 검증에 실패했습니다.');
    } catch (err) {
      setPaymentError((err as Error).message);
      setPaymentState('error');
      return;
    }

    void router.push('/order/complete');
  };

  const openModal = (method: PaymentMethod) => {
    setPaymentError(null);
    setModalMethod(method);
  };

  return (
    <Layout title={t('title')}>
    <div className="min-h-screen bg-white px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-[1440px] pb-6">
        <p className="text-sm text-neutral-500">{t('preview')}</p>

        <div className="mt-2">
          <button
            type="button"
            onClick={handleBackToDesign}
            className="text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            {t('backToDesign')}
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
                  //width={640}
                  productColor={productColor}
                />
              </div>
            </div>

            {/* PRODUCT INFORMATION */}
            <div className="rounded-[28px] border border-neutral-200 bg-white px-5 py-5 lg:px-6 lg:py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                {t('productInfo')}
              </p>

              <div className="mt-5 space-y-8">
                <section>
                  <p className="text-sm font-semibold text-neutral-900">
                    {t('productDescription.title')}
                  </p>

                  <div className="mt-3 text-sm leading-7 text-neutral-600">
                    <div className="space-y-2">
                      <Bullet>{t('productDescription.bullet1')}</Bullet>
                      <Bullet>{t('productDescription.bullet2')}</Bullet>
                      <Bullet>{t('productDescription.bullet3')}</Bullet>
                    </div>
                  </div>
                </section>

                <section className="border-t border-neutral-200 pt-6">
                  <p className="text-sm font-semibold text-neutral-900">
                    {t('refund.title')}
                  </p>

                  <div className="mt-3 text-sm leading-7 text-neutral-600">
                    <p>{t('refund.text1')}</p>
                    <p className="mt-4">{t('refund.text2')}</p>
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
              {t('moviata')}
            </p>

            <h1 className="mt-3 text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950">
              {t('heading')}
            </h1>

            <p className="mt-4 text-sm leading-6 text-neutral-500">
              {t('subtitle')}
            </p>
          </div>

          <div className="mt-8 border-t border-neutral-200 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              {t('product')}
            </p>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {t('sizeGuide.title')}
                </p>
              </div>

              <div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-white text-neutral-500">
                      <th className="border-b border-neutral-200 px-3 py-3 text-left font-medium">
                        {t('sizeGuide.size')}
                      </th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">
                        {t('sizeGuide.length')}
                      </th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">
                        {t('sizeGuide.shoulder')}
                      </th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">
                        {t('sizeGuide.chest')}
                      </th>
                      <th className="border-b border-neutral-200 px-2 py-3 text-center font-medium">
                        {t('sizeGuide.sleeve')}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sizeOptions.map((size) => {
                      const guide = sizeGuideMap[size];
                      const isInCart = cartItems.some((i) => i.size === size);

                      return (
                        <tr
                          key={size}
                          className={`transition ${isInCart ? 'bg-black/[0.05]' : 'bg-white'}`}
                        >
                          <td className="border-b border-neutral-200 px-3 py-3 font-medium text-neutral-900">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold ${
                                  isInCart
                                    ? 'bg-black text-white'
                                    : 'bg-neutral-200 text-neutral-700'
                                }`}
                              >
                                {size}
                              </span>
                            </div>
                          </td>
                          <td className={`border-b border-neutral-200 px-2 py-3 text-center ${isInCart ? 'font-semibold text-neutral-950' : 'text-neutral-600'}`}>
                            {guide.length}
                          </td>
                          <td className={`border-b border-neutral-200 px-2 py-3 text-center ${isInCart ? 'font-semibold text-neutral-950' : 'text-neutral-600'}`}>
                            {guide.shoulder}
                          </td>
                          <td className={`border-b border-neutral-200 px-2 py-3 text-center ${isInCart ? 'font-semibold text-neutral-950' : 'text-neutral-600'}`}>
                            {guide.chest}
                          </td>
                          <td className={`border-b border-neutral-200 px-2 py-3 text-center ${isInCart ? 'font-semibold text-neutral-950' : 'text-neutral-600'}`}>
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
                  {t('sizeGuide.note')}
                </p>
              </div>
            </div>
          </div>

          {/* 장바구니 아이템 */}
          <div className="mt-5 space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3"
              >
                <select
                  value={item.size}
                  onChange={(e) => updateCartSize(item.id, e.target.value as ProductSize)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:outline-none"
                >
                  {sizeOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-neutral-900">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                  >
                    +
                  </button>
                </div>

                <span className="ml-auto text-sm font-medium text-neutral-900">
                  {(item.qty * UNIT_PRICE).toLocaleString()}원
                </span>

                {cartItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCartItem(item.id)}
                    className="text-neutral-400 transition hover:text-neutral-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addCartItem}
              className="w-full rounded-2xl border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
            >
              {t('addSize')}
            </button>
          </div>

          <div className="mt-5 rounded-[28px] bg-neutral-50 px-5 py-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-500">{t('total')}</p>
                <p className="mt-1 text-[32px] font-semibold tracking-[-0.03em] text-neutral-950">
                  {totalAmount.toLocaleString()}원
                </p>
              </div>

              <p className="text-right text-xs leading-5 text-neutral-400">
                {t('delivery')}
                <br />
                {t('deliveryDays')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => openModal('kakaopay')}
              disabled={paymentState === 'paying'}
              className="mt-5 w-full rounded-2xl bg-yellow-400 py-4 text-sm font-semibold text-neutral-900 transition hover:bg-yellow-300 disabled:opacity-50"
            >
              {paymentState === 'paying' ? '결제 처리 중...' : 'KakaoPay로 결제하기'}
            </button>

            {paymentState === 'error' && paymentError && (
              <p className="mt-2 text-center text-xs text-red-500">{paymentError}</p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled
                className="rounded-2xl bg-green-500 py-3 text-sm font-medium text-white opacity-40"
              >
                NaverPay
              </button>
              <button
                type="button"
                onClick={() => openModal('card')}
                disabled={paymentState === 'paying'}
                className="rounded-2xl bg-neutral-200 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-300 disabled:opacity-50"
              >
                카드 결제
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>

      {modalMethod && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          onClick={() => setModalMethod(null)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] bg-white px-6 py-7 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-neutral-950">
              구매자 정보 입력
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {modalMethod === 'kakaopay' ? '카카오페이' : '카드'} 결제에 사용됩니다.
            </p>

            <div className="mt-5 space-y-3">
              <input
                type="text"
                placeholder="이름"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
              <input
                type="email"
                placeholder="이메일"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
              <input
                type="tel"
                placeholder="전화번호 (예: 01012345678)"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            {paymentState === 'error' && paymentError && (
              <p className="mt-3 text-center text-xs text-red-500">{paymentError}</p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModalMethod(null)}
                className="flex-1 rounded-2xl border border-neutral-200 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handlePayment(modalMethod)}
                disabled={paymentState === 'paying'}
                className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition disabled:opacity-50 ${
                  modalMethod === 'kakaopay'
                    ? 'bg-yellow-400 text-neutral-900 hover:bg-yellow-300'
                    : 'bg-neutral-900 text-white hover:bg-neutral-700'
                }`}
              >
                {paymentState === 'paying' ? '처리 중...' : '결제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}


function Bullet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-neutral-600">• {children}</p>;
}
