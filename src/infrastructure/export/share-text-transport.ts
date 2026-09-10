import { left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { TextShareTransport } from '../../domain/export/export.transport';
import { ShareFailedError, ShareUnavailableError } from '../../domain/errors';

interface TextShareCapableNavigator {
  share?: (data: { text: string }) => Promise<void>;
}

export class ShareTextTransport implements TextShareTransport {
  async send(text: string): Promise<Either<AppError, void>> {
    const nav = navigator as unknown as TextShareCapableNavigator;
    if (!nav.share) return left(new ShareUnavailableError());

    try {
      await nav.share({ text });
      return right(undefined);
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') {
        return right(undefined);
      }
      return left(new ShareFailedError());
    }
  }
}

export class ClipboardTextTransport implements TextShareTransport {
  async send(text: string): Promise<Either<AppError, void>> {
    if (!navigator.clipboard) return left(new ShareUnavailableError());
    try {
      await navigator.clipboard.writeText(text);
      return right(undefined);
    } catch {
      return left(new ShareFailedError());
    }
  }
}
