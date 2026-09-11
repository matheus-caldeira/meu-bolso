import type { Either } from '../shared/either';
import type { AppError } from '../shared/errors';

export interface ExportFile {
  name: string;
  type: string;
  content: Uint8Array<ArrayBuffer>;
}

export interface FileShareTransport {
  send(file: ExportFile): Promise<Either<AppError, void>>;
}

export interface TextShareTransport {
  send(text: string): Promise<Either<AppError, void>>;
}
