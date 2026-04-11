import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Playfair_Display } from 'next/font/google';

interface LayoutProps {
  title?: string;
}

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const sharedHeaderStyle = {
  backdropFilter: 'blur(20px) saturate(180%)',
  backgroundColor: 'rgba(255,255,255,0.72)',
};

export default function Layout({ title, children }: PropsWithChildren<LayoutProps>) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const router = useRouter();
  const t = useTranslations('layout');

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      setVisible(currentY < lastScrollY.current || currentY < 10);
      lastScrollY.current = currentY;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function switchLocale(locale: string) {
    void router.push(router.asPath, router.asPath, { locale });
  }

  const currentLocale = router.locale ?? 'en';

  const langButtons = (
    <>
      <button
        type="button"
        onClick={() => switchLocale('en')}
        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
          currentLocale === 'en' ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'
        }`}
      >
        {t('langEn')}
      </button>
      <span className="text-neutral-300 text-xs">|</span>
      <button
        type="button"
        onClick={() => switchLocale('ko')}
        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
          currentLocale === 'ko' ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'
        }`}
      >
        {t('langKo')}
      </button>
      <span className="text-neutral-300 text-xs">|</span>
      <button
        type="button"
        onClick={() => switchLocale('ja')}
        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
          currentLocale === 'ja' ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'
        }`}
      >
        {t('langJa')}
      </button>
    </>
  );

  return (
    <>
      <Head>
        <title>{title ? `${title} – MOVIATA` : 'MOVIATA'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen w-full bg-white">
        {/* ── 모바일 전용: 언어 스위처 고정 bar (항상 표시) ── */}
        <div
          className="fixed left-0 top-0 z-50 flex h-8 w-full items-center justify-end gap-1 border-b border-black/[0.06] px-4 sm:hidden"
          style={sharedHeaderStyle}
        >
          {langButtons}
        </div>

        {/* ── 로고 헤더 ──
            모바일: top-0에서 시작하되 visible 시 translate-y-8(32px)로 언어 bar 아래 위치
                   hidden 시 -translate-y-full로 완전히 뷰포트 위로 숨김
            데스크탑: 기존과 동일 (top-0, translate-y-0 / -translate-y-full)
        ── */}
        <header
          className={`fixed left-0 top-0 z-40 w-full border-b border-black/[0.08] transition-transform duration-[300ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            visible
              ? 'translate-y-8 sm:translate-y-0'
              : '-translate-y-full'
          }`}
          style={sharedHeaderStyle}
        >
          <div className="relative flex h-11 items-center justify-center px-6">
            <Link
              href="/"
              className="text-sm font-black tracking-[-0.03em] text-neutral-950 transition-opacity duration-[180ms] hover:opacity-50"
            >
              MOVIATA
            </Link>

            {/* 데스크탑 전용: 언어 스위처 */}
            <div className="absolute right-6 hidden items-center gap-1 sm:flex">
              {langButtons}
            </div>
          </div>
        </header>

        {/* 모바일: 언어 bar(32px) + 로고 bar(44px) = 76px 패딩
            데스크탑: 로고 bar(44px) = 44px 패딩 */}
        <div className="pt-[76px] sm:pt-11">
          {children}
        </div>
      </main>
    </>
  );
}
