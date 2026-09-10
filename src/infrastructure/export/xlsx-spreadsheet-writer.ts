import type { Workbook } from '../../domain/export/spreadsheet.entity';
import type { SpreadsheetWriter } from '../../domain/export/spreadsheet.writer';

const SHEET_NAME_LIMIT = 31;

export const xlsxSpreadsheetWriter: SpreadsheetWriter = {
  async write(workbook: Workbook): Promise<Uint8Array<ArrayBuffer>> {
    const XLSX = await import('../../vendor/xlsx/xlsx.mjs');
    const book = XLSX.utils.book_new();
    for (const sheet of workbook.sheets) {
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet(sheet.rows),
        sheet.name.slice(0, SHEET_NAME_LIMIT),
      );
    }
    return new Uint8Array(
      XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
    );
  },
};
