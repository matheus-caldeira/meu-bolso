import { describe, expect, it } from 'vitest';
import type { Order } from '../order/order.entity';
import type { Product } from '../product/product.entity';
import type { SessionReport } from '../../application/report/report.usecases';
import {
  buildBatchReceipt,
  buildDayReportReceipt,
  buildOrderReceipt,
  buildPendingTabsReceipt,
  buildStockReceipt,
} from './receipt.builders';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    uid: 'tab-1',
    businessTypeId: 'scout',
    sessionUid: 's-1',
    items: [
      {
        name: 'Cachorro',
        salePrice: 10,
        costPrice: 4,
        qty: 2,
        batchId: 'b-1',
        addedAt: new Date(2026, 8, 9, 19, 2).getTime(),
      },
      {
        name: 'Refri',
        salePrice: 5,
        costPrice: 2,
        qty: 1,
        batchId: 'b-2',
        addedAt: new Date(2026, 8, 9, 20, 15).getTime(),
      },
    ],
    total: 25,
    paymentMethod: null,
    customerName: 'Maju (Lobinha)',
    customerPhone: '',
    ticket: '042',
    stage: 'aceito',
    status: 'pending',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('buildOrderReceipt', () => {
  it('monta o cupom com número, nome, itens e total', () => {
    const receipt = buildOrderReceipt(makeOrder(), 'Grupo Escoteiro', 1000);

    expect(receipt.title).toBe('Comanda');
    expect(receipt.ticket).toBe('042');
    expect(receipt.customerName).toBe('Maju (Lobinha)');
    expect(receipt.businessName).toBe('Grupo Escoteiro');
    expect(receipt.lines).toHaveLength(2);
    expect(receipt.lines[0]).toEqual({
      label: 'Cachorro',
      qty: 2,
      value: 'R$ 20,00',
    });
    expect(receipt.total).toBe(25);
    expect(receipt.printedAt).toBe(1000);
  });

  it('inclui os adicionais como linha própria', () => {
    const order = makeOrder({
      items: [
        {
          name: 'Cachorro',
          salePrice: 10,
          costPrice: 4,
          qty: 1,
          customizations: [
            { groupName: 'Extras', name: 'Bacon', qty: 1, price: 2 },
          ],
          customizationTotal: 2,
          batchId: 'b-1',
          addedAt: 1000,
        },
      ],
    });

    const receipt = buildOrderReceipt(order, 'Grupo Escoteiro', 1000);

    expect(receipt.lines[0]).toEqual({
      label: 'Cachorro',
      qty: 1,
      value: 'R$ 12,00',
    });
    expect(receipt.lines[1]).toEqual({ label: '  + Bacon' });
    expect(receipt.lines.some((line) => line.label.includes('Bacon'))).toBe(
      true,
    );
  });

  it('avisa que o pagamento é feito em outro lugar', () => {
    const receipt = buildOrderReceipt(makeOrder(), 'Grupo Escoteiro', 1000);
    expect(receipt.footer).toMatch(/pagar no caixa/i);
  });

  it('junta os dados do cliente vinculado numa linha só', () => {
    const receipt = buildOrderReceipt(makeOrder(), 'Grupo Escoteiro', 1000, [
      'Lobinho',
      'Maria da Silva',
    ]);

    expect(receipt.customerDetails).toBe('Lobinho, Maria da Silva');
  });

  it('não imprime dados do cliente quando não há vínculo', () => {
    const receipt = buildOrderReceipt(makeOrder(), 'Grupo Escoteiro', 1000);

    expect(receipt.customerDetails).toBeUndefined();
  });
});

describe('buildStockReceipt', () => {
  it('lista os produtos com a quantidade atual', () => {
    const products = [
      { uid: 'p-1', name: 'Refri', stock: 12 },
      { uid: 'p-2', name: 'Cachorro', stock: 3 },
    ] as Product[];

    const receipt = buildStockReceipt(products, 'Grupo Escoteiro', 1000);

    expect(receipt.title).toMatch(/estoque/i);
    expect(receipt.businessName).toBe('Grupo Escoteiro');
    expect(receipt.printedAt).toBe(1000);
    expect(receipt.lines).toHaveLength(2);
    expect(receipt.lines[0]).toEqual({ label: 'Refri', value: '12' });
    expect(receipt.total).toBeUndefined();
  });
});

describe('buildPendingTabsReceipt', () => {
  it('lista só as comandas em aberto e fechadas', () => {
    const orders = [
      makeOrder({
        uid: 'a',
        status: 'open',
        ticket: '001',
        customerName: 'Ana',
        total: 10,
      }),
      makeOrder({ uid: 'b', status: 'paid', ticket: '002' }),
      makeOrder({
        uid: 'c',
        status: 'pending',
        ticket: '003',
        customerName: 'Caio',
        total: 5,
      }),
    ];

    const receipt = buildPendingTabsReceipt(orders, 'Grupo Escoteiro', 1000);

    expect(receipt.title).toBe('Comandas pendentes');
    expect(receipt.lines).toHaveLength(2);
    expect(receipt.lines[0]).toEqual({
      label: '001 — Ana',
      value: 'R$ 10,00',
    });
    expect(receipt.total).toBe(15);
  });
});

describe('buildDayReportReceipt', () => {
  it('monta o fechamento com totais, formas de pagamento e ranking', () => {
    const report: SessionReport = {
      summary: {
        totalSales: 100,
        totalCost: 40,
        profit: 60,
        margin: 60,
        paidCount: 4,
        averageTicket: 25,
      },
      byMethod: { dinheiro: 70, pix: 30 },
      products: [
        { name: 'Cachorro', qty: 5, total: 50, cost: 20 },
        { name: 'Refri', qty: 10, total: 50, cost: 20 },
      ],
      pending: [],
    };

    const receipt = buildDayReportReceipt(report, 'Grupo Escoteiro', 1000);

    expect(receipt.title).toBe('Fechamento do dia');
    expect(receipt.businessName).toBe('Grupo Escoteiro');
    expect(receipt.printedAt).toBe(1000);
    expect(receipt.total).toBe(100);
    expect(
      receipt.lines.some(
        (line) =>
          line.label === 'Total de vendas' && line.value === 'R$ 100,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'Custo' && line.value === 'R$ 40,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'Lucro' && line.value === 'R$ 60,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'Margem' && line.value === '60.0%',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'Comandas pagas' && line.value === '4',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'dinheiro' && line.value === 'R$ 70,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) => line.label === 'pix' && line.value === 'R$ 30,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) =>
          line.label === 'Cachorro' &&
          line.qty === 5 &&
          line.value === 'R$ 50,00',
      ),
    ).toBe(true);
    expect(
      receipt.lines.some(
        (line) =>
          line.label === 'Refri' &&
          line.qty === 10 &&
          line.value === 'R$ 50,00',
      ),
    ).toBe(true);
  });

  it('lida com relatório sem vendas por forma de pagamento nem produtos', () => {
    const report: SessionReport = {
      summary: {
        totalSales: 0,
        totalCost: 0,
        profit: 0,
        margin: 0,
        paidCount: 0,
        averageTicket: 0,
      },
      byMethod: {},
      products: [],
      pending: [],
    };

    const receipt = buildDayReportReceipt(report, 'Grupo Escoteiro', 1000);

    expect(receipt.total).toBe(0);
    expect(receipt.lines.some((line) => line.label === 'Comandas pagas')).toBe(
      true,
    );
  });
});

describe('buildBatchReceipt', () => {
  const previousAt = new Date(2026, 8, 9, 19, 2).getTime();
  const currentAt = new Date(2026, 8, 9, 20, 15).getTime();

  it('identifica a comanda com número e nome numa linha só', () => {
    const receipt = buildBatchReceipt(
      makeOrder(),
      'b-2',
      { includePrevious: false },
      'Grupo Escoteiro',
      1000,
    );

    expect(receipt.ticket).toBe('COMANDA 042 - Maju (Lobinha)');
    expect(receipt.customerName).toBeUndefined();
  });

  it('identifica só pelo número quando não há nome', () => {
    const receipt = buildBatchReceipt(
      makeOrder({ customerName: '' }),
      'b-2',
      { includePrevious: false },
      'Grupo Escoteiro',
      1000,
    );

    expect(receipt.ticket).toBe('COMANDA 042');
  });

  it('imprime os dados do cliente vinculado abaixo da identificação', () => {
    const receipt = buildBatchReceipt(
      makeOrder(),
      'b-2',
      { includePrevious: false },
      'Grupo Escoteiro',
      1000,
      ['Lobinho', 'Maria da Silva'],
    );

    expect(receipt.ticket).toBe('COMANDA 042 - Maju (Lobinha)');
    expect(receipt.customerDetails).toBe('Lobinho, Maria da Silva');
  });

  it('com um único dado preenchido, não deixa vírgula solta', () => {
    const receipt = buildBatchReceipt(
      makeOrder(),
      'b-2',
      { includePrevious: false },
      'Grupo Escoteiro',
      1000,
      ['Lobinho'],
    );

    expect(receipt.customerDetails).toBe('Lobinho');
  });

  it('ignora dados em branco e omite a linha quando nada sobra', () => {
    const receipt = buildBatchReceipt(
      makeOrder(),
      'b-2',
      { includePrevious: false },
      'Grupo Escoteiro',
      1000,
      ['  ', ''],
    );

    expect(receipt.customerDetails).toBeUndefined();
  });

  it('sem cliente vinculado, não acrescenta linha de dados', () => {
    const receipt = buildBatchReceipt(
      makeOrder({ customerUid: undefined }),
      'b-2',
      { includePrevious: false },
      'Grupo Escoteiro',
      1000,
    );

    expect(receipt.customerDetails).toBeUndefined();
  });

  it('sem histórico, lista só os itens da rodada com o total acumulado', () => {
    const receipt = buildBatchReceipt(
      makeOrder(),
      'b-2',
      { includePrevious: false },
      'Grupo Escoteiro',
      1000,
    );

    expect(receipt.lines).toEqual([
      { label: '20h15' },
      { label: 'Refri', qty: 1, value: 'R$ 5,00' },
    ]);
    expect(receipt.total).toBe(25);
  });

  it('com histórico, separa novos produtos do que já havia', () => {
    const receipt = buildBatchReceipt(
      makeOrder(),
      'b-2',
      { includePrevious: true },
      'Grupo Escoteiro',
      1000,
    );

    expect(receipt.lines).toEqual([
      { label: 'NOVOS PRODUTOS', emphasis: true },
      { label: '20h15' },
      { label: 'Refri', qty: 1, value: 'R$ 5,00' },
      { label: '', kind: 'blank' },
      { label: '', kind: 'divider' },
      { label: 'HISTORICO', emphasis: true },
      { label: '19h02' },
      { label: 'Cachorro', qty: 2, value: 'R$ 20,00' },
    ]);
    expect(receipt.total).toBe(25);
  });

  it('omite os rótulos de seção quando a rodada é a única', () => {
    const order = makeOrder({
      items: [
        {
          name: 'Cachorro',
          salePrice: 10,
          costPrice: 4,
          qty: 2,
          batchId: 'b-1',
          addedAt: previousAt,
        },
      ],
      total: 20,
    });

    const receipt = buildBatchReceipt(
      order,
      'b-1',
      { includePrevious: true },
      'Grupo Escoteiro',
      1000,
    );

    expect(receipt.lines).toEqual([
      { label: '19h02' },
      { label: 'Cachorro', qty: 2, value: 'R$ 20,00' },
    ]);
    expect(receipt.total).toBe(20);
  });

  it('sem itens na rodada atual, lista só o histórico sem nenhum rótulo de seção', () => {
    const receipt = buildBatchReceipt(
      makeOrder(),
      'b-3',
      { includePrevious: true },
      'Grupo Escoteiro',
      1000,
    );

    expect(receipt.lines).toEqual([
      { label: '19h02' },
      { label: 'Cachorro', qty: 2, value: 'R$ 20,00' },
      { label: '20h15' },
      { label: 'Refri', qty: 1, value: 'R$ 5,00' },
    ]);
    expect(receipt.total).toBe(25);
  });

  it('lista os adicionais abaixo do item', () => {
    const order = makeOrder({
      items: [
        {
          name: 'Cachorro',
          salePrice: 10,
          costPrice: 4,
          qty: 1,
          batchId: 'b-1',
          addedAt: currentAt,
          customizations: [
            { groupName: 'Extras', name: 'Bacon', qty: 1, price: 2 },
          ],
          customizationTotal: 2,
        },
      ],
      total: 12,
    });

    const receipt = buildBatchReceipt(
      order,
      'b-1',
      { includePrevious: false },
      'Grupo Escoteiro',
      1000,
    );

    expect(receipt.lines).toEqual([
      { label: '20h15' },
      { label: 'Cachorro', qty: 1, value: 'R$ 12,00' },
      { label: '  + Bacon' },
    ]);
  });
});
