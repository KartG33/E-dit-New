import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsModal } from '../apps/android/src/components/Settings/SettingsModal';
import { ANDROID_BACK_REQUEST_EVENT } from '../apps/android/src/hooks/useAndroidAppLifecycle';

describe('SettingsModal', () => {
  it('returns from Data to Settings on Android Back, then leaves closing to the app', () => {
    render(<SettingsModal presets={[]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Data/ }));
    const back = new Event(ANDROID_BACK_REQUEST_EVENT, { cancelable: true });
    fireEvent(window, back);
    expect(back.defaultPrevented).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeDefined();
    const next = new Event(ANDROID_BACK_REQUEST_EVENT, { cancelable: true });
    fireEvent(window, next);
    expect(next.defaultPrevented).toBe(false);
  });
  it('closes on an outside click but not a drag starting inside the dialog', () => {
    const close = vi.fn();
    render(<SettingsModal presets={[]} onClose={close} />);
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const backdrop = dialog.parentElement!;
    fireEvent.mouseDown(dialog); fireEvent.click(backdrop);
    expect(close).not.toHaveBeenCalled();
    fireEvent.mouseDown(backdrop); fireEvent.click(backdrop);
    expect(close).toHaveBeenCalledOnce();
  });
  it('opens Keys and Data as separate Settings views', () => {
    render(<SettingsModal presets={[]} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Keys/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Data/ })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Keys/ }));
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeDefined();
    expect(screen.getByText('Switch to Editor 1')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Data/ }));
    expect(screen.getByRole('dialog', { name: 'Data' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Export' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Import' })).toBeDefined();
  });

  it('closes with Escape', () => {
    const onClose = vi.fn();
    render(<SettingsModal presets={[]} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
