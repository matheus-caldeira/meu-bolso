import { useId, useState } from 'react';
import {
  ChevronUp,
  CreditCard,
  Receipt,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { Money } from '../atoms/Money';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Autocomplete } from '../molecules/Autocomplete';
import { customerSuggestionLabel } from '../../domain/customer/customer.rules';
import type { Customer } from '../../domain/customer/customer.entity';
import type { Order } from '../../domain/order/order.entity';
import type { BusinessTypeRules } from '../../domain/business-type/business-type.entity';
import type { CartItem } from '../hooks/usePdvController';

interface CartBarProps {
  cart: CartItem[];
  total: number;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerSuggestions: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  ordering?: BusinessTypeRules['ordering'];
  selectedTab?: Order | null;
  onExpand: () => void;
  onOpenTab: () => void;
  onFinalize: () => void;
  onCreateCustomer: () => void;
  onClearCart: () => void;
}

export function CartBar({
  cart,
  total,
  customerName,
  onCustomerNameChange,
  customerSuggestions,
  onSelectCustomer,
  ordering = 'optional',
  selectedTab,
  onExpand,
  onOpenTab,
  onFinalize,
  onCreateCustomer,
  onClearCart,
}: CartBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchFieldId = useId();
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const hasItems = itemCount > 0;
  const suggestionOptions = customerSuggestions.map((customer) => ({
    value: customer.uid,
    label: customerSuggestionLabel(customer),
    hint: customer.phone,
  }));

  function runAndClose(action: () => void) {
    setMenuOpen(false);
    action();
  }

  function pickSuggestion(uid: string) {
    customerSuggestions
      .filter((entry) => entry.uid === uid)
      .forEach((customer) => onSelectCustomer(customer));
  }

  return (
    <div
      data-testid="cart-bar"
      className="fixed inset-x-0 bottom-[var(--bottom-nav-h,var(--nav-bottom-height))] z-[110] border-t border-border-emphasis bg-surface-2"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 pt-3 text-left"
        onClick={onExpand}
        disabled={!hasItems}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
          {selectedTab && (
            <span className="rounded-full bg-accent-subtle px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-accent">
              nº {selectedTab.ticket}
            </span>
          )}
          {hasItems
            ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
            : 'Nenhum item'}
        </span>
        <span className="flex items-center gap-1">
          {hasItems && (
            <Money
              value={total}
              className="font-mono text-lg font-extrabold tabular-nums text-accent"
            />
          )}
          {hasItems && <ChevronUp size={16} className="text-ink-tertiary" />}
        </span>
      </button>

      <div className="flex items-end gap-2 px-4 pb-3 pt-2">
        <div className="min-w-0 flex-1">
          <Autocomplete
            label="Cliente"
            placeholder="Nome do cliente"
            value={customerName}
            searchLabel="Buscar cliente na lista"
            options={suggestionOptions}
            onChange={onCustomerNameChange}
            onSelect={(option) => pickSuggestion(option.value)}
            onSearch={() => setSearchOpen(true)}
          />
        </div>
        <Button
          size="sm"
          className="min-h-11 w-[100px] shrink-0"
          aria-label="Ações da venda"
          onClick={() => setMenuOpen(true)}
        >
          <Sparkles size={18} className="shrink-0" />
          Ações
        </Button>
      </div>

      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Buscar cliente"
      >
        <div className="flex flex-col gap-3">
          <label
            htmlFor={searchFieldId}
            className="text-xs font-semibold text-ink-secondary"
          >
            Nome do cliente
          </label>
          <input
            id={searchFieldId}
            autoComplete="off"
            placeholder="Digite para filtrar"
            className="min-h-11 w-full rounded-sm border border-border-emphasis bg-surface-inset px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
          />
          {suggestionOptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-tertiary">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <ul
              aria-label="Clientes encontrados"
              className="flex max-h-[50dvh] flex-col overflow-y-auto"
            >
              {suggestionOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-left hover:bg-surface-inset"
                    onClick={() => {
                      setSearchOpen(false);
                      pickSuggestion(option.value);
                    }}
                  >
                    <span className="truncate text-ink-primary">
                      {option.label}
                    </span>
                    {option.hint && (
                      <span className="shrink-0 font-mono text-sm tabular-nums text-ink-tertiary">
                        {option.hint}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Ações da venda"
      >
        <div className="flex flex-col gap-2">
          <Button
            fullWidth
            className="min-h-14"
            aria-label="Finalizar venda"
            disabled={!hasItems}
            onClick={() => runAndClose(onFinalize)}
          >
            <CreditCard size={20} className="shrink-0" />
            Finalizar venda
          </Button>
          {ordering !== 'none' && (
            <Button
              variant="ghost"
              fullWidth
              className="min-h-14"
              aria-label={
                selectedTab
                  ? `Lançar na comanda nº ${selectedTab.ticket}`
                  : 'Abrir comanda'
              }
              disabled={selectedTab ? !hasItems : false}
              onClick={() => runAndClose(onOpenTab)}
            >
              <Receipt size={20} className="shrink-0" />
              {selectedTab ? (
                <span className="truncate">
                  Lançar na comanda{' '}
                  <span className="font-mono font-bold tabular-nums">
                    nº {selectedTab.ticket}
                  </span>
                </span>
              ) : (
                <span className="truncate">Abrir comanda</span>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            fullWidth
            className="min-h-14"
            onClick={() => runAndClose(onCreateCustomer)}
          >
            <User size={20} className="shrink-0" />
            Cadastrar cliente
          </Button>
          <Button
            variant="danger"
            fullWidth
            className="min-h-14"
            disabled={!hasItems}
            onClick={() => runAndClose(onClearCart)}
          >
            <Trash2 size={20} className="shrink-0" />
            Limpar carrinho
          </Button>
        </div>
      </Modal>
    </div>
  );
}
