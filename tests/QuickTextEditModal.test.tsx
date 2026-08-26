import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuickTextEditModal } from '../src/components/TextEdit/QuickTextEditModal';

const source = 'The NEW system was successfully installed today! The NEW system is ready.';

describe('QuickTextEditModal', () => {
  it('replaces all exact matches in the selected editor', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(<QuickTextEditModal editorId="right" value={source} onApply={onApply} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Find & edit' })).toBeDefined();
    expect(screen.getByText('Editor 2 · exact matches · entire text')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Find exact text'), { target: { value: 'NEW' } });
    fireEvent.change(screen.getByLabelText('Replace with'), { target: { value: 'OLD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Replace all in Editor 2' }));

    expect(onApply).toHaveBeenCalledWith('The OLD system was successfully installed today! The OLD system is ready.');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('removes multiple exact fragments in one operation', () => {
    const onApply = vi.fn();
    render(<QuickTextEditModal editorId="left" value={source} onApply={onApply} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.change(screen.getByLabelText('Fragment 1'), { target: { value: 'successfully ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add fragment' }));
    fireEvent.change(screen.getByLabelText('Fragment 2'), { target: { value: '!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove all from Editor 1' }));

    expect(onApply).toHaveBeenCalledWith('The NEW system was installed today The NEW system is ready.');
  });

  it('keeps the dialog open when no exact match exists', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(<QuickTextEditModal editorId="left" value={source} onApply={onApply} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Find exact text'), { target: { value: 'new' } });
    fireEvent.change(screen.getByLabelText('Replace with'), { target: { value: 'old' } });
    fireEvent.click(screen.getByRole('button', { name: 'Replace all in Editor 1' }));

    expect(screen.getByText('No exact matches found.')).toBeDefined();
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes with Escape', () => {
    const onClose = vi.fn();
    render(<QuickTextEditModal editorId="left" value={source} onApply={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
