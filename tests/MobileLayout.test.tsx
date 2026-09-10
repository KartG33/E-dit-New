import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../apps/android/src/App';
import { db } from '../apps/android/src/lib/db';

describe('Mobile editor layout state', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.history, db.settings, async () => {
      await db.history.clear();
      await db.settings.clear();
    });
  });

  it('switches the visible editor pane without unmounting either editor', async () => {
    render(<App />);

    const leftEditor = screen.getByRole('textbox', { name: 'left editor' });
    const rightEditor = screen.getByRole('textbox', { name: 'right editor' });
    await waitFor(() => expect((leftEditor as HTMLTextAreaElement).disabled).toBe(false));

    const leftPane = leftEditor.closest('.app-editor-pane');
    const rightPane = rightEditor.closest('.app-editor-pane');
    expect(leftPane?.classList.contains('is-mobile-visible')).toBe(true);
    expect(rightPane?.classList.contains('is-mobile-visible')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Editor 2' }));
    expect(leftPane?.classList.contains('is-mobile-visible')).toBe(false);
    expect(rightPane?.classList.contains('is-mobile-visible')).toBe(true);
    expect(screen.getByRole('textbox', { name: 'left editor' })).toBe(leftEditor);
    expect(screen.getByRole('textbox', { name: 'right editor' })).toBe(rightEditor);
  });

  it('keeps the Tags panel visible for the active mobile editor', async () => {
    render(<App />);
    await waitFor(() => {
      expect((screen.getByRole('textbox', { name: 'left editor' }) as HTMLTextAreaElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));

    const tagsPanel = screen.getByRole('dialog', { name: 'Suno Tags' });
    expect(tagsPanel.closest('.app-editor-pane')?.classList.contains('is-mobile-visible')).toBe(true);
  });

  it('keeps only one auxiliary window open at a time', async () => {
    render(<App />);
    await waitFor(() => {
      expect((screen.getByRole('textbox', { name: 'left editor' }) as HTMLTextAreaElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Presets\s*Manage presets/ }));
    expect(screen.getByRole('dialog', { name: 'Presets' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(screen.queryByRole('dialog', { name: 'Presets' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Suno Tags' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.queryByRole('dialog', { name: 'Suno Tags' })).toBeNull();
    expect(screen.getByTestId('sliding-drawer').classList.contains('is-open')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Presets\s*Manage presets/ }));
    expect(screen.getByTestId('sliding-drawer').classList.contains('is-open')).toBe(false);
    expect(screen.getByRole('dialog', { name: 'Presets' })).toBeDefined();
  });

  it('uses the resized window and ignores transient visual viewport collapse', async () => {
    const root = document.documentElement;
    const heightDescriptor = Object.getOwnPropertyDescriptor(root, 'clientHeight');
    const viewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    let windowHeight = 844;
    const viewport = new EventTarget();
    Object.assign(viewport, { height: 844, offsetTop: 0 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => windowHeight });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    const { unmount } = render(<App />);
    try {
      expect(root.style.getPropertyValue('--app-viewport-height')).toBe('844px');
      // The WebView has resized once; a transitional visual viewport subtracts the IME again.
      windowHeight = 533;
      Object.assign(viewport, { height: 202, offsetTop: 12 });
      act(() => { viewport.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('resize')); });
      await waitFor(() => expect(root.style.getPropertyValue('--app-viewport-height')).toBe('533px'));
      expect(root.style.getPropertyValue('--app-viewport-offset-top')).toBe('0px');
      Object.assign(viewport, { height: 533, offsetTop: 0 });
      act(() => viewport.dispatchEvent(new Event('resize')));
      expect(root.style.getPropertyValue('--app-viewport-height')).toBe('533px');
      windowHeight = 844;
      act(() => window.dispatchEvent(new Event('resize')));
      await waitFor(() => expect(root.style.getPropertyValue('--app-viewport-height')).toBe('844px'));
    } finally {
      unmount();
      if (heightDescriptor) Object.defineProperty(root, 'clientHeight', heightDescriptor);
      else Reflect.deleteProperty(root, 'clientHeight');
      if (viewportDescriptor) Object.defineProperty(window, 'visualViewport', viewportDescriptor);
      else Reflect.deleteProperty(window, 'visualViewport');
    }
  });
});
