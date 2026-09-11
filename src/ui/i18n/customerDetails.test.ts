import { describe, expect, it } from 'vitest';
import type { Customer } from '../../domain/customer/customer.entity';
import { customerDetailValues } from './customerDetails';

function makeCustomer(extra: Record<string, string>): Customer {
  return {
    uid: 'customer-1',
    name: 'Maju',
    addresses: [],
    extra,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('customerDetailValues', () => {
  it('traduz o valor do select e mantém o texto livre', () => {
    const customer = makeCustomer({
      section: 'lobinho',
      guardian: 'Maria da Silva',
    });

    expect(customerDetailValues(customer, 'scout')).toEqual([
      'Lobinho',
      'Maria da Silva',
    ]);
  });

  it('mantém o valor cru quando não há tradução para ele', () => {
    const customer = makeCustomer({ section: 'mateiro' });

    expect(customerDetailValues(customer, 'scout')).toEqual(['mateiro']);
  });

  it('devolve só o campo preenchido', () => {
    const customer = makeCustomer({ section: '', guardian: 'Ana' });

    expect(customerDetailValues(customer, 'scout')).toEqual(['Ana']);
  });

  it('devolve vazio quando o cliente não tem campos extras', () => {
    expect(customerDetailValues(makeCustomer({}), 'scout')).toEqual([]);
  });

  it('devolve vazio quando o tipo de negócio não declara campos de cliente', () => {
    const customer = makeCustomer({ section: 'lobinho' });

    expect(customerDetailValues(customer, 'quick_sale')).toEqual([]);
  });

  it('devolve vazio quando o tipo de negócio é desconhecido', () => {
    const customer = makeCustomer({ section: 'lobinho' });

    expect(customerDetailValues(customer, 'nao-existe')).toEqual([]);
  });

  it('devolve vazio quando não há cliente vinculado', () => {
    expect(customerDetailValues(undefined, 'scout')).toEqual([]);
  });
});
