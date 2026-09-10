import * as XLSX from '../../vendor/xlsx/xlsx.mjs';
import type { Workbook } from '../../domain/export/spreadsheet.entity';
import type { SpreadsheetWriter } from '../../domain/export/spreadsheet.writer';

const SHEET_NAME_LIMIT = 31;

export const xlsxSpreadsheetWriter: SpreadsheetWriter = {
  write(workbook: Workbook): Uint8Array<ArrayBuffer> {
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
