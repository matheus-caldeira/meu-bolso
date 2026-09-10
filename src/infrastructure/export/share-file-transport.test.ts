import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLeft, isRight } from '../../domain/shared/either';
import type { ExportFile } from '../../domain/export/export.transport';
import { ShareFileTransport } from './share-file-transport';

function makeFile(): ExportFile {
  return {
    name: 'relatorio.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: new Uint8Array([1, 2, 3]),
  };
}

describe('ShareFileTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('compartilha a planilha pela bandeja do sistema', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });

    const result = await new ShareFileTransport().send(makeFile());

    expect(isRight(result)).toBe(true);
    expect(share).toHaveBeenCalled();
  });

  it('trata o cancelamento do usuário como sucesso silencioso', async () => {
    const abort = Object.assign(new Error('cancelado'), { name: 'AbortError' });
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(abort),
      canShare: () => true,
    });

    const result = await new ShareFileTransport().send(makeFile());

    expect(isRight(result)).toBe(true);
  });

  it('avisa quando o dispositivo não compartilha arquivos', async () => {
    vi.stubGlobal('navigator', {});

    const result = await new ShareFileTransport().send(makeFile());

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('SHARE_UNAVAILABLE');
  });

  it('avisa quando canShare recusa o arquivo', async () => {
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => false });

    const result = await new ShareFileTransport().send(makeFile());

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('SHARE_UNAVAILABLE');
  });

  it('reporta falha quando o compartilhamento rejeita por outro motivo', async () => {
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('falhou')),
      canShare: () => true,
    });

    const result = await new ShareFileTransport().send(makeFile());

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('SHARE_FAILED');
  });
});
