import type { BusinessTypeDefinition } from './business-type.entity';

export interface ExtraEntry {
  key: string;
  value: string;
}

export function declaredKeys(
  def: BusinessTypeDefinition,
  scope: 'business' | 'customer',
): string[] {
  return def.fields[scope].map((field) => field.key);
}

export function filledExtra(
  def: BusinessTypeDefinition,
  scope: 'business' | 'customer',
  extra: Record<string, string>,
): ExtraEntry[] {
  return declaredKeys(def, scope)
    .map((key) => ({ key, value: (extra[key] ?? '').trim() }))
    .filter((entry) => entry.value !== '');
}

export function splitExtra(
  extra: Record<string, string>,
  declared: string[],
): { inline: ExtraEntry[]; orphans: ExtraEntry[] } {
  const inline: ExtraEntry[] = declared.map((key) => ({
    key,
    value: extra[key] ?? '',
  }));
  const declaredSet = new Set(declared);
  const orphans: ExtraEntry[] = Object.entries(extra)
    .filter(([key, value]) => !declaredSet.has(key) && value !== '')
    .map(([key, value]) => ({ key, value }));
  return { inline, orphans };
}
