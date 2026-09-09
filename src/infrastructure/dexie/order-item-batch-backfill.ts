interface OrderItemLike {
  batchId?: string;
  addedAt?: number;
}

interface OrderLike {
  uid: string;
  createdAt: number;
  items?: OrderItemLike[];
}

export function backfillOrderItemBatch(order: Record<string, unknown>): void {
  const typedOrder = order as unknown as OrderLike;
  const batchId = typedOrder.uid + '#' + typedOrder.createdAt;
  for (const item of typedOrder.items ?? []) {
    if (item.batchId == null) item.batchId = batchId;
    if (item.addedAt == null) item.addedAt = typedOrder.createdAt;
  }
  order.items = typedOrder.items ?? [];
}
