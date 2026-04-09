import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface LayoutProps {
  title?: string;
}

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

  const currentLocale = router.locale ?? 'ko';

  return (
    <>
      <Head>
        <title>{title ? `${title} – MOVIATA` : 'MOVIATA'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen w-full bg-white">
        <header
          className={`fixed left-0 top-0 z-50 w-full border-b border-black/[0.08] transition-transform duration-[300ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            visible ? 'translate-y-0' : '-translate-y-full'
          }`}
          style={{
            backdropFilter: 'blur(20px) saturate(180%)',
            backgroundColor: 'rgba(255,255,255,0.72)',
          }}
        >
          <div className="relative flex h-11 items-center justify-center px-6">
            <Link
              href="/"
              className="text-sm font-black tracking-[-0.03em] text-neutral-950 transition-opacity duration-[180ms] hover:opacity-50"
            >
              MOVIATA
            </Link>

            <div className="absolute right-6 flex items-center gap-1">
              <button
                type="button"
                onClick={() => switchLocale('en')}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  currentLocale === 'en'
                    ? 'text-neutral-950'
                    : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                {t('langEn')}
              </button>
              <span className="text-neutral-300 text-xs">|</span>
              <button
                type="button"
                onClick={() => switchLocale('ko')}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  currentLocale === 'ko'
                    ? 'text-neutral-950'
                    : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                {t('langKo')}
              </button>
              <span className="text-neutral-300 text-xs">|</span>
              <button
                type="button"
                onClick={() => switchLocale('ja')}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  currentLocale === 'ja'
                    ? 'text-neutral-950'
                    : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                {t('langJa')}
              </button>
            </div>
          </div>
        </header>

        <div className="pt-11">
          {children}
        </div>
      </main>
    </>
  );
}
