import type { Order } from '../order/order.entity';
import type { Product } from '../product/product.entity';
import type { SessionReport } from '../../application/report/report.usecases';

export type ReportSectionId = 'summary' | 'sales' | 'stock' | 'pending';

export interface ReportExportData {
  businessName: string;
  day: string;
  report: SessionReport;
  orders: Order[];
  stock: Product[];
  generatedAt: number;
}
