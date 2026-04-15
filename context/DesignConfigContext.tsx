import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DesignConfig } from '../lib/poster/types';
import type { DesignEditorState } from '../components/DesignSettingsPanel';

const STORAGE_KEY = 'wtm-confirm-draft-v5';
const EDITOR_STORAGE_KEY = 'wtm-editor-snapshot-v1';
const RETURN_FLAG_KEY = 'design-return-from-confirm';

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
  editorSnapshot?: DesignEditorState | null;
};

type DesignConfigContextValue = {
  config: Readonly<DesignConfig> | null;
  posterSnapshot: string | null;
  saveDraft: (input: SaveDraftInput) => void;
  clearDraft: () => void;
  /** confirm → design 복귀 시 editor 상태 복원 후 null 반환 (한 번만 소비) */
  consumeEditorSnapshot: () => DesignEditorState | null;
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
      const persisted: PersistedDraftState = { config: input.config };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));

      if (input.editorSnapshot) {
        sessionStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(input.editorSnapshot));
      }
    } catch (error) {
      console.error('Failed to persist draft config:', error);
    }
  }, []);

  const clearDraft = useCallback(() => {
    setDraft({ config: null, posterSnapshot: null });

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(EDITOR_STORAGE_KEY);
      sessionStorage.removeItem(RETURN_FLAG_KEY);
    }
  }, []);

  /**
   * confirm → design 복귀일 때만 저장된 editor 상태를 반환하고
   * 플래그와 스냅샷을 즉시 제거합니다 (한 번만 소비).
   * 복귀가 아니거나 스냅샷이 없으면 null을 반환합니다.
   */
  const consumeEditorSnapshot = useCallback((): DesignEditorState | null => {
    if (typeof window === 'undefined') return null;

    const isReturnFromConfirm = sessionStorage.getItem(RETURN_FLAG_KEY) === '1';
    sessionStorage.removeItem(RETURN_FLAG_KEY);

    if (!isReturnFromConfirm) return null;

    try {
      const raw = sessionStorage.getItem(EDITOR_STORAGE_KEY);
      sessionStorage.removeItem(EDITOR_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as DesignEditorState;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      config: draft.config,
      posterSnapshot: draft.posterSnapshot,
      saveDraft,
      clearDraft,
      consumeEditorSnapshot,
    }),
    [draft, saveDraft, clearDraft, consumeEditorSnapshot],
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