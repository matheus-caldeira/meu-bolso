import { describe, expect, it } from 'vitest';
import {
  buildBusinessInfo,
  formatTicket,
  nextTicketCounter,
  normalizeLayoutMode,
  normalizeTicketCounter,
  normalizeTicketLimit,
  parseTicketNumber,
  reconcileTicketCounter,
  shouldClaimTicket,
} from './config.rules';

describe('formatTicket', () => {
  it('pads to the digit count of the limit', () => {
    expect(formatTicket(7, 9999)).toBe('0007');
  });

  it('uses three digits for a limit of 100', () => {
    expect(formatTicket(5, 100)).toBe('005');
  });

  it('falls back to a single digit for a zero limit', () => {
    expect(formatTicket(3, 0)).toBe('3');
  });
});

describe('nextTicketCounter', () => {
  it('increments by one', () => {
    expect(nextTicketCounter(1, 9999, true)).toBe(2);
  });

  it('resets to one past the limit when auto reset is on', () => {
    expect(nextTicketCounter(9999, 9999, true)).toBe(1);
  });

  it('keeps counting past the limit when auto reset is off', () => {
    expect(nextTicketCounter(9999, 9999, false)).toBe(10000);
  });
});

describe('buildBusinessInfo', () => {
  it('trims every field', () => {
    expect(
      buildBusinessInfo({
        name: '  Bar  ',
        document: ' 123 ',
        phone: ' 4199 ',
        address: ' Rua A ',
      }),
    ).toEqual({
      name: 'Bar',
      document: '123',
      phone: '4199',
      address: 'Rua A',
    });
  });
});

describe('normalizeTicketLimit', () => {
  it('floors and clamps to at least one', () => {
    expect(normalizeTicketLimit(99.9)).toBe(99);
    expect(normalizeTicketLimit(0)).toBe(1);
    expect(normalizeTicketLimit(Number.NaN)).toBe(1);
  });
});

describe('normalizeTicketCounter', () => {
  it('floors and clamps to at least one', () => {
    expect(normalizeTicketCounter(5.7)).toBe(5);
    expect(normalizeTicketCounter(-3)).toBe(1);
    expect(normalizeTicketCounter(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('normalizeLayoutMode', () => {
  it('aceita os três modos válidos', () => {
    expect(normalizeLayoutMode('auto')).toBe('auto');
    expect(normalizeLayoutMode('mobile')).toBe('mobile');
    expect(normalizeLayoutMode('desktop')).toBe('desktop');
  });

  it('cai em auto para qualquer valor inválido', () => {
    expect(normalizeLayoutMode('tablet')).toBe('auto');
    expect(normalizeLayoutMode('')).toBe('auto');
    expect(normalizeLayoutMode(undefined)).toBe('auto');
  });
});

describe('parseTicketNumber', () => {
  it('lê o número ignorando os zeros à esquerda', () => {
    expect(parseTicketNumber('0041')).toBe(41);
    expect(parseTicketNumber(' 0007 ')).toBe(7);
    expect(parseTicketNumber('0')).toBe(0);
  });

  it('devolve null para valores não numéricos ou ausentes', () => {
    expect(parseTicketNumber('')).toBeNull();
    expect(parseTicketNumber('   ')).toBeNull();
    expect(parseTicketNumber('A12')).toBeNull();
    expect(parseTicketNumber('12.5')).toBeNull();
    expect(parseTicketNumber('-3')).toBeNull();
    expect(parseTicketNumber(undefined)).toBeNull();
    expect(parseTicketNumber(41)).toBeNull();
  });

  it('devolve null para inteiros fora da faixa segura', () => {
    expect(parseTicketNumber('9'.repeat(20))).toBeNull();
  });
});

describe('reconcileTicketCounter', () => {
  it('preserva o contador do backup quando ele está à frente dos pedidos', () => {
    expect(reconcileTicketCounter(42, ['0001', '0041'])).toBe(42);
    expect(reconcileTicketCounter(100, ['0001', '0041'])).toBe(100);
  });

  it('avança para o maior ticket mais um quando o contador ficou atrás', () => {
    expect(reconcileTicketCounter(1, ['0001', '0041', '0012'])).toBe(42);
    expect(reconcileTicketCounter(30, ['0041'])).toBe(42);
  });

  it('ignora tickets não numéricos sem quebrar', () => {
    expect(reconcileTicketCounter(5, ['', '   ', 'ABC', null, undefined])).toBe(
      5,
    );
    expect(reconcileTicketCounter(5, ['ABC', '0009'])).toBe(10);
  });

  it('preserva o contador quando nenhum pedido foi importado', () => {
    expect(reconcileTicketCounter(42, [])).toBe(42);
  });

  it('normaliza contadores inválidos para pelo menos um', () => {
    expect(reconcileTicketCounter(0, [])).toBe(1);
    expect(reconcileTicketCounter(Number.NaN, [])).toBe(1);
  });
});

describe('shouldClaimTicket', () => {
  it('reserva o próximo número quando nenhum ticket foi informado', () => {
    expect(shouldClaimTicket(undefined, '0001')).toBe(true);
    expect(shouldClaimTicket('', '0001')).toBe(true);
    expect(shouldClaimTicket('   ', '0001')).toBe(true);
  });

  it('reserva o próximo número quando o informado é igual à sugestão', () => {
    expect(shouldClaimTicket('0001', '0001')).toBe(true);
    expect(shouldClaimTicket(' 0001 ', '0001')).toBe(true);
  });

  it('não reserva quando o usuário digitou outro número', () => {
    expect(shouldClaimTicket('42', '0001')).toBe(false);
  });
});
