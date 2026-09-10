import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportExportPanel } from './ReportExportPanel';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import {
  EmptyReportSelectionError,
  ShareFailedError,
  ShareUnavailableError,
} from '../../domain/errors';

const exportReportSpreadsheet = vi.fn();
const buildReportMessage = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    exportReportSpreadsheet: (input: unknown) => exportReportSpreadsheet(input),
    buildReportMessage: (input: unknown) => buildReportMessage(input),
  },
}));

const shareFileSend = vi.fn();
const downloadFileSend = vi.fn();
const shareTextSend = vi.fn();
const clipboardSend = vi.fn();

vi.mock('../../infrastructure/export/share-file-transport', () => ({
  ShareFileTransport: class {
    send(file: unknown) {
      return shareFileSend(file);
    }
  },
}));

vi.mock('../../infrastructure/export/download-file-transport', () => ({
  DownloadFileTransport: class {
    send(file: unknown) {
      return downloadFileSend(file);
    }
  },
}));

vi.mock('../../infrastructure/export/share-text-transport', () => ({
  ShareTextTransport: class {
    send(text: string) {
      return shareTextSend(text);
    }
  },
  ClipboardTextTransport: class {
    send(text: string) {
      return clipboardSend(text);
    }
  },
}));

const TARGET = {
  sessionUid: 's-1',
  businessName: 'Grupo Escoteiro',
  day: '09/09/2026',
};

const FILE = {
  name: 'relatorio-09-09-2026.xlsx',
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  content: new Uint8Array([1]),
};

function renderPanel(target: typeof TARGET = TARGET) {
  return render(
    <ToastProvider>
      <ReportExportPanel target={target} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  exportReportSpreadsheet.mockResolvedValue(right(FILE));
  buildReportMessage.mockResolvedValue(
    right('*Grupo Escoteiro*\nVendas: R$ 20,00'),
  );
  shareFileSend.mockResolvedValue(right(undefined));
  downloadFileSend.mockResolvedValue(right(undefined));
  shareTextSend.mockResolvedValue(right(undefined));
  clipboardSend.mockResolvedValue(right(undefined));
  vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ReportExportPanel', () => {
  it('começa com todos os relatórios marcados', () => {
    renderPanel();

    for (const label of [
      'Resumo do dia',
      'Vendas',
      'Estoque',
      'Comandas pendentes',
    ]) {
      expect(
        screen.getByRole('checkbox', { name: new RegExp(label) }),
      ).toBeChecked();
    }
  });

  it('exporta a planilha com as seções marcadas', async () => {
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar planilha' }),
    );

    await waitFor(() => expect(exportReportSpreadsheet).toHaveBeenCalled());
    expect(exportReportSpreadsheet.mock.calls[0][0]).toMatchObject({
      sessionUid: 's-1',
      businessName: 'Grupo Escoteiro',
      day: '09/09/2026',
      sections: ['summary', 'sales', 'stock', 'pending'],
    });
    expect(shareFileSend).toHaveBeenCalledWith(FILE);
    expect(await screen.findByText('Planilha exportada!')).toBeInTheDocument();
  });

  it('desmarcar um relatório o tira da exportação', async () => {
    renderPanel();

    await userEvent.click(screen.getByRole('checkbox', { name: /Estoque/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar planilha' }),
    );

    await waitFor(() => expect(exportReportSpreadsheet).toHaveBeenCalled());
    expect(exportReportSpreadsheet.mock.calls[0][0].sections).toEqual([
      'summary',
      'sales',
      'pending',
    ]);
  });

  it('remarcar um relatório o devolve na ordem original', async () => {
    renderPanel();

    const summary = screen.getByRole('checkbox', { name: /Resumo do dia/ });
    await userEvent.click(summary);
    await userEvent.click(summary);
    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar planilha' }),
    );

    await waitFor(() => expect(exportReportSpreadsheet).toHaveBeenCalled());
    expect(exportReportSpreadsheet.mock.calls[0][0].sections).toEqual([
      'summary',
      'sales',
      'stock',
      'pending',
    ]);
  });

  it('desabilita os botões quando nada está marcado', async () => {
    renderPanel();

    for (const label of [
      'Resumo do dia',
      'Vendas',
      'Estoque',
      'Comandas pendentes',
    ]) {
      await userEvent.click(
        screen.getByRole('checkbox', { name: new RegExp(label) }),
      );
    }

    expect(
      screen.getByRole('button', { name: 'Exportar planilha' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Gerar mensagem' }),
    ).toBeDisabled();
  });

  it('baixa a planilha quando o dispositivo não compartilha arquivos', async () => {
    vi.stubGlobal('navigator', { canShare: () => false });
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar planilha' }),
    );

    await waitFor(() => expect(downloadFileSend).toHaveBeenCalledWith(FILE));
    expect(shareFileSend).not.toHaveBeenCalled();
  });

  it('cai para o download quando o compartilhamento fica indisponível', async () => {
    shareFileSend.mockResolvedValue(left(new ShareUnavailableError()));
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar planilha' }),
    );

    await waitFor(() => expect(downloadFileSend).toHaveBeenCalledWith(FILE));
  });

  it('avisa quando a planilha não pode ser montada', async () => {
    exportReportSpreadsheet.mockResolvedValue(
      left(new EmptyReportSelectionError()),
    );
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar planilha' }),
    );

    expect(
      await screen.findByText('Selecione pelo menos um relatório.'),
    ).toBeInTheDocument();
  });

  it('avisa quando o envio da planilha falha', async () => {
    shareFileSend.mockResolvedValue(left(new ShareFailedError()));
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Exportar planilha' }),
    );

    expect(
      await screen.findByText(
        'Não foi possível compartilhar. Tente novamente.',
      ),
    ).toBeInTheDocument();
  });

  it('mostra a prévia da mensagem e a compartilha', async () => {
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar mensagem' }),
    );

    const preview = await screen.findByLabelText('Prévia da mensagem');
    expect(preview).toHaveValue('*Grupo Escoteiro*\nVendas: R$ 20,00');

    await userEvent.click(
      screen.getByRole('button', { name: 'Compartilhar mensagem' }),
    );

    await waitFor(() =>
      expect(shareTextSend).toHaveBeenCalledWith(
        '*Grupo Escoteiro*\nVendas: R$ 20,00',
      ),
    );
  });

  it('copia a mensagem quando o dispositivo não compartilha texto', async () => {
    vi.stubGlobal('navigator', { canShare: () => true });
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar mensagem' }),
    );
    await screen.findByLabelText('Prévia da mensagem');
    await userEvent.click(
      screen.getByRole('button', { name: 'Compartilhar mensagem' }),
    );

    await waitFor(() => expect(clipboardSend).toHaveBeenCalled());
    expect(await screen.findByText('Relatório copiado!')).toBeInTheDocument();
  });

  it('cai para a cópia quando o compartilhamento de texto fica indisponível', async () => {
    shareTextSend.mockResolvedValue(left(new ShareUnavailableError()));
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar mensagem' }),
    );
    await screen.findByLabelText('Prévia da mensagem');
    await userEvent.click(
      screen.getByRole('button', { name: 'Compartilhar mensagem' }),
    );

    await waitFor(() => expect(clipboardSend).toHaveBeenCalled());
  });

  it('avisa quando a cópia da mensagem também falha', async () => {
    shareTextSend.mockResolvedValue(left(new ShareUnavailableError()));
    clipboardSend.mockResolvedValue(left(new ShareFailedError()));
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar mensagem' }),
    );
    await screen.findByLabelText('Prévia da mensagem');
    await userEvent.click(
      screen.getByRole('button', { name: 'Compartilhar mensagem' }),
    );

    expect(
      await screen.findByText(
        'Não foi possível compartilhar. Tente novamente.',
      ),
    ).toBeInTheDocument();
  });

  it('avisa quando a mensagem não pode ser montada', async () => {
    buildReportMessage.mockResolvedValue(left(new EmptyReportSelectionError()));
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar mensagem' }),
    );

    expect(
      await screen.findByText('Selecione pelo menos um relatório.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Prévia da mensagem'),
    ).not.toBeInTheDocument();
  });

  it('esconde a prévia ao trocar a seleção', async () => {
    renderPanel();

    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar mensagem' }),
    );
    await screen.findByLabelText('Prévia da mensagem');

    await userEvent.click(screen.getByRole('checkbox', { name: /Estoque/ }));

    expect(
      screen.queryByLabelText('Prévia da mensagem'),
    ).not.toBeInTheDocument();
  });
});
