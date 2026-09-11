import { describe, expect, it } from 'vitest';
import {
  detectEntityByFileName,
  detectEntityByHeaders,
} from './entity-detection';

describe('detectEntityByFileName', () => {
  it('reconhece o nome gerado pela exportação', () => {
    expect(detectEntityByFileName('pdv-products.csv')).toBe('products');
    expect(detectEntityByFileName('pdv-financeEntries.csv')).toBe(
      'financeEntries',
    );
  });

  it('reconhece o nome sem prefixo', () => {
    expect(detectEntityByFileName('orders.csv')).toBe('orders');
  });

  it('ignora maiúsculas e minúsculas', () => {
    expect(detectEntityByFileName('PDV-Orders.CSV')).toBe('orders');
  });

  it('devolve nulo para arquivo desconhecido', () => {
    expect(detectEntityByFileName('planilha.csv')).toBeNull();
    expect(detectEntityByFileName('pdv-vendas.csv')).toBeNull();
  });
});

describe('detectEntityByHeaders', () => {
  it('reconhece a entidade pelas colunas', () => {
    expect(
      detectEntityByHeaders(['uid', 'name', 'category', 'salePrice', 'stock']),
    ).toBe('products');
  });

  it('devolve nulo quando nenhuma entidade corresponde', () => {
    expect(detectEntityByHeaders(['coluna', 'outra'])).toBeNull();
  });

  it('devolve nulo diante de colunas vazias', () => {
    expect(detectEntityByHeaders([])).toBeNull();
  });

  it('reconhece pedidos pelas colunas de ticket e estágio', () => {
    expect(
      detectEntityByHeaders(['uid', 'ticket', 'stage', 'status', 'total']),
    ).toBe('orders');
  });

  it('reconhece sessões de caixa pelas colunas de abertura e fechamento', () => {
    expect(
      detectEntityByHeaders(['uid', 'openedAt', 'closedAt', 'cashInitial']),
    ).toBe('sessions');
  });

  it('reconhece movimentações de caixa pelo tipo sangria/suprimento', () => {
    expect(
      detectEntityByHeaders(['uid', 'sessionUid', 'type', 'amount', 'reason']),
    ).toBe('cashMovements');
  });

  it('reconhece clientes pelo telefone e endereços', () => {
    expect(detectEntityByHeaders(['uid', 'name', 'phone', 'addresses'])).toBe(
      'customers',
    );
  });

  it('reconhece grupos de adicionais pela obrigatoriedade e limites', () => {
    expect(
      detectEntityByHeaders([
        'uid',
        'name',
        'required',
        'minQty',
        'maxQty',
        'chargeAfter',
      ]),
    ).toBe('customizationGroups');
  });

  it('reconhece itens de adicionais pelo grupo e preço', () => {
    expect(
      detectEntityByHeaders([
        'uid',
        'groupUid',
        'name',
        'price',
        'maxQty',
        'chargeAfter',
        'active',
      ]),
    ).toBe('customizationItems');
  });

  it('reconhece a configuração pelo contador de tíquete', () => {
    expect(
      detectEntityByHeaders([
        'name',
        'document',
        'ticketCounter',
        'ticketLimit',
        'printerDriver',
      ]),
    ).toBe('config');
  });

  it('reconhece membros da família pelo arquivamento sem categoria', () => {
    expect(
      detectEntityByHeaders(['uid', 'name', 'archived', 'createdAt']),
    ).toBe('financeMembers');
  });

  it('reconhece categorias financeiras pelo tipo receita/despesa', () => {
    expect(
      detectEntityByHeaders(['uid', 'name', 'kind', 'archived', 'createdAt']),
    ).toBe('financeCategories');
  });

  it('reconhece lançamentos financeiros pelas colunas de mês e status', () => {
    expect(
      detectEntityByHeaders([
        'uid',
        'description',
        'amount',
        'kind',
        'categoryUid',
        'month',
        'status',
        'source',
      ]),
    ).toBe('financeEntries');
  });

  it('reconhece itens de orçamento pelo mês opcional', () => {
    expect(
      detectEntityByHeaders(['uid', 'categoryUid', 'amount', 'month']),
    ).toBe('financeBudgetItems');
  });

  it('reconhece fórmulas financeiras pelo percentual', () => {
    expect(
      detectEntityByHeaders([
        'uid',
        'name',
        'percent',
        'filter',
        'outputKind',
        'outputCategoryUid',
        'outputDescription',
      ]),
    ).toBe('financeFormulas');
  });

  it('reconhece recorrências pelo dia do mês e mês final', () => {
    expect(
      detectEntityByHeaders([
        'uid',
        'description',
        'amount',
        'kind',
        'dayOfMonth',
        'startMonth',
        'endMonth',
        'active',
      ]),
    ).toBe('financeRecurrences');
  });

  it('reconhece parcelamentos pela contagem de parcelas', () => {
    expect(
      detectEntityByHeaders([
        'uid',
        'description',
        'totalAmount',
        'installmentCount',
        'firstMonth',
        'dayOfMonth',
      ]),
    ).toBe('financeInstallmentPlans');
  });

  it('reconhece fechamentos de mês pelo saldo planejado', () => {
    expect(
      detectEntityByHeaders([
        'uid',
        'month',
        'closedAt',
        'plannedIncome',
        'plannedExpense',
        'plannedBalance',
        'actualIncome',
      ]),
    ).toBe('financeClosings');
  });

  it('reconhece meios de pagamento pelo dia de fechamento e vencimento', () => {
    expect(
      detectEntityByHeaders([
        'uid',
        'name',
        'type',
        'closingDay',
        'dueDay',
        'archived',
      ]),
    ).toBe('financePaymentMethods');
  });

  it('reconhece faturas de cartão pelo valor informado e vencimento', () => {
    expect(
      detectEntityByHeaders([
        'uid',
        'paymentMethodUid',
        'month',
        'dueDate',
        'statedAmount',
        'paidAt',
      ]),
    ).toBe('financeCardInvoices');
  });

  it('devolve nulo quando as colunas empatam entre duas entidades', () => {
    expect(detectEntityByHeaders(['uid', 'name', 'createdAt'])).toBeNull();
  });
});
