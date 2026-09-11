import { describe, expect, it } from 'vitest';
import {
  makeExportData,
  makeOrder,
  makeProduct,
} from '../../test/export-fixtures';
import { buildReportWorkbook } from './spreadsheet.builders';

describe('buildReportWorkbook', () => {
  it('cria uma aba para cada relatório selecionado, na ordem pedida', () => {
    const workbook = buildReportWorkbook(makeExportData(), [
      'summary',
      'sales',
      'stock',
      'pending',
    ]);

    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual([
      'Resumo',
      'Vendas',
      'Estoque',
      'Comandas pendentes',
    ]);
  });

  it('exporta só as abas selecionadas', () => {
    const workbook = buildReportWorkbook(makeExportData(), ['stock']);

    expect(workbook.sheets).toHaveLength(1);
    expect(workbook.sheets[0].name).toBe('Estoque');
  });

  it('coloca cabeçalho, totais e formas de pagamento no resumo', () => {
    const workbook = buildReportWorkbook(makeExportData(), ['summary']);
    const rows = workbook.sheets[0].rows;

    expect(rows[0]).toEqual(['Negócio', 'Grupo Escoteiro']);
    expect(rows[1]).toEqual(['Dia', '09/09/2026']);
    expect(rows[2][0]).toBe('Gerado em');
    expect(rows).toContainEqual(['Total de vendas', 20]);
    expect(rows).toContainEqual(['Custo', 8]);
    expect(rows).toContainEqual(['Lucro', 12]);
    expect(rows).toContainEqual(['Margem (%)', 60]);
    expect(rows).toContainEqual(['Comandas pagas', 1]);
    expect(rows).toContainEqual(['PIX', 20]);
    expect(rows).toContainEqual(['Cachorro-quente', 2, 20, 8, 12]);
  });

  it('detalha cada item vendido na aba de vendas', () => {
    const workbook = buildReportWorkbook(
      makeExportData({
        orders: [
          makeOrder({
            items: [
              {
                name: 'Cachorro-quente',
                salePrice: 10,
                costPrice: 4,
                qty: 2,
                customizationTotal: 2,
                customizations: [
                  { groupName: 'Extras', name: 'Bacon', qty: 1, price: 2 },
                ],
                observation: 'sem cebola',
                batchId: 'b-1',
                addedAt: 1,
              },
            ],
          }),
        ],
      }),
      ['sales'],
    );
    const rows = workbook.sheets[0].rows;

    expect(rows[0][0]).toBe('Comanda');
    expect(rows[1][0]).toBe('042');
    expect(rows[1][1]).toBe('Maju');
    expect(rows[1][2]).toBe('Paga');
    expect(rows[1][3]).toBe('PIX');
    expect(rows[1][5]).toBe('Cachorro-quente');
    expect(rows[1][6]).toBe(2);
    expect(rows[1][7]).toBe(12);
    expect(rows[1][8]).toBe(24);
    expect(rows[1][9]).toBe(8);
    expect(rows[1][10]).toBe('Bacon');
    expect(rows[1][11]).toBe('sem cebola');
  });

  it('usa Outros quando a venda não tem forma de pagamento e trata itens sem extras', () => {
    const workbook = buildReportWorkbook(
      makeExportData({
        orders: [makeOrder({ paymentMethod: null, status: 'open' })],
      }),
      ['sales'],
    );
    const row = workbook.sheets[0].rows[1];

    expect(row[2]).toBe('Aberta');
    expect(row[3]).toBe('Outros');
    expect(row[10]).toBe('');
    expect(row[11]).toBe('');
  });

  it('mantém o rótulo bruto de um status desconhecido', () => {
    const workbook = buildReportWorkbook(
      makeExportData({
        orders: [
          makeOrder({ status: 'entregue' as never, paymentMethod: 'boleto' }),
        ],
      }),
      ['sales'],
    );

    expect(workbook.sheets[0].rows[1][2]).toBe('entregue');
    expect(workbook.sheets[0].rows[1][3]).toBe('boleto');
  });

  it('lista o estoque com custo acumulado', () => {
    const workbook = buildReportWorkbook(
      makeExportData({ stock: [makeProduct({ stock: 3 })] }),
      ['stock'],
    );

    expect(workbook.sheets[0].rows[0][0]).toBe('Produto');
    expect(workbook.sheets[0].rows[1]).toEqual([
      'Cachorro-quente',
      'Lanches',
      3,
      4,
      10,
      12,
    ]);
  });

  it('detalha as comandas pendentes com o total ao final', () => {
    const workbook = buildReportWorkbook(
      makeExportData({
        orders: [
          makeOrder({ status: 'pending', ticket: '007', total: 20 }),
          makeOrder({ status: 'cancelled', ticket: '008' }),
        ],
      }),
      ['pending'],
    );
    const rows = workbook.sheets[0].rows;

    expect(rows[1]).toEqual([
      '007',
      'Maju',
      'Pendente',
      'Cachorro-quente',
      2,
      20,
    ]);
    expect(rows[rows.length - 1]).toEqual([
      'Total pendente',
      '',
      '',
      '',
      '',
      20,
    ]);
  });
});
