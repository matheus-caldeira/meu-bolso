import {
  isLeft,
  left,
  right,
  type Either,
} from '../../../domain/shared/either';
import type {
  BackupEntity,
  BackupFormat,
  BackupRepository,
  BackupSnapshot,
  ImportAllResult,
  ImportMode,
} from '../../../domain/backup/backup.repository';
import {
  detectEntityByFileName,
  detectEntityByHeaders,
} from '../../../domain/backup/entity-detection';
import type { InfrastructureError } from '../../errors';
import {
  CONFIG_ID,
  TICKET_DEFAULTS,
  type PDVDatabase,
} from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';
import { backfillOrderItemBatch } from '../order-item-batch-backfill';
import { reconcileTicketCounter } from '../../../domain/config/config.rules';

type Row = Record<string, unknown>;

const CSV_ENTITIES: BackupEntity[] = [
  'products',
  'orders',
  'sessions',
  'cashMovements',
  'financeMembers',
  'financeCategories',
  'financeEntries',
  'financeBudgetItems',
  'financeFormulas',
  'financeRecurrences',
  'financeInstallmentPlans',
  'financeClosings',
  'financePaymentMethods',
  'financeCardInvoices',
  'customers',
  'customizationGroups',
  'customizationItems',
  'config',
];

const NO_NULLABLE_COLUMNS: ReadonlySet<string> = new Set();

const NULLABLE_COLUMNS: Partial<Record<BackupEntity, ReadonlySet<string>>> = {
  sessions: new Set(['closedAt', 'cashFinal']),
  financeEntries: new Set([
    'sourceUid',
    'installmentNumber',
    'formulaBaseMonth',
    'paymentMethodUid',
    'invoiceMonth',
    'invoiceUid',
  ]),
  financeBudgetItems: new Set(['month']),
  financeRecurrences: new Set(['endMonth']),
  financePaymentMethods: new Set(['closingDay', 'dueDay']),
  financeCardInvoices: new Set(['statedAmount', 'paidAt']),
  customers: new Set(['phone']),
  config: new Set(['lastBackupAt', 'lastBackupPromptAt']),
};

const SNAPSHOT_TABLES: (keyof BackupSnapshot)[] = [
  'products',
  'orders',
  'sessions',
  'cashMovements',
  'config',
  'customers',
  'customizationGroups',
  'customizationItems',
];

const IMPORT_ORDER: BackupEntity[] = [
  'config',
  'customizationGroups',
  'customizationItems',
  'products',
  'customers',
  'sessions',
  'orders',
  'cashMovements',
  'financeMembers',
  'financeCategories',
  'financePaymentMethods',
  'financeCardInvoices',
  'financeFormulas',
  'financeRecurrences',
  'financeInstallmentPlans',
  'financeBudgetItems',
  'financeEntries',
  'financeClosings',
];

interface ParsedFile {
  entity: BackupEntity;
  rows: Row[];
}

export interface FileSaver {
  save(content: string, filename: string, type: string): void;
}

export class DexieBackupRepository implements BackupRepository {
  private readonly db: PDVDatabase;
  private readonly saver: FileSaver;

  constructor(db: PDVDatabase, saver: FileSaver) {
    this.db = db;
    this.saver = saver;
  }

  async buildSnapshot(): Promise<Either<InfrastructureError, string>> {
    try {
      const data = await this.collectSnapshotData();
      return right(JSON.stringify(data, null, 2));
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async exportAll(
    format: BackupFormat,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      if (format === 'json') {
        const snapshot = await this.buildSnapshot();
        if (isLeft(snapshot)) return snapshot;
        this.saver.save(snapshot.right, 'pdv-backup.json', 'application/json');
      } else {
        const data = await this.collectSnapshotData();
        for (const entity of CSV_ENTITIES) {
          const items = data[entity] as unknown as Row[];
          if (items.length > 0) {
            this.saver.save(toCsv(items), `pdv-${entity}.csv`, 'text/csv');
          }
        }
      }
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  private async collectSnapshotData() {
    return {
      products: await this.db.products.toArray(),
      orders: await this.db.orders.toArray(),
      sessions: await this.db.sessions.toArray(),
      cashMovements: await this.db.cashMovements.toArray(),
      config: await this.db.config.toArray(),
      customers: await this.db.customers.toArray(),
      customizationGroups: await this.db.customizationGroups.toArray(),
      customizationItems: await this.db.customizationItems.toArray(),
      financeMembers: await this.db.financeMembers.toArray(),
      financeCategories: await this.db.financeCategories.toArray(),
      financeEntries: await this.db.financeEntries.toArray(),
      financeBudgetItems: await this.db.financeBudgetItems.toArray(),
      financeFormulas: await this.db.financeFormulas.toArray(),
      financeRecurrences: await this.db.financeRecurrences.toArray(),
      financeInstallmentPlans: await this.db.financeInstallmentPlans.toArray(),
      financeClosings: await this.db.financeClosings.toArray(),
      financePaymentMethods: await this.db.financePaymentMethods.toArray(),
      financeCardInvoices: await this.db.financeCardInvoices.toArray(),
      exportedAt: Date.now(),
      version: 1,
    };
  }

  async exportEntity(
    entity: BackupEntity,
    format: BackupFormat,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      const items = (await this.db.table(entity).toArray()) as Row[];
      if (format === 'json') {
        this.saver.save(
          JSON.stringify(items, null, 2),
          `pdv-${entity}.json`,
          'application/json',
        );
      } else if (items.length > 0) {
        this.saver.save(toCsv(items), `pdv-${entity}.csv`, 'text/csv');
      }
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async importEntity(
    entity: BackupEntity,
    file: File,
  ): Promise<Either<InfrastructureError, number>> {
    try {
      const text = await file.text();
      const items = file.name.endsWith('.csv')
        ? parseCsv(text, entity)
        : extractItems(JSON.parse(text), entity);
      const cleaned = items.map((item) => {
        const copy = { ...item };
        delete copy.id;
        return copy;
      });
      if (entity === 'orders') {
        cleaned.forEach((item) => backfillOrderItemBatch(item));
      }
      await this.db.table(entity).bulkAdd(cleaned);
      return right(cleaned.length);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async importAll(
    files: File[],
    mode: ImportMode,
  ): Promise<Either<InfrastructureError, ImportAllResult>> {
    try {
      const skipped: string[] = [];
      const rowsByEntity = new Map<BackupEntity, Row[]>();

      for (const file of files) {
        const parsed = await readBackupFile(file);
        if (parsed.length === 0) {
          skipped.push(file.name);
          continue;
        }
        for (const { entity, rows } of parsed) {
          const current = rowsByEntity.get(entity) ?? [];
          rowsByEntity.set(entity, [...current, ...rows]);
        }
      }

      const imported = await this.applySnapshot(rowsByEntity, mode);
      return right({ imported, skipped });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  private async applySnapshot(
    rowsByEntity: Map<BackupEntity, Row[]>,
    mode: ImportMode,
  ): Promise<Partial<Record<BackupEntity, number>>> {
    const imported: Partial<Record<BackupEntity, number>> = {};
    await this.db.transaction('rw', this.db.tables, async () => {
      if (mode === 'replace') {
        await Promise.all(this.db.tables.map((table) => table.clear()));
      }
      for (const entity of IMPORT_ORDER) {
        const rows = rowsByEntity.get(entity);
        if (!rows || rows.length === 0) continue;
        const cleaned = rows.map(stripId);
        if (entity === 'orders') {
          cleaned.forEach((row) => backfillOrderItemBatch(row));
        }
        if (entity === 'config') {
          await this.putConfig(cleaned);
        } else {
          await this.putByUid(entity, cleaned);
        }
        imported[entity] = cleaned.length;
      }
      await this.reconcileTickets();
    });
    return imported;
  }

  private async reconcileTickets(): Promise<void> {
    const orderRows = (await this.db.table('orders').toArray()) as Row[];
    if (orderRows.length === 0) return;
    const table = this.db.table('config');
    const stored = ((await table.toArray()) as Row[])[0];
    const counter =
      typeof stored?.ticketCounter === 'number'
        ? stored.ticketCounter
        : TICKET_DEFAULTS.ticketCounter;
    const reconciled = reconcileTicketCounter(
      counter,
      orderRows.map((row) => row.ticket),
    );
    if (reconciled === counter) return;
    await table.put({
      ...TICKET_DEFAULTS,
      id: CONFIG_ID,
      ...stored,
      ticketCounter: reconciled,
    });
  }

  private async putConfig(rows: Row[]): Promise<void> {
    const table = this.db.table('config');
    const existing = (await table.toArray()) as Row[];
    const currentId = existing[0]?.id;
    const [first] = rows;
    await table.clear();
    await table.put(currentId == null ? first : { ...first, id: currentId });
  }

  private async putByUid(entity: BackupEntity, rows: Row[]): Promise<void> {
    const table = this.db.table(entity);
    const merged = await Promise.all(
      rows.map(async (row) => {
        const uid = row.uid;
        if (typeof uid !== 'string') return row;
        const existing = (await table.where('uid').equals(uid).first()) as
          | Row
          | undefined;
        return existing?.id == null ? row : { ...row, id: existing.id };
      }),
    );
    await table.bulkPut(merged);
  }

  async hasData(): Promise<Either<InfrastructureError, boolean>> {
    try {
      const counts = await Promise.all(
        this.db.tables
          .filter((table) => table.name !== 'config')
          .map((table) => table.count()),
      );
      return right(counts.some((count) => count > 0));
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async importDemo(
    data: BackupSnapshot,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      const snapshotTables = SNAPSHOT_TABLES.map((name) => this.db.table(name));
      await this.db.transaction('rw', snapshotTables, async () => {
        await Promise.all(snapshotTables.map((table) => table.clear()));
        for (const name of SNAPSHOT_TABLES) {
          const items = data[name];
          if (items && items.length > 0) {
            await this.db.table(name).bulkPut(items);
          }
        }
      });
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async wipeAll(): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.transaction('rw', this.db.tables, async () => {
        await Promise.all(this.db.tables.map((table) => table.clear()));
      });
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}

function stripId(row: Row): Row {
  const copy = { ...row };
  delete copy.id;
  return copy;
}

async function readBackupFile(file: File): Promise<ParsedFile[]> {
  const text = await file.text();
  return file.name.toLowerCase().endsWith('.csv')
    ? readCsvFile(file.name, text)
    : readJsonFile(file.name, text);
}

function readCsvFile(fileName: string, text: string): ParsedFile[] {
  const entity =
    detectEntityByFileName(fileName) ??
    detectEntityByHeaders(readHeaders(text));
  if (!entity) return [];
  const rows = parseCsv(text, entity);
  return [{ entity, rows }];
}

function readHeaders(text: string): string[] {
  const records = tokenizeCsv(text.replace(/\r\n/g, '\n').replace(/\n+$/, ''));
  return records.length === 0
    ? []
    : records[0].map((field) => field.value.trim());
}

function readJsonFile(fileName: string, text: string): ParsedFile[] {
  const parsed: unknown = JSON.parse(text);
  if (Array.isArray(parsed)) {
    const entity = detectEntityByFileName(fileName);
    return entity ? [{ entity, rows: parsed as Row[] }] : [];
  }
  const record = parsed as Record<string, unknown>;
  return IMPORT_ORDER.filter((entity) => Array.isArray(record[entity])).map(
    (entity) => ({ entity, rows: record[entity] as Row[] }),
  );
}

function extractItems(parsed: unknown, entity: BackupEntity): Row[] {
  if (Array.isArray(parsed)) return parsed as Row[];
  const record = parsed as Record<string, unknown>;
  return (record[entity] as Row[] | undefined) ?? [];
}

function toCsv(items: Row[]): string {
  const headers = Object.keys(items[0]);
  const rows = items.map((item) =>
    headers.map((header) => encodeCell(item[header])).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function encodeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  }
  const text = String(value);
  return /[,"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

interface CsvField {
  value: string;
  quoted: boolean;
}

function tokenizeCsv(text: string): CsvField[][] {
  const records: CsvField[][] = [];
  let record: CsvField[] = [];
  let field = '';
  let wasQuoted = false;
  let inQuotes = false;
  let index = 0;

  const pushField = () => {
    record.push({ value: field, quoted: wasQuoted });
    field = '';
    wasQuoted = false;
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

  while (index < text.length) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      wasQuoted = true;
      index += 1;
      continue;
    }
    if (char === ',') {
      pushField();
      index += 1;
      continue;
    }
    if (char === '\r') {
      index += 1;
      continue;
    }
    if (char === '\n') {
      pushRecord();
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }
  if (record.length > 0 || field !== '' || wasQuoted) {
    pushRecord();
  }
  return records;
}

function parseCsv(text: string, entity: BackupEntity): Row[] {
  const nullableColumns = NULLABLE_COLUMNS[entity] ?? NO_NULLABLE_COLUMNS;
  const records = tokenizeCsv(text.replace(/\r\n/g, '\n').replace(/\n+$/, ''));
  if (records.length < 2) return [];
  const headers = records[0].map((field) => field.value.trim());
  return records.slice(1).map((record) => {
    const row: Row = {};
    headers.forEach((header, index) => {
      const field = record[index];
      const value = field ? decodeCell(field) : '';
      row[header] =
        value === '' && !field?.quoted && nullableColumns.has(header)
          ? null
          : value;
    });
    return row;
  });
}

function decodeCell(field: CsvField): unknown {
  if (field.quoted) {
    try {
      return JSON.parse(field.value);
    } catch {
      return field.value;
    }
  }
  const value = field.value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}
