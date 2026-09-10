import { right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type {
  ExportFile,
  FileShareTransport,
} from '../../domain/export/export.transport';

export class DownloadFileTransport implements FileShareTransport {
  async send(file: ExportFile): Promise<Either<AppError, void>> {
    const blob = new Blob([file.content], { type: file.type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
    return right(undefined);
  }
}
