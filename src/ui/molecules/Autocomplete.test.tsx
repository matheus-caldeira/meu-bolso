import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Autocomplete, type AutocompleteOption } from './Autocomplete';

afterEach(cleanup);

const options: AutocompleteOption[] = [
  { value: 'c-1', label: 'Maju', hint: 'Lobinho' },
  { value: 'c-2', label: 'Pedro' },
];

describe('Autocomplete', () => {
  it('não mostra a lista antes de o campo receber foco', () => {
    render(
      <Autocomplete
        label="Comanda"
        value=""
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('mostra a lista ao focar e esconde ao sair do campo', async () => {
    render(
      <>
        <Autocomplete
          label="Comanda"
          value=""
          options={options}
          onChange={vi.fn()}
          onSelect={vi.fn()}
        />
        <button type="button">Fora</button>
      </>,
    );

    await userEvent.click(screen.getByLabelText('Comanda'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('mantém a lista aberta ao navegar para uma opção com Tab', async () => {
    render(
      <Autocomplete
        label="Comanda"
        value=""
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText('Comanda'));
    await userEvent.tab();

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('não mostra a lista quando não há opções', () => {
    render(
      <Autocomplete
        label="Cliente"
        value=""
        options={[]}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('avisa a cada tecla digitada', async () => {
    const onChange = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value=""
        options={[]}
        onChange={onChange}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText('Cliente'), 'ma');

    expect(onChange).toHaveBeenCalled();
  });

  it('seleciona uma opção com o clique', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByLabelText('Cliente'));
    await userEvent.click(screen.getByRole('option', { name: /Maju/ }));

    expect(onSelect).toHaveBeenCalledWith(options[0]);
  });

  it('navega com as setas e confirma com Enter', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="p"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(options[1]);
  });

  it('sobe com a seta para cima', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="p"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(options[0]);
  });

  it('fecha a lista com Esc', async () => {
    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ignora Enter quando nada está destacado', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByLabelText('Cliente'));
    await userEvent.keyboard('{Enter}');

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('sobe para o último item quando nada está destacado', async () => {
    const onSelect = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value="p"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(options[1]);
  });

  it('reseta o item destacado quando as opções mudam', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <Autocomplete
        label="Cliente"
        value="p"
        options={options}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');

    rerender(
      <Autocomplete
        label="Cliente"
        value="p"
        options={[...options]}
        onChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await userEvent.keyboard('{Enter}');

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('limita a altura da lista e deixa rolar', async () => {
    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText('Cliente'));

    const list = screen.getByRole('listbox');
    expect(list.className).toContain('max-h-56');
    expect(list.className).toContain('overflow-y-auto');
  });

  it('mantém o item destacado visível ao navegar com as setas', async () => {
    const scrollIntoView = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText('Cliente'));
    await userEvent.keyboard('{ArrowDown}');

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });

    HTMLElement.prototype.scrollIntoView = original;
  });

  it('não mostra a lupa quando a busca não é oferecida', () => {
    render(
      <Autocomplete
        label="Cliente"
        value=""
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /Buscar/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Cliente').className).not.toContain('pr-12');
  });

  it('aciona a busca pela lupa', async () => {
    const onSearch = vi.fn();
    render(
      <Autocomplete
        label="Cliente"
        value=""
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
        onSearch={onSearch}
      />,
    );

    const search = screen.getByRole('button', { name: 'Buscar Cliente' });
    expect(search.className).toContain('h-11');
    expect(search.className).toContain('w-11');
    expect(screen.getByLabelText('Cliente').className).toContain('pr-12');

    await userEvent.click(search);

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('aceita um rótulo próprio para a lupa', () => {
    render(
      <Autocomplete
        label="Cliente"
        value=""
        options={options}
        searchLabel="Buscar cliente na lista"
        onChange={vi.fn()}
        onSelect={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Buscar cliente na lista' }),
    ).toBeInTheDocument();
  });

  it('não sinaliza vínculo quando a prop não é passada', () => {
    render(
      <Autocomplete
        label="Cliente"
        value="Maju"
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.queryByText('Cliente vinculado ao cadastro'),
    ).not.toBeInTheDocument();
    const input = screen.getByLabelText('Cliente');
    expect(input.className).toContain('border-border-emphasis');
    expect(input.className).not.toContain('border-success');
  });

  it('sinaliza o vínculo com ícone, cor e texto acessível', () => {
    render(
      <Autocomplete
        label="Cliente"
        value="Maju"
        options={options}
        selected
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Cliente vinculado ao cadastro'),
    ).toBeInTheDocument();
    const input = screen.getByLabelText('Cliente');
    expect(input.className).toContain('border-success');
    expect(input.className).not.toContain('border-border-emphasis');
    expect(input.className).toContain('pr-9');
  });

  it('aceita um texto acessível próprio para o vínculo', () => {
    render(
      <Autocomplete
        label="Comanda"
        value="0012"
        options={options}
        selected
        selectedLabel="Comanda encontrada"
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Comanda encontrada')).toBeInTheDocument();
  });

  it('afasta o sinal da lupa quando as duas convivem', () => {
    render(
      <Autocomplete
        label="Cliente"
        value="Maju"
        options={options}
        selected
        onChange={vi.fn()}
        onSelect={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Cliente');
    expect(input.className).toContain('pr-18');

    const search = screen.getByRole('button', { name: 'Buscar Cliente' });
    expect(search.className).toContain('h-11');
    expect(search.className).toContain('w-11');

    const mark = screen.getByText('Cliente vinculado ao cadastro')
      .parentElement as HTMLElement;
    expect(mark.className).toContain('right-11');
    expect(mark.className).toContain('pointer-events-none');
  });

  it('esconde o sinal assim que o texto é editado', async () => {
    function Host() {
      const [value, setValue] = useState('Maju');
      const [selected, setSelected] = useState(true);
      return (
        <Autocomplete
          label="Cliente"
          value={value}
          options={options}
          selected={selected}
          onChange={(next) => {
            setValue(next);
            setSelected(false);
          }}
          onSelect={(option) => {
            setValue(option.label);
            setSelected(true);
          }}
        />
      );
    }

    render(<Host />);

    expect(
      screen.getByText('Cliente vinculado ao cadastro'),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Cliente'), 'x');

    expect(
      screen.queryByText('Cliente vinculado ao cadastro'),
    ).not.toBeInTheDocument();
  });

  it('mostra a dica da opção', async () => {
    render(
      <Autocomplete
        label="Cliente"
        value="ma"
        options={options}
        onChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText('Cliente'));

    expect(screen.getByText('Lobinho')).toBeInTheDocument();
  });
});
