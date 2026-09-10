import type { Order } from '../order/order.entity';
import type { Product } from '../product/product.entity';
import { formatMoney } from '../shared/format';
import { paymentMethodLabel } from './payment-labels';
import type { ReportExportData, ReportSectionId } from './report-export.entity';

function labeledLine(label: string, value: string): string {
  return label + ': ' + value;
}

function heading(title: string): string {
  return '*' + title + '*';
}

function joinSections(sections: string[][]): string {
  return sections
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join('\n'))
    .join('\n\n');
}

function summaryLines(data: ReportExportData): string[] {
  const { summary, byMethod } = data.report;
  const methods = Object.entries(byMethod);
  return [
    heading('Resumo do dia'),
    labeledLine('Vendas', formatMoney(summary.totalSales)),
    labeledLine('Custo', formatMoney(summary.totalCost)),
    labeledLine('Lucro', formatMoney(summary.profit)),
    labeledLine('Margem', summary.margin.toFixed(1).replace('.', ',') + '%'),
    labeledLine('Comandas pagas', String(summary.paidCount)),
    ...(methods.length > 0
      ? [
          '',
          heading('Pagamentos'),
          ...methods.map(([method, total]) =>
            labeledLine(paymentMethodLabel(method), formatMoney(total)),
          ),
        ]
      : []),
  ];
}

function productLines(data: ReportExportData): string[] {
  const { products } = data.report;
  if (products.length === 0) return [];
  return [
    heading('Produtos vendidos'),
    ...products.map((product) =>
      labeledLine(
        product.qty + 'x ' + product.name,
        formatMoney(product.total),
      ),
    ),
  ];
}

function pendingOrderLines(order: Order): string[] {
  const name = order.customerName || 'sem cliente';
  return [
    labeledLine('#' + order.ticket + ' ' + name, formatMoney(order.total)),
    ...order.items.map((item) => '  • ' + item.qty + 'x ' + item.name),
  ];
}

function pendingLines(data: ReportExportData): string[] {
  const { pending } = data.report;
  if (pending.length === 0) {
    return [heading('Comandas pendentes'), 'Nenhuma comanda pendente.'];
  }
  const total = pending.reduce((sum, order) => sum + order.total, 0);
  return [
    heading('Comandas pendentes'),
    ...pending.flatMap(pendingOrderLines),
    '',
    labeledLine('Total pendente', formatMoney(total)),
  ];
}

function stockLine(product: Product): string {
  return labeledLine(product.name, String(product.stock));
}

function stockLines(data: ReportExportData): string[] {
  if (data.stock.length === 0) return [];
  return [heading('Estoque'), ...data.stock.map(stockLine)];
}

const SECTION_BUILDERS: Record<
  ReportSectionId,
  (data: ReportExportData) => string[]
> = {
  summary: summaryLines,
  sales: productLines,
  stock: stockLines,
  pending: pendingLines,
};

export function buildReportMessage(
  data: ReportExportData,
  sections: ReportSectionId[],
): string {
  const header = [data.businessName, data.day].filter(Boolean).join(' — ');
  const body = sections.map((section) => SECTION_BUILDERS[section](data));
  return joinSections([[heading(header)], ...body]);
}
