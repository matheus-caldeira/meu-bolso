import type { BackupEntity } from '../../domain/backup/backup.repository';

export const BACKUP_ENTITY_LABELS: Record<BackupEntity, string> = {
  products: 'Produtos',
  orders: 'Pedidos',
  sessions: 'Sessões',
  cashMovements: 'Movimentações',
  financeMembers: 'Membros da família',
  financeCategories: 'Categorias financeiras',
  financeEntries: 'Lançamentos',
  financeBudgetItems: 'Itens de orçamento',
  financeFormulas: 'Fórmulas',
  financeRecurrences: 'Recorrências',
  financeInstallmentPlans: 'Parcelamentos',
  financeClosings: 'Fechamentos',
  financePaymentMethods: 'Meios de pagamento',
  financeCardInvoices: 'Faturas de cartão',
  customers: 'Clientes',
  customizationGroups: 'Grupos de adicionais',
  customizationItems: 'Itens de adicionais',
  config: 'Configuração',
};
