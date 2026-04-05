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
          className={`fixed left-0 top-0 z-50 w-full border-b border-neutral-200 bg-white transition-transform duration-300 ${
            visible ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="relative flex h-14 items-center justify-center px-6">
            <Link
              href="/"
              className="text-base font-black tracking-[-0.04em] text-neutral-950 transition hover:opacity-60"
            >
              MOVIATA
            </Link>
          </div>
        </header>

        <div className="pt-14">
          {children}
        </div>
      </main>
    </>
  );
}
