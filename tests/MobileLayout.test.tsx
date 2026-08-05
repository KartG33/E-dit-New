import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import { db } from '../src/lib/db';

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

    fireEvent.click(screen.getByRole('button', { name: 'Manage presets' }));
    expect(screen.getByRole('dialog', { name: 'Presets' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Suno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(screen.queryByRole('dialog', { name: 'Presets' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Suno Tags' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.queryByRole('dialog', { name: 'Suno Tags' })).toBeNull();
    expect(screen.getByTestId('sliding-drawer').classList.contains('is-open')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Manage presets' }));
    expect(screen.getByTestId('sliding-drawer').classList.contains('is-open')).toBe(false);
    expect(screen.getByRole('dialog', { name: 'Presets' })).toBeDefined();
  });

  it('tracks the visual viewport while the software keyboard changes its height', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    const listeners = new Map<string, EventListener>();
    let viewportHeight = 480;
    const visualViewport = {
      get height() { return viewportHeight; },
      get offsetTop() { return 12; },
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.set(type, listener as EventListener);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    } as unknown as VisualViewport;

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: visualViewport,
    });

    const { unmount } = render(<App />);
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--app-viewport-height')).toBe('480px');
      expect(document.documentElement.style.getPropertyValue('--app-viewport-offset-top')).toBe('12px');
    });

    viewportHeight = 320;
    act(() => listeners.get('resize')?.(new Event('resize')));
    expect(document.documentElement.style.getPropertyValue('--app-viewport-height')).toBe('320px');

    unmount();
    if (originalDescriptor) {
      Object.defineProperty(window, 'visualViewport', originalDescriptor);
    } else {
      Reflect.deleteProperty(window, 'visualViewport');
    }
  });
});
