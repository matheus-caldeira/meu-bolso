import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { left, right } from '../../domain/shared/either';
import { PrintFailedError, PrinterUnavailableError } from '../../domain/errors';
import { container } from '../../app/container';
import { usePrint } from './usePrint';
import type { Product } from '../../domain/product/product.entity';
import type { Order } from '../../domain/order/order.entity';
import type { SessionReport } from '../../application/report/report.usecases';

const browserPrint = vi.fn();
const bluetoothPrint = vi.fn();
const rawbtPrint = vi.fn();

vi.mock('../../app/container', () => ({
  container: { readConfig: vi.fn(), findCustomerByUid: vi.fn() },
}));

vi.mock('../../infrastructure/printing/triggered-receipt-printer', () => ({
  TriggeredReceiptPrinter: vi.fn(function TriggeredReceiptPrinter() {
    return { print: browserPrint };
  }),
}));

vi.mock('../../infrastructure/printing/escpos-bluetooth-printer', () => ({
  EscPosBluetoothPrinter: vi.fn(function EscPosBluetoothPrinter() {
    return { print: bluetoothPrint };
  }),
}));

vi.mock('../../infrastructure/printing/rawbt-receipt-printer', () => ({
  RawBtReceiptPrinter: vi.fn(function RawBtReceiptPrinter() {
    return { print: rawbtPrint };
  }),
}));

vi.mock('../molecules/receipt-print-context', () => ({
  useReceiptPrintHandler: () => vi.fn(),
}));

const toast = vi.fn();
vi.mock('../molecules/toast-context', () => ({
  useToast: () => toast,
}));

const readConfig = vi.mocked(container.readConfig);
const findCustomerByUid = vi.mocked(container.findCustomerByUid);

const order = {
  uid: 'tab-1',
  ticket: '042',
  customerName: 'Maju',
  items: [],
  total: 5,
} as never;

const orderWithTwoBatches = {
  uid: 'tab-1',
  ticket: '042',
  customerName: 'Maju (Lobinha)',
  items: [
    {
      uid: 'i1',
      productUid: 'p1',
      name: 'Refri',
      qty: 1,
      salePrice: 5,
      batchId: 'b-1',
      addedAt: 1,
    },
    {
      uid: 'i2',
      productUid: 'p2',
      name: 'Pastel',
      qty: 1,
      salePrice: 8,
      batchId: 'b-2',
      addedAt: 2,
    },
  ],
  total: 13,
} as never;

const linkedOrder = {
  ...(orderWithTwoBatches as object),
  customerUid: 'customer-1',
} as never;

function makeCustomer(extra: Record<string, string>) {
  return right({
    uid: 'customer-1',
    name: 'Maju',
    addresses: [],
    extra,
    createdAt: 1,
    updatedAt: 1,
  } as never);
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  return right({
    name: 'Grupo',
    businessTypeId: 'scout',
    printerDriver: 'browser',
    printerPaperWidth: 80,
    printerCodepage: 'cp860',
    printerBatchIncludesPrevious: true,
    ...overrides,
  } as never);
}

function renderPrint() {
  return renderHook(() => usePrint());
}

let configResult: ReturnType<typeof makeConfig> = makeConfig();
let printed: Array<{
  ticket: string;
  customerDetails?: string;
  lines: Array<{ label: string }>;
}> = [];

describe('usePrint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    printed = [];
    configResult = makeConfig();
    readConfig.mockImplementation(async () => configResult);
    findCustomerByUid.mockResolvedValue(right(undefined));
    browserPrint.mockImplementation(async (receipt: never) => {
      printed.push(receipt as never);
      return right(undefined);
    });
    bluetoothPrint.mockResolvedValue(right(undefined));
    rawbtPrint.mockResolvedValue(right(undefined));
  });

  it('usa o driver do navegador quando a flag é browser', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'browser',
        printerPaperWidth: 80,
      } as never),
    );

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printOrder(order);
    });

    expect(browserPrint).toHaveBeenCalled();
    expect(bluetoothPrint).not.toHaveBeenCalled();
  });

  it('passa a usar o novo driver quando a config muda, sem remontar', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'browser',
        printerPaperWidth: 80,
        printerCodepage: 'cp860',
      } as never),
    );

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printOrder(order);
    });
    expect(browserPrint).toHaveBeenCalled();

    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'rawbt',
        printerPaperWidth: 80,
        printerCodepage: 'cp860',
      } as never),
    );

    await act(async () => {
      await result.current.printOrder(order);
    });

    expect(rawbtPrint).toHaveBeenCalled();
  });

  it('usa o driver bluetooth quando a flag é bluetooth', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'bluetooth',
        printerPaperWidth: 80,
      } as never),
    );

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printOrder(order);
    });

    expect(bluetoothPrint).toHaveBeenCalled();
    expect(browserPrint).not.toHaveBeenCalled();
  });

  it('usa o driver rawbt quando a flag é rawbt', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'rawbt',
        printerPaperWidth: 80,
        printerCodepage: 'cp860',
      } as never),
    );

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printOrder(order);
    });

    expect(rawbtPrint).toHaveBeenCalled();
    expect(browserPrint).not.toHaveBeenCalled();
    expect(bluetoothPrint).not.toHaveBeenCalled();
  });

  it('cai no navegador quando o rawbt não está disponível', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'rawbt',
        printerPaperWidth: 80,
        printerCodepage: 'cp860',
      } as never),
    );
    rawbtPrint.mockResolvedValue(left(new PrinterUnavailableError()));

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printOrder(order);
    });

    expect(rawbtPrint).toHaveBeenCalled();
    expect(browserPrint).toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
  });

  it('cai no navegador quando o bluetooth não está disponível', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'bluetooth',
        printerPaperWidth: 80,
      } as never),
    );
    bluetoothPrint.mockResolvedValue(left(new PrinterUnavailableError()));

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printOrder(order);
    });

    expect(bluetoothPrint).toHaveBeenCalled();
    expect(browserPrint).toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
  });

  it('avisa por toast quando o navegador falha diretamente', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'browser',
        printerPaperWidth: 80,
      } as never),
    );
    browserPrint.mockResolvedValue(left(new PrintFailedError()));

    const { result } = renderHook(() => usePrint());

    const ok = await act(async () => result.current.printOrder(order));

    expect(ok).toBe(false);
    expect(toast).toHaveBeenCalled();
  });

  it('avisa por toast quando o fallback do navegador também falha', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'bluetooth',
        printerPaperWidth: 80,
      } as never),
    );
    bluetoothPrint.mockResolvedValue(left(new PrinterUnavailableError()));
    browserPrint.mockResolvedValue(left(new PrintFailedError()));

    const { result } = renderHook(() => usePrint());

    const ok = await act(async () => result.current.printOrder(order));

    expect(ok).toBe(false);
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('mantém a configuração padrão quando a leitura da config falha', async () => {
    readConfig.mockResolvedValue(left(new PrintFailedError()));

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printOrder(order);
    });

    expect(browserPrint).toHaveBeenCalled();
  });

  it('imprime o relatório de estoque', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'browser',
        printerPaperWidth: 80,
      } as never),
    );
    const products = [{ uid: 'p1', name: 'Refri', stock: 3 }] as Product[];

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printStock(products);
    });

    expect(browserPrint).toHaveBeenCalled();
  });

  it('imprime as comandas pendentes', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'browser',
        printerPaperWidth: 80,
      } as never),
    );
    const orders = [order] as Order[];

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printPendingTabs(orders);
    });

    expect(browserPrint).toHaveBeenCalled();
  });

  it('imprime o fechamento do dia', async () => {
    readConfig.mockResolvedValue(
      right({
        name: 'Grupo',
        printerDriver: 'browser',
        printerPaperWidth: 80,
      } as never),
    );
    const report = {
      summary: {
        totalSales: 100,
        totalCost: 40,
        profit: 60,
        margin: 60,
        paidCount: 2,
      },
      byMethod: { pix: 100 },
      products: [],
    } as unknown as SessionReport;

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.printDayReport(report);
    });

    expect(browserPrint).toHaveBeenCalled();
  });

  it('imprime a rodada com o histórico quando a configuração está ligada', async () => {
    configResult = makeConfig({ printerBatchIncludesPrevious: true });
    const { result } = renderPrint();

    await act(async () => {
      await result.current.printBatch(orderWithTwoBatches, 'b-2');
    });

    const receipt = printed[0];
    expect(receipt.ticket).toBe('COMANDA 042 - Maju (Lobinha)');
    expect(receipt.lines[0]).toEqual({
      label: 'NOVOS PRODUTOS',
      emphasis: true,
    });
  });

  it('imprime só a rodada quando a configuração está desligada', async () => {
    configResult = makeConfig({ printerBatchIncludesPrevious: false });
    const { result } = renderPrint();

    await act(async () => {
      await result.current.printBatch(orderWithTwoBatches, 'b-2');
    });

    expect(printed[0].lines.some((line) => line.label === 'HISTORICO')).toBe(
      false,
    );
  });

  it('acrescenta os dados do cliente vinculado na rodada', async () => {
    findCustomerByUid.mockResolvedValue(
      makeCustomer({ section: 'lobinho', guardian: 'Maria da Silva' }),
    );
    const { result } = renderPrint();

    await act(async () => {
      await result.current.printBatch(linkedOrder, 'b-2');
    });

    expect(findCustomerByUid).toHaveBeenCalledWith('customer-1');
    expect(printed[0].customerDetails).toBe('Lobinho, Maria da Silva');
  });

  it('acrescenta os dados do cliente vinculado na venda avulsa', async () => {
    findCustomerByUid.mockResolvedValue(
      makeCustomer({ section: 'pioneiro', guardian: 'João' }),
    );
    const { result } = renderPrint();

    await act(async () => {
      await result.current.printOrder(linkedOrder);
    });

    expect(printed[0].customerDetails).toBe('Pioneiro, João');
  });

  it('não busca cliente quando a venda não tem vínculo', async () => {
    const { result } = renderPrint();

    await act(async () => {
      await result.current.printBatch(orderWithTwoBatches, 'b-2');
    });

    expect(findCustomerByUid).not.toHaveBeenCalled();
    expect(printed[0].customerDetails).toBeUndefined();
  });

  it('imprime sem os dados do cliente quando a busca falha', async () => {
    findCustomerByUid.mockResolvedValue(left(new PrintFailedError()));
    const { result } = renderPrint();

    await act(async () => {
      await result.current.printBatch(linkedOrder, 'b-2');
    });

    expect(printed[0].customerDetails).toBeUndefined();
  });

  it('imprime sem os dados do cliente quando o cadastro sumiu', async () => {
    findCustomerByUid.mockResolvedValue(right(undefined));
    const { result } = renderPrint();

    await act(async () => {
      await result.current.printBatch(linkedOrder, 'b-2');
    });

    expect(printed[0].customerDetails).toBeUndefined();
  });
});
