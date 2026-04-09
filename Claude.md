# MOVIATA Frontend — CLAUDE.md

> AI 어시스턴트(Claude, Cursor 등)가 이 프로젝트를 이해하고 올바르게 기여하기 위한 가이드입니다.

---

## 프로젝트 개요

**MOVIATA**는 사용자의 GPX 경로 데이터를 기반으로 커스텀 티셔츠 목업을 생성하는 서비스입니다.

* 사용자가 GPX 파일을 업로드하면 경로가 지도 위에 렌더링됩니다.
* 렌더링된 지도 이미지가 티셔츠 목업에 합성되어 결제 후 실제 제품으로 제작됩니다.

**배포 URL:** https://moviata-zinoings-projects.vercel.app

**레포지토리:** https://github.com/zinoing/MOVIATA-frontend

**브랜치 전략:** `main` 단일 브랜치 운영

---

## 기술 스택

| 항목        | 기술                                          |
| ----------- | --------------------------------------------- |
| 프레임워크  | Next.js 14 (Pages Router)                     |
| 언어        | TypeScript                                    |
| 스타일      | Tailwind CSS                                  |
| 지도        | MapLibre GL + PMTiles + Protomaps Basemaps    |
| 이미지 캡처 | dom-to-image-more, html-to-image, html2canvas |
| 배포        | Vercel                                        |

---

## 폴더 구조

```
MOVIATA-frontend/
├── components/        # 재사용 가능한 UI 컴포넌트
├── context/           # React Context (전역 상태)
├── docs/              # 프로젝트 문서
├── hooks/             # Custom React Hooks
├── lib/               # 유틸리티 함수, 헬퍼
├── pages/             # Next.js 페이지 (Pages Router)
├── public/            # 정적 파일 (이미지, 폰트 등)
├── styles/            # 전역 CSS
├── types/             # TypeScript 타입 정의
├── apple-hig-design-prompt.md  # 디자인 시스템 가이드
└── CLAUDE.md          # (이 파일)
```

---

## 디자인 시스템

`apple-hig-design-prompt.md` 를 반드시 참조하세요.

### 핵심 원칙

* Apple HIG 기반 디자인 토큰 사용
* 모든 스페이싱은 **8px 배수**
* 최소 터치 타겟: **44×44pt**
* 다크모드 자동 지원 (system color 우선)

### MOVIATA 브랜드 컬러

```
Brand Primary:  #111111  (Graphite Black)
Brand Accent:   #FF5A1F  (Signal Orange) — CTA, 선택 상태에만 사용
Off White:      #FAFAFA
Cool Gray:      #E5E7EB
Muted Text:     #6B7280
```

### 주의사항

* Signal Orange(`#FF5A1F`)는 **전체 UI의 5% 이하**로만 사용
* Navigation Bar / Tab Bar 배경색 변경 금지
* 그림자에 색상 사용 금지 (alpha black만 허용)

---

## 코딩 컨벤션

### 일반

* 모든 컴포넌트는 **TypeScript** 로 작성
* `any` 타입 사용 금지 — `types/` 폴더에 타입 정의
* 컴포넌트 파일명: **PascalCase** (예: `MapViewer.tsx`)
* 훅 파일명: **camelCase** with `use` prefix (예: `useGpxParser.ts`)

### Next.js Pages Router

* `pages/` 디렉토리 기반 라우팅 사용 (App Router 아님)
* API Routes는 `pages/api/` 에 작성
* `getServerSideProps` / `getStaticProps` 는 필요한 경우에만 사용

### Tailwind CSS

* 인라인 스타일 지양, Tailwind 클래스 우선 사용
* 커스텀 색상은 `tailwind.config.js` 에 브랜드 컬러로 등록
* 반응형: 모바일 퍼스트 (`sm:`, `md:`, `lg:` 순서)

### 지도 (MapLibre)

* PMTiles 기반 오프라인 타일 사용
* 지도 인스턴스는 `useRef` 로 관리
* 컴포넌트 언마운트 시 반드시 `map.remove()` 호출

---

## 환경변수

```env
# 필요 시 추가 예정
NEXT_PUBLIC_API_URL=
```

---

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start
```

---

## 미완성 / 진행 중 기능

자세한 내용은 `docs/CHECKLIST.md` 참조

* [ ] 변위맵 기반 티셔츠 목업 합성
* [ ] 한국어 / 일본어 다국어 지원 (i18n)
* [ ] GPX 파일 업로드 및 파싱
* [ ] 결제 기능 (토스페이먼츠 or 아임포트)

---

## AI 어시스턴트에게

* 코드 수정 전 반드시 해당 파일의 **전체 컨텍스트** 를 파악하세요.
* 새 패키지 추가 시 `package.json` 을 확인하고 중복 설치를 피하세요.
* 지도 관련 작업 시 MapLibre GL 공식 문서를 참고하세요.
* 디자인 관련 작업 시 `apple-hig-design-prompt.md` 의 토큰을 정확히 따르세요.
* 브랜치는 `main` 만 사용합니다.
