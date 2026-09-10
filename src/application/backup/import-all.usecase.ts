import type { Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type {
  BackupRepository,
  ImportAllResult,
  ImportMode,
} from '../../domain/backup/backup.repository';

export function makeImportAllBackup(repository: BackupRepository) {
  return (
    files: File[],
    mode: ImportMode,
  ): Promise<Either<AppError, ImportAllResult>> =>
    repository.importAll(files, mode);
}
