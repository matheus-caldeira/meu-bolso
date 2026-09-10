import { describe, expect, it } from 'vitest';
import { isLeft, isRight, left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { Order } from '../../domain/order/order.entity';
import type { OrderRepository } from '../../domain/order/order.repository';
import type { Product } from '../../domain/product/product.entity';
import type { ProductRepository } from '../../domain/product/product.repository';
import type { SpreadsheetWriter } from '../../domain/export/spreadsheet.writer';
import type { Workbook } from '../../domain/export/spreadsheet.entity';
import { makeOrder, makeProduct } from '../../test/export-fixtures';
import {
  makeBuildReportMessage,
  makeExportReportSpreadsheet,
  type ExportReportInput,
} from './export-report.usecases';

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function makeOrderRepository(orders: Order[]): OrderRepository {
  return {
    async listBySession() {
      return right(orders);
    },
  } as unknown as OrderRepository;
}

function makeFailingOrderRepository(): OrderRepository {
  return {
    async listBySession() {
      return left(new FakeError('falha pedidos'));
    },
  } as unknown as OrderRepository;
}

function makeProductRepository(products: Product[]): ProductRepository {
  return {
    async list() {
      return right(products);
    },
  } as unknown as ProductRepository;
}

function makeFailingProductRepository(): ProductRepository {
  return {
    async list() {
      return left(new FakeError('falha produtos'));
    },
  } as unknown as ProductRepository;
}

function makeWriter(): SpreadsheetWriter & { last: Workbook | null } {
  const writer = {
    last: null as Workbook | null,
    async write(workbook: Workbook) {
      writer.last = workbook;
      return new Uint8Array([1, 2, 3]);
    },
  };
  return writer;
}

function makeInput(overrides: Partial<ExportReportInput> = {}) {
  return {
    sessionUid: 's-1',
    businessName: 'Grupo Escoteiro',
    day: '09/09/2026',
    sections: ['summary'] as ExportReportInput['sections'],
    generatedAt: 1000,
    ...overrides,
  };
}

describe('makeExportReportSpreadsheet', () => {
  it('devolve o arquivo xlsx com as abas pedidas', async () => {
    const writer = makeWriter();
    const exportSpreadsheet = makeExportReportSpreadsheet(
      makeOrderRepository([makeOrder()]),
      makeProductRepository([makeProduct()]),
      writer,
    );

    const result = await exportSpreadsheet(
      makeInput({ sections: ['summary', 'stock'] }),
    );

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.name).toBe('relatorio-09-09-2026.xlsx');
      expect(result.right.type).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(result.right.content).toEqual(new Uint8Array([1, 2, 3]));
    }
    expect(writer.last?.sheets.map((sheet) => sheet.name)).toEqual([
      'Resumo',
      'Estoque',
    ]);
  });

  it('recusa a exportação sem nenhum relatório selecionado', async () => {
    const exportSpreadsheet = makeExportReportSpreadsheet(
      makeOrderRepository([]),
      makeProductRepository([]),
      makeWriter(),
    );

    const result = await exportSpreadsheet(makeInput({ sections: [] }));

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left.code).toBe('EMPTY_REPORT_SELECTION');
    }
  });

  it('propaga a falha ao ler os pedidos', async () => {
    const exportSpreadsheet = makeExportReportSpreadsheet(
      makeFailingOrderRepository(),
      makeProductRepository([]),
      makeWriter(),
    );

    const result = await exportSpreadsheet(makeInput());

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('FAKE');
  });

  it('propaga a falha ao ler os produtos', async () => {
    const exportSpreadsheet = makeExportReportSpreadsheet(
      makeOrderRepository([]),
      makeFailingProductRepository(),
      makeWriter(),
    );

    const result = await exportSpreadsheet(makeInput());

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('FAKE');
  });

  it('nomeia o arquivo pelo instante quando o dia não tem números', async () => {
    const exportSpreadsheet = makeExportReportSpreadsheet(
      makeOrderRepository([]),
      makeProductRepository([]),
      makeWriter(),
    );

    const result = await exportSpreadsheet(makeInput({ day: '' }));

    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right.name).toBe('relatorio-1000.xlsx');
  });

  it('leva ao arquivo apenas os produtos que controlam estoque', async () => {
    const writer = makeWriter();
    const exportSpreadsheet = makeExportReportSpreadsheet(
      makeOrderRepository([]),
      makeProductRepository([
        makeProduct({ uid: 'p-1', name: 'Refri', stock: 5 }),
        makeProduct({ uid: 'p-2', name: 'Brinde', tracksStock: false }),
      ]),
      writer,
    );

    await exportSpreadsheet(makeInput({ sections: ['stock'] }));

    const rows = writer.last?.sheets[0].rows ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe('Refri');
  });
});

describe('makeBuildReportMessage', () => {
  it('monta o texto com as seções pedidas', async () => {
    const buildMessage = makeBuildReportMessage(
      makeOrderRepository([makeOrder()]),
      makeProductRepository([makeProduct()]),
    );

    const result = await buildMessage(makeInput());

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toContain('*Grupo Escoteiro — 09/09/2026*');
      expect(result.right).toContain('Vendas: R$ 20,00');
    }
  });

  it('recusa o texto sem nenhum relatório selecionado', async () => {
    const buildMessage = makeBuildReportMessage(
      makeOrderRepository([]),
      makeProductRepository([]),
    );

    const result = await buildMessage(makeInput({ sections: [] }));

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left.code).toBe('EMPTY_REPORT_SELECTION');
    }
  });

  it('propaga a falha ao carregar os dados', async () => {
    const buildMessage = makeBuildReportMessage(
      makeFailingOrderRepository(),
      makeProductRepository([]),
    );

    const result = await buildMessage(makeInput());

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('FAKE');
  });
});
