import { describe, expect, it } from 'vitest';
import { isLeft, isRight, left, right } from '../../domain/shared/either';
import type { Either } from '../../domain/shared/either';
import type {
  BackupRepository,
  ImportAllResult,
  ImportMode,
} from '../../domain/backup/backup.repository';
import type { InfrastructureError } from '../../infrastructure/errors';
import { ConnectorError } from '../../infrastructure/errors';
import { makeImportAllBackup } from './import-all.usecase';

class FakeBackupRepository implements BackupRepository {
  received: { files: File[]; mode: ImportMode } | null = null;
  private readonly outcome: Either<InfrastructureError, ImportAllResult>;

  constructor(outcome: Either<InfrastructureError, ImportAllResult>) {
    this.outcome = outcome;
  }

  async buildSnapshot(): Promise<Either<InfrastructureError, string>> {
    return right('{}');
  }
  async exportAll(): Promise<Either<InfrastructureError, void>> {
    return right(undefined);
  }
  async exportEntity(): Promise<Either<InfrastructureError, void>> {
    return right(undefined);
  }
  async importEntity(): Promise<Either<InfrastructureError, number>> {
    return right(0);
  }
  async importAll(
    files: File[],
    mode: ImportMode,
  ): Promise<Either<InfrastructureError, ImportAllResult>> {
    this.received = { files, mode };
    return this.outcome;
  }
  async hasData(): Promise<Either<InfrastructureError, boolean>> {
    return right(false);
  }
  async importDemo(): Promise<Either<InfrastructureError, void>> {
    return right(undefined);
  }
  async wipeAll(): Promise<Either<InfrastructureError, void>> {
    return right(undefined);
  }
}

describe('makeImportAllBackup', () => {
  it('delega ao repositório e devolve a contagem', async () => {
    const repository = new FakeBackupRepository(
      right({ imported: { products: 3 }, skipped: [] }),
    );
    const importAll = makeImportAllBackup(repository);
    const file = new File([''], 'pdv-products.csv');

    const result = await importAll([file], 'merge');

    expect(isRight(result)).toBe(true);
    expect(isRight(result) && result.right.imported.products).toBe(3);
    expect(repository.received?.mode).toBe('merge');
    expect(repository.received?.files).toEqual([file]);
  });

  it('propaga a falha do repositório', async () => {
    const repository = new FakeBackupRepository(
      left(new ConnectorError('falhou')),
    );
    const importAll = makeImportAllBackup(repository);

    const result = await importAll([], 'replace');

    expect(isLeft(result)).toBe(true);
    expect(repository.received?.mode).toBe('replace');
  });
});
