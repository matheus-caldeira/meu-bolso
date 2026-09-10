import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ImportAllModal } from './ImportAllModal';

afterEach(cleanup);

const files = [
  new File([''], 'pdv-products.csv'),
  new File([''], 'pdv-customers.csv'),
];

describe('ImportAllModal', () => {
  it('não renderiza sem arquivos', () => {
    const { container } = render(
      <ImportAllModal
        files={[]}
        result={null}
        importing={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('lista os arquivos escolhidos e os avisos de cada modo', () => {
    render(
      <ImportAllModal
        files={files}
        result={null}
        importing={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('dialog', { name: 'Importar tudo' }),
    ).toBeInTheDocument();
    expect(screen.getByText('pdv-products.csv')).toBeInTheDocument();
    expect(screen.getByText('pdv-customers.csv')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Apaga todos os dados atuais deste aparelho, inclusive os ajustes, e coloca no lugar o conteúdo do backup.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Mantém o que já existe e acrescenta o backup. Registros repetidos são atualizados, não duplicados.',
      ),
    ).toBeInTheDocument();
  });

  it('confirma a substituição de tudo', () => {
    const onConfirm = vi.fn();
    render(
      <ImportAllModal
        files={files}
        result={null}
        importing={false}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Substituir tudo' }));

    expect(onConfirm).toHaveBeenCalledWith('replace');
  });

  it('confirma a soma ao que existe', () => {
    const onConfirm = vi.fn();
    render(
      <ImportAllModal
        files={files}
        result={null}
        importing={false}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Somar ao que existe' }),
    );

    expect(onConfirm).toHaveBeenCalledWith('merge');
  });

  it('fecha ao cancelar', () => {
    const onClose = vi.fn();
    render(
      <ImportAllModal
        files={files}
        result={null}
        importing={false}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('desabilita os botões enquanto importa', () => {
    render(
      <ImportAllModal
        files={files}
        result={null}
        importing
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Importando...')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Substituir tudo' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Somar ao que existe' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('lista as entidades encontradas com as contagens', () => {
    render(
      <ImportAllModal
        files={files}
        result={{ imported: { products: 12, customers: 3 }, skipped: [] }}
        importing={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Produtos')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('mostra os arquivos ignorados', () => {
    render(
      <ImportAllModal
        files={files}
        result={{ imported: {}, skipped: ['planilha.csv'] }}
        importing={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Não reconhecemos estes arquivos:'),
    ).toBeInTheDocument();
    expect(screen.getByText('planilha.csv')).toBeInTheDocument();
  });

  it('avisa quando nada foi importado', () => {
    render(
      <ImportAllModal
        files={files}
        result={{ imported: {}, skipped: [] }}
        importing={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Nenhum dado foi importado.')).toBeInTheDocument();
  });

  it('fecha o resultado pelo botão de concluir', () => {
    const onClose = vi.fn();
    render(
      <ImportAllModal
        files={files}
        result={{ imported: { products: 1 }, skipped: [] }}
        importing={false}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(onClose).toHaveBeenCalled();
  });
});
