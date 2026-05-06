import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Layout from '../components/Layout';

interface CollectionItem {
  fileName: string;
  imageUrl: string;
  title: string;
  date: string;
  time: string;
  shirtColor: 'white' | 'black';
}

export default function CollectionsPage() {
  const t = useTranslations('collections');
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CollectionItem | null>(null);
  const [query, setQuery] = useState('');

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Layout title={`${t('title')} — MOVIATA`}>
      <div className="min-h-screen bg-white px-6 py-12 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">
              MOVIATA
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-neutral-950 md:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-3 text-sm text-neutral-500">{t('subtitle')}</p>
          </div>

          <div className="mb-6">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full max-w-sm rounded-[12px] border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:bg-white"
            />
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

          {!loading && !error && items.length > 0 && (() => {
            const q = query.trim().toLowerCase();
            const filtered = q
              ? items.filter(
                  (item) =>
                    item.title.toLowerCase().includes(q),
                )
              : items;
            return filtered.length === 0 ? (
              <div className="flex items-center justify-center py-24">
                <p className="text-sm text-neutral-400">{t('noResults')}</p>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((item) => (
                <button
                  key={item.fileName}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="overflow-hidden rounded-[16px] border border-neutral-200 bg-white text-left shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]"
                >
                  <div className="aspect-square bg-neutral-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title || item.fileName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="px-3 py-3">
                    <p className="truncate text-xs font-semibold text-neutral-950">
                      {item.title || '—'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">{item.date}</p>
                  </div>
                </button>
              ))}
            </div>
            );
          })()}
        </div>
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`rounded-[16px] shadow-2xl ${selected.shirtColor === 'white' ? 'bg-white' : 'bg-black'}`}
            >
              <img
                src={selected.imageUrl}
                alt={selected.title || selected.fileName}
                className="max-h-[80vh] max-w-[85vw] rounded-[16px] object-contain"
              />
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm font-semibold text-white">{selected.title || '—'}</p>
              <p className="mt-0.5 text-xs text-white/60">{selected.date}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-neutral-900 shadow-lg transition hover:bg-neutral-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
