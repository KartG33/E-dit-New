import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsModal } from '../src/components/Settings/SettingsModal';

describe('SettingsModal', () => {
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
