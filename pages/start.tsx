import { useState } from 'react';

import Layout from '../components/Layout';
import { API_BASE_URL } from '../lib/api';

export default function SourceSelectionPage() {
  const [isStravaLoading, setIsStravaLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
          : 'An error occurred while starting Strava authentication.'
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
            CONNECT YOUR DATA
          </h1>
          <p className="mt-4 text-sm leading-7 text-neutral-500 sm:text-base">
            Import your movement and turn it into a wearable design.
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {/* Strava */}
          <div className="flex flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
            <div className="flex flex-1 flex-col px-5 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF5A1F]">
                Strava
              </p>
              <h2 className="mt-3 text-lg font-black tracking-[0.02em] text-neutral-950">
                CONNECT STRAVA
              </h2>
              <p className="mt-2 flex-1 text-xs leading-5 text-neutral-500">
                Sync your recent activities instantly from your Strava account.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleConnectStrava}
                  disabled={isStravaLoading}
                  className="w-full rounded-[14px] bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStravaLoading ? 'Connecting...' : 'SELECT'}
                </button>
              </div>
            </div>
          </div>

          {/* Garmin */}
          <div className="flex flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] opacity-50">
            <div className="flex flex-1 flex-col px-5 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                Garmin
              </p>
              <h2 className="mt-3 text-lg font-black tracking-[0.02em] text-neutral-950">
                CONNECT GARMIN
              </h2>
              <p className="mt-2 flex-1 text-xs leading-5 text-neutral-500">
                Import activities from Garmin Connect.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-full bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-400"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>

          {/* GPX */}
          <div className="flex flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] opacity-50">
            <div className="flex flex-1 flex-col px-5 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                File
              </p>
              <h2 className="mt-3 text-lg font-black tracking-[0.02em] text-neutral-950">
                UPLOAD GPX
              </h2>
              <p className="mt-2 flex-1 text-xs leading-5 text-neutral-500">
                Upload your route manually as a GPX file.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-full bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-400"
                >
                  COMING SOON
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
