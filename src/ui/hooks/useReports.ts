import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import { formatDate } from '../../domain/shared/format';
import type { SessionReport } from '../../application/report/report.usecases';
import type { Session } from '../../domain/cash/cash.entity';
import type { Order } from '../../domain/order/order.entity';
import { useToast } from '../molecules/toast-context';

function sortByRecent(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.openedAt - a.openedAt);
}

function distinctDays(sessions: Session[]): string[] {
  return [...new Set(sessions.map((session) => formatDate(session.openedAt)))];
}

function sessionsOfDayIn(sessions: Session[], day: string | null): Session[] {
  if (day === null) return [];
  return sessions.filter((session) => formatDate(session.openedAt) === day);
}

export function useReports() {
  const toast = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionUid, setSelectedSessionUid] = useState<string | null>(
    null,
  );
  const [report, setReport] = useState<SessionReport | null>(null);
  const [pendingAll, setPendingAll] = useState<Order[]>([]);

  useEffect(() => {
    let cancelled = false;
    container.loadPendingAll().then((result) => {
      if (cancelled) return;
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (orders) => setPendingAll(orders),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    container.listReportSessions().then((result) => {
      if (cancelled) return;
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (value) => {
          const sorted = sortByRecent(value);
          setSessions(sorted);
          if (sorted.length > 0) {
            setSelectedSessionUid(sorted[0].uid);
          }
        },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    if (selectedSessionUid === null) {
      Promise.resolve().then(() => {
        if (!cancelled) setReport(null);
      });
      return () => {
        cancelled = true;
      };
    }
    container.loadSessionReport(selectedSessionUid).then((result) => {
      if (cancelled) return;
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (value) => setReport(value),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSessionUid, toast]);

  const select = useCallback((uid: string) => {
    setSelectedSessionUid(uid);
  }, []);

  const selectedSession =
    sessions.find((session) => session.uid === selectedSessionUid) ?? null;
  const selectedDay = selectedSession
    ? formatDate(selectedSession.openedAt)
    : null;
  const days = distinctDays(sessions);
  const sessionsOfDay = sessionsOfDayIn(sessions, selectedDay);

  const selectDay = useCallback(
    (day: string) => {
      const first = sessionsOfDayIn(sessions, day)[0];
      if (first) setSelectedSessionUid(first.uid);
    },
    [sessions],
  );

  return {
    sessions,
    selectedSessionUid,
    select,
    report,
    days,
    selectedDay,
    selectDay,
    sessionsOfDay,
    pendingAll,
  };
}
