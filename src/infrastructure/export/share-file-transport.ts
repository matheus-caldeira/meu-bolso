import { left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type {
  ExportFile,
  FileShareTransport,
} from '../../domain/export/export.transport';
import { ShareFailedError, ShareUnavailableError } from '../../domain/errors';

interface ShareCapableNavigator {
  share?: (data: { files: File[] }) => Promise<void>;
  canShare?: (data: { files: File[] }) => boolean;
}

export class ShareFileTransport implements FileShareTransport {
  async send(file: ExportFile): Promise<Either<AppError, void>> {
    const nav = navigator as unknown as ShareCapableNavigator;
    const shared = new File([file.content], file.name, {
      type: file.type,
    });

    if (!nav.share || !nav.canShare?.({ files: [shared] })) {
      return left(new ShareUnavailableError());
    }

    try {
      await nav.share({ files: [shared] });
      return right(undefined);
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') {
        return right(undefined);
      }
      return left(new ShareFailedError());
    }
  }
}
