import type { TransformFnParams } from 'class-transformer';

export function trimString(params: TransformFnParams): unknown {
  const value: unknown = params.value;

  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeEmail(params: TransformFnParams): unknown {
  const value = trimString(params);

  return typeof value === 'string' ? value.toLowerCase() : value;
}
