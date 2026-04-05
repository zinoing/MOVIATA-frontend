import { useRouter } from 'next/router';
import { useState } from 'react';

import Layout from '../components/Layout';
import { API_BASE_URL } from '../lib/api';

export default function SourceSelectionPage() {
  const router = useRouter();
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
    <Layout title="Select Activity Source">
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          backgroundImage: 'url(/resources/running.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="w-full max-w-5xl bg-black/50 backdrop-blur-sm rounded-3xl px-16 py-16">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Choose your activity source
            </h1>
            <p className="mt-3 text-neutral-300 text-sm">
              Import your movement and turn it into a wearable design.
            </p>
          </div>

          {/* Cards */}
          <div className="grid gap-6 md:grid-cols-3">

            {/* STRAVA */}
            <button
              type="button"
              onClick={handleConnectStrava}
              disabled={isStravaLoading}
              className="group rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="mb-4 text-orange-500 font-semibold">
                STRAVA
              </div>

              <h2 className="text-xl font-semibold text-neutral-900">
                Connect Strava
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Sync your recent activities instantly.
              </p>

              <div className="mt-6 text-sm font-medium text-neutral-800 group-hover:text-orange-500">
                Continue →
              </div>
            </button>

            {/* GARMIN */}
            <button
              onClick={() => alert('Garmin coming soon')}
              className="group rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 text-blue-500 font-semibold">
                GARMIN
              </div>

              <h2 className="text-xl font-semibold text-neutral-900">
                Connect Garmin
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Import activities from Garmin Connect.
              </p>

              <div className="mt-6 text-sm font-medium text-neutral-800 group-hover:text-blue-500">
                Coming soon
              </div>
            </button>

            {/* GPX */}
            <button
              onClick={() => alert('GPX upload coming soon')}
              className="group rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 text-neutral-700 font-semibold">
                FILE
              </div>

              <h2 className="text-xl font-semibold text-neutral-900">
                Upload GPX file
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Upload your route manually as a GPX file.
              </p>

              <div className="mt-6 text-sm font-medium text-neutral-800">
                Upload →
              </div>
            </button>

          </div>

          {/* Bottom hint */}
          <div className="mt-10 text-center text-xs text-neutral-300">
            You can change your source later in settings.
          </div>
        </div>
      </div>
    </Layout>
  );
}