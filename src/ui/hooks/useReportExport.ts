import { useCallback, useState } from 'react';
import { container } from '../../app/container';
import { isLeft } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type {
  FileShareTransport,
  TextShareTransport,
} from '../../domain/export/export.transport';
import type { ReportSectionId } from '../../domain/export/report-export.entity';
import type { ExportReportInput } from '../../application/report/export-report.usecases';
import { ShareFileTransport } from '../../infrastructure/export/share-file-transport';
import { DownloadFileTransport } from '../../infrastructure/export/download-file-transport';
import {
  ClipboardTextTransport,
  ShareTextTransport,
} from '../../infrastructure/export/share-text-transport';
import { useToast } from '../molecules/toast-context';

interface ShareCapableNavigator {
  share?: (data: { files: File[] }) => Promise<void>;
  canShare?: (data: { files: File[] }) => boolean;
}

export interface ReportExportTarget {
  sessionUid: string;
  businessName: string;
  day: string;
}

function resolveFileTransport(): FileShareTransport {
  const nav = navigator as unknown as ShareCapableNavigator;
  return nav.canShare?.({ files: [] })
    ? new ShareFileTransport()
    : new DownloadFileTransport();
}

function resolveTextTransport(): {
  transport: TextShareTransport;
  copies: boolean;
} {
  const nav = navigator as unknown as ShareCapableNavigator;
  return nav.share
    ? { transport: new ShareTextTransport(), copies: false }
    : { transport: new ClipboardTextTransport(), copies: true };
}

export function useReportExport(target: ReportExportTarget) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [exportingSpreadsheet, setExportingSpreadsheet] = useState(false);

  const buildInput = useCallback(
    (sections: ReportSectionId[]): ExportReportInput => ({
      sessionUid: target.sessionUid,
      businessName: target.businessName,
      day: target.day,
      sections,
      generatedAt: Date.now(),
    }),
    [target],
  );

  const exportSpreadsheet = useCallback(
    async (sections: ReportSectionId[]): Promise<boolean> => {
      const input = buildInput(sections);
      setExporting(true);
      setExportingSpreadsheet(true);
      try {
        const file = await container.exportReportSpreadsheet(input);
        if (isLeft(file)) {
          toast((file.left as AppError).message, 'error');
          return false;
        }

        let result = await resolveFileTransport().send(file.right);
        if (isLeft(result) && result.left.code === 'SHARE_UNAVAILABLE') {
          result = await new DownloadFileTransport().send(file.right);
        }
        if (isLeft(result)) {
          toast((result.left as AppError).message, 'error');
          return false;
        }
        toast('Planilha exportada!');
        return true;
      } finally {
        setExporting(false);
        setExportingSpreadsheet(false);
      }
    },
    [buildInput, toast],
  );

  const buildMessage = useCallback(
    async (sections: ReportSectionId[]): Promise<string | null> => {
      const message = await container.buildReportMessage(buildInput(sections));
      if (isLeft(message)) {
        toast((message.left as AppError).message, 'error');
        return null;
      }
      return message.right;
    },
    [buildInput, toast],
  );

  const shareMessage = useCallback(
    async (text: string): Promise<boolean> => {
      setExporting(true);
      try {
        const primary = resolveTextTransport();
        let copied = primary.copies;
        let result = await primary.transport.send(text);

        if (isLeft(result) && result.left.code === 'SHARE_UNAVAILABLE') {
          copied = true;
          result = await new ClipboardTextTransport().send(text);
        }
        if (isLeft(result)) {
          toast((result.left as AppError).message, 'error');
          return false;
        }
        if (copied) toast('Relatório copiado!');
        return true;
      } finally {
        setExporting(false);
      }
    },
    [toast],
  );

  return {
    exportSpreadsheet,
    buildMessage,
    shareMessage,
    exporting,
    exportingSpreadsheet,
  };
}
