import { environmentValidationSchema } from './env.validation';

describe('environmentValidationSchema', () => {
  it('applies foundation defaults and permits unrelated variables', () => {
    const validationResult = environmentValidationSchema.validate(
      {
        DATABASE_URL: 'postgresql://user:password@localhost/test',
        JWT_ACCESS_SECRET: 'access-secret-that-is-at-least-32-characters',
        JWT_REFRESH_SECRET: 'refresh-secret-that-is-at-least-32-characters',
        OPERATING_SYSTEM_VALUE: 'allowed',
      },
      {
        abortEarly: false,
        allowUnknown: true,
      },
    );
    const validatedEnvironment: unknown = validationResult.value;

    expect(validationResult.error).toBeUndefined();
    expect(validatedEnvironment).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      FRONTEND_URL: 'http://localhost:5173',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      OPERATING_SYSTEM_VALUE: 'allowed',
    });
  });

  it('reports all invalid foundation values', () => {
    const { error } = environmentValidationSchema.validate(
      {
        NODE_ENV: 'invalid',
        PORT: 70_000,
        FRONTEND_URL: 'not-a-url',
        DATABASE_URL: 'mysql://localhost/test',
        JWT_ACCESS_SECRET: 'short',
        JWT_REFRESH_SECRET: 'short',
      },
      {
        abortEarly: false,
        allowUnknown: true,
      },
    );

    expect(error?.details).toHaveLength(7);
  });

  it('requires different access and refresh secrets', () => {
    const sharedSecret = 'same-secret-that-is-at-least-32-characters';
    const { error } = environmentValidationSchema.validate({
      DATABASE_URL: 'postgresql://user:password@localhost/test',
      JWT_ACCESS_SECRET: sharedSecret,
      JWT_REFRESH_SECRET: sharedSecret,
    });

    expect(error?.message).toContain(
      'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
    );
  });
});
