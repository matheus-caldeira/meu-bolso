const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
  pagar_depois: 'Pagar Depois',
  outros: 'Outros',
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}
