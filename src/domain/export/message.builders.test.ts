import { describe, expect, it } from 'vitest';
import {
  makeExportData,
  makeOrder,
  makeProduct,
} from '../../test/export-fixtures';
import { buildReportMessage } from './message.builders';

describe('buildReportMessage', () => {
  it('abre com o nome do negócio e o dia', () => {
    const message = buildReportMessage(makeExportData(), ['summary']);

    expect(message.split('\n')[0]).toBe('*Grupo Escoteiro — 09/09/2026*');
  });

  it('usa só o dia quando o negócio não tem nome', () => {
    const message = buildReportMessage(makeExportData({ businessName: '' }), [
      'summary',
    ]);

    expect(message.split('\n')[0]).toBe('*09/09/2026*');
  });

  it('resume totais e formas de pagamento', () => {
    const message = buildReportMessage(makeExportData(), ['summary']);

    expect(message).toContain('*Resumo do dia*');
    expect(message).toContain('Vendas: R$ 20,00');
    expect(message).toContain('Custo: R$ 8,00');
    expect(message).toContain('Lucro: R$ 12,00');
    expect(message).toContain('Margem: 60,0%');
    expect(message).toContain('Comandas pagas: 1');
    expect(message).toContain('*Pagamentos*');
    expect(message).toContain('PIX: R$ 20,00');
  });

  it('omite a seção de pagamentos quando não houve venda paga', () => {
    const message = buildReportMessage(
      makeExportData({ orders: [makeOrder({ status: 'open' })] }),
      ['summary'],
    );

    expect(message).not.toContain('*Pagamentos*');
    expect(message).toContain('Vendas: R$ 0,00');
  });

  it('lista os produtos vendidos com quantidade', () => {
    const message = buildReportMessage(makeExportData(), ['sales']);

    expect(message).toContain('*Produtos vendidos*');
    expect(message).toContain('2x Cachorro-quente: R$ 20,00');
  });

  it('omite os produtos quando nada foi vendido', () => {
    const message = buildReportMessage(
      makeExportData({ orders: [makeOrder({ status: 'open' })] }),
      ['sales'],
    );

    expect(message).not.toContain('*Produtos vendidos*');
  });

  it('detalha as comandas pendentes com seus itens e o total', () => {
    const message = buildReportMessage(
      makeExportData({
        orders: [makeOrder({ status: 'pending', ticket: '007' })],
      }),
      ['pending'],
    );

    expect(message).toContain('*Comandas pendentes*');
    expect(message).toContain('#007 Maju: R$ 20,00');
    expect(message).toContain('  • 2x Cachorro-quente');
    expect(message).toContain('Total pendente: R$ 20,00');
  });

  it('identifica a comanda sem cliente', () => {
    const message = buildReportMessage(
      makeExportData({
        orders: [makeOrder({ status: 'pending', customerName: '' })],
      }),
      ['pending'],
    );

    expect(message).toContain('#042 sem cliente: R$ 20,00');
  });

  it('avisa quando não há comanda pendente', () => {
    const message = buildReportMessage(makeExportData(), ['pending']);

    expect(message).toContain('Nenhuma comanda pendente.');
  });

  it('lista o estoque de cada produto', () => {
    const message = buildReportMessage(
      makeExportData({ stock: [makeProduct({ stock: 7 })] }),
      ['stock'],
    );

    expect(message).toContain('*Estoque*');
    expect(message).toContain('Cachorro-quente: 7');
  });

  it('omite o estoque quando não há produto controlado', () => {
    const message = buildReportMessage(makeExportData({ stock: [] }), [
      'stock',
    ]);

    expect(message).not.toContain('*Estoque*');
  });

  it('junta as seções pedidas separadas por linha em branco', () => {
    const message = buildReportMessage(makeExportData(), ['summary', 'stock']);

    expect(message).toContain('\n\n*Resumo do dia*');
    expect(message).toContain('\n\n*Estoque*');
  });
});
