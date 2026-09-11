import type { Order, OrderItem } from '../order/order.entity';
import type { OrderBatch } from '../order/order.rules';
import { groupItemsByBatch } from '../order/order.rules';
import type { Product } from '../product/product.entity';
import type { SessionReport } from '../../application/report/report.usecases';
import { formatBatchTime, formatMoney } from '../shared/format';
import type { Receipt, ReceiptLine } from './receipt.entity';

function itemLines(items: OrderItem[]): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  for (const item of items) {
    const customizationTotal = item.customizationTotal ?? 0;
    lines.push({
      label: item.name,
      qty: item.qty,
      value: formatMoney((item.salePrice + customizationTotal) * item.qty),
    });
    for (const customization of item.customizations ?? []) {
      lines.push({ label: '  + ' + customization.name });
    }
  }
  return lines;
}

function joinCustomerDetails(values: string[] | undefined): string | undefined {
  const filled = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return filled.length > 0 ? filled.join(', ') : undefined;
}

export function buildOrderReceipt(
  order: Order,
  businessName: string,
  printedAt: number,
  customerDetails?: string[],
): Receipt {
  return {
    title: 'Comanda',
    businessName,
    ticket: order.ticket,
    customerName: order.customerName,
    customerDetails: joinCustomerDetails(customerDetails),
    lines: itemLines(order.items),
    total: order.total,
    footer: 'Pagar no caixa',
    printedAt,
  };
}

function batchLines(batches: OrderBatch[]): ReceiptLine[] {
  return batches.flatMap((batch) => [
    { label: formatBatchTime(batch.addedAt) },
    ...itemLines(batch.items),
  ]);
}

function receiptHeading(order: Order): string {
  const label = 'COMANDA ' + order.ticket;
  return order.customerName ? label + ' - ' + order.customerName : label;
}

export interface BatchReceiptOptions {
  includePrevious: boolean;
}

export function buildBatchReceipt(
  order: Order,
  batchId: string,
  options: BatchReceiptOptions,
  businessName: string,
  printedAt: number,
  customerDetails?: string[],
): Receipt {
  const batches = groupItemsByBatch(order.items);
  const current = batches.filter((batch) => batch.batchId === batchId);
  const previous = batches.filter((batch) => batch.batchId !== batchId);
  const showSections =
    options.includePrevious && current.length > 0 && previous.length > 0;

  const lines: ReceiptLine[] = showSections
    ? [
        { label: 'NOVOS PRODUTOS', emphasis: true },
        ...batchLines(current),
        { label: 'HISTORICO', emphasis: true },
        ...batchLines(previous),
      ]
    : batchLines(options.includePrevious ? [...current, ...previous] : current);

  return {
    title: 'Comanda',
    businessName,
    ticket: receiptHeading(order),
    customerDetails: joinCustomerDetails(customerDetails),
    lines,
    total: order.total,
    printedAt,
  };
}

export function buildStockReceipt(
  products: Product[],
  businessName: string,
  printedAt: number,
): Receipt {
  return {
    title: 'Estoque atual',
    businessName,
    lines: products.map((product) => ({
      label: product.name,
      value: String(product.stock),
    })),
    printedAt,
  };
}

export function buildPendingTabsReceipt(
  orders: Order[],
  businessName: string,
  printedAt: number,
): Receipt {
  const pending = orders.filter(
    (order) => order.status === 'open' || order.status === 'pending',
  );
  return {
    title: 'Comandas pendentes',
    businessName,
    lines: pending.map((order) => ({
      label: order.ticket + ' — ' + order.customerName,
      value: formatMoney(order.total),
    })),
    total: pending.reduce((sum, order) => sum + order.total, 0),
    printedAt,
  };
}

export function buildDayReportReceipt(
  report: SessionReport,
  businessName: string,
  printedAt: number,
): Receipt {
  const { summary, byMethod, products } = report;
  const lines: ReceiptLine[] = [
    { label: 'Total de vendas', value: formatMoney(summary.totalSales) },
    { label: 'Custo', value: formatMoney(summary.totalCost) },
    { label: 'Lucro', value: formatMoney(summary.profit), emphasis: true },
    { label: 'Margem', value: summary.margin.toFixed(1) + '%' },
    { label: 'Comandas pagas', value: String(summary.paidCount) },
    ...Object.entries(byMethod).map(([method, total]) => ({
      label: method,
      value: formatMoney(total),
    })),
    ...products.map((product) => ({
      label: product.name,
      qty: product.qty,
      value: formatMoney(product.total),
    })),
  ];

  return {
    title: 'Fechamento do dia',
    businessName,
    lines,
    total: summary.totalSales,
    printedAt,
  };
}
