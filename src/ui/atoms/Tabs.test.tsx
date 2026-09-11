import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

const ITEMS = [
  { value: 'summary', label: 'Resumo' },
  { value: 'day', label: 'Fechamento do dia' },
  { value: 'stock', label: 'Estoque' },
];

describe('Tabs', () => {
  afterEach(cleanup);

  it('marks the active tab as selected', () => {
    render(
      <Tabs items={ITEMS} value="day" onChange={vi.fn()} label="Relatório" />,
    );
    expect(
      screen.getByRole('tab', { name: 'Fechamento do dia' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('names the tablist for screen readers', () => {
    render(
      <Tabs
        items={ITEMS}
        value="summary"
        onChange={vi.fn()}
        label="Relatório"
      />,
    );
    expect(
      screen.getByRole('tablist', { name: 'Relatório' }),
    ).toBeInTheDocument();
  });

  it('reports the clicked tab', async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        items={ITEMS}
        value="summary"
        onChange={onChange}
        label="Relatório"
      />,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Estoque' }));
    expect(onChange).toHaveBeenCalledWith('stock');
  });

  it('moves to the next tab with the right arrow', async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        items={ITEMS}
        value="summary"
        onChange={onChange}
        label="Relatório"
      />,
    );
    screen.getByRole('tab', { name: 'Resumo' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('day');
  });

  it('wraps to the first tab when moving past the last one', async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        items={ITEMS}
        value="stock"
        onChange={onChange}
        label="Relatório"
      />,
    );
    screen.getByRole('tab', { name: 'Estoque' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('summary');
  });

  it('wraps to the last tab when moving before the first one', async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        items={ITEMS}
        value="summary"
        onChange={onChange}
        label="Relatório"
      />,
    );
    screen.getByRole('tab', { name: 'Resumo' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith('stock');
  });

  it('ignores keys other than the arrows', async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        items={ITEMS}
        value="summary"
        onChange={onChange}
        label="Relatório"
      />,
    );
    screen.getByRole('tab', { name: 'Resumo' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps only the active tab in the focus order', () => {
    render(
      <Tabs items={ITEMS} value="day" onChange={vi.fn()} label="Relatório" />,
    );
    expect(
      screen.getByRole('tab', { name: 'Fechamento do dia' }),
    ).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });
});
