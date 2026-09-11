import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLeft, isRight } from '../../domain/shared/either';
import {
  ClipboardTextTransport,
  ShareTextTransport,
} from './share-text-transport';

describe('ShareTextTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('compartilha o texto pela bandeja do sistema', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });

    const result = await new ShareTextTransport().send('Resumo do dia');

    expect(isRight(result)).toBe(true);
    expect(share).toHaveBeenCalledWith({ text: 'Resumo do dia' });
  });

  it('trata o cancelamento do usuário como sucesso silencioso', async () => {
    const abort = Object.assign(new Error('cancelado'), { name: 'AbortError' });
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(abort) });

    const result = await new ShareTextTransport().send('Resumo');

    expect(isRight(result)).toBe(true);
  });

  it('avisa quando o dispositivo não compartilha texto', async () => {
    vi.stubGlobal('navigator', {});

    const result = await new ShareTextTransport().send('Resumo');

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('SHARE_UNAVAILABLE');
  });

  it('reporta falha quando o compartilhamento rejeita por outro motivo', async () => {
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('falhou')),
    });

    const result = await new ShareTextTransport().send('Resumo');

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('SHARE_FAILED');
  });
});

describe('ClipboardTextTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('copia o texto para a área de transferência', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await new ClipboardTextTransport().send('Resumo do dia');

    expect(isRight(result)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('Resumo do dia');
  });

  it('avisa quando o dispositivo não tem área de transferência', async () => {
    vi.stubGlobal('navigator', {});

    const result = await new ClipboardTextTransport().send('Resumo');

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('SHARE_UNAVAILABLE');
  });

  it('reporta falha quando a cópia rejeita', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('falhou')) },
    });

    const result = await new ClipboardTextTransport().send('Resumo');

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('SHARE_FAILED');
  });
});
