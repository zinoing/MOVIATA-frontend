import type { NextApiRequest, NextApiResponse } from 'next';

const UNIT_PRICE = 30000;

interface CartItem {
  id: number;
  size: string;
  qty: number;
}

interface OrderPayload {
  paymentId: string;
  imageUrl: string;
  cartItems: CartItem[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  recipientName: string;
  recipientPhone: string;
  postcode: string;
  address: string;
  addressDetail: string;
  deliveryNote?: string;
}

interface PortOnePayment {
  status: string;
  amount: { total: number };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const body = req.body as OrderPayload;
  const { paymentId, imageUrl, cartItems } = body;

  if (!paymentId || !Array.isArray(cartItems)) {
    return res.status(400).json({ message: '필수 파라미터가 누락되었습니다.' });
  }

  const secret = process.env.PORTONE_V2_API_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'PortOne API secret이 설정되지 않았습니다.' });
  }

  // 1. PortOne 결제 검증
  let portoneRes: Response;
  try {
    portoneRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${secret}` },
    });
  } catch (e) {
    console.error('[verify] PortOne fetch error:', e);
    return res.status(500).json({ message: 'PortOne API 호출 실패', detail: String(e) });
  }

  if (!portoneRes.ok) {
    const text = await portoneRes.text();
    console.error('[verify] PortOne response error:', portoneRes.status, text);
    return res.status(400).json({ message: '결제 정보를 조회할 수 없습니다.', detail: text });
  }

  const payment = (await portoneRes.json()) as PortOnePayment;

  if (payment.status !== 'PAID') {
    return res.status(400).json({ message: `결제 상태가 올바르지 않습니다. (${payment.status})` });
  }

  const expectedAmount = cartItems.reduce((sum, item) => sum + item.qty * UNIT_PRICE, 0);
  if (payment.amount.total !== expectedAmount) {
    return res.status(400).json({ message: '결제 금액이 일치하지 않습니다.' });
  }

  // 2. 백엔드에 주문 저장
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
  let saveRes: Response;
  try {
    saveRes = await fetch(`${backendUrl}/api/orders/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId,
        imageUrl,
        cartItems,
        totalAmount: expectedAmount,
        buyerName: body.buyerName,
        buyerEmail: body.buyerEmail,
        buyerPhone: body.buyerPhone,
        recipientName: body.recipientName,
        recipientPhone: body.recipientPhone,
        postcode: body.postcode,
        address: body.address,
        addressDetail: body.addressDetail,
        deliveryNote: body.deliveryNote,
      }),
    });
  } catch (e) {
    console.error('[verify] backend fetch error:', e);
    return res.status(500).json({ message: '백엔드 연결 실패', detail: String(e) });
  }

  if (!saveRes.ok) {
    const text = await saveRes.text();
    console.error('[verify] backend save error:', saveRes.status, text);
    return res.status(500).json({ message: '주문 저장에 실패했습니다.', detail: text });
  }

  return res.status(200).json({ success: true });
}
