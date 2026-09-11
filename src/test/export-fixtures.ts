import type { Order } from '../domain/order/order.entity';
import type { Product } from '../domain/product/product.entity';
import {
  pendingOrders,
  productRanking,
  salesByMethod,
  summarizeSales,
} from '../domain/order/order.report';
import type { ReportExportData } from '../domain/export/report-export.entity';

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    uid: 'tab-1',
    businessTypeId: 'scout',
    sessionUid: 's-1',
    items: [
      {
        name: 'Cachorro-quente',
        salePrice: 10,
        costPrice: 4,
        qty: 2,
        batchId: 'b-1',
        addedAt: new Date(2026, 8, 9, 19, 2).getTime(),
      },
    ],
    total: 20,
    paymentMethod: 'pix',
    customerName: 'Maju',
    customerPhone: '',
    ticket: '042',
    stage: 'aceito',
    status: 'paid',
    createdAt: new Date(2026, 8, 9, 19, 2).getTime(),
    updatedAt: 1,
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    uid: 'p-1',
    name: 'Cachorro-quente',
    category: 'Lanches',
    costPrice: 4,
    salePrice: 10,
    stock: 12,
    tracksStock: true,
    active: true,
    customizationGroupIds: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

export function makeExportData(
  overrides: Partial<ReportExportData> = {},
): ReportExportData {
  const orders = overrides.orders ?? [makeOrder()];
  return {
    businessName: 'Grupo Escoteiro',
    day: '09/09/2026',
    report: {
      summary: summarizeSales(orders),
      byMethod: salesByMethod(orders),
      products: productRanking(orders),
      pending: pendingOrders(orders),
    },
    orders,
    stock: [makeProduct()],
    generatedAt: new Date(2026, 8, 9, 21, 30).getTime(),
    ...overrides,
  };
}
