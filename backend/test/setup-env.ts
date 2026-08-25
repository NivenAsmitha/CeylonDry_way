process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://test:test@localhost:5432/ceylon_dryway_test';
process.env.JWT_ACCESS_SECRET =
  'e2e-access-secret-that-is-longer-than-thirty-two-characters';
process.env.JWT_REFRESH_SECRET =
  'e2e-refresh-secret-that-is-different-and-longer-than-thirty-two';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
