import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrintPromptModal } from './PrintPromptModal';
import type { Order } from '../../domain/order/order.entity';

afterEach(cleanup);

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    uid: 'tab-1',
    businessTypeId: 'scout',
    sessionUid: 's-1',
    items: [],
    total: 25,
    paymentMethod: null,
    customerName: 'Maju',
    customerPhone: '',
    ticket: '042',
    stage: 'aceito',
    status: 'open',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('PrintPromptModal', () => {
  it('não renderiza sem pedido', () => {
    const { container } = render(
      <PrintPromptModal
        order={null}
        onPrint={vi.fn()}
        onDismiss={vi.fn()}
        printing={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('mostra a identificação da comanda', () => {
    render(
      <PrintPromptModal
        order={makeOrder()}
        onPrint={vi.fn()}
        onDismiss={vi.fn()}
        printing={false}
      />,
    );

    expect(screen.getByText('042')).toBeInTheDocument();
    expect(screen.getByText('Maju')).toBeInTheDocument();
  });

  it('imprime ao confirmar', async () => {
    const onPrint = vi.fn();
    render(
      <PrintPromptModal
        order={makeOrder()}
        onPrint={onPrint}
        onDismiss={vi.fn()}
        printing={false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /imprimir/i }));

    expect(onPrint).toHaveBeenCalled();
  });

  it('segue sem imprimir ao dispensar', async () => {
    const onDismiss = vi.fn();
    render(
      <PrintPromptModal
        order={makeOrder()}
        onPrint={vi.fn()}
        onDismiss={onDismiss}
        printing={false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /agora não/i }));

    expect(onDismiss).toHaveBeenCalled();
  });

  it('desabilita o botão enquanto imprime', () => {
    render(
      <PrintPromptModal
        order={makeOrder()}
        onPrint={vi.fn()}
        onDismiss={vi.fn()}
        printing
      />,
    );

    expect(screen.getByRole('button', { name: /imprimindo/i })).toBeDisabled();
  });
});
