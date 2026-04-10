import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DesignConfig } from '../lib/poster/types';

const STORAGE_KEY = 'wtm-confirm-draft-v5';

type DraftState = {
  config: Readonly<DesignConfig> | null;
  posterSnapshot: string | null;
};

type PersistedDraftState = {
  config: Readonly<DesignConfig> | null;
};

type SaveDraftInput = {
  config: Readonly<DesignConfig>;
  posterSnapshot?: string | null;
};

type DesignConfigContextValue = {
  config: Readonly<DesignConfig> | null;
  posterSnapshot: string | null;
  saveDraft: (input: SaveDraftInput) => void;
  clearDraft: () => void;
};

const DesignConfigContext = createContext<DesignConfigContextValue | null>(null);

export function DesignConfigProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<DraftState>({
    config: null,
    posterSnapshot: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as PersistedDraftState;

      setDraft((prev) => ({
        ...prev,
        config: parsed?.config ?? null,
      }));
    } catch (error) {
      console.error('Failed to restore draft:', error);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveDraft = useCallback((input: SaveDraftInput) => {
    setDraft({
      config: input.config,
      posterSnapshot: input.posterSnapshot ?? null,
    });

    if (typeof window === 'undefined') return;

    try {
      const persisted: PersistedDraftState = {
        config: input.config,
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch (error) {
      console.error('Failed to persist draft config:', error);
    }
  }, []);

  const clearDraft = useCallback(() => {
    setDraft({
      config: null,
      posterSnapshot: null,
    });

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      config: draft.config,
      posterSnapshot: draft.posterSnapshot,
      saveDraft,
      clearDraft,
    }),
    [draft, saveDraft, clearDraft],
  );

  return (
    <DesignConfigContext.Provider value={value}>
      {children}
    </DesignConfigContext.Provider>
  );
}

export function useDesignConfig() {
  const context = useContext(DesignConfigContext);
  if (!context) {
    throw new Error('useDesignConfig must be used within DesignConfigProvider');
  }
  return context;
}