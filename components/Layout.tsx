import Head from 'next/head';
import Link from 'next/link';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';

interface LayoutProps {
  title?: string;
}

export default function Layout({ title, children }: PropsWithChildren<LayoutProps>) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      setVisible(currentY < lastScrollY.current || currentY < 10);
      lastScrollY.current = currentY;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          </div>
        </header>

        <div className="pt-11">
          {children}
        </div>
      </main>
    </>
  );
}
