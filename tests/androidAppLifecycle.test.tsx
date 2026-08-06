import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANDROID_BACK_REQUEST_EVENT,
  type AndroidAppBindings,
  useAndroidAppLifecycle,
} from '../src/hooks/useAndroidAppLifecycle';

interface NativeListeners {
  backButton?: (event: { canGoBack: boolean }) => void;
  appStateChange?: (event: { isActive: boolean }) => void;
  keyboardWillShow?: (event: { keyboardHeight: number }) => void;
  keyboardWillHide?: () => void;
}

const createBindings = (isAndroid = true) => {
  const listeners: NativeListeners = {};
  const remove = vi.fn(async () => undefined);
  const bindings: AndroidAppBindings = {
    isAndroid: () => isAndroid,
    addBackButtonListener: async listener => {
      listeners.backButton = listener;
      return { remove };
    },
    addAppStateChangeListener: async listener => {
      listeners.appStateChange = listener;
      return { remove };
    },
    addKeyboardWillShowListener: async listener => {
      listeners.keyboardWillShow = listener;
      return { remove };
    },
    addKeyboardWillHideListener: async listener => {
      listeners.keyboardWillHide = listener;
      return { remove };
    },
    hideKeyboard: vi.fn(async () => undefined),
    minimizeApp: vi.fn(async () => undefined),
  };

  return { bindings, listeners, remove };
};

describe('useAndroidAppLifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not register native listeners outside Android', () => {
    const { bindings, listeners } = createBindings(false);

    renderHook(() => useAndroidAppLifecycle({
      hasOpenWindow: false,
      closeOpenWindow: vi.fn(),
      flushPendingState: vi.fn(async () => undefined),
    }, bindings));

    expect(listeners).toEqual({});
  });

  it('hides the keyboard before handling windows or navigation', async () => {
    const { bindings, listeners } = createBindings();
    const closeOpenWindow = vi.fn();
    const flushPendingState = vi.fn(async () => undefined);

    renderHook(() => useAndroidAppLifecycle({
      hasOpenWindow: true,
      closeOpenWindow,
      flushPendingState,
    }, bindings));

    act(() => listeners.keyboardWillShow?.({ keyboardHeight: 320 }));
    act(() => listeners.backButton?.({ canGoBack: false }));

    await waitFor(() => expect(bindings.hideKeyboard).toHaveBeenCalledTimes(1));
    expect(closeOpenWindow).not.toHaveBeenCalled();
    expect(flushPendingState).not.toHaveBeenCalled();
    expect(bindings.minimizeApp).not.toHaveBeenCalled();
  });

  it('lets an inner mobile view consume Back before closing its window', async () => {
    const { bindings, listeners } = createBindings();
    const closeOpenWindow = vi.fn();
    const consumeBack = (event: Event) => event.preventDefault();
    window.addEventListener(ANDROID_BACK_REQUEST_EVENT, consumeBack);

    renderHook(() => useAndroidAppLifecycle({
      hasOpenWindow: true,
      closeOpenWindow,
      flushPendingState: vi.fn(async () => undefined),
    }, bindings));

    act(() => listeners.backButton?.({ canGoBack: false }));
    await waitFor(() => expect(closeOpenWindow).not.toHaveBeenCalled());

    window.removeEventListener(ANDROID_BACK_REQUEST_EVENT, consumeBack);
  });

  it('closes an auxiliary window before leaving the main screen', async () => {
    const { bindings, listeners } = createBindings();
    const closeOpenWindow = vi.fn();

    renderHook(() => useAndroidAppLifecycle({
      hasOpenWindow: true,
      closeOpenWindow,
      flushPendingState: vi.fn(async () => undefined),
    }, bindings));

    act(() => listeners.backButton?.({ canGoBack: false }));

    await waitFor(() => expect(closeOpenWindow).toHaveBeenCalledTimes(1));
    expect(bindings.minimizeApp).not.toHaveBeenCalled();
  });

  it('flushes pending state before minimizing from the main screen', async () => {
    const { bindings, listeners } = createBindings();
    const callOrder: string[] = [];
    const flushPendingState = vi.fn(async () => {
      callOrder.push('flush');
    });
    vi.mocked(bindings.minimizeApp).mockImplementation(async () => {
      callOrder.push('minimize');
    });

    renderHook(() => useAndroidAppLifecycle({
      hasOpenWindow: false,
      closeOpenWindow: vi.fn(),
      flushPendingState,
    }, bindings));

    act(() => listeners.backButton?.({ canGoBack: false }));

    await waitFor(() => expect(bindings.minimizeApp).toHaveBeenCalledTimes(1));
    expect(callOrder).toEqual(['flush', 'minimize']);
  });

  it('flushes pending state when Android moves to the background', async () => {
    const { bindings, listeners } = createBindings();
    const flushPendingState = vi.fn(async () => undefined);

    renderHook(() => useAndroidAppLifecycle({
      hasOpenWindow: false,
      closeOpenWindow: vi.fn(),
      flushPendingState,
    }, bindings));

    act(() => listeners.appStateChange?.({ isActive: false }));

    await waitFor(() => expect(flushPendingState).toHaveBeenCalledTimes(1));
  });

  it('removes every native listener on unmount', async () => {
    const { bindings, remove } = createBindings();
    const { unmount } = renderHook(() => useAndroidAppLifecycle({
      hasOpenWindow: false,
      closeOpenWindow: vi.fn(),
      flushPendingState: vi.fn(async () => undefined),
    }, bindings));

    await act(async () => undefined);
    unmount();

    await waitFor(() => expect(remove).toHaveBeenCalledTimes(4));
  });
});
