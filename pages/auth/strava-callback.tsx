import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../lib/api';

type CallbackResponse = {
  connected?: boolean;
  message?: string;
  error?: string;
};

export default function StravaCallbackPage() {
  const router = useRouter();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (!router.isReady || hasProcessedRef.current) {
      return;
    }

    const code = router.query.code;
    const state = router.query.state;

    if (typeof code !== 'string') {
      console.error('Missing Strava OAuth code in callback query.');
      void router.replace('/strava/activities');
      return;
    }

    hasProcessedRef.current = true;

    const completeOAuth = async () => {
      try {
        const params = new URLSearchParams({ code });

        if (typeof state === 'string') {
          params.append('state', state);
        }

        const response = await fetch(
          `${API_BASE_URL}/auth/strava/callback?${params.toString()}`
        );
        const data = (await response.json()) as CallbackResponse;

        if (!response.ok || !data.connected) {
          console.error(
            data.message || data.error || 'Failed to complete Strava OAuth callback.'
          );
        }
      } catch (error) {
        console.error('Error while processing Strava OAuth callback:', error);
      } finally {
        void router.replace('/strava/activities');
      }
    };

    void completeOAuth();
  }, [router]);

  return null;
}
