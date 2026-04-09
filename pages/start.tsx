import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../components/Layout';
import { API_BASE_URL } from '../lib/api';

export default function SourceSelectionPage() {
  const router = useRouter();
  const t = useTranslations('start');
  const tCommon = useTranslations('common');
  const [isStravaLoading, setIsStravaLoading] = useState(false);
  const [isGpxLoading, setIsGpxLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  function handleGpxClick() {
    gpxInputRef.current?.click();
  }

  async function handleGpxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setMessage(t('errors.invalidFile'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage(t('errors.fileSize'));
      return;
    }

    setIsGpxLoading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const { parseGpx } = await import('../lib/gpxParser');
      const gpxData = parseGpx(text);
      sessionStorage.setItem('gpxData', JSON.stringify(gpxData));
      await router.push('/design/gpx');
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : t('errors.parseFailed'),
      );
      setIsGpxLoading(false);
    }

    // Reset input so the same file can be re-selected
    if (gpxInputRef.current) gpxInputRef.current.value = '';
  }

  async function handleConnectStrava() {
    if (isStravaLoading) return;

    setIsStravaLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/strava`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error('Failed to get the Strava authorization URL.');
      }

      window.location.href = data.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t('errors.stravaAuthFailed')
      );
      setIsStravaLoading(false);
    }
  }

  return (
    <Layout title="Connect Your Activity Source">
      <div className="min-h-screen bg-white px-4 py-8 flex flex-col">
        <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-3xl text-center mb-12">
          <h1 className="text-4xl font-black tracking-[-0.02em] text-neutral-950 sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-sm leading-7 text-neutral-500 sm:text-base">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {/* Strava */}
          <div className="flex flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
            <div className="flex flex-1 flex-col px-5 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF5A1F]">
                {t('strava.label')}
              </p>
              <h2 className="mt-3 text-lg font-black tracking-[0.02em] text-neutral-950">
                {t('strava.title')}
              </h2>
              <p className="mt-2 flex-1 text-xs leading-5 text-neutral-500">
                {t('strava.description')}
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleConnectStrava}
                  disabled={isStravaLoading}
                  className="w-full rounded-[14px] bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStravaLoading ? tCommon('connecting') : tCommon('select')}
                </button>
              </div>
            </div>
          </div>

          {/* Garmin */}
          <div className="flex flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] opacity-50">
            <div className="flex flex-1 flex-col px-5 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                {t('garmin.label')}
              </p>
              <h2 className="mt-3 text-lg font-black tracking-[0.02em] text-neutral-950">
                {t('garmin.title')}
              </h2>
              <p className="mt-2 flex-1 text-xs leading-5 text-neutral-500">
                {t('garmin.description')}
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-full bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-400"
                >
                  {tCommon('comingSoon')}
                </button>
              </div>
            </div>
          </div>

          {/* GPX */}
          <div className="flex flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
            <div className="flex flex-1 flex-col px-5 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                {t('gpx.label')}
              </p>
              <h2 className="mt-3 text-lg font-black tracking-[0.02em] text-neutral-950">
                {t('gpx.title')}
              </h2>
              <p className="mt-2 flex-1 text-xs leading-5 text-neutral-500">
                {t('gpx.description')}
              </p>
              <div className="mt-5">
                <input
                  ref={gpxInputRef}
                  type="file"
                  accept=".gpx"
                  className="hidden"
                  onChange={handleGpxFile}
                />
                <button
                  type="button"
                  onClick={handleGpxClick}
                  disabled={isGpxLoading}
                  className="w-full rounded-[14px] bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGpxLoading ? tCommon('loading') : tCommon('select')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <p className="mt-6 text-sm text-red-500">{message}</p>
        )}
        </div>
      </div>
    </Layout>
  );
}
