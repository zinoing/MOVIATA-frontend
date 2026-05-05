import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Layout from '../components/Layout';

interface CollectionItem {
  fileName: string;
  imageUrl: string;
  title: string;
  date: string;
  time: string;
}

export default function CollectionsPage() {
  const t = useTranslations('collections');
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:4000';
    fetch(`${apiBase}/api/collections`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ collections: CollectionItem[] }>;
      })
      .then((data) => {
        setItems(data.collections ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, []);

  return (
    <Layout title={`${t('title')} — MOVIATA`}>
      <div className="min-h-screen bg-white px-6 py-12 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">
              MOVIATA
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-neutral-950 md:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-3 text-sm text-neutral-500">{t('subtitle')}</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm text-neutral-400">{t('loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm font-semibold text-neutral-900">{t('empty.heading')}</p>
              <p className="mt-2 text-sm text-neutral-400">{t('empty.description')}</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.fileName}
                  className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                >
                  <div className="aspect-square bg-neutral-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title || item.fileName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="px-5 py-4">
                    <p className="truncate text-sm font-semibold text-neutral-950">
                      {item.title || '—'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
