import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReports } from './useReports';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { SessionReport } from '../../application/report/report.usecases';
import type { Session } from '../../domain/cash/cash.entity';

const listReportSessions = vi.fn();
const loadSessionReport = vi.fn();
const loadPendingAll = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listReportSessions: () => listReportSessions(),
    loadSessionReport: (uid: string) => loadSessionReport(uid),
    loadPendingAll: () => loadPendingAll(),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const DAY_ONE = new Date(1970, 0, 1, 10, 0).getTime();
const DAY_TWO_MORNING = new Date(1970, 0, 2, 9, 0).getTime();
const DAY_TWO_NIGHT = new Date(1970, 0, 2, 19, 0).getTime();

const SESSIONS: Session[] = [
  {
    id: 1,
    uid: 'session-1',
    openedAt: DAY_ONE,
    closedAt: DAY_ONE + 1000,
    cashInitial: 0,
    cashFinal: 0,
    notes: '',
  },
  {
    id: 3,
    uid: 'session-3',
    openedAt: DAY_TWO_MORNING,
    closedAt: DAY_TWO_MORNING + 1000,
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

function makeReport(total: number): SessionReport {
  return {
    summary: {
      totalSales: total,
      totalCost: 0,
      profit: total,
      margin: 0,
      paidCount: 0,
      averageTicket: 0,
    },
    byMethod: {},
    products: [],
    pending: [],
  };
}

function Probe() {
  const {
    sessions,
    selectedSessionUid,
    select,
    report,
    days,
    selectedDay,
    selectDay,
    sessionsOfDay,
    pendingAll,
  } = useReports();
  return (
    <div>
      <span>count:{sessions.length}</span>
      <span>selected:{selectedSessionUid ?? 'none'}</span>
      <span>report:{report ? report.summary.totalSales : 'none'}</span>
      <span>days:{days.join('|')}</span>
      <span>day:{selectedDay ?? 'none'}</span>
      <span>ofDay:{sessionsOfDay.map((s) => s.uid).join('|')}</span>
      <span>pendingAll:{pendingAll.length}</span>
      <button onClick={() => select('session-1')}>select-1</button>
      <button onClick={() => selectDay('01/01/1970')}>select-day</button>
      <button onClick={() => selectDay('31/12/1969')}>select-empty-day</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ToastProvider>
      <Probe />
    </ToastProvider>,
  );
}

describe('useReports', () => {
  beforeEach(() => {
    listReportSessions.mockReset();
    loadSessionReport.mockReset();
    loadPendingAll.mockReset();
    listReportSessions.mockResolvedValue(right(SESSIONS));
    loadSessionReport.mockResolvedValue(right(makeReport(50)));
    loadPendingAll.mockResolvedValue(right([]));
  });
  afterEach(cleanup);

  it('loads sessions and selects the most recent by default', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('selected:session-2')).toBeInTheDocument(),
    );
    expect(screen.getByText('count:3')).toBeInTheDocument();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
  });

  it('lists the distinct days from most to least recent', async () => {
    renderProbe();
    await waitFor(() =>
      expect(
        screen.getByText('days:02/01/1970|01/01/1970'),
      ).toBeInTheDocument(),
    );
  });

  it('selects the day of the most recent session by default', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('day:02/01/1970')).toBeInTheDocument(),
    );
  });

  it('exposes every session of the selected day, most recent first', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('ofDay:session-2|session-3')).toBeInTheDocument(),
    );
  });

  it('selects the most recent session of a newly chosen day', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('selected:session-2')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('select-day'));
    await waitFor(() =>
      expect(screen.getByText('day:01/01/1970')).toBeInTheDocument(),
    );
    expect(screen.getByText('selected:session-1')).toBeInTheDocument();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenLastCalledWith('session-1'),
    );
  });

  it('keeps the current selection when the chosen day has no session', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('selected:session-2')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('select-empty-day'));
    expect(screen.getByText('selected:session-2')).toBeInTheDocument();
    expect(screen.getByText('day:02/01/1970')).toBeInTheDocument();
  });

  it('follows the day when a session of another day is selected', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('day:02/01/1970')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('select-1'));
    await waitFor(() =>
      expect(screen.getByText('day:01/01/1970')).toBeInTheDocument(),
    );
    expect(screen.getByText('ofDay:session-1')).toBeInTheDocument();
  });

  it('loads the pending orders of every session once', async () => {
    loadPendingAll.mockResolvedValue(
      right([{ uid: 'o1' }, { uid: 'o2' }, { uid: 'o3' }]),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('pendingAll:3')).toBeInTheDocument(),
    );
    expect(loadPendingAll).toHaveBeenCalledTimes(1);
  });

  it('keeps the pending list independent from the selected day', async () => {
    loadPendingAll.mockResolvedValue(right([{ uid: 'o1' }]));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('pendingAll:1')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('select-day'));
    await waitFor(() =>
      expect(screen.getByText('day:01/01/1970')).toBeInTheDocument(),
    );
    expect(screen.getByText('pendingAll:1')).toBeInTheDocument();
    expect(loadPendingAll).toHaveBeenCalledTimes(1);
  });

  it('toasts when loading the pending orders fails', async () => {
    loadPendingAll.mockResolvedValue(left(new FakeError('falha pendentes')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha pendentes'),
    );
    expect(screen.getByText('pendingAll:0')).toBeInTheDocument();
  });

  it('handles an empty session list with no selection', async () => {
    listReportSessions.mockResolvedValue(right([]));
    renderProbe();
    await waitFor(() => expect(listReportSessions).toHaveBeenCalled());
    expect(screen.getByText('count:0')).toBeInTheDocument();
    expect(screen.getByText('selected:none')).toBeInTheDocument();
    expect(screen.getByText('report:none')).toBeInTheDocument();
    expect(loadSessionReport).not.toHaveBeenCalled();
  });

  it('loads the report when the selection changes', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('report:50')).toBeInTheDocument(),
    );
    loadSessionReport.mockResolvedValue(right(makeReport(99)));
    await userEvent.click(screen.getByText('select-1'));
    await waitFor(() =>
      expect(screen.getByText('selected:session-1')).toBeInTheDocument(),
    );
    expect(loadSessionReport).toHaveBeenLastCalledWith('session-1');
    await waitFor(() =>
      expect(screen.getByText('report:99')).toBeInTheDocument(),
    );
  });

  it('toasts when loading sessions fails', async () => {
    listReportSessions.mockResolvedValue(left(new FakeError('falha sessoes')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha sessoes'),
    );
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });

  it('toasts when loading a report fails', async () => {
    loadSessionReport.mockResolvedValue(left(new FakeError('falha relatorio')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha relatorio'),
    );
    expect(screen.getByText('report:none')).toBeInTheDocument();
  });

  it('ignores resolved sessions after unmount', async () => {
    let resolveSessions: (value: ReturnType<typeof right>) => void = () => {};
    listReportSessions.mockReturnValue(
      new Promise((resolve) => {
        resolveSessions = resolve;
      }),
    );
    const { unmount } = renderProbe();
    await waitFor(() => expect(listReportSessions).toHaveBeenCalled());
    unmount();
    resolveSessions(right(SESSIONS));
    await Promise.resolve();
    expect(screen.queryByText('count:3')).not.toBeInTheDocument();
  });

  it('ignores a resolved report after unmount', async () => {
    let resolveReport: (value: ReturnType<typeof right>) => void = () => {};
    loadSessionReport.mockReturnValue(
      new Promise((resolve) => {
        resolveReport = resolve;
      }),
    );
    const { unmount } = renderProbe();
    await waitFor(() =>
      expect(loadSessionReport).toHaveBeenCalledWith('session-2'),
    );
    unmount();
    resolveReport(right(makeReport(77)));
    await Promise.resolve();
    expect(screen.queryByText('report:77')).not.toBeInTheDocument();
  });

  it('ignores the clear microtask after unmount with no selection', async () => {
    listReportSessions.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderProbe();
    unmount();
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('report:none')).not.toBeInTheDocument();
  });
});
