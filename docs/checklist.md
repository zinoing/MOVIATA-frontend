# MOVIATA 개발 체크리스트

> 마지막 업데이트: 2026-04-12
>
> 브랜치: `main`

---

## 1. 🗺️ 변위맵 생성 및 티셔츠 목업 합성

티셔츠 주름/음영에 맞게 디자인 이미지를 자연스럽게 합성하는 기능

### 1-1. 변위맵 준비

* [X] 티셔츠 기본 사진(앞/뒤) 고해상도 촬영 또는 확보
* [X] Photoshop에서 채널 기반 변위맵 (.PSD) 생성
  * Red/Green/Blue 채널 중 명암 대비 최대 채널 선택
  * 회색조 변환 후 Gaussian Blur 적용 (3~5px)
  * Levels 조정으로 대비 강화
  * `.psd` 파일로 저장 → `public/displacement/` 에 배치
* [X] 앞면 변위맵 완성
* [X] 뒷면 변위맵 완성

### 1-2. Canvas 기반 합성 구현

* [X] `lib/displacement.ts` 유틸 함수 작성
  * 변위맵 이미지 로드
  * 사용자 디자인 이미지에 픽셀 왜곡 적용
  * Multiply 블렌드 모드로 음영 합성
* [X] `hooks/useMockup.ts` 훅 작성
  * 티셔츠 사진 + 디자인 + 변위맵 합성 파이프라인
* [X] `components/TshirtPreview.tsx` 컴포넌트 작성
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

### 2-4. 디자인 생성

* [X] 캡처 이미지를 티셔츠 목업 합성 파이프라인에 전달 — `pages/design/gpx.tsx` → `/confirm`
* [ ] 드래그 앤 드롭 업로드 지원

---

## 3. 🌏 한국어 / 일본어 다국어 지원 (i18n)

### 3-1. i18n 구조 설계

* [X] i18n 라이브러리 선택 및 설치
  * `next-intl` v3 (Next.js 14 Pages Router 호환) 설치 완료
* [X] `locales/` 폴더 구조 설계
  ```
  locales/├── ko.json   # 한국어└── ja.json   # 일본어
  ```
* [X] 언어 감지 로직 — Next.js 내장 i18n 라우팅 (`next.config.js`) 기반
* [X] URL 기반 언어 전환 (`/ko/`, `/ja/`) — `next.config.js` i18n + 헤더 스위처

### 3-2. 번역 텍스트 작업

* [X] 전체 UI 텍스트 인벤토리 정리
* [X] `locales/ko.json` 한국어 번역 완성
* [X] `locales/ja.json` 일본어 번역 완성
  * 일본어 번역은 전문 번역 또는 검토 필요
* [X] 날짜/숫자 포맷 — `timeZone: "Asia/Seoul"` 설정 완료

### 3-3. 컴포넌트 적용

* [X] 하드코딩된 문자열을 모두 번역 키로 교체
  * `pages/index.tsx`, `activity-type.tsx`, `start.tsx`, `confirm.tsx`
  * `pages/strava/activities.tsx`, `pages/design/gpx.tsx`
  * `components/DesignSettingsPanel.tsx`
* [X] 언어 전환 UI 컴포넌트 추가 — `components/Layout.tsx` 헤더 우측
* [X] RTL 레이아웃 불필요 확인 (한국어/일본어는 LTR)

---

## 4. 🖼️ 디자인 이미지 저장 (Cloudflare R2)

구매 확정 시 캡쳐된 포스터 이미지를 영구 저장하는 기능.
Railway 로컬 디스크는 재배포 시 초기화되므로 R2를 사용.

### 4-1. Cloudflare R2 버킷 설정

* [X] Cloudflare 계정에서 R2 버킷 생성
  * 버킷명: `moviata-map-designs`
* [X] API 토큰 발급
  * Workers R2 Storage 권한 부여
* [X] 환경변수 설정
  ```env
  CLOUDFLARE_ACCOUNT_ID=R2_ACCESS_KEY_ID=R2_SECRET_ACCESS_KEY=R2_BUCKET_NAME=moviata-designsR2_PUBLIC_URL=                  # 퍼블릭 도메인 또는 커스텀 도메인
  ```

### 4-2. Railway API 서버 연동

* [X] `@aws-sdk/client-s3` 설치 (R2는 S3 호환 API 사용)
  ```bash
  npm install @aws-sdk/client-s3
  ```
* [X] `src/lib/r2.ts` S3 클라이언트 초기화
* [X] `POST /api/orders/capture` 엔드포인트 구현
  * `multipart/form-data`로 이미지 수신 (multer 메모리 스토리지)
  * R2에 업로드 후 퍼블릭 URL 반환
  * orderId와 함께 인메모리 DB에 imageUrl 저장
* [X] 파일명 규칙 정의
  * `designs/{orderId}/{timestamp}.jpg`
* [X] 업로드 파일 크기 제한 설정 (10MB)

### 4-3. 프론트엔드 연동

* [X] `confirm.tsx`의 구매 확정 버튼(`handleBuyNow`) 에서 이미지 전송
  * `posterSnapshot` (base64) → Blob 변환 → FormData로 전송
* [X] 업로드 로딩 상태 UI 추가
* [X] 업로드 실패 시 에러 핸들링 및 재시도 로직 (최대 2회 재시도)

### 4-4. 검증

* [ ] 이미지 업로드 후 R2 버킷에서 파일 확인 — 백엔드 서버 기동 후 실제 업로드 테스트 필요
* [ ] 반환된 퍼블릭 URL로 이미지 접근 가능 여부 확인 — R2 버킷 퍼블릭 도메인 활성화 확인
* [ ] 결제 연동 후 주문-이미지 URL 매핑 확인 — 5. 결제 기능 완료 후 처리

---

## 5. 💳 결제 기능

### 5-1. 결제 수단 선택 및 연동

* [ ] PG사 선택
  * 국내 추천: **토스페이먼츠** (간편한 SDK, 문서 우수)
  * 대안: 아임포트 (포트원)
* [ ] 사업자 등록 및 PG 계약 완료
* [ ] SDK 설치 및 환경변수 설정
  ```env
  NEXT_PUBLIC_TOSS_CLIENT_KEY=TOSS_SECRET_KEY=
  ```

### 5-2. 주문 데이터 설계

* [ ] 주문 데이터 구조 정의 (`types/order.ts`)
  ```typescript
  interface Order {  id: string  userId?: string  gpxData: GpxData  designImageUrl: string  // R2 퍼블릭 URL  shirtSize: 'S' | 'M' | 'L' | 'XL'  quantity: number  price: number  status: 'pending' | 'paid' | 'failed'  createdAt: string}
  ```
* [ ] 백엔드 API 연동 (주문 생성, 결제 검증)
  * `pages/api/orders/create.ts`
  * `pages/api/payments/confirm.ts`

### 5-3. 결제 플로우 구현

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

### 5-4. 보안

* [ ] 결제 금액 서버 사이드 검증 (클라이언트 금액 신뢰 금지)
* [ ] 주문 상태 멱등성 처리 (중복 결제 방지)
* [ ] 환불 처리 플로우 설계

---

## 기타 / 인프라

* [X] Vercel 환경변수 설정 (프로덕션)
* [ ] Railway 환경변수 설정 (R2 키 포함)
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
