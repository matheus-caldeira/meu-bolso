import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartBar } from './CartBar';
import type { Customer } from '../../domain/customer/customer.entity';
import type { Order } from '../../domain/order/order.entity';
import type { CartItem } from '../hooks/usePdvController';

afterEach(cleanup);

const item: CartItem = {
  cartId: 'a',
  productUid: 'product-1',
  name: 'Coxinha',
  salePrice: 5,
  costPrice: 2,
  qty: 3,
  batchId: 'b-1',
  addedAt: 1000,
};

const tab = { uid: 'tab-1', ticket: '0012' } as Order;

function baseProps() {
  return {
    cart: [] as CartItem[],
    total: 0,
    customerName: '',
    onCustomerNameChange: vi.fn(),
    customerSuggestions: [] as Customer[],
    onSelectCustomer: vi.fn(),
    ordering: 'optional' as const,
    selectedTab: null as Order | null,
    onExpand: vi.fn(),
    onOpenTab: vi.fn(),
    onFinalize: vi.fn(),
    onCreateCustomer: vi.fn(),
    onClearCart: vi.fn(),
  };
}

describe('CartBar', () => {
  it('fica acima do menu de navegação', () => {
    render(<CartBar {...baseProps()} />);

    const bar = screen.getByTestId('cart-bar');
    expect(bar.className).toContain('bottom-[var(--bottom-nav-h');
    expect(bar.className).toContain('z-[110]');
  });

  it('mostra o nome do cliente no campo', () => {
    render(<CartBar {...baseProps()} customerName="Maju" />);

    expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue(
      'Maju',
    );
  });

  it('mostra o número da comanda selecionada', () => {
    render(<CartBar {...baseProps()} selectedTab={tab} />);

    expect(screen.getByText('nº 0012')).toBeInTheDocument();
  });

  it('esconde o número quando não há comanda selecionada', () => {
    render(<CartBar {...baseProps()} />);

    expect(screen.queryByText(/nº /)).not.toBeInTheDocument();
  });

  it('busca e vincula o cliente pelo campo da barra', async () => {
    const props = baseProps();
    const customer: Customer = {
      uid: 'customer-1',
      name: 'Maju',
      addresses: [],
      extra: {},
      createdAt: 1,
      updatedAt: 1,
    };
    render(
      <CartBar {...props} customerName="Ma" customerSuggestions={[customer]} />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Cliente' }));
    await userEvent.click(screen.getByRole('option', { name: /Maju/ }));

    expect(props.onSelectCustomer).toHaveBeenCalledWith(customer);
  });

  it('encaminha o nome digitado sem vincular ninguém', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.type(
      screen.getByRole('combobox', { name: 'Cliente' }),
      'F',
    );

    expect(props.onCustomerNameChange).toHaveBeenCalledWith('F');
    expect(props.onSelectCustomer).not.toHaveBeenCalled();
  });

  it('avisa quando não há itens', () => {
    render(<CartBar {...baseProps()} />);

    expect(screen.getByText('Nenhum item')).toBeInTheDocument();
  });

  it('mostra a contagem e o total', () => {
    render(<CartBar {...baseProps()} cart={[item]} total={15} />);

    expect(screen.getByText('3 itens')).toBeInTheDocument();
    expect(screen.getByText('R$ 15,00')).toBeInTheDocument();
  });

  it('usa o singular com um item só', () => {
    render(<CartBar {...baseProps()} cart={[{ ...item, qty: 1 }]} total={5} />);

    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('expande a lista ao tocar no resumo', async () => {
    const props = baseProps();
    render(<CartBar {...props} cart={[item]} total={15} />);

    await userEvent.click(screen.getByText('3 itens'));

    expect(props.onExpand).toHaveBeenCalledTimes(1);
  });

  it('não expande quando o carrinho está vazio', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.click(screen.getByText('Nenhum item'));

    expect(props.onExpand).not.toHaveBeenCalled();
  });

  it('deixa a barra com um único botão de ação', () => {
    render(<CartBar {...baseProps()} cart={[item]} total={15} />);

    const action = screen.getByRole('button', { name: 'Ações da venda' });
    expect(action).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Finalizar venda' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Abrir comanda' }),
    ).not.toBeInTheDocument();
  });

  it('põe o campo de cliente e as ações na mesma linha', () => {
    render(<CartBar {...baseProps()} cart={[item]} total={15} />);

    const action = screen.getByRole('button', { name: 'Ações da venda' });
    const field = screen.getByRole('combobox', { name: 'Cliente' });
    const row = action.parentElement as HTMLElement;

    expect(row.className).toContain('flex');
    expect(row).toContainElement(field);
  });

  it('mantém a ação compacta e com alvo de toque confortável', () => {
    render(<CartBar {...baseProps()} cart={[item]} total={15} />);

    const action = screen.getByRole('button', { name: 'Ações da venda' });
    expect(action.className).toContain('min-h-11');
    expect(action.className).toContain('w-[100px]');
    expect(action.className).not.toContain('w-full');
  });

  it('abre o modal de busca pela lupa do campo de cliente', async () => {
    render(<CartBar {...baseProps()} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Buscar cliente na lista' }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Buscar cliente' }),
    ).toBeInTheDocument();
  });

  it('lista todos os clientes no modal de busca', async () => {
    const customer: Customer = {
      uid: 'customer-1',
      name: 'Maju',
      phone: '99999',
      addresses: [],
      extra: {},
      createdAt: 1,
      updatedAt: 1,
    };
    render(<CartBar {...baseProps()} customerSuggestions={[customer]} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Buscar cliente na lista' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Buscar cliente' });
    const list = within(dialog).getByRole('list', {
      name: 'Clientes encontrados',
    });
    expect(list.className).toContain('overflow-y-auto');
    expect(within(list).getByText('Maju')).toBeInTheDocument();
    expect(within(list).getByText('99999')).toBeInTheDocument();
  });

  it('vincula o cliente escolhido no modal de busca', async () => {
    const props = baseProps();
    const customer: Customer = {
      uid: 'customer-1',
      name: 'Maju',
      addresses: [],
      extra: {},
      createdAt: 1,
      updatedAt: 1,
    };
    render(<CartBar {...props} customerSuggestions={[customer]} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Buscar cliente na lista' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Maju' }));

    expect(props.onSelectCustomer).toHaveBeenCalledWith(customer);
    expect(
      screen.queryByRole('dialog', { name: 'Buscar cliente' }),
    ).not.toBeInTheDocument();
  });

  it('filtra a lista digitando no campo do modal de busca', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Buscar cliente na lista' }),
    );
    await userEvent.type(screen.getByLabelText('Nome do cliente'), 'M');

    expect(props.onCustomerNameChange).toHaveBeenCalledWith('M');
  });

  it('oferece a comanda quando o tipo de pedido não é informado', async () => {
    const props = baseProps();
    render(<CartBar {...props} ordering={undefined} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    expect(
      screen.getByRole('button', { name: 'Abrir comanda' }),
    ).toBeInTheDocument();
  });

  it('fecha o modal de busca pelo Escape', async () => {
    render(<CartBar {...baseProps()} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Buscar cliente na lista' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Buscar cliente' }),
    ).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('avisa quando a busca não encontra ninguém', async () => {
    render(<CartBar {...baseProps()} customerName="Zzz" />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Buscar cliente na lista' }),
    );

    expect(screen.getByText('Nenhum cliente encontrado.')).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Clientes encontrados' }),
    ).not.toBeInTheDocument();
  });

  it('abre o modal com todas as ações', async () => {
    render(<CartBar {...baseProps()} cart={[item]} total={15} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Ações da venda' });
    expect(
      within(dialog).getByRole('button', { name: 'Finalizar venda' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Abrir comanda' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Cadastrar cliente' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Limpar carrinho' }),
    ).toBeInTheDocument();
  });

  it('coloca a finalização no topo do modal', async () => {
    render(<CartBar {...baseProps()} cart={[item]} total={15} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Ações da venda' });
    const names = within(dialog)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent);

    expect(names).toEqual([
      'Finalizar venda',
      'Abrir comanda',
      'Cadastrar cliente',
      'Limpar carrinho',
    ]);
  });

  it('dá alvo de toque confortável a cada ação do modal', async () => {
    render(<CartBar {...baseProps()} cart={[item]} total={15} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Ações da venda' });
    within(dialog)
      .getAllByRole('button')
      .forEach((button) => expect(button.className).toContain('min-h-14'));
  });

  it('finaliza a venda pelo modal', async () => {
    const props = baseProps();
    render(<CartBar {...props} cart={[item]} total={15} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar venda' }),
    );

    expect(props.onFinalize).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('impede finalizar sem itens', async () => {
    render(<CartBar {...baseProps()} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    expect(
      screen.getByRole('button', { name: 'Finalizar venda' }),
    ).toBeDisabled();
  });

  it('deixa tentar abrir comanda sem cliente para avisar o motivo', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );
    const button = screen.getByRole('button', { name: 'Abrir comanda' });
    expect(button).toBeEnabled();

    await userEvent.click(button);

    expect(props.onOpenTab).toHaveBeenCalledTimes(1);
  });

  it('mostra lançar na comanda quando há comanda selecionada', async () => {
    render(
      <CartBar {...baseProps()} cart={[item]} total={15} selectedTab={tab} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    expect(
      screen.getByRole('button', { name: 'Lançar na comanda nº 0012' }),
    ).toBeEnabled();
  });

  it('impede lançar na comanda sem itens', async () => {
    render(<CartBar {...baseProps()} selectedTab={tab} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    expect(
      screen.getByRole('button', { name: 'Lançar na comanda nº 0012' }),
    ).toBeDisabled();
  });

  it('esconde a comanda quando o negócio não usa comandas', async () => {
    render(<CartBar {...baseProps()} ordering="none" />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    expect(
      screen.queryByRole('button', { name: 'Abrir comanda' }),
    ).not.toBeInTheDocument();
  });

  it('abre o cadastro de cliente pelo modal de ações', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Cadastrar cliente' }),
    );

    expect(props.onCreateCustomer).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('limpa o carrinho pelo modal de ações', async () => {
    const props = baseProps();
    render(<CartBar {...props} cart={[item]} total={15} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpar carrinho' }),
    );

    expect(props.onClearCart).toHaveBeenCalledTimes(1);
  });

  it('impede limpar carrinho vazio', async () => {
    render(<CartBar {...baseProps()} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    expect(
      screen.getByRole('button', { name: 'Limpar carrinho' }),
    ).toBeDisabled();
  });

  it('mostra o número da comanda em monoespaçado no modal', async () => {
    render(
      <CartBar {...baseProps()} cart={[item]} total={15} selectedTab={tab} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Ações da venda' });
    const ticket = within(dialog).getByText('nº 0012');
    expect(ticket.className).toContain('font-mono');
    expect(ticket.className).toContain('tabular-nums');
  });

  it('fecha o modal de ações pelo Escape', async () => {
    render(<CartBar {...baseProps()} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ações da venda' }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
