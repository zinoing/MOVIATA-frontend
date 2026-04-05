import Head from 'next/head';
import React, { PropsWithChildren } from 'react';

interface LayoutProps {
  title?: string;
}

export default function Layout({ title, children }: PropsWithChildren<LayoutProps>) {
  return (
    <>
      <Head>
        <title>{title ? `${title} – MOVIATA` : 'MOVIATA'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen w-full bg-neutral-100">
        {children}
      </main>
    </>
  );
}