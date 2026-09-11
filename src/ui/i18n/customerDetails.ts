import type { Customer } from '../../domain/customer/customer.entity';
import { getBusinessType } from '../../domain/business-type/registry';
import { filledExtra } from '../../domain/business-type/business-type.rules';
import { t } from './t';

export function customerDetailValues(
  customer: Customer | undefined,
  businessTypeId: string,
): string[] {
  const definition = customer && getBusinessType(businessTypeId);
  if (!definition) return [];

  return filledExtra(definition, 'customer', customer.extra).map(
    ({ key, value }) => {
      const translated = t(`field.${key}.${value}`, businessTypeId);
      return translated === `field.${key}.${value}` ? value : translated;
    },
  );
}
