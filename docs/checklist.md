# MOVIATA 개발 체크리스트

> 마지막 업데이트: 2026-04-09
>
> 브랜치: `main`

---

## 1. 🗺️ 변위맵 생성 및 티셔츠 목업 합성

티셔츠 주름/음영에 맞게 디자인 이미지를 자연스럽게 합성하는 기능

### 1-1. 변위맵 준비

* [ ] 티셔츠 기본 사진(앞/뒤) 고해상도 촬영 또는 확보
* [ ] Photoshop에서 채널 기반 변위맵 (.PSD) 생성
  * Red/Green/Blue 채널 중 명암 대비 최대 채널 선택
  * 회색조 변환 후 Gaussian Blur 적용 (3~5px)
  * Levels 조정으로 대비 강화
  * `.psd` 파일로 저장 → `public/displacement/` 에 배치
* [ ] 앞면 변위맵 완성
* [ ] 뒷면 변위맵 완성

### 1-2. Canvas 기반 합성 구현

* [ ] `lib/displacement.ts` 유틸 함수 작성
  * 변위맵 이미지 로드
  * 사용자 디자인 이미지에 픽셀 왜곡 적용
  * Multiply 블렌드 모드로 음영 합성
* [ ] `hooks/useMockup.ts` 훅 작성
  * 티셔츠 사진 + 디자인 + 변위맵 합성 파이프라인
* [ ] `components/TshirtPreview.tsx` 컴포넌트 작성
  * Canvas 렌더링
  * 앞/뒤 전환 UI
* [ ] 결과물 이미지 다운로드 기능

### 1-3. 품질 검증

* [ ] 다양한 디자인으로 합성 품질 테스트
* [ ] 모바일 환경에서 Canvas 성능 테스트
* [ ] 이미지 해상도 최적화 (출력용 고해상도 유지)

---

## 2. 📍 GPX 파일 업로드 기능

사용자의 GPS 경로 데이터를 받아 지도 위에 렌더링하는 기능

### 2-1. 파일 업로드 UI

* [X] 파일 형식 검증 (`.gpx` only) — `pages/start.tsx`
* [X] 파일 크기 제한 처리 (10MB) — `pages/start.tsx`
* [X] 업로드 상태 UI (로딩, 에러) — `pages/start.tsx`
* [ ] `components/GpxUploader.tsx` 분리 (드래그 앤 드롭 지원)

### 2-2. GPX 파싱

* [X] `lib/gpxParser.ts` 작성
  * DOMParser 기반 GPX XML 파싱
  * `trkpt` 좌표 배열 추출 (lat, lon → [lon, lat] MapLibre 순서)
  * 거리 계산 (Haversine formula)
  * 소요 시간 계산 (첫/마지막 `<time>` 차이)
* [X] `types/gpx.ts` 타입 정의 (`GpxData`)

### 2-3. 지도 렌더링

* [X] 파싱된 좌표를 MapLibre GeoJSON 레이어로 렌더링 — `pages/design/gpx.tsx` + 기존 `ActivityMap` 재사용
* [X] 경로에 맞게 지도 자동 Fit (fitBounds) — `ActivityMap` 내장
* [X] 경로 통계 표시 (거리, 시간, 날짜) — `DesignSettingsPanel` 재사용
* [ ] 지역명 자동 추출 (Reverse Geocoding)

### 2-4. 디자인 생성

* [X] 캡처 이미지를 티셔츠 목업 합성 파이프라인에 전달 — `pages/design/gpx.tsx` → `/confirm`
* [ ] 드래그 앤 드롭 업로드 지원

---

## 3. 🌏 한국어 / 일본어 다국어 지원 (i18n)

### 3-1. i18n 구조 설계

* [ ] i18n 라이브러리 선택 및 설치
  * 권장: `next-intl` (Next.js 14 Pages Router 호환)
* [ ] `locales/` 폴더 구조 설계
  ```
  locales/├── ko.json   # 한국어└── ja.json   # 일본어
  ```
* [ ] 언어 감지 로직 (브라우저 설정 기반)
* [ ] URL 기반 언어 전환 (`/ko/`, `/ja/`) 또는 쿠키 기반 결정

### 3-2. 번역 텍스트 작업

* [ ] 전체 UI 텍스트 인벤토리 정리
* [ ] `locales/ko.json` 한국어 번역 완성
* [ ] `locales/ja.json` 일본어 번역 완성
  * 일본어 번역은 전문 번역 또는 검토 필요
* [ ] 날짜/숫자 포맷 로케일별 처리

### 3-3. 컴포넌트 적용

* [ ] 하드코딩된 문자열을 모두 번역 키로 교체
* [ ] 언어 전환 UI 컴포넌트 추가 (헤더 or 설정)
* [ ] RTL 레이아웃 불필요 확인 (한국어/일본어는 LTR)

---

## 4. 💳 결제 기능

### 4-1. 결제 수단 선택 및 연동

* [ ] PG사 선택
  * 국내 추천: **토스페이먼츠** (간편한 SDK, 문서 우수)
  * 대안: 아임포트 (포트원)
* [ ] 사업자 등록 및 PG 계약 완료
* [ ] SDK 설치 및 환경변수 설정
  ```env
  NEXT_PUBLIC_TOSS_CLIENT_KEY=TOSS_SECRET_KEY=
  ```

### 4-2. 주문 데이터 설계

* [ ] 주문 데이터 구조 정의 (`types/order.ts`)
  ```typescript
  interface Order {  id: string  userId?: string  gpxData: GpxData  designImageUrl: string  shirtSize: 'S' | 'M' | 'L' | 'XL'  quantity: number  price: number  status: 'pending' | 'paid' | 'failed'  createdAt: string}
  ```
* [ ] 백엔드 API 연동 (주문 생성, 결제 검증)
  * `pages/api/orders/create.ts`
  * `pages/api/payments/confirm.ts`

### 4-3. 결제 플로우 구현

* [ ] 주문 요약 페이지 (`pages/checkout.tsx`)
  * 티셔츠 목업 미리보기
  * 사이즈 선택
  * 수량 선택
  * 배송지 입력
  * 최종 금액 표시
* [ ] 결제 위젯 렌더링
* [ ] 결제 성공 페이지 (`pages/payment/success.tsx`)
* [ ] 결제 실패 페이지 (`pages/payment/fail.tsx`)
* [ ] 결제 완료 후 이메일 알림 (선택)

### 4-4. 보안

* [ ] 결제 금액 서버 사이드 검증 (클라이언트 금액 신뢰 금지)
* [ ] 주문 상태 멱등성 처리 (중복 결제 방지)
* [ ] 환불 처리 플로우 설계

---

## 기타 / 인프라

* [ ] Vercel 환경변수 설정 (프로덕션)
* [ ] 에러 모니터링 도구 연동 (Sentry 등)
* [ ] 이미지 최적화 (Next.js Image 컴포넌트 활용)
* [ ] SEO 메타태그 정비 (`next/head`)
* [ ] OG Image 설정

---

## 완료된 항목

* [X] Next.js 14 + TypeScript 기본 세팅
* [X] MapLibre GL 지도 렌더링
* [X] PMTiles / Protomaps 오프라인 타일 연동
* [X] Apple HIG 디자인 시스템 정의 (`apple-hig-design-prompt.md`)
* [X] Tailwind CSS 설정
* [X] Vercel 배포 연결
