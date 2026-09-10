import type { Workbook } from './spreadsheet.entity';

export interface SpreadsheetWriter {
  write(workbook: Workbook): Uint8Array<ArrayBuffer>;
}
