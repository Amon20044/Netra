/**
 * Shallow-merge `overrides` onto `defaults`, ignoring `undefined` values so a
 * caller passing `{ foo: undefined }` does not clobber a real default.
 */
export function mergeConfig<T extends object>(
  defaults: T,
  overrides?: Partial<T>,
): T {
  if (!overrides) return { ...defaults };
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const value = overrides[key];
    if (value !== undefined) {
      result[key] = value as T[keyof T];
    }
  }
  return result;
}
