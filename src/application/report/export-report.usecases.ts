import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { OrderRepository } from '../../domain/order/order.repository';
import type { ProductRepository } from '../../domain/product/product.repository';
import { EmptyReportSelectionError } from '../../domain/errors';
import { buildReportMessage } from '../../domain/export/message.builders';
import { buildReportWorkbook } from '../../domain/export/spreadsheet.builders';
import type {
  ReportExportData,
  ReportSectionId,
} from '../../domain/export/report-export.entity';
import type { SpreadsheetWriter } from '../../domain/export/spreadsheet.writer';
import type { ExportFile } from '../../domain/export/export.transport';
import {
  pendingOrders,
  productRanking,
  salesByMethod,
  summarizeSales,
} from '../../domain/order/order.report';
import { trackedStock } from './stock.usecases';

export interface ExportReportInput {
  sessionUid: string;
  businessName: string;
  day: string;
  sections: ReportSectionId[];
  generatedAt: number;
}

function fileName(day: string, generatedAt: number): string {
  const slug = day.replace(/\D+/g, '-');
  return `relatorio-${slug || String(generatedAt)}.xlsx`;
}

function makeLoadExportData(
  orders: OrderRepository,
  products: ProductRepository,
) {
  return async (
    input: ExportReportInput,
  ): Promise<Either<AppError, ReportExportData>> => {
    const sessionOrders = await orders.listBySession(input.sessionUid);
    if (isLeft(sessionOrders)) return sessionOrders;
    const stock = await products.list();
    if (isLeft(stock)) return stock;

    const list = sessionOrders.right;
    return right({
      businessName: input.businessName,
      day: input.day,
      report: {
        summary: summarizeSales(list),
        byMethod: salesByMethod(list),
        products: productRanking(list),
        pending: pendingOrders(list),
      },
      orders: list,
      stock: trackedStock(stock.right),
      generatedAt: input.generatedAt,
    });
  };
}

export function makeExportReportSpreadsheet(
  orders: OrderRepository,
  products: ProductRepository,
  writer: SpreadsheetWriter,
) {
  const loadData = makeLoadExportData(orders, products);
  return async (
    input: ExportReportInput,
  ): Promise<Either<AppError, ExportFile>> => {
    if (input.sections.length === 0) {
      return left(new EmptyReportSelectionError());
    }
    const data = await loadData(input);
    if (isLeft(data)) return data;
    return right({
      name: fileName(input.day, input.generatedAt),
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: writer.write(buildReportWorkbook(data.right, input.sections)),
    });
  };
}

export function makeBuildReportMessage(
  orders: OrderRepository,
  products: ProductRepository,
) {
  const loadData = makeLoadExportData(orders, products);
  return async (
    input: ExportReportInput,
  ): Promise<Either<AppError, string>> => {
    if (input.sections.length === 0) {
      return left(new EmptyReportSelectionError());
    }
    const data = await loadData(input);
    if (isLeft(data)) return data;
    return right(buildReportMessage(data.right, input.sections));
  };
}
