import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { Tabs } from '../atoms/Tabs';
import { Autocomplete } from '../molecules/Autocomplete';
import { SalesSummaryCards } from '../organisms/SalesSummaryCards';
import { ProductRankingList } from '../organisms/ProductRankingList';
import { ReceiptPreview } from '../organisms/ReceiptPreview';
import { useReports } from '../hooks/useReports';
import { usePrint } from '../hooks/usePrint';
import { useToast } from '../molecules/toast-context';
import { container } from '../../app/container';
import { fold, isLeft } from '../../domain/shared/either';
import { formatTime } from '../../domain/shared/format';
import type { PaperWidth } from '../../domain/printing/printer-driver';
import type { Product } from '../../domain/product/product.entity';
import {
  buildDayReportReceipt,
  buildPendingTabsReceipt,
  buildStockReceipt,
} from '../../domain/printing/receipt.builders';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
  pagar_depois: 'Pagar Depois',
  outros: 'outros',
};

const TAB_ITEMS = [
  { value: 'summary', label: 'Resumo' },
  { value: 'day', label: 'Fechamento do dia' },
  { value: 'stock', label: 'Estoque' },
  { value: 'pending', label: 'Comandas pendentes' },
];

function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}

export function ReportsPage() {
  const {
    days,
    selectedDay,
    selectDay,
    sessionsOfDay,
    selectedSessionUid,
    select,
    report,
  } = useReports();
  const { printDayReport, printStock, printPendingTabs } = usePrint();
  const toast = useToast();

  const [tab, setTab] = useState('summary');
  const [dayQuery, setDayQuery] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(80);
  const [stock, setStock] = useState<Product[] | null>(null);
  const [printedAt] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    container.readConfig().then((result) => {
      if (cancelled || isLeft(result)) return;
      setBusinessName(result.right.name);
      setPaperWidth(result.right.printerPaperWidth);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [lastDay, setLastDay] = useState(selectedDay);
  if (selectedDay !== null && lastDay !== selectedDay) {
    setLastDay(selectedDay);
    setDayQuery(selectedDay);
  }

  useEffect(() => {
    if (tab !== 'stock') return;
    let cancelled = false;
    container.loadStockReport().then((result) => {
      if (cancelled) return;
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (products) => setStock(products),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [tab, toast]);

  const summary = report?.summary ?? null;
  const byMethod = report?.byMethod ?? {};
  const products = report?.products ?? [];
  const pending = useMemo(() => report?.pending ?? [], [report]);
  const totalSales = summary?.totalSales ?? 0;

  const dayOptions = useMemo(
    () =>
      days
        .filter((day) => day.includes(dayQuery.trim()))
        .map((day) => ({ value: day, label: day })),
    [days, dayQuery],
  );

  const dayReceipt = useMemo(
    () =>
      report ? buildDayReportReceipt(report, businessName, printedAt) : null,
    [report, businessName, printedAt],
  );

  const stockReceipt = useMemo(
    () => (stock ? buildStockReceipt(stock, businessName, printedAt) : null),
    [stock, businessName, printedAt],
  );

  const pendingReceipt = useMemo(
    () =>
      report ? buildPendingTabsReceipt(pending, businessName, printedAt) : null,
    [report, pending, businessName, printedAt],
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Relatórios</h1>
      </div>

      {days.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-tertiary">
          Nenhuma sessão encontrada
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="max-w-xs">
            <Autocomplete
              label="Dia"
              value={dayQuery}
              options={dayOptions}
              placeholder="Escolha o dia"
              onChange={setDayQuery}
              onSelect={(option) => selectDay(option.value)}
            />
          </div>

          {sessionsOfDay.length > 1 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
                Sessão
              </h3>
              <div className="flex flex-wrap gap-2">
                {sessionsOfDay.map((session) => (
                  <button
                    key={session.uid}
                    type="button"
                    aria-pressed={selectedSessionUid === session.uid}
                    onClick={() => select(session.uid)}
                    className={
                      selectedSessionUid === session.uid
                        ? 'rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-text'
                        : 'rounded-full border border-border-emphasis bg-surface-2 px-3 py-1 text-sm font-semibold text-ink-secondary hover:bg-surface-inset'
                    }
                  >
                    {formatTime(session.openedAt)}
                    {session.closedAt === null && ' (ativa)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Tabs
            items={TAB_ITEMS}
            value={tab}
            label="Relatório"
            onChange={setTab}
          />

          {tab === 'summary' && (
            <div className="flex flex-col gap-6">
              <SalesSummaryCards
                cards={[
                  {
                    label: 'Total Vendas',
                    value: <Money value={totalSales} />,
                    highlight: true,
                  },
                  {
                    label: 'Pedidos Pagos',
                    value: (
                      <span className="font-mono tabular-nums">
                        {summary?.paidCount ?? 0}
                      </span>
                    ),
                  },
                  {
                    label: 'Lucro Bruto',
                    value: <Money value={summary?.profit ?? 0} />,
                  },
                  {
                    label: 'Margem',
                    value: (
                      <span className="font-mono tabular-nums">
                        {(summary?.margin ?? 0).toFixed(1)}%
                      </span>
                    ),
                  },
                ]}
              />

              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
                  Por Forma de Pagamento
                </h3>
                {Object.keys(byMethod).length === 0 ? (
                  <div className="py-6 text-center text-sm text-ink-tertiary">
                    Nenhuma venda ainda
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {Object.entries(byMethod).map(([method, total]) => {
                      const pct =
                        totalSales > 0 ? (total / totalSales) * 100 : 0;
                      return (
                        <div
                          key={method}
                          className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-2"
                        >
                          <span className="w-24 shrink-0 text-sm text-ink-secondary">
                            {paymentLabel(method)}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-inset">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-ink-tertiary">
                            {pct.toFixed(0)}%
                          </span>
                          <Money
                            value={total}
                            className="w-24 shrink-0 text-right font-bold"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
                  Por Produto
                </h3>
                <ProductRankingList
                  products={products}
                  emptyLabel="Nenhuma venda ainda"
                />
              </div>

              {pending.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
                    Pedidos Pendentes
                  </h3>
                  <div className="flex flex-col gap-1">
                    {pending.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-2"
                      >
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="font-mono font-bold tabular-nums text-ink-primary">
                            #{order.ticket}
                          </span>
                          {order.customerName && (
                            <span className="truncate text-sm text-ink-secondary">
                              {order.customerName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            tone={order.status === 'open' ? 'info' : 'warning'}
                            size="xs"
                            uppercase
                          >
                            {order.status === 'open' ? 'Aberto' : 'Pendente'}
                          </Badge>
                          <Money value={order.total} className="font-bold" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'day' && (
            <div className="flex flex-col gap-3">
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!dayReceipt}
                  onClick={() => printDayReport(report!)}
                >
                  Imprimir
                </Button>
              </div>
              <ReceiptPreview
                receipt={dayReceipt}
                paperWidth={paperWidth}
                visible
              />
            </div>
          )}

          {tab === 'stock' && (
            <div className="flex flex-col gap-3">
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!stockReceipt}
                  onClick={() => printStock(stock!)}
                >
                  Imprimir
                </Button>
              </div>
              <ReceiptPreview
                receipt={stockReceipt}
                paperWidth={paperWidth}
                visible
              />
            </div>
          )}

          {tab === 'pending' && (
            <div className="flex flex-col gap-3">
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!pendingReceipt}
                  onClick={() => printPendingTabs(pending)}
                >
                  Imprimir
                </Button>
              </div>
              <ReceiptPreview
                receipt={pendingReceipt}
                paperWidth={paperWidth}
                visible
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
