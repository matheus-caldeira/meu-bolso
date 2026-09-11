export interface ReceiptLine {
  label: string;
  value?: string;
  qty?: number;
  emphasis?: boolean;
  kind?: 'divider' | 'blank';
}

export interface Receipt {
  title: string;
  businessName: string;
  ticket?: string;
  customerName?: string;
  customerDetails?: string;
  lines: ReceiptLine[];
  total?: number;
  footer?: string;
  printedAt: number;
}
