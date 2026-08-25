function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export interface AccessJwtPayload {
  sub: string;
  type: 'access';
}

export interface RefreshJwtPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

export function isAccessJwtPayload(value: unknown): value is AccessJwtPayload {
  return (
    isRecord(value) &&
    typeof value.sub === 'string' &&
    value.sub.length > 0 &&
    value.type === 'access'
  );
}

export function isRefreshJwtPayload(
  value: unknown,
): value is RefreshJwtPayload {
  return (
    isRecord(value) &&
    typeof value.sub === 'string' &&
    value.sub.length > 0 &&
    typeof value.sid === 'string' &&
    value.sid.length > 0 &&
    value.type === 'refresh'
  );
}
