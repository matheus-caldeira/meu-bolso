import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsPage } from './ReportsPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { SessionReport } from '../../application/report/report.usecases';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { Session } from '../../domain/cash/cash.entity';
import type { Order, OrderStatus } from '../../domain/order/order.entity';
import type { Product } from '../../domain/product/product.entity';

const listReportSessions = vi.fn();
const loadSessionReport = vi.fn();
const loadStockReport = vi.fn();
const readConfig = vi.fn();
const printDayReport = vi.fn();
const printStock = vi.fn();
const printPendingTabs = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listReportSessions: () => listReportSessions(),
    loadSessionReport: (uid: string) => loadSessionReport(uid),
    loadStockReport: () => loadStockReport(),
    readConfig: () => readConfig(),
  },
}));

const exportPanelTarget = vi.fn();

vi.mock('../organisms/ReportExportPanel', () => ({
  ReportExportPanel: ({ target }: { target: unknown }) => {
    exportPanelTarget(target);
    return <div>painel de exportação</div>;
  },
}));

vi.mock('../hooks/usePrint', () => ({
  usePrint: () => ({
    printOrder: vi.fn(),
    printStock: (products: unknown) => printStock(products),
    printPendingTabs: (orders: unknown) => printPendingTabs(orders),
    printDayReport: (report: unknown) => printDayReport(report),
    printing: false,
  }),
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const DAY_ONE = new Date(2026, 8, 8, 10, 0).getTime();
const DAY_TWO_MORNING = new Date(2026, 8, 9, 9, 0).getTime();
const DAY_TWO_NIGHT = new Date(2026, 8, 9, 19, 0).getTime();

const SESSIONS: Session[] = [
  {
    id: 1,
    uid: 'session-1',
    openedAt: DAY_ONE,
    closedAt: DAY_ONE + 3600000,
    cashInitial: 0,
    cashFinal: 0,
    notes: '',
  },
  {
    id: 3,
    uid: 'session-3',
    openedAt: DAY_TWO_MORNING,
    closedAt: DAY_TWO_MORNING + 3600000,
    cashInitial: 0,
    cashFinal: 0,
    notes: '',
  },
  {
    id: 2,
    uid: 'session-2',
    openedAt: DAY_TWO_NIGHT,
    closedAt: null,
    cashInitial: 0,
    cashFinal: null,
    notes: '',
  },
];

const CONFIG = {
  name: 'Grupo Escoteiro',
  printerPaperWidth: 80,
} as BusinessConfig;

function makeOrder(ticket: string, status: OrderStatus, name: string): Order {
  return {
    id: Number(ticket),
    uid: `order-${ticket}`,
    businessTypeId: 'tab',
    sessionUid: 'session-2',
    items: [],
    total: 30,
    paymentMethod: null,
    customerName: name,
    ticket,
    customerPhone: '',
    stage: 'aceito',
    status,
    createdAt: DAY_TWO_NIGHT,
    updatedAt: DAY_TWO_NIGHT,
  };
}

const FULL_REPORT: SessionReport = {
  summary: {
    totalSales: 200,
    totalCost: 80,
    profit: 120,
    margin: 60,
    paidCount: 4,
  },
  byMethod: { pix: 100, mistura: 100 },
  products: [{ name: 'Coxinha', qty: 5, total: 150, cost: 50 }],
  pending: [makeOrder('10', 'open', 'Ana'), makeOrder('11', 'pending', 'Bia')],
};

function renderPage() {
  return render(
    <ToastProvider>
      <ReportsPage />
    </ToastProvider>,
  );
}

async function openTab(name: string) {
  await userEvent.click(await screen.findByRole('tab', { name }));
}

describe('ReportsPage', () => {
  beforeEach(() => {
    listReportSessions.mockReset();
    loadSessionReport.mockReset();
    loadStockReport.mockReset();
    readConfig.mockReset();
    printDayReport.mockReset();
    printStock.mockReset();
    printPendingTabs.mockReset();
    exportPanelTarget.mockReset();
    listReportSessions.mockResolvedValue(right(SESSIONS));
    loadSessionReport.mockResolvedValue(right(FULL_REPORT));
    loadStockReport.mockResolvedValue(right([]));
    readConfig.mockResolvedValue(right(CONFIG));
  });
  afterEach(cleanup);

  it('shows the empty state when there are no sessions', async () => {
    listReportSessions.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nenhuma sessão encontrada')).toBeInTheDocument(),
    );
  });

  it('starts on the day of the most recent session', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Dia' })).toHaveValue(
        '09/09/2026',
      ),
    );
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
  });

  it('lists the matching days while typing in the autocomplete', async () => {
    renderPage();
    const input = await screen.findByRole('combobox', { name: 'Dia' });
    await userEvent.clear(input);
    await userEvent.type(input, '08/09');
    const option = await screen.findByRole('option', { name: /08\/09\/2026/ });
    await userEvent.click(option);
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-1'),
    );
  });

  it('shows the session picker only when the day has more than one session', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Dia' })).toHaveValue(
        '09/09/2026',
      ),
    );
    expect(screen.getByRole('button', { name: /19:00/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /09:00/ })).toBeInTheDocument();
  });

  it('hides the session picker when the day has a single session', async () => {
    const input = await (async () => {
      renderPage();
      return screen.findByRole('combobox', { name: 'Dia' });
    })();
    await userEvent.clear(input);
    await userEvent.type(input, '08/09');
    await userEvent.click(
      await screen.findByRole('option', { name: /08\/09\/2026/ }),
    );
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-1'),
    );
    expect(
      screen.queryByRole('button', { name: /10:00/ }),
    ).not.toBeInTheDocument();
  });

  it('switches the report when another session of the day is picked', async () => {
    renderPage();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
    await userEvent.click(screen.getByRole('button', { name: /09:00/ }));
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenLastCalledWith('session-3'),
    );
  });

  it('renders the summary cards on the summary tab', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('R$ 200,00')).toBeInTheDocument(),
    );
    expect(screen.getByText('Total Vendas')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument();
  });

  it('renders payment methods with percentages and labels', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('PIX')).toBeInTheDocument());
    expect(screen.getByText('mistura')).toBeInTheDocument();
    expect(screen.getAllByText('50%')).toHaveLength(2);
  });

  it('renders the product ranking', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Coxinha')).toBeInTheDocument(),
    );
    expect(screen.getByText('5x')).toBeInTheDocument();
  });

  it('renders pending orders with open and pending badges', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#10')).toBeInTheDocument());
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('shows the day closing receipt on its tab', async () => {
    renderPage();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
    await openTab('Fechamento do dia');
    expect(await screen.findByText('Grupo Escoteiro')).toBeInTheDocument();
    expect(screen.getByText('Total de vendas')).toBeInTheDocument();
    expect(screen.getByText('Margem')).toBeInTheDocument();
  });

  it('prints the day closing receipt from its tab', async () => {
    renderPage();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
    await openTab('Fechamento do dia');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Imprimir' }),
    );
    expect(printDayReport).toHaveBeenCalledWith(FULL_REPORT);
  });

  it('shows the stock receipt on its tab', async () => {
    loadStockReport.mockResolvedValue(
      right([{ uid: 'p1', name: 'Refri', stock: 3 }] as Product[]),
    );
    renderPage();
    await openTab('Estoque');
    expect(await screen.findByText('Estoque atual')).toBeInTheDocument();
    expect(screen.getByText('Refri')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('prints the stock receipt from its tab', async () => {
    const products = [{ uid: 'p1', name: 'Refri', stock: 3 }] as Product[];
    loadStockReport.mockResolvedValue(right(products));
    renderPage();
    await openTab('Estoque');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Imprimir' }),
    );
    expect(printStock).toHaveBeenCalledWith(products);
  });

  it('toasts when loading the stock report fails', async () => {
    loadStockReport.mockResolvedValue(left(new FakeError('falha estoque')));
    renderPage();
    await openTab('Estoque');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha estoque'),
    );
    expect(printStock).not.toHaveBeenCalled();
  });

  it('shows the pending tabs receipt on its tab', async () => {
    renderPage();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
    await openTab('Comandas pendentes');
    expect(await screen.findByText('10 — Ana')).toBeInTheDocument();
    expect(screen.getByText('11 — Bia')).toBeInTheDocument();
    expect(screen.getByText('R$ 60,00')).toBeInTheDocument();
  });

  it('prints the pending tabs receipt from its tab', async () => {
    renderPage();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
    await openTab('Comandas pendentes');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Imprimir' }),
    );
    expect(printPendingTabs).toHaveBeenCalledWith(FULL_REPORT.pending);
  });

  it('abre o painel de exportação com a sessão e o dia escolhidos', async () => {
    renderPage();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
    await openTab('Exportar');

    expect(await screen.findByText('painel de exportação')).toBeInTheDocument();
    await waitFor(() =>
      expect(exportPanelTarget).toHaveBeenLastCalledWith({
        sessionUid: 'session-2',
        businessName: 'Grupo Escoteiro',
        day: '09/09/2026',
      }),
    );
  });

  it('keeps the default business name when the config fails to load', async () => {
    readConfig.mockResolvedValue(left(new FakeError('falha config')));
    renderPage();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
    await openTab('Fechamento do dia');
    expect(await screen.findByText('Total de vendas')).toBeInTheDocument();
    expect(screen.queryByText('Grupo Escoteiro')).not.toBeInTheDocument();
  });

  it('leaves the day field empty while no session is selected', async () => {
    listReportSessions.mockReturnValue(new Promise(() => {}));
    renderPage();
    await waitFor(() => expect(listReportSessions).toHaveBeenCalled());
    expect(screen.getByText('Nenhuma sessão encontrada')).toBeInTheDocument();
  });

  it('ignores a resolved stock report after unmount', async () => {
    let resolveStock: (value: unknown) => void = () => {};
    loadStockReport.mockReturnValue(
      new Promise((resolve) => {
        resolveStock = resolve;
      }),
    );
    const { unmount } = renderPage();
    await openTab('Estoque');
    await waitFor(() => expect(loadStockReport).toHaveBeenCalled());
    unmount();
    resolveStock(right([{ uid: 'p1', name: 'Refri', stock: 3 }] as Product[]));
    await Promise.resolve();
    expect(screen.queryByText('Refri')).not.toBeInTheDocument();
  });

  it('renders zero percentages when a method has no sales', async () => {
    loadSessionReport.mockResolvedValue(
      right({
        summary: {
          totalSales: 0,
          totalCost: 0,
          profit: 0,
          margin: 0,
          paidCount: 0,
        },
        byMethod: { pix: 0 },
        products: [],
        pending: [],
      }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('PIX')).toBeInTheDocument());
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows empty hints when the report has no sales', async () => {
    loadSessionReport.mockResolvedValue(
      right({
        summary: {
          totalSales: 0,
          totalCost: 0,
          profit: 0,
          margin: 0,
          paidCount: 0,
        },
        byMethod: {},
        products: [],
        pending: [],
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Nenhuma venda ainda').length).toBe(2),
    );
    expect(screen.queryByText('Pedidos Pendentes')).not.toBeInTheDocument();
  });
});
