import type { BackupEntity } from './backup.repository';

const ENTITY_FIELDS: Record<BackupEntity, ReadonlySet<string>> = {
  products: new Set([
    'uid',
    'name',
    'category',
    'costPrice',
    'salePrice',
    'stock',
    'tracksStock',
    'active',
    'customizationGroupIds',
    'createdAt',
    'updatedAt',
  ]),
  orders: new Set([
    'uid',
    'businessTypeId',
    'sessionUid',
    'customerUid',
    'items',
    'total',
    'paymentMethod',
    'customerName',
    'customerPhone',
    'ticket',
    'stage',
    'status',
    'createdAt',
    'updatedAt',
  ]),
  sessions: new Set([
    'uid',
    'openedAt',
    'closedAt',
    'cashInitial',
    'cashFinal',
    'notes',
  ]),
  cashMovements: new Set([
    'uid',
    'sessionUid',
    'type',
    'amount',
    'reason',
    'createdAt',
  ]),
  customers: new Set([
    'uid',
    'name',
    'phone',
    'addresses',
    'extra',
    'createdAt',
    'updatedAt',
  ]),
  customizationGroups: new Set([
    'uid',
    'name',
    'required',
    'minQty',
    'maxQty',
    'chargeAfter',
  ]),
  customizationItems: new Set([
    'uid',
    'groupUid',
    'name',
    'price',
    'maxQty',
    'chargeAfter',
    'active',
  ]),
  config: new Set([
    'name',
    'document',
    'phone',
    'address',
    'ticketCounter',
    'ticketLimit',
    'ticketAutoReset',
    'statusControlEnabled',
    'businessTypeId',
    'enabledModules',
    'extra',
    'printerDriver',
    'printerPaperWidth',
    'printerCodepage',
    'printerAutoPrintOnClose',
    'printerBatchIncludesPrevious',
    'layoutMode',
    'lastBackupAt',
    'lastBackupPromptAt',
  ]),
  financeMembers: new Set(['uid', 'name', 'archived', 'createdAt']),
  financeCategories: new Set(['uid', 'name', 'kind', 'archived', 'createdAt']),
  financeEntries: new Set([
    'uid',
    'description',
    'amount',
    'kind',
    'categoryUid',
    'memberUids',
    'date',
    'month',
    'status',
    'source',
    'sourceUid',
    'installmentNumber',
    'sourceEntryUids',
    'formulaBaseMonth',
    'paymentMethodUid',
    'invoiceMonth',
    'invoiceUid',
    'createdAt',
    'updatedAt',
  ]),
  financeBudgetItems: new Set([
    'uid',
    'categoryUid',
    'amount',
    'month',
    'createdAt',
    'updatedAt',
  ]),
  financeFormulas: new Set([
    'uid',
    'name',
    'percent',
    'filter',
    'outputKind',
    'outputCategoryUid',
    'outputDescription',
    'createdAt',
    'updatedAt',
  ]),
  financeRecurrences: new Set([
    'uid',
    'description',
    'amount',
    'kind',
    'categoryUid',
    'memberUids',
    'paymentMethodUid',
    'dayOfMonth',
    'startMonth',
    'endMonth',
    'active',
    'createdAt',
    'updatedAt',
  ]),
  financeInstallmentPlans: new Set([
    'uid',
    'description',
    'totalAmount',
    'installmentCount',
    'firstMonth',
    'dayOfMonth',
    'kind',
    'categoryUid',
    'memberUids',
    'paymentMethodUid',
    'createdAt',
  ]),
  financeClosings: new Set([
    'uid',
    'month',
    'closedAt',
    'plannedIncome',
    'plannedExpense',
    'plannedBalance',
    'actualIncome',
    'actualExpense',
    'actualBalance',
    'categories',
  ]),
  financePaymentMethods: new Set([
    'uid',
    'name',
    'type',
    'closingDay',
    'dueDay',
    'archived',
    'createdAt',
  ]),
  financeCardInvoices: new Set([
    'uid',
    'paymentMethodUid',
    'month',
    'dueDate',
    'statedAmount',
    'status',
    'paidAt',
    'createdAt',
    'updatedAt',
  ]),
};

const ENTITY_KEY_FIELDS: Record<BackupEntity, ReadonlySet<string>> = {
  products: new Set(['category', 'salePrice', 'stock', 'tracksStock']),
  orders: new Set(['ticket', 'stage', 'customerPhone']),
  sessions: new Set(['openedAt', 'cashInitial', 'cashFinal']),
  cashMovements: new Set(['type', 'reason']),
  customers: new Set(['phone', 'addresses']),
  customizationGroups: new Set(['required', 'minQty', 'maxQty']),
  customizationItems: new Set(['groupUid', 'price']),
  config: new Set(['ticketCounter', 'ticketLimit', 'printerDriver']),
  financeMembers: new Set(['archived']),
  financeCategories: new Set(['kind']),
  financeEntries: new Set(['status', 'source']),
  financeBudgetItems: new Set(['categoryUid', 'month']),
  financeFormulas: new Set(['percent', 'outputKind', 'outputCategoryUid']),
  financeRecurrences: new Set(['dayOfMonth', 'startMonth', 'endMonth']),
  financeInstallmentPlans: new Set(['installmentCount', 'firstMonth']),
  financeClosings: new Set(['plannedIncome', 'plannedBalance', 'closedAt']),
  financePaymentMethods: new Set(['closingDay', 'dueDay']),
  financeCardInvoices: new Set(['statedAmount', 'dueDate', 'paidAt']),
};

const FILE_NAME_ENTITIES: BackupEntity[] = Object.keys(
  ENTITY_FIELDS,
) as BackupEntity[];

export function detectEntityByFileName(fileName: string): BackupEntity | null {
  const normalized = fileName
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/^pdv-/, '');
  const match = FILE_NAME_ENTITIES.find(
    (entity) => entity.toLowerCase() === normalized,
  );
  return match ?? null;
}

export function detectEntityByHeaders(headers: string[]): BackupEntity | null {
  if (headers.length === 0) return null;
  const columns = new Set(headers);

  const candidates = FILE_NAME_ENTITIES.filter((entity) => {
    const fields = ENTITY_FIELDS[entity];
    if (![...columns].every((column) => fields.has(column))) return false;
    const keyFields = ENTITY_KEY_FIELDS[entity];
    return [...keyFields].some((keyField) => columns.has(keyField));
  });

  return candidates.length === 1 ? candidates[0] : null;
}
