import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Layout from '../components/Layout';

const MOTION_SESSION_KEYS = [
  'motionJobId', 'motionFramesMeta', 'motionSelectedFrames', 'motionFileType',
  'motionSelectedFramePaths', 'motionPointCoords', 'motionProcessResult',
  'motionLayerTransforms', 'motionCompositeImage',
];

export default function HomePage() {
  const t = useTranslations('home');

  useEffect(() => {
    MOTION_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
  }, []);

  return (
    <Layout title="MOVIATA">
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.05),transparent_45%)]" />
        <div className="absolute left-1/2 top-[180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-neutral-100 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-20 pt-8 md:px-10 lg:px-12">

          <main className="flex flex-1 flex-col items-center">
            <div className="relative w-full max-w-6xl">
              <div className="relative flex min-h-[940px] flex-col items-center">
                <div className="relative z-20 mx-auto max-w-4xl text-center">
                  <h1 className="text-4xl font-black tracking-[-0.02em] md:tracking-[-0.04em] lg:tracking-[-0.06em] text-neutral-950 md:text-6xl lg:text-7xl">
                    {t('hero.title1')}{" "}
                    <br className="hidden sm:block" />
                    {t('hero.title2')}{" "}
                    <br className="hidden sm:block" />
                    {t('hero.title3')}
                  </h1>

                  <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-neutral-500 md:text-lg md:leading-8">
                    {t('heroSubtitle')}
                  </p>
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-[300px] z-10 flex justify-center">
                  <div className="relative w-full max-w-[820px]">
                    <img
                      src="/index/background.png"
                      alt="MOVIATA route background"
                      className="block w-full select-none object-contain"
                      draggable={false}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_66%,rgba(255,255,255,0.06)_84%,rgba(255,255,255,0.14)_100%)]" />
                  </div>
                </div>

                <div className="relative z-20 mt-[420px] sm:mt-[580px] md:mt-[720px] lg:mt-[800px] grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-neutral-200 bg-white/92 px-6 py-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.04)] backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">
                      01
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-neutral-950">
                      {t('steps.step1.title')}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      {t('steps.step1.description')}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-neutral-200 bg-white/92 px-6 py-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.04)] backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">
                      02
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-neutral-950">
                      {t('steps.step2.title')}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      {t('steps.step2.description')}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-neutral-200 bg-white/92 px-6 py-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.04)] backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">
                      03
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-neutral-950">
                      {t('steps.step3.title')}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      {t('steps.step3.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-30 mt-12 flex flex-col items-center">
              <Link
                href="/activity-type"
                className="inline-flex min-w-[220px] items-center justify-center rounded-[14px] bg-neutral-950 px-8 py-4 text-base font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:bg-[#FF5A1F]"
              >
                {t('cta.button')}
              </Link>

              <p className="mt-5 text-sm italic tracking-[0.02em] text-neutral-400 md:text-base">
                {t('cta.tagline')}
              </p>
            </div>
          </main>
        </div>
      </section>
    </Layout>
  );
}
