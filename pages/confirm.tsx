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
type PaymentMethod = 'card';

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
  const [sameAsBuyer, setSameAsBuyer] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<PaymentMethod>('card');
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
    const pending = JSON.parse(pendingRaw) as {
      paymentId: string; imageUrl: string; cartItems: CartItem[];
      buyerName: string; buyerEmail: string; buyerPhone: string;
      recipientName: string; recipientPhone: string;
      postcode: string; address: string; addressDetail: string; deliveryNote?: string;
    };
    sessionStorage.removeItem(PENDING_CARD_KEY);

    setPaymentState('paying');
    fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    })
      .then((res) => { if (!res.ok) throw new Error('결제 검증에 실패했습니다.'); })
      .then(() => { void router.push(`/order/complete?paymentId=${pending.paymentId}`); })
      .catch((err: Error) => {
        setPaymentError(err.message);
        setPaymentState('error');
        void router.replace('/confirm', undefined, { shallow: true });
      });
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sameAsBuyer) {
      setRecipientName(buyerName);
      setRecipientPhone(buyerPhone);
    }
  }, [sameAsBuyer, buyerName, buyerPhone]);

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

  const handleDownloadPng = () => {
    if (!posterSnapshot) return;
    const a = document.createElement('a');
    a.href = posterSnapshot;
    a.download = `moviata-${config.title || 'design'}.png`;
    a.click();
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

  const handlePayment = async () => {
    if (paymentState === 'paying') return;

    if (!buyerName.trim()) { setPaymentError('이름을 입력해주세요.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) { setPaymentError('올바른 이메일을 입력해주세요.'); return; }
    if (!/^01[0-9]{8,9}$/.test(buyerPhone.replace(/-/g, ''))) { setPaymentError('올바른 전화번호를 입력해주세요. (예: 01012345678)'); return; }
    if (!recipientName.trim()) { setPaymentError('수령인 이름을 입력해주세요.'); return; }
    if (!/^01[0-9]{8,9}$/.test(recipientPhone.replace(/-/g, ''))) { setPaymentError('수령인 전화번호를 올바르게 입력해주세요.'); return; }
    if (!address.trim()) { setPaymentError('배송 주소를 입력해주세요.'); return; }
    if (!agreePrivacy) { setPaymentError('개인정보 수집 동의가 필요합니다.'); return; }
    if (!agreeRefund) { setPaymentError('환불 정책 동의가 필요합니다.'); return; }

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

    sessionStorage.setItem(PENDING_CARD_KEY, JSON.stringify({
      paymentId, imageUrl, cartItems,
      buyerName, buyerEmail, buyerPhone,
      recipientName, recipientPhone,
      postcode, address, addressDetail, deliveryNote,
    }));

    const paymentRequest = {
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
      sessionStorage.removeItem(PENDING_CARD_KEY);
      setPaymentError(response.message ?? '결제가 취소되었습니다.');
      setPaymentState('error');
      return;
    }

    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId, imageUrl, cartItems,
          buyerName, buyerEmail, buyerPhone,
          recipientName, recipientPhone,
          postcode, address, addressDetail, deliveryNote,
        }),
      });
      if (!verifyRes.ok) throw new Error('결제 검증에 실패했습니다.');
    } catch (err) {
      setPaymentError((err as Error).message);
      setPaymentState('error');
      return;
    }

    void router.push(`/order/complete?paymentId=${paymentId}`);
  };

  const openModal = (method: PaymentMethod) => {
    setPaymentError(null);
    setSelectedPayMethod(method);
    setModalMethod(method);
  };

  const handlePostcodeSearch = () => {
    const open = () =>
      new (window as { daum?: { Postcode: new (opts: { oncomplete: (d: { zonecode: string; roadAddress: string; jibunAddress: string }) => void }) => { open: () => void } } }).daum!.Postcode({
        oncomplete: (data) => {
          setPostcode(data.zonecode);
          setAddress(data.roadAddress || data.jibunAddress);
          setAddressDetail('');
        },
      }).open();

    if ((window as { daum?: unknown }).daum) {
      open();
    } else {
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = open;
      document.head.appendChild(script);
    }
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
              onClick={() => openModal('card')}
              disabled={paymentState === 'paying'}
              className="mt-5 w-full rounded-2xl bg-[#111111] py-4 text-sm font-semibold text-white transition hover:bg-[#333333] disabled:opacity-50"
            >
              {paymentState === 'paying' ? '결제 처리 중...' : '카드 결제하기'}
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="mt-2 w-full rounded-2xl border border-neutral-200 py-3.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
            >
              {t('downloadPng')}
            </button>

            {paymentState === 'error' && paymentError && (
              <p className="mt-2 text-center text-xs text-red-500">{paymentError}</p>
            )}
          </div>
        </aside>
      </div>
    </div>

      {modalMethod && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Sheet */}
          <div
            className="relative w-full sm:max-w-[440px] max-h-[85vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[#111111]">
                주문 / 결제
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setModalMethod(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F7] text-[#6B7280] transition hover:bg-[#E5E7EB]"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1 1L12 12M12 1L1 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 space-y-7">

              {/* 상품 정보 */}
              <section>
                <div className="flex items-center gap-4 rounded-2xl bg-[#F2F2F7] px-4 py-4">
                  <div className="h-[72px] w-[72px] flex-shrink-0 rounded-[16px] overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                    {posterSnapshot ? (
                      <img src={posterSnapshot} alt="상품 미리보기" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[#E5E7EB] flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" fill="#C6C6C8" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium tracking-[0.06em] text-[#6B7280] uppercase">MOVIATA</p>
                    <p className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em] text-[#111111]">커스텀 티셔츠</p>
                    <p className="mt-2 text-[17px] font-bold tracking-[-0.02em] text-[#111111]">
                      {totalAmount.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </section>

              {/* 구분선 */}
              <div className="h-px bg-[#E5E7EB]" />

              {/* 구매자 정보 */}
              <section>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">구매자 정보</p>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="이름"
                    aria-label="구매자 이름"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full h-[50px] rounded-[10px] bg-[rgba(120,120,128,0.12)] px-4 text-[15px] text-[#111111] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/40 transition"
                  />
                  <input
                    type="email"
                    placeholder="이메일"
                    aria-label="이메일"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full h-[50px] rounded-[10px] bg-[rgba(120,120,128,0.12)] px-4 text-[15px] text-[#111111] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/40 transition"
                  />
                  <input
                    type="tel"
                    placeholder="전화번호 (예: 01012345678)"
                    aria-label="전화번호"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full h-[50px] rounded-[10px] bg-[rgba(120,120,128,0.12)] px-4 text-[15px] text-[#111111] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/40 transition"
                  />
                </div>
              </section>

              {/* 구분선 */}
              <div className="h-px bg-[#E5E7EB]" />

              {/* 수령인 정보 */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">수령인 정보</p>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={sameAsBuyer}
                      onChange={(e) => setSameAsBuyer(e.target.checked)}
                    />
                    <div
                      className={`h-[20px] w-[20px] rounded-[6px] border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                        sameAsBuyer ? 'bg-[#FF5A1F] border-[#FF5A1F]' : 'bg-white border-[#C6C6C8]'
                      }`}
                    >
                      {sameAsBuyer && (
                        <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                          <path d="M1 3.5L4 6.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[13px] text-[#6B7280]">구매자 정보와 동일</span>
                  </label>
                </div>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="수령인 이름"
                    aria-label="수령인 이름"
                    value={recipientName}
                    disabled={sameAsBuyer}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full h-[50px] rounded-[10px] bg-[rgba(120,120,128,0.12)] px-4 text-[15px] text-[#111111] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/40 transition disabled:opacity-40"
                  />
                  <input
                    type="tel"
                    placeholder="수령인 전화번호"
                    aria-label="수령인 전화번호"
                    value={recipientPhone}
                    disabled={sameAsBuyer}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full h-[50px] rounded-[10px] bg-[rgba(120,120,128,0.12)] px-4 text-[15px] text-[#111111] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/40 transition disabled:opacity-40"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="우편번호"
                      aria-label="우편번호"
                      value={postcode}
                      readOnly
                      className="h-[50px] w-[110px] flex-shrink-0 rounded-[10px] bg-[rgba(120,120,128,0.12)] px-4 text-[15px] text-[#111111] placeholder:text-[#6B7280] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handlePostcodeSearch}
                      className="flex-1 h-[50px] rounded-[10px] bg-[#111111] text-white text-[14px] font-medium transition hover:bg-[#333333]"
                    >
                      우편번호 찾기
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="주소"
                    aria-label="주소"
                    value={address}
                    readOnly
                    className="w-full h-[50px] rounded-[10px] bg-[rgba(120,120,128,0.12)] px-4 text-[15px] text-[#111111] placeholder:text-[#6B7280] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="상세주소 (동/호수 등)"
                    aria-label="상세주소"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    className="w-full h-[50px] rounded-[10px] bg-[rgba(120,120,128,0.12)] px-4 text-[15px] text-[#111111] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/40 transition"
                  />
                  <div className="relative">
                    <select
                      value={deliveryNote}
                      aria-label="배송메모"
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      className="w-full h-[50px] appearance-none rounded-[10px] bg-[rgba(120,120,128,0.12)] px-4 pr-10 text-[15px] text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/40 transition"
                    >
                      <option value="">배송메모를 선택해주세요</option>
                      <option value="door">문 앞에 놓아주세요</option>
                      <option value="security">경비실에 맡겨주세요</option>
                      <option value="call">배달 전 연락 부탁드립니다</option>
                      <option value="direct">직접 수령하겠습니다</option>
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                      <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
                        <path d="M1 1L6 6L11 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </section>

              {/* 구분선 */}
              <div className="h-px bg-[#E5E7EB]" />

              {/* 결제수단 */}
              <section>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">결제수단</p>
                <div className="space-y-2.5">
                  {/* 카드 */}
                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('card')}
                    className={`w-full flex items-center gap-3 rounded-[14px] border-[1.5px] px-4 py-3.5 transition ${
                      selectedPayMethod === 'card'
                        ? 'border-[#FF5A1F] bg-[#FAFAFA]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#C6C6C8]'
                    }`}
                  >
                    <div className="flex h-10 w-[58px] flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#1C1C2E] to-[#2C2C4E] shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
                      <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
                        <rect width="30" height="20" rx="3" fill="url(#cg)" />
                        <rect y="5.5" width="30" height="5" fill="white" fillOpacity="0.15" />
                        <rect x="4" y="13.5" width="9" height="3" rx="1.5" fill="#FFCC00" />
                        <defs>
                          <linearGradient id="cg" x1="0" y1="0" x2="30" y2="20" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#1C1C2E" />
                            <stop offset="1" stopColor="#2C2C4E" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[15px] font-semibold text-[#111111]">신용 / 체크카드</p>
                      <p className="text-[12px] text-[#6B7280]">국내외 모든 카드 결제</p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-[2px] flex-shrink-0 flex items-center justify-center transition-colors ${
                      selectedPayMethod === 'card' ? 'border-[#FF5A1F]' : 'border-[#C6C6C8]'
                    }`}>
                      {selectedPayMethod === 'card' && (
                        <div className="h-[10px] w-[10px] rounded-full bg-[#FF5A1F]" />
                      )}
                    </div>
                  </button>

                </div>
              </section>

              {/* 구분선 */}
              <div className="h-px bg-[#E5E7EB]" />

              {/* 약관 동의 */}
              <section className="space-y-3.5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">약관 동의</p>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                  />
                  <div className={`mt-0.5 h-[22px] w-[22px] rounded-[7px] border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                    agreePrivacy ? 'bg-[#FF5A1F] border-[#FF5A1F]' : 'bg-white border-[#C6C6C8]'
                  }`}>
                    {agreePrivacy && (
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[14px] leading-6 text-[#111111]">
                    개인정보 수집 및 이용에 동의합니다{' '}
                    <span className="text-[#FF3B30] text-[12px]">(필수)</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={agreeRefund}
                    onChange={(e) => setAgreeRefund(e.target.checked)}
                  />
                  <div className={`mt-0.5 h-[22px] w-[22px] rounded-[7px] border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                    agreeRefund ? 'bg-[#FF5A1F] border-[#FF5A1F]' : 'bg-white border-[#C6C6C8]'
                  }`}>
                    {agreeRefund && (
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[14px] leading-6 text-[#111111]">
                    환불 정책에 동의합니다{' '}
                    <span className="text-[#FF3B30] text-[12px]">(필수)</span>
                  </span>
                </label>
              </section>

              {/* 에러 메시지 */}
              {paymentState === 'error' && paymentError && (
                <p className="text-center text-[13px] text-[#FF3B30]">{paymentError}</p>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 flex gap-3 px-6 py-5 border-t border-[#E5E7EB] bg-white">
              <button
                type="button"
                onClick={() => setModalMethod(null)}
                className="h-[50px] w-24 flex-shrink-0 rounded-[14px] border border-[#E5E7EB] text-[15px] font-medium text-[#6B7280] transition hover:bg-[#F2F2F7]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handlePayment()}
                disabled={paymentState === 'paying' || !agreePrivacy || !agreeRefund}
                className={`flex-1 h-[50px] rounded-[14px] text-white text-[15px] font-semibold transition ${
                  agreePrivacy && agreeRefund
                    ? 'bg-[#FF5A1F] hover:bg-[#E04A12]'
                    : 'bg-[#C6C6C8] cursor-not-allowed'
                } disabled:opacity-50`}
              >
                {paymentState === 'paying' ? '처리 중...' : `${totalAmount.toLocaleString()}원 결제하기`}
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
