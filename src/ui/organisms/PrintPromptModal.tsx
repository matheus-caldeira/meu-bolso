import { Printer } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import type { Order } from '../../domain/order/order.entity';

interface PrintPromptModalProps {
  order: Order | null;
  onPrint: () => void;
  onDismiss: () => void;
  printing: boolean;
}

export function PrintPromptModal({
  order,
  onPrint,
  onDismiss,
  printing,
}: PrintPromptModalProps) {
  if (!order) return null;

  return (
    <Modal open onClose={onDismiss} title="Imprimir comanda?">
      <div className="flex flex-col items-center gap-1 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
          Comanda
        </span>
        <span className="font-mono text-5xl font-extrabold tabular-nums text-accent">
          {order.ticket}
        </span>
        {order.customerName && (
          <span className="text-base font-semibold text-ink-primary">
            {order.customerName}
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Button fullWidth onClick={onPrint} disabled={printing}>
          <Printer size={16} /> {printing ? 'Imprimindo...' : 'Imprimir'}
        </Button>
        <Button variant="ghost" fullWidth onClick={onDismiss}>
          Agora não
        </Button>
      </div>
    </Modal>
  );
}
