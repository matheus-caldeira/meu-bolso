import type { Workbook } from './spreadsheet.entity';

export interface SpreadsheetWriter {
  write(workbook: Workbook): Promise<Uint8Array<ArrayBuffer>>;
}
