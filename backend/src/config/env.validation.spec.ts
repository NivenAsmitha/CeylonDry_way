import { environmentValidationSchema } from './env.validation';

describe('environmentValidationSchema', () => {
  it('applies foundation defaults and permits unrelated variables', () => {
    const validationResult = environmentValidationSchema.validate(
      {
        DATABASE_URL: 'postgresql://user:password@localhost/test',
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
      },
      {
        abortEarly: false,
        allowUnknown: true,
      },
    );

    expect(error?.details).toHaveLength(4);
  });
});
