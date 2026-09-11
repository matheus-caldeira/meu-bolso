import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartItemList } from './CartItemList';
import type { CartItem } from '../hooks/usePdvController';

afterEach(cleanup);

function baseProps() {
  return {
    cart: [] as CartItem[],
    onUpdateQty: vi.fn(),
    onRemoveItem: vi.fn(),
    onSetObservation: vi.fn(),
  };
}

const cartItem: CartItem = {
  cartId: 'a',
  productUid: 'product-1',
  name: 'X-Burger',
  salePrice: 20,
  costPrice: 5,
  qty: 2,
  observation: 'Sem cebola',
  customizationTotal: 3,
  customizations: [
    { groupName: 'Adicionais', name: 'Bacon', qty: 2, price: 3 },
  ],
  batchId: '',
  addedAt: 1000,
};

describe('CartItemList', () => {
  it('mostra o estado vazio', () => {
    render(<CartItemList {...baseProps()} />);
    expect(
      screen.getByText('Toque nos produtos para adicionar'),
    ).toBeInTheDocument();
  });

  it('renderiza item com customizações, observação e totais', () => {
    render(<CartItemList {...baseProps()} cart={[cartItem]} />);
    expect(screen.getByText('X-Burger')).toBeInTheDocument();
    expect(screen.getByText('2x Bacon')).toBeInTheDocument();
    expect(screen.getByText('Obs: Sem cebola')).toBeInTheDocument();
    expect(screen.getByText('R$ 46,00')).toBeInTheDocument();
  });

  it('dispara os callbacks de quantidade e remoção', async () => {
    const props = baseProps();
    render(<CartItemList {...props} cart={[cartItem]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Diminuir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remover item' }));
    expect(props.onUpdateQty).toHaveBeenCalledWith('a', 1);
    expect(props.onUpdateQty).toHaveBeenCalledWith('a', -1);
    expect(props.onRemoveItem).toHaveBeenCalledWith('a');
  });

  it('abre a anotação preenchida e salva o texto editado', async () => {
    const props = baseProps();
    render(<CartItemList {...props} cart={[cartItem]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Anotação' }));
    const textarea = screen.getByLabelText('Anotação do item');
    expect(textarea).toHaveValue('Sem cebola');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Bem passado');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(props.onSetObservation).toHaveBeenCalledWith('a', 'Bem passado');
  });

  it('não mostra cabeçalho de horário no carrinho em formação, mesmo com vários itens', () => {
    const other: CartItem = {
      ...cartItem,
      cartId: 'b',
      name: 'Refri',
      customizations: undefined,
      observation: undefined,
    };
    render(<CartItemList {...baseProps()} cart={[cartItem, other]} />);
    expect(screen.queryByText(/^\d{2}h\d{2}$/)).not.toBeInTheDocument();
  });
});
