import type { Order } from '../order/order.entity';
import type { Product } from '../product/product.entity';
import { formatDateTime, formatTime } from '../shared/format';
import { paymentMethodLabel } from './payment-labels';
import type { ReportExportData, ReportSectionId } from './report-export.entity';
import type { CellValue, SheetData, Workbook } from './spreadsheet.entity';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberta',
  pending: 'Pendente',
  paid: 'Paga',
  cancelled: 'Cancelada',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function summarySheet(data: ReportExportData): SheetData {
  const { summary, byMethod } = data.report;
  const rows: CellValue[][] = [
    ['Negócio', data.businessName],
    ['Dia', data.day],
    ['Gerado em', formatDateTime(data.generatedAt)],
    [],
    ['Indicador', 'Valor'],
    ['Total de vendas', summary.totalSales],
    ['Custo', summary.totalCost],
    ['Lucro', summary.profit],
    ['Margem (%)', Number(summary.margin.toFixed(1))],
    ['Comandas pagas', summary.paidCount],
    [],
    ['Forma de pagamento', 'Total'],
    ...Object.entries(byMethod).map(([method, total]): CellValue[] => [
      paymentMethodLabel(method),
      total,
    ]),
    [],
    ['Produto', 'Quantidade', 'Total', 'Custo', 'Lucro'],
    ...data.report.products.map((product): CellValue[] => [
      product.name,
      product.qty,
      product.total,
      product.cost,
      product.total - product.cost,
    ]),
  ];
  return { name: 'Resumo', rows };
}

function orderItemRows(order: Order): CellValue[][] {
  return order.items.map((item): CellValue[] => [
    order.ticket,
    order.customerName,
    statusLabel(order.status),
    paymentMethodLabel(order.paymentMethod ?? 'outros'),
    formatTime(order.createdAt),
    item.name,
    item.qty,
    item.salePrice + (item.customizationTotal ?? 0),
    (item.salePrice + (item.customizationTotal ?? 0)) * item.qty,
    item.costPrice * item.qty,
    (item.customizations ?? []).map((option) => option.name).join(', '),
    item.observation ?? '',
  ]);
}

function salesSheet(data: ReportExportData): SheetData {
  const rows: CellValue[][] = [
    [
      'Comanda',
      'Cliente',
      'Situação',
      'Pagamento',
      'Hora',
      'Produto',
      'Quantidade',
      'Preço unitário',
      'Total do item',
      'Custo do item',
      'Adicionais',
      'Observação',
    ],
    ...data.orders.flatMap(orderItemRows),
  ];
  return { name: 'Vendas', rows };
}

function stockRow(product: Product): CellValue[] {
  return [
    product.name,
    product.category,
    product.stock,
    product.costPrice,
    product.salePrice,
    product.stock * product.costPrice,
  ];
}

function stockSheet(data: ReportExportData): SheetData {
  const rows: CellValue[][] = [
    [
      'Produto',
      'Categoria',
      'Estoque',
      'Custo unitário',
      'Preço de venda',
      'Custo em estoque',
    ],
    ...data.stock.map(stockRow),
  ];
  return { name: 'Estoque', rows };
}

function pendingSheet(data: ReportExportData): SheetData {
  const rows: CellValue[][] = [
    ['Comanda', 'Cliente', 'Situação', 'Produto', 'Quantidade', 'Total'],
    ...data.report.pending.flatMap((order) =>
      order.items.map((item): CellValue[] => [
        order.ticket,
        order.customerName,
        statusLabel(order.status),
        item.name,
        item.qty,
        (item.salePrice + (item.customizationTotal ?? 0)) * item.qty,
      ]),
    ),
    [],
    [
      'Total pendente',
      '',
      '',
      '',
      '',
      data.report.pending.reduce((sum, order) => sum + order.total, 0),
    ],
  ];
  return { name: 'Comandas pendentes', rows };
}

const SHEET_BUILDERS: Record<
  ReportSectionId,
  (data: ReportExportData) => SheetData
> = {
  summary: summarySheet,
  sales: salesSheet,
  stock: stockSheet,
  pending: pendingSheet,
};

export function buildReportWorkbook(
  data: ReportExportData,
  sections: ReportSectionId[],
): Workbook {
  return {
    sheets: sections.map((section) => SHEET_BUILDERS[section](data)),
  };
}
