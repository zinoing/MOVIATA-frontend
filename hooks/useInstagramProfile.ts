import { useEffect, useRef, useState } from 'react';
import type { AvatarSource, InstagramFetchErrorCode, InstagramProfileState } from '../types/instagram';
import {
  createInstagramProfileErrorState,
  createInstagramProfileIdleState,
  createInstagramProfileLoadingState,
  createInstagramProfileNotFoundState,
  createInstagramProfileSuccessState,
  fetchInstagramProfile,
  validateInstagramHandleInput,
} from '../lib/instagram/profile';

const initialState: InstagramProfileState = {
  isInstagramVisible: true,
  handleInput: '',
  normalizedHandle: '',
  displayHandle: '',
  fetchState: createInstagramProfileIdleState(),
  avatarSource: 'default',
  avatarUrl: '',
};

export function useInstagramProfile() {
  const [state, setState] = useState<InstagramProfileState>(initialState);
  const requestSequenceRef = useRef(0);
  const activeRequestRef = useRef<{ id: number; handle: string; controller: AbortController } | null>(null);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.controller.abort();
    };
  }, []);

  const setHandleInput = (value: string) => {
    const validation = validateInstagramHandleInput(value);

    setState((prev) => ({
      ...prev,
      handleInput: value,
      normalizedHandle: validation.normalizedHandle,
      displayHandle: validation.displayHandle,
      fetchState: createInstagramProfileIdleState(),
      ...(prev.avatarSource === 'auto'
        ? {
            avatarUrl: '',
            avatarSource: 'default' as AvatarSource,
          }
        : {}),
    }));
  };

  const fetchProfile = async (handleOverride?: string) => {
    const rawInput = handleOverride ?? state.handleInput;
    const validation = validateInstagramHandleInput(rawInput);

    if (!validation.isValid) {
      setState((prev) => ({
        ...prev,
        handleInput: handleOverride ?? prev.handleInput,
        normalizedHandle: validation.normalizedHandle,
        displayHandle: validation.displayHandle,
        fetchState: createInstagramProfileErrorState('INVALID_HANDLE'),
      }));
      return;
    }

    const activeRequest = activeRequestRef.current;
    if (activeRequest && activeRequest.handle === validation.normalizedHandle) {
      return;
    }

    activeRequest?.controller.abort();

    const requestId = ++requestSequenceRef.current;
    const controller = new AbortController();
    activeRequestRef.current = {
      id: requestId,
      handle: validation.normalizedHandle,
      controller,
    };

    setState((prev) => ({
      ...prev,
      normalizedHandle: validation.normalizedHandle,
      displayHandle: validation.displayHandle,
      fetchState: createInstagramProfileLoadingState(validation.normalizedHandle),
    }));

    try {
      const profile = await fetchInstagramProfile(validation.normalizedHandle, {
        signal: controller.signal,
      });

      if (activeRequestRef.current?.id !== requestId) {
        return;
      }

      activeRequestRef.current = null;

      setState((prev) => ({
        ...prev,
        normalizedHandle: profile.normalizedHandle,
        displayHandle: profile.displayHandle,
        avatarUrl: profile.avatarUrl,
        avatarSource: 'auto',
        fetchState: createInstagramProfileSuccessState(profile),
      }));
    } catch (error) {
      if (controller.signal.aborted) {
        if (activeRequestRef.current?.id === requestId) {
          activeRequestRef.current = null;
        }
        return;
      }

      if (activeRequestRef.current?.id !== requestId) {
        return;
      }

      activeRequestRef.current = null;

      const errorCode = (error instanceof Error ? error.message : 'UNKNOWN_FETCH_ERROR') as InstagramFetchErrorCode;

      setState((prev) => ({
        ...prev,
        fetchState:
          errorCode === 'PROFILE_NOT_FOUND'
            ? createInstagramProfileNotFoundState()
            : createInstagramProfileErrorState(errorCode),
      }));
    }
  };

  const toggleVisibility = (visible: boolean) => {
    setState((prev) => ({
      ...prev,
      isInstagramVisible: visible,
    }));
  };

  const useHandleOnly = () => {
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;

    setState((prev) => ({
      ...prev,
      avatarSource: 'none',
      avatarUrl: '',
      fetchState: createInstagramProfileIdleState(),
    }));
  };

  const removeInstagramProfile = () => {
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setState(initialState);
  };

  return {
    state,
    setHandleInput,
    fetchProfile,
    toggleVisibility,
    useHandleOnly,
    removeInstagramProfile,
  };
}
