import { describe, expect, it } from 'vitest';
import { paymentMethodLabel } from './payment-labels';

describe('paymentMethodLabel', () => {
  it('traduz os meios conhecidos', () => {
    expect(paymentMethodLabel('pix')).toBe('PIX');
    expect(paymentMethodLabel('credito')).toBe('Crédito');
    expect(paymentMethodLabel('debito')).toBe('Débito');
    expect(paymentMethodLabel('dinheiro')).toBe('Dinheiro');
    expect(paymentMethodLabel('pagar_depois')).toBe('Pagar Depois');
    expect(paymentMethodLabel('outros')).toBe('Outros');
  });

  it('devolve o próprio valor quando o meio é desconhecido', () => {
    expect(paymentMethodLabel('boleto')).toBe('boleto');
  });
});
