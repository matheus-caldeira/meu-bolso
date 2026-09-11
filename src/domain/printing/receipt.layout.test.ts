import { describe, expect, it } from 'vitest';
import type { Receipt } from './receipt.entity';
import { buildReceiptLayout } from './receipt.layout';

const receipt: Receipt = {
  title: 'Comanda',
  businessName: 'Grupo Escoteiro',
  ticket: '042',
  customerName: 'Maju (Lobinha)',
  lines: [{ label: 'Refri', qty: 1, value: 'R$ 5,00' }],
  total: 5,
  footer: 'Pagar no caixa',
  printedAt: 1000,
};

function textOf(receiptToBuild: Receipt, width: 58 | 80 = 80): string[] {
  return buildReceiptLayout(receiptToBuild, width).map((line) => line.text);
}

describe('buildReceiptLayout', () => {
  it('quebra a linha de identificação da comanda quando excede a largura do papel', () => {
    const wide: Receipt = {
      ...receipt,
      ticket: 'COMANDA 042 - Maria Eduarda Rodrigues',
      customerName: undefined,
    };

    const layout = buildReceiptLayout(wide, 58);
    const ticketLines = layout.filter(
      (line) => wide.ticket!.includes(line.text) || line.text === wide.ticket,
    );

    expect(ticketLines.length).toBeGreaterThan(1);
    expect(ticketLines.every((line) => line.text.length <= 32)).toBe(true);
    expect(ticketLines.every((line) => line.align === 'center')).toBe(true);
    expect(ticketLines.every((line) => line.bold)).toBe(true);
    expect(ticketLines.map((line) => line.text).join(' ')).toBe(wide.ticket);
  });

  it('não quebra a linha de identificação quando cabe em 80mm', () => {
    const wide: Receipt = {
      ...receipt,
      ticket: 'COMANDA 042 - Maria Eduarda Rodrigues',
      customerName: undefined,
    };

    expect(textOf(wide, 80)).toContain(wide.ticket);
  });

  it('mantém uma identificação curta em uma única linha, como hoje', () => {
    expect(textOf(receipt, 58)).toContain('042');
  });

  it('não trava nem perde conteúdo quando a identificação tem uma palavra maior que a largura', () => {
    const wide: Receipt = {
      ...receipt,
      ticket: 'A'.repeat(40) + ' Silva',
      customerName: undefined,
    };

    const lines = textOf(wide, 58);

    expect(lines).toContain('A'.repeat(40));
    expect(lines).toContain('Silva');
  });

  it('quebra o nome do negócio e o título quando excedem a largura, preservando bold', () => {
    const wide: Receipt = {
      ...receipt,
      businessName: 'Grupo Escoteiro Pioneiros do Vale Encantado',
      title: 'Comprovante de Retirada no Balcão da Cantina',
    };

    const layout = buildReceiptLayout(wide, 58);

    expect(layout.every((line) => line.text.length <= 32)).toBe(true);

    const businessLines = layout.slice(
      0,
      layout.findIndex((l) => l.bold === false),
    );
    expect(businessLines.length).toBeGreaterThan(1);
    expect(businessLines.every((line) => line.bold)).toBe(true);
    expect(businessLines.map((line) => line.text).join(' ')).toBe(
      wide.businessName,
    );
  });

  it('abre com o nome do negócio e o título centralizados', () => {
    const layout = buildReceiptLayout(receipt, 80);

    expect(layout[0]).toEqual({
      text: 'Grupo Escoteiro',
      align: 'center',
      bold: true,
    });
    expect(layout[1]).toEqual({
      text: 'Comanda',
      align: 'center',
      bold: false,
    });
  });

  it('inclui comanda e cliente quando presentes', () => {
    expect(textOf(receipt)).toContain('042');
    expect(textOf(receipt)).toContain('Maju (Lobinha)');
  });

  it('escreve os dados do cliente logo abaixo do nome', () => {
    const withDetails: Receipt = {
      ...receipt,
      customerDetails: 'Lobinho, Maria da Silva',
    };

    const layout = buildReceiptLayout(withDetails, 58);
    const index = layout.findIndex((line) => line.text === 'Maju (Lobinha)');

    expect(layout[index + 1]).toEqual({
      text: 'Lobinho, Maria da Silva',
      align: 'center',
      bold: false,
    });
  });

  it('mantém os dados do cliente em uma linha nas duas larguras quando cabem', () => {
    const withDetails: Receipt = {
      ...receipt,
      customerDetails: 'Lobinho, Maria da Silva',
    };

    expect(textOf(withDetails, 58)).toContain('Lobinho, Maria da Silva');
    expect(textOf(withDetails, 80)).toContain('Lobinho, Maria da Silva');
  });

  it('quebra os dados do cliente por palavra quando excedem a largura', () => {
    const withDetails: Receipt = {
      ...receipt,
      customerDetails: 'Pioneiro, Maria Aparecida da Silva Gonçalves',
    };

    const narrow = textOf(withDetails, 58);
    const wide = textOf(withDetails, 80);

    expect(narrow).toContain('Pioneiro, Maria Aparecida da');
    expect(narrow).toContain('Silva Gonçalves');
    expect(narrow.every((line) => line.length <= 32)).toBe(true);
    expect(wide).toContain('Pioneiro, Maria Aparecida da Silva Gonçalves');
  });

  it('não trunca uma palavra maior que a largura do papel', () => {
    const withDetails: Receipt = {
      ...receipt,
      customerDetails: 'A'.repeat(40) + ' Silva',
    };

    const lines = textOf(withDetails, 58);

    expect(lines).toContain('A'.repeat(40));
    expect(lines).toContain('Silva');
  });

  it('omite comanda, cliente, total e rodapé quando ausentes', () => {
    const minimal: Receipt = {
      title: 'Estoque atual',
      businessName: 'Grupo Escoteiro',
      lines: [{ label: 'Refri' }],
      printedAt: 1000,
    };

    const lines = textOf(minimal);

    expect(lines).toEqual(['Grupo Escoteiro', 'Estoque atual', 'Refri']);
  });

  it('prefixa a quantidade no item quando informada', () => {
    const lines = textOf(receipt);

    expect(lines.some((line) => line.startsWith('1x Refri'))).toBe(true);
  });

  it('alinha o valor na margem direita conforme a largura do papel', () => {
    const wide = textOf(receipt, 80).find((line) => line.includes('Refri'));
    const narrow = textOf(receipt, 58).find((line) => line.includes('Refri'));

    expect(wide).toHaveLength(48);
    expect(narrow).toHaveLength(32);
    expect(wide?.endsWith('R$ 5,00')).toBe(true);
    expect(narrow?.endsWith('R$ 5,00')).toBe(true);
  });

  it('mantém ao menos um espaço entre rótulo e valor quando não cabe', () => {
    const long: Receipt = {
      ...receipt,
      lines: [{ label: 'x'.repeat(60), value: 'R$ 5,00' }],
    };

    const line = textOf(long, 58).find((text) => text.includes('xxx'));

    expect(line).toBe('x'.repeat(60) + ' ' + 'R$ 5,00');
  });

  it('escreve o item sem preenchimento quando não há valor', () => {
    const noValue: Receipt = { ...receipt, lines: [{ label: 'Refri' }] };

    expect(textOf(noValue)).toContain('Refri');
  });

  it('emite o total em negrito, alinhado à direita', () => {
    const totalLine = buildReceiptLayout(receipt, 80).find((line) =>
      line.text.startsWith('Total'),
    );

    expect(totalLine).toEqual({
      text:
        'Total' +
        ' '.repeat(48 - 'Total'.length - 'R$ 5,00'.length) +
        'R$ 5,00',
      align: 'left',
      bold: true,
    });
  });

  it('inclui o total zerado, que é informação legítima', () => {
    const zero: Receipt = { ...receipt, total: 0 };

    expect(textOf(zero).some((line) => line.includes('R$ 0,00'))).toBe(true);
  });

  it('fecha com o rodapé centralizado', () => {
    const layout = buildReceiptLayout(receipt, 80);

    expect(layout[layout.length - 1]).toEqual({
      text: 'Pagar no caixa',
      align: 'center',
      bold: false,
    });
  });
});
