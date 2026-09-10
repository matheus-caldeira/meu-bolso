export type CellValue = string | number;

export interface SheetData {
  name: string;
  rows: CellValue[][];
}

export interface Workbook {
  sheets: SheetData[];
}
