import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { isLeft, isRight } from '../../domain/shared/either';
import { PDVDatabase } from './dexie-database';
import {
  DexieBackupRepository,
  type FileSaver,
} from './repositories/dexie-backup.repository';

let db: PDVDatabase;

interface SavedFile {
  content: string;
  filename: string;
  type: string;
}

class FakeFileSaver implements FileSaver {
  files: SavedFile[] = [];
  save(content: string, filename: string, type: string): void {
    this.files.push({ content, filename, type });
  }
}

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  db = new PDVDatabase();
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const product = (over: Record<string, unknown> = {}) => ({
  uid: 'product-1',
  name: 'X-Burger',
  category: 'Lanches',
  costPrice: 8,
  salePrice: 20,
  stock: 0,
  tracksStock: true,
  active: true,
  customizationGroupIds: [] as number[],
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

describe('DexieBackupRepository', () => {
  it('exports all data as a single JSON file', async () => {
    await db.products.add(product());
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    const result = await repo.exportAll('json');
    expect(isRight(result)).toBe(true);
    expect(saver.files).toHaveLength(1);
    expect(saver.files[0].filename).toBe('pdv-backup.json');
    const parsed = JSON.parse(saver.files[0].content);
    expect(parsed.products).toHaveLength(1);
    expect(parsed.version).toBe(1);
  });

  it('exports populated entities as CSV files only', async () => {
    await db.products.add(product({ name: 'A, B', category: 'x"y' }));
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportAll('csv');
    expect(saver.files.map((f) => f.filename)).toEqual(['pdv-products.csv']);
    expect(saver.files[0].content).toContain('"A, B"');
  });

  it('exports a single entity as JSON', async () => {
    await db.products.add(product());
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('products', 'json');
    expect(saver.files[0].filename).toBe('pdv-products.json');
  });

  it('skips CSV export for an empty entity', async () => {
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('products', 'csv');
    expect(saver.files).toHaveLength(0);
  });

  it('exports a populated entity as CSV', async () => {
    await db.products.add(product({ meta: { a: 1 } }));
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('products', 'csv');
    expect(saver.files[0].filename).toBe('pdv-products.csv');
  });

  it('imports a JSON array dropping ids', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const file = new File(
      [JSON.stringify([{ id: 99, ...product() }])],
      'p.json',
    );
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.products.toArray();
    expect(stored[0].id).not.toBe(99);
  });

  it('imports from a JSON object keyed by entity', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const file = new File(
      [JSON.stringify({ products: [product()] })],
      'backup.json',
    );
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(1);
  });

  it('defaults to an empty list when the JSON object lacks the entity', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const file = new File([JSON.stringify({ other: [] })], 'backup.json');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(0);
  });

  it('imports from a CSV file parsing numbers and json cells', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name,salePrice,meta\nBurger,15,"{""x"":1}"';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.products.toArray();
    expect(stored[0].name).toBe('Burger');
    expect(stored[0].salePrice).toBe(15);
    expect((stored[0] as unknown as { meta: unknown }).meta).toEqual({ x: 1 });
  });

  it('encodes null cells as empty in CSV export', async () => {
    await db.orders.add({
      sessionId: 1,
      items: [],
      total: 0,
      paymentMethod: null,
      customerName: 'X',
      ticket: '1',
      customerPhone: '',
      stage: 'aceito',
      status: 'open',
      createdAt: 1,
      updatedAt: 1,
    } as never);
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('orders', 'csv');
    const header = saver.files[0].content.split('\n')[0].split(',');
    const row = saver.files[0].content.split('\n')[1].split(',');
    expect(row[header.indexOf('paymentMethod')]).toBe('');
  });

  it('fills missing CSV columns with an empty string', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name,salePrice\nBurger';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.products.toArray();
    expect(stored[0].salePrice).toBe('');
  });

  it('returns zero rows for a CSV without data lines', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const file = new File(['name,price'], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(0);
  });

  it('returns zero rows for an empty CSV file', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const file = new File([''], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(0);
  });

  it('keeps a malformed quoted cell as text', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name\n"{bad json}"';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result)).toBe(true);
    const stored = await db.products.toArray();
    expect(stored[0].name).toBe('{bad json}');
  });

  it('parses a quoted cell whose json contains commas', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name,meta\nBurger,"{""a"":1,""b"":2}"';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result)).toBe(true);
    const stored = await db.products.toArray();
    expect(stored[0].name).toBe('Burger');
    expect((stored[0] as unknown as { meta: unknown }).meta).toEqual({
      a: 1,
      b: 2,
    });
  });

  it('ignores stray carriage returns outside quotes', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name,salePrice\nBur\rger,15';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result)).toBe(true);
    const stored = await db.products.toArray();
    expect(stored[0].name).toBe('Burger');
    expect(stored[0].salePrice).toBe(15);
  });

  it('parses a final row that is a single empty quoted field', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name\n""';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.products.toArray();
    expect(stored[0].name).toBe('');
  });

  it('parses a quoted cell containing a newline', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const csv = 'name,note\nBurger,"line1\nline2"';
    const file = new File([csv], 'p.csv');
    const result = await repo.importEntity('products', file);
    expect(isRight(result)).toBe(true);
    const stored = await db.products.toArray();
    expect((stored[0] as unknown as { note: string }).note).toBe(
      'line1\nline2',
    );
  });

  it('round-trips orders with nested items through CSV', async () => {
    await db.orders.add({
      sessionId: 3,
      items: [
        { productId: 1, name: 'A, B', salePrice: 10, costPrice: 5, qty: 2 },
        { productId: 2, name: 'C', salePrice: 7, costPrice: 3, qty: 1 },
      ],
      total: 27,
      paymentMethod: 'dinheiro',
      customerName: 'Zé',
      ticket: '0001',
      customerPhone: '',
      stage: 'aceito',
      status: 'paid',
      createdAt: 1,
      updatedAt: 1,
    } as never);
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('orders', 'csv');
    const csv = saver.files[0].content;

    await repo.wipeAll();
    const file = new File([csv], 'pdv-orders.csv');
    const result = await repo.importEntity('orders', file);
    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.orders.toArray();
    expect(stored[0].total).toBe(27);
    expect(stored[0].items).toHaveLength(2);
    expect(stored[0].items[0]).toEqual({
      productId: 1,
      name: 'A, B',
      salePrice: 10,
      costPrice: 5,
      qty: 2,
      batchId: 'undefined#1',
      addedAt: 1,
    });
    expect(stored[0].customerName).toBe('Zé');
  });

  it('round-trips an open session preserving null fields and empty notes', async () => {
    await db.sessions.add({
      uid: 'session-1',
      openedAt: 10,
      closedAt: null,
      cashInitial: 100,
      cashFinal: null,
      notes: '',
    });
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);
    await repo.exportEntity('sessions', 'csv');
    const csv = saver.files[0].content;
    await db.sessions.clear();
    const result = await repo.importEntity(
      'sessions',
      new File([csv], 'pdv-sessions.csv'),
    );
    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.sessions.toArray();
    expect(stored[0].closedAt).toBeNull();
    expect(stored[0].cashFinal).toBeNull();
    expect(stored[0].cashInitial).toBe(100);
    expect(stored[0].notes).toBe('');
  });

  it('wipes every table', async () => {
    await db.products.add(product());
    await db.orders.add({ sessionId: 1 } as never);
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.wipeAll();
    expect(isRight(result)).toBe(true);
    expect(await db.products.count()).toBe(0);
    expect(await db.orders.count()).toBe(0);
  });

  it('reports no data when only config exists', async () => {
    await db.config.add({ id: 1 } as never);
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.hasData();
    expect(isRight(result) && result.right).toBe(false);
  });

  it('reports data when a data table is populated', async () => {
    await db.products.add(product());
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.hasData();
    expect(isRight(result) && result.right).toBe(true);
  });

  it('imports a demo snapshot preserving ids and replacing data', async () => {
    await db.products.add(product({ name: 'Old' }));
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.importDemo({
      products: [{ id: 7, ...product({ name: 'Seed' }) }],
      config: [{ id: 1, name: 'Demo' } as never],
    });
    expect(isRight(result)).toBe(true);
    const stored = await db.products.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(7);
    expect(stored[0].name).toBe('Seed');
    expect((await db.config.toArray())[0].name).toBe('Demo');
  });

  it('ignores entities missing from the demo snapshot', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.importDemo({ products: [] });
    expect(isRight(result)).toBe(true);
    expect(await db.orders.count()).toBe(0);
  });

  it('imports customers and customizations preserving ids', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    const result = await repo.importDemo({
      customers: [{ id: 5, name: 'Ana', phone: '1', addresses: [] } as never],
      customizationGroups: [{ id: 2, name: 'Adicionais' } as never],
      customizationItems: [{ id: 3, groupId: 2, name: 'Bacon' } as never],
    });
    expect(isRight(result)).toBe(true);
    expect((await db.customers.toArray())[0].id).toBe(5);
    expect((await db.customizationGroups.toArray())[0].id).toBe(2);
    expect((await db.customizationItems.toArray())[0].id).toBe(3);
  });

  it('exporta e reimporta clientes em CSV', async () => {
    await db.customers.add({
      uid: 'cus-1',
      name: 'Maju',
      phone: '',
      createdAt: 1,
      updatedAt: 1,
    } as never);
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);

    await repo.exportEntity('customers', 'csv');
    await repo.wipeAll();
    const file = new File([saver.files[0].content], 'pdv-customers.csv');
    const result = await repo.importEntity('customers', file);

    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.customers.toArray();
    expect(stored[0].name).toBe('Maju');
  });

  it('exporta e reimporta grupos de adicionais em CSV', async () => {
    await db.customizationGroups.add({
      uid: 'group-1',
      name: 'Adicionais',
      required: false,
      minQty: 0,
      maxQty: 1,
      chargeAfter: 0,
    } as never);
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);

    await repo.exportEntity('customizationGroups', 'csv');
    await repo.wipeAll();
    const file = new File(
      [saver.files[0].content],
      'pdv-customizationGroups.csv',
    );
    const result = await repo.importEntity('customizationGroups', file);

    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.customizationGroups.toArray();
    expect(stored[0].name).toBe('Adicionais');
  });

  it('exporta e reimporta itens de adicionais em CSV', async () => {
    await db.customizationItems.add({
      uid: 'item-1',
      groupUid: 'group-1',
      name: 'Bacon',
      price: 3,
      maxQty: 2,
      chargeAfter: 0,
      active: true,
    } as never);
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);

    await repo.exportEntity('customizationItems', 'csv');
    await repo.wipeAll();
    const file = new File(
      [saver.files[0].content],
      'pdv-customizationItems.csv',
    );
    const result = await repo.importEntity('customizationItems', file);

    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.customizationItems.toArray();
    expect(stored[0].name).toBe('Bacon');
  });

  it('exporta e reimporta a configuração em CSV', async () => {
    await db.config.add({
      name: 'Minha Loja',
      document: '',
      phone: '',
      address: '',
      ticketCounter: 1,
      ticketLimit: 100,
      ticketAutoReset: true,
      statusControlEnabled: true,
      businessTypeId: '',
      enabledModules: [],
      extra: {},
      printerDriver: 'browser',
      printerPaperWidth: 80,
      printerCodepage: 'cp850',
      printerAutoPrintOnClose: false,
      printerBatchIncludesPrevious: true,
      layoutMode: 'auto',
    } as never);
    const saver = new FakeFileSaver();
    const repo = new DexieBackupRepository(db, saver);

    await repo.exportEntity('config', 'csv');
    await repo.wipeAll();
    const file = new File([saver.files[0].content], 'pdv-config.csv');
    const result = await repo.importEntity('config', file);

    expect(isRight(result) && result.right).toBe(1);
    const stored = await db.config.toArray();
    expect(stored[0].name).toBe('Minha Loja');
  });

  describe('importAll', () => {
    it('importa um backup JSON inteiro identificando as entidades', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());
      const snapshot = JSON.stringify({
        products: [product({ uid: 'p-1', name: 'Coca' })],
        customers: [
          { uid: 'c-1', name: 'Maju', phone: '', createdAt: 1, updatedAt: 1 },
        ],
        exportedAt: 1,
        version: 1,
      });

      const result = await repo.importAll(
        [new File([snapshot], 'pdv-backup.json')],
        'merge',
      );

      expect(isRight(result)).toBe(true);
      expect(isRight(result) && result.right.imported.products).toBe(1);
      expect(isRight(result) && result.right.imported.customers).toBe(1);
      expect(await db.products.count()).toBe(1);
      expect(await db.customers.count()).toBe(1);
    });

    it('importa vários CSV de uma vez', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());
      const files = [
        new File(['uid,name,category\np-1,Coca,Bebidas'], 'pdv-products.csv'),
        new File(['uid,name,phone\nc-1,Maju,999'], 'pdv-customers.csv'),
      ];

      const result = await repo.importAll(files, 'merge');

      expect(isRight(result) && result.right.imported.products).toBe(1);
      expect(isRight(result) && result.right.imported.customers).toBe(1);
    });

    it('identifica a entidade pelo cabeçalho quando o nome não ajuda', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());

      const result = await repo.importAll(
        [
          new File(
            ['uid,name,category,salePrice\np-1,Coca,Bebidas,5'],
            'x.csv',
          ),
        ],
        'merge',
      );

      expect(isRight(result) && result.right.imported.products).toBe(1);
      expect(isRight(result) && result.right.skipped).toEqual([]);
    });

    it('reporta arquivos não reconhecidos sem importá-los', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());

      const result = await repo.importAll(
        [new File(['a,b\n1,2'], 'planilha.csv')],
        'merge',
      );

      expect(isRight(result) && result.right.skipped).toEqual(['planilha.csv']);
      expect(isRight(result) && result.right.imported).toEqual({});
    });

    it('reporta um JSON sem nenhuma entidade conhecida', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());

      const result = await repo.importAll(
        [new File([JSON.stringify({ outra: [] })], 'coisa.json')],
        'merge',
      );

      expect(isRight(result) && result.right.skipped).toEqual(['coisa.json']);
    });

    it('importa um JSON de entidade única identificado pelo nome', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());
      const snapshot = JSON.stringify([product({ uid: 'p-1' })]);

      const result = await repo.importAll(
        [new File([snapshot], 'pdv-products.json')],
        'merge',
      );

      expect(isRight(result) && result.right.imported.products).toBe(1);
    });

    it('não duplica ao importar o mesmo backup duas vezes', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());
      const file = () =>
        new File(['uid,name,category\np-1,Coca,Bebidas'], 'pdv-products.csv');

      await repo.importAll([file()], 'merge');
      await repo.importAll([file()], 'merge');

      expect(await db.products.count()).toBe(1);
    });

    it('substitui a configuração existente no modo somar', async () => {
      await db.config.add({ name: 'Antiga' } as never);
      const repo = new DexieBackupRepository(db, new FakeFileSaver());

      await repo.importAll(
        [
          new File(
            [JSON.stringify({ config: [{ name: 'Nova' }] })],
            'pdv-backup.json',
          ),
        ],
        'merge',
      );

      const stored = await db.config.toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Nova');
    });

    it('insere a configuração quando o aparelho ainda não tem uma', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());

      await repo.importAll(
        [
          new File(
            [JSON.stringify({ config: [{ name: 'Nova' }] })],
            'pdv-backup.json',
          ),
        ],
        'merge',
      );

      expect((await db.config.toArray())[0].name).toBe('Nova');
    });

    it('substitui os dados existentes no modo replace', async () => {
      await db.products.add(product({ uid: 'antigo', name: 'Velho' }));
      const repo = new DexieBackupRepository(db, new FakeFileSaver());

      await repo.importAll(
        [new File(['uid,name,category\np-1,Coca,Bebidas'], 'pdv-products.csv')],
        'replace',
      );

      const stored = await db.products.toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].uid).toBe('p-1');
    });

    it('apaga a configuração atual no modo replace', async () => {
      await db.config.add({ name: 'Antiga' } as never);
      const repo = new DexieBackupRepository(db, new FakeFileSaver());

      await repo.importAll(
        [new File(['uid,name,category\np-1,Coca,Bebidas'], 'pdv-products.csv')],
        'replace',
      );

      expect(await db.config.count()).toBe(0);
    });

    it('preserva os dados quando a importação falha no meio', async () => {
      await db.products.add(product({ uid: 'antigo', name: 'Velho' }));
      const repo = new DexieBackupRepository(db, new FakeFileSaver());

      const result = await repo.importAll(
        [new File(['{ json quebrado'], 'pdv-backup.json')],
        'replace',
      );

      expect(isLeft(result)).toBe(true);
      expect(await db.products.count()).toBe(1);
    });

    it('faz o backfill de rodada nos pedidos importados', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());
      const snapshot = JSON.stringify({
        orders: [
          {
            uid: 'ord-1',
            createdAt: 1700,
            items: [{ name: 'Coca', salePrice: 5, costPrice: 2, qty: 1 }],
          },
        ],
      });

      await repo.importAll([new File([snapshot], 'pdv-backup.json')], 'merge');

      const [order] = await db.orders.toArray();
      expect(order.items[0].batchId).toBe('ord-1#1700');
    });

    it('importa os grupos antes dos itens de adicionais', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());
      const files = [
        new File(
          ['uid,groupUid,name,price\ni-1,g-1,Bacon,3'],
          'pdv-customizationItems.csv',
        ),
        new File(
          ['uid,name,required,minQty,maxQty\ng-1,Adicionais,false,0,1'],
          'pdv-customizationGroups.csv',
        ),
      ];

      const result = await repo.importAll(files, 'merge');

      expect(isRight(result)).toBe(true);
      expect((await db.customizationGroups.toArray())[0].uid).toBe('g-1');
      expect((await db.customizationItems.toArray())[0].uid).toBe('i-1');
    });

    it('ignora entidades vazias na contagem', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());

      const result = await repo.importAll(
        [new File([JSON.stringify({ products: [] })], 'pdv-backup.json')],
        'merge',
      );

      expect(isRight(result) && result.right.imported).toEqual({});
      expect(isRight(result) && result.right.skipped).toEqual([]);
    });

    it('devolve Left quando o banco falha', async () => {
      const repo = new DexieBackupRepository(db, new FakeFileSaver());
      db.close();

      const result = await repo.importAll(
        [new File(['uid,name,category\np-1,Coca,Bebidas'], 'pdv-products.csv')],
        'merge',
      );

      expect(isLeft(result)).toBe(true);
    });
  });

  it('returns Left when the database fails', async () => {
    const repo = new DexieBackupRepository(db, new FakeFileSaver());
    db.close();
    expect(isLeft(await repo.exportAll('json'))).toBe(true);
    expect(isLeft(await repo.exportEntity('products', 'json'))).toBe(true);
    expect(isLeft(await repo.wipeAll())).toBe(true);
    expect(isLeft(await repo.hasData())).toBe(true);
    expect(isLeft(await repo.importDemo({ products: [] }))).toBe(true);
    const file = new File(['[]'], 'p.json');
    expect(isLeft(await repo.importEntity('products', file))).toBe(true);
  });
});
