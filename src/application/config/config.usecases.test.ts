import { describe, expect, it } from 'vitest';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { ConfigRepository } from '../../domain/config/config.repository';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import {
  makePeekTicketSuggestion,
  makeReadConfig,
  makeResetTicketSequence,
  makeSaveBackupInfo,
  makeSaveConfig,
  makeSavePrinterConfig,
  type ConfigInput,
} from './config.usecases';

const config: BusinessConfig = {
  id: 1,
  name: 'Bar',
  document: '',
  phone: '',
  address: '',
  ticketCounter: 1,
  ticketLimit: 9999,
  ticketAutoReset: true,
  statusControlEnabled: true,
  businessTypeId: 'tab',
  enabledModules: [],
  extra: {},
  printerDriver: 'browser',
  printerPaperWidth: 80,
  printerCodepage: 'cp860',
  printerAutoPrintOnClose: false,
  printerBatchIncludesPrevious: true,
  layoutMode: 'auto',
};

class FakeConfigRepository implements ConfigRepository {
  saved: Partial<BusinessConfig> | null = null;

  async read(): Promise<Either<InfrastructureError, BusinessConfig>> {
    return right(config);
  }
  async claimTicket(): Promise<Either<InfrastructureError, string>> {
    return right('0001');
  }
  async save(
    patch: Partial<BusinessConfig>,
  ): Promise<Either<InfrastructureError, BusinessConfig>> {
    this.saved = patch;
    return right({ ...config, ...patch });
  }
}

const input = (over: Partial<ConfigInput> = {}): ConfigInput => ({
  name: '  Bar  ',
  document: '  12  ',
  phone: '  99  ',
  address: '  Rua  ',
  ticketCounter: 7,
  ticketLimit: 50.5,
  ticketAutoReset: false,
  statusControlEnabled: true,
  businessTypeId: 'scout',
  extra: { group: 'Alcatéia' },
  layoutMode: 'mobile',
  ...over,
});

describe('makeReadConfig', () => {
  it('returns the stored config', async () => {
    const result = await makeReadConfig(new FakeConfigRepository())();
    expect(isRight(result) && result.right.statusControlEnabled).toBe(true);
  });
});

describe('makeSaveConfig', () => {
  it('normalizes business info and ticket limit before saving', async () => {
    const repo = new FakeConfigRepository();
    const result = await makeSaveConfig(repo)(input());
    expect(isRight(result)).toBe(true);
    expect(repo.saved).toEqual({
      name: 'Bar',
      document: '12',
      phone: '99',
      address: 'Rua',
      ticketCounter: 7,
      ticketLimit: 50,
      ticketAutoReset: false,
      statusControlEnabled: true,
      businessTypeId: 'scout',
      extra: { group: 'Alcatéia' },
      layoutMode: 'mobile',
    });
  });

  it('recusa um contador acima do limite sem gravar nada', async () => {
    const repo = new FakeConfigRepository();
    const result = await makeSaveConfig(repo)(input({ ticketCounter: 51 }));
    expect(isLeft(result)).toBe(true);
    expect(isLeft(result) && result.left.code).toBe('INVALID_TICKET_COUNTER');
    expect(repo.saved).toBeNull();
  });

  it('recusa um contador zerado, fracionado ou inválido', async () => {
    const repo = new FakeConfigRepository();
    for (const ticketCounter of [0, -1, 7.5, Number.NaN]) {
      const result = await makeSaveConfig(repo)(input({ ticketCounter }));
      expect(isLeft(result) && result.left.code).toBe('INVALID_TICKET_COUNTER');
    }
    expect(repo.saved).toBeNull();
  });

  it('aceita o contador exatamente no limite', async () => {
    const repo = new FakeConfigRepository();
    const result = await makeSaveConfig(repo)(input({ ticketCounter: 50 }));
    expect(isRight(result)).toBe(true);
    expect(repo.saved?.ticketCounter).toBe(50);
  });

  it('cai em auto quando o layoutMode informado é inválido', async () => {
    const repo = new FakeConfigRepository();
    const result = await makeSaveConfig(repo)(
      input({ layoutMode: 'invalid' as ConfigInput['layoutMode'] }),
    );
    expect(isRight(result)).toBe(true);
    expect(repo.saved?.layoutMode).toBe('auto');
  });
});

describe('makeSavePrinterConfig', () => {
  it('saves the printer fields as-is', async () => {
    const repo = new FakeConfigRepository();
    const result = await makeSavePrinterConfig(repo)({
      printerDriver: 'bluetooth',
      printerPaperWidth: 58,
      printerCodepage: 'cp860',
      printerAutoPrintOnClose: true,
      printerBatchIncludesPrevious: true,
    });
    expect(isRight(result)).toBe(true);
    expect(repo.saved).toEqual({
      printerDriver: 'bluetooth',
      printerPaperWidth: 58,
      printerCodepage: 'cp860',
      printerAutoPrintOnClose: true,
      printerBatchIncludesPrevious: true,
    });
  });
});

describe('makeSaveBackupInfo', () => {
  it('saves the backup fields as-is', async () => {
    const repo = new FakeConfigRepository();
    const result = await makeSaveBackupInfo(repo)({
      lastBackupAt: 1000,
      lastBackupPromptAt: 2000,
    });
    expect(isRight(result)).toBe(true);
    expect(repo.saved).toEqual({
      lastBackupAt: 1000,
      lastBackupPromptAt: 2000,
    });
  });
});

describe('makeResetTicketSequence', () => {
  it('normalizes the counter and saves only that field', async () => {
    const repo = new FakeConfigRepository();
    await makeResetTicketSequence(repo)(7.9);
    expect(repo.saved).toEqual({ ticketCounter: 7 });
  });
});

describe('makePeekTicketSuggestion', () => {
  it('formats the current counter padded to the limit width', async () => {
    const result = await makePeekTicketSuggestion(new FakeConfigRepository())();
    expect(isRight(result) && result.right).toBe('0001');
  });

  it('propagates a failure from read', async () => {
    const repo = new FakeConfigRepository();
    repo.read = async () => left(new ConnectorError('x'));
    const result = await makePeekTicketSuggestion(repo)();
    expect(isLeft(result)).toBe(true);
  });
});
