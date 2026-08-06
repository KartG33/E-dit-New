import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

export const ANDROID_BACK_REQUEST_EVENT = 'android-back-request';

type ListenerHandle = Pick<PluginListenerHandle, 'remove'>;

export interface AndroidAppBindings {
  isAndroid: () => boolean;
  addBackButtonListener: (
    listener: (event: { canGoBack: boolean }) => void,
  ) => Promise<ListenerHandle>;
  addAppStateChangeListener: (
    listener: (event: { isActive: boolean }) => void,
  ) => Promise<ListenerHandle>;
  addKeyboardWillShowListener: (
    listener: (event: { keyboardHeight: number }) => void,
  ) => Promise<ListenerHandle>;
  addKeyboardWillHideListener: (
    listener: () => void,
  ) => Promise<ListenerHandle>;
  hideKeyboard: () => Promise<void>;
  minimizeApp: () => Promise<void>;
}

export const capacitorAndroidAppBindings: AndroidAppBindings = {
  isAndroid: () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
  addBackButtonListener: listener => App.addListener('backButton', listener),
  addAppStateChangeListener: listener => App.addListener('appStateChange', listener),
  addKeyboardWillShowListener: listener => Keyboard.addListener('keyboardWillShow', listener),
  addKeyboardWillHideListener: listener => Keyboard.addListener('keyboardWillHide', listener),
  hideKeyboard: () => Keyboard.hide(),
  minimizeApp: () => App.minimizeApp(),
};

interface UseAndroidAppLifecycleOptions {
  hasOpenWindow: boolean;
  closeOpenWindow: () => void;
  flushPendingState: () => Promise<void>;
}

const reportLifecycleError = () => {
  window.dispatchEvent(new CustomEvent('app-error', {
    detail: 'Failed to handle Android application state',
  }));
};

export const useAndroidAppLifecycle = (
  {
    hasOpenWindow,
    closeOpenWindow,
    flushPendingState,
  }: UseAndroidAppLifecycleOptions,
  bindings: AndroidAppBindings = capacitorAndroidAppBindings,
) => {
  const hasOpenWindowRef = useRef(hasOpenWindow);
  const closeOpenWindowRef = useRef(closeOpenWindow);
  const flushPendingStateRef = useRef(flushPendingState);

  hasOpenWindowRef.current = hasOpenWindow;
  closeOpenWindowRef.current = closeOpenWindow;
  flushPendingStateRef.current = flushPendingState;

  useEffect(() => {
    if (!bindings.isAndroid()) return;

    let disposed = false;
    let keyboardVisible = false;
    let handlingBack = false;
    const handles: ListenerHandle[] = [];

    const keepHandle = (handlePromise: Promise<ListenerHandle>) => {
      void handlePromise
        .then(handle => {
          if (disposed) {
            return handle.remove();
          }
          handles.push(handle);
        })
        .catch(reportLifecycleError);
    };

    keepHandle(bindings.addKeyboardWillShowListener(() => {
      keyboardVisible = true;
    }));

    keepHandle(bindings.addKeyboardWillHideListener(() => {
      keyboardVisible = false;
    }));

    keepHandle(bindings.addAppStateChangeListener(({ isActive }) => {
      if (!isActive) {
        void flushPendingStateRef.current().catch(reportLifecycleError);
        return;
      }

      keyboardVisible = false;
      window.dispatchEvent(new Event('resize'));
    }));

    keepHandle(bindings.addBackButtonListener(({ canGoBack }) => {
      if (handlingBack) return;
      handlingBack = true;

      void (async () => {
        try {
          if (keyboardVisible) {
            await bindings.hideKeyboard();
            keyboardVisible = false;
            return;
          }

          const request = new Event(ANDROID_BACK_REQUEST_EVENT, { cancelable: true });
          window.dispatchEvent(request);
          if (request.defaultPrevented) return;

          if (hasOpenWindowRef.current) {
            closeOpenWindowRef.current();
            return;
          }

          if (canGoBack) {
            window.history.back();
            return;
          }

          await flushPendingStateRef.current();
          await bindings.minimizeApp();
        } catch {
          reportLifecycleError();
        } finally {
          handlingBack = false;
        }
      })();
    }));

    return () => {
      disposed = true;
      for (const handle of handles) {
        void handle.remove().catch(reportLifecycleError);
      }
    };
  }, [bindings]);
};
