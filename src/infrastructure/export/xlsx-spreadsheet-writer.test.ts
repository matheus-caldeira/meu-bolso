import { describe, expect, it } from 'vitest';
import * as XLSX from '../../vendor/xlsx/xlsx.mjs';
import { xlsxSpreadsheetWriter } from './xlsx-spreadsheet-writer';

describe('xlsxSpreadsheetWriter', () => {
  it('gera um arquivo xlsx com uma aba por relatório e os dados no lugar', () => {
    const bytes = xlsxSpreadsheetWriter.write({
      sheets: [
        {
          name: 'Resumo',
          rows: [
            ['Indicador', 'Valor'],
            ['Vendas', 20],
          ],
        },
        {
          name: 'Estoque',
          rows: [
            ['Produto', 'Estoque'],
            ['Refri', 5],
          ],
        },
      ],
    });

    const book = XLSX.read(bytes, { type: 'array' });

    expect(book.SheetNames).toEqual(['Resumo', 'Estoque']);
    expect(XLSX.utils.sheet_to_json(book.Sheets.Resumo, { header: 1 })).toEqual(
      [
        ['Indicador', 'Valor'],
        ['Vendas', 20],
      ],
    );
    expect(
      XLSX.utils.sheet_to_json(book.Sheets.Estoque, { header: 1 }),
    ).toEqual([
      ['Produto', 'Estoque'],
      ['Refri', 5],
    ]);
  });

  it('encurta nomes de aba acima do limite do formato', () => {
    const bytes = xlsxSpreadsheetWriter.write({
      sheets: [
        {
          name: 'Comandas pendentes com nome muito longo',
          rows: [['Comanda']],
        },
      ],
    });

    const book = XLSX.read(bytes, { type: 'array' });

    expect(book.SheetNames[0]).toBe('Comandas pendentes com nome mui');
  });
});
