import { formatMoney } from '../shared/format';
import { CHARS_BY_PAPER_WIDTH, type PaperWidth } from './printer-driver';
import type { Receipt } from './receipt.entity';

export interface ReceiptLayoutLine {
  text: string;
  align: 'left' | 'center';
  bold: boolean;
}

function padLine(label: string, value: string, width: number): string {
  const spacing = Math.max(1, width - label.length - value.length);
  return label + ' '.repeat(spacing) + value;
}

function wrapText(text: string, width: number): string[] {
  const [first, ...rest] = text.split(' ');
  const lines = [first];
  for (const word of rest) {
    const candidate = lines[lines.length - 1] + ' ' + word;
    if (candidate.length <= width) {
      lines[lines.length - 1] = candidate;
      continue;
    }
    lines.push(word);
  }
  return lines;
}

function pushCentered(
  layout: ReceiptLayoutLine[],
  text: string,
  width: number,
  bold: boolean,
): void {
  for (const wrapped of wrapText(text, width)) {
    layout.push({ text: wrapped, align: 'center', bold });
  }
}

export function buildReceiptLayout(
  receipt: Receipt,
  paperWidth: PaperWidth,
): ReceiptLayoutLine[] {
  const width = CHARS_BY_PAPER_WIDTH[paperWidth];
  const layout: ReceiptLayoutLine[] = [];

  pushCentered(layout, receipt.businessName, width, true);
  pushCentered(layout, receipt.title, width, false);

  if (receipt.ticket) {
    pushCentered(layout, receipt.ticket, width, true);
  }

  if (receipt.customerName) {
    pushCentered(layout, receipt.customerName, width, false);
  }

  if (receipt.customerDetails) {
    pushCentered(layout, receipt.customerDetails, width, false);
  }

  for (const line of receipt.lines) {
    if (line.kind === 'blank') {
      layout.push({ text: '', align: 'left', bold: false });
      continue;
    }
    if (line.kind === 'divider') {
      layout.push({ text: '-'.repeat(width), align: 'left', bold: false });
      continue;
    }
    const label = line.qty ? `${line.qty}x ${line.label}` : line.label;
    layout.push({
      text: line.value ? padLine(label, line.value, width) : label,
      align: 'left',
      bold: line.emphasis ?? false,
    });
  }

  if (receipt.total !== undefined) {
    layout.push({
      text: padLine('Total', formatMoney(receipt.total), width),
      align: 'left',
      bold: true,
    });
  }

  if (receipt.footer) {
    layout.push({ text: receipt.footer, align: 'center', bold: false });
  }

  return layout;
}
