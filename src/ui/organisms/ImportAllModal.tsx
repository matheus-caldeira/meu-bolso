import { AlertTriangle, FileText, Merge } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import { BACKUP_ENTITY_LABELS } from '../i18n/backup-entity-labels';
import type {
  BackupEntity,
  ImportAllResult,
  ImportMode,
} from '../../domain/backup/backup.repository';

interface ImportAllModalProps {
  files: File[];
  result: ImportAllResult | null;
  importing: boolean;
  onConfirm: (mode: ImportMode) => void;
  onClose: () => void;
}

export function ImportAllModal({
  files,
  result,
  importing,
  onConfirm,
  onClose,
}: ImportAllModalProps) {
  if (files.length === 0) return null;

  return (
    <Modal open onClose={onClose} title="Importar tudo">
      {result ? (
        <ImportSummary result={result} onClose={onClose} />
      ) : (
        <ModeChoice
          files={files}
          importing={importing}
          onConfirm={onConfirm}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

interface ModeChoiceProps {
  files: File[];
  importing: boolean;
  onConfirm: (mode: ImportMode) => void;
  onClose: () => void;
}

function ModeChoice({ files, importing, onConfirm, onClose }: ModeChoiceProps) {
  return (
    <div className="flex flex-col gap-4">
      <FileList title="Arquivos escolhidos:" names={files.map((f) => f.name)} />

      <div className="flex flex-col gap-2 rounded-md border border-danger/40 bg-surface-inset p-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle size={16} /> Substituir tudo
        </span>
        <p className="text-sm text-ink-secondary">
          Apaga todos os dados atuais deste aparelho, inclusive os ajustes, e
          coloca no lugar o conteúdo do backup.
        </p>
        <Button
          variant="danger"
          fullWidth
          disabled={importing}
          onClick={() => onConfirm('replace')}
        >
          Substituir tudo
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-inset p-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
          <Merge size={16} /> Somar ao que existe
        </span>
        <p className="text-sm text-ink-secondary">
          Mantém o que já existe e acrescenta o backup. Registros repetidos são
          atualizados, não duplicados.
        </p>
        <Button
          fullWidth
          disabled={importing}
          onClick={() => onConfirm('merge')}
        >
          Somar ao que existe
        </Button>
      </div>

      {importing && (
        <p className="text-center text-sm font-semibold text-ink-secondary">
          Importando...
        </p>
      )}

      <Button variant="ghost" fullWidth disabled={importing} onClick={onClose}>
        Cancelar
      </Button>
    </div>
  );
}

interface ImportSummaryProps {
  result: ImportAllResult;
  onClose: () => void;
}

function ImportSummary({ result, onClose }: ImportSummaryProps) {
  const entries = Object.entries(result.imported) as [BackupEntity, number][];

  return (
    <div className="flex flex-col gap-4">
      {entries.length === 0 ? (
        <p className="text-sm text-ink-secondary">Nenhum dado foi importado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {entries.map(([entity, count]) => (
            <li
              key={entity}
              className="flex items-center justify-between rounded-md bg-surface-inset px-3 py-2 text-sm"
            >
              <span className="text-ink-secondary">
                {BACKUP_ENTITY_LABELS[entity]}
              </span>
              <span className="font-mono font-semibold tabular-nums text-ink-primary">
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}

      {result.skipped.length > 0 && (
        <FileList
          title="Não reconhecemos estes arquivos:"
          names={result.skipped}
        />
      )}

      <Button fullWidth onClick={onClose}>
        Concluir
      </Button>
    </div>
  );
}

interface FileListProps {
  title: string;
  names: string[];
}

function FileList({ title, names }: FileListProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
        {title}
      </span>
      <ul className="flex flex-col gap-1">
        {names.map((name) => (
          <li
            key={name}
            className="flex items-center gap-2 text-sm text-ink-secondary"
          >
            <FileText size={14} /> {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
