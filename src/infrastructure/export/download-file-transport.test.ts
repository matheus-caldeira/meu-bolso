// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRight } from '../../domain/shared/either';
import { DownloadFileTransport } from './download-file-transport';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DownloadFileTransport', () => {
  it('baixa a planilha e libera a url temporária', async () => {
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const result = await new DownloadFileTransport().send({
      name: 'relatorio.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: new Uint8Array([1, 2, 3]),
    });

    expect(isRight(result)).toBe(true);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
