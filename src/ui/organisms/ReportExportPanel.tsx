import { useCallback, useState } from 'react';
import { Button } from '../atoms/Button';
import type { ReportSectionId } from '../../domain/export/report-export.entity';
import {
  useReportExport,
  type ReportExportTarget,
} from '../hooks/useReportExport';

interface ReportExportPanelProps {
  target: ReportExportTarget;
}

const SECTIONS: { id: ReportSectionId; label: string; hint: string }[] = [
  {
    id: 'summary',
    label: 'Resumo do dia',
    hint: 'Totais, lucro e formas de pagamento',
  },
  {
    id: 'sales',
    label: 'Vendas',
    hint: 'Cada item vendido, comanda a comanda',
  },
  { id: 'stock', label: 'Estoque', hint: 'Quantidade atual de cada produto' },
  {
    id: 'pending',
    label: 'Comandas pendentes',
    hint: 'Quem ainda não pagou e o que pediu',
  },
];

const ALL_SECTIONS = SECTIONS.map((section) => section.id);

export function ReportExportPanel({ target }: ReportExportPanelProps) {
  const { exportSpreadsheet, buildMessage, shareMessage, exporting } =
    useReportExport(target);
  const [selected, setSelected] = useState<ReportSectionId[]>(ALL_SECTIONS);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = useCallback((id: ReportSectionId) => {
    setMessage(null);
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }, []);

  const ordered = ALL_SECTIONS.filter((id) => selected.includes(id));
  const disabled = ordered.length === 0 || exporting;

  async function handlePreview() {
    setMessage(await buildMessage(ordered));
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          O que incluir
        </legend>
        {SECTIONS.map((section) => (
          <label
            key={section.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface-2 px-4 py-3"
          >
            <input
              type="checkbox"
              checked={selected.includes(section.id)}
              onChange={() => toggle(section.id)}
              className="mt-1 size-4 accent-accent"
            />
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-ink-primary">
                {section.label}
              </span>
              <span className="text-xs text-ink-tertiary">{section.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          Planilha
        </h3>
        <p className="text-xs text-ink-tertiary">
          Um arquivo .xlsx com uma aba para cada relatório selecionado.
        </p>
        <Button
          disabled={disabled}
          onClick={() => exportSpreadsheet(ordered)}
          fullWidth
        >
          Exportar planilha
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          Mensagem
        </h3>
        <p className="text-xs text-ink-tertiary">
          Texto pronto para enviar no WhatsApp.
        </p>
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={handlePreview}
          fullWidth
        >
          Gerar mensagem
        </Button>
        {message !== null && (
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-bold uppercase tracking-wide text-ink-tertiary"
              htmlFor="report-message"
            >
              Prévia da mensagem
            </label>
            <textarea
              id="report-message"
              readOnly
              value={message}
              rows={12}
              className="w-full rounded-md border border-border bg-surface-inset px-3 py-2 font-mono text-xs tabular-nums text-ink-primary"
            />
            <Button
              disabled={exporting}
              onClick={() => shareMessage(message)}
              fullWidth
            >
              Compartilhar mensagem
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
