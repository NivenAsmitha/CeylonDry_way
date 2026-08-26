import Joi from 'joi';

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  PORT: number;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  REFRESH_COOKIE_DOMAIN?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  EMAIL_FROM?: string;
  EMAIL_API_KEY?: string;
}

const optionalString = Joi.string().allow('').optional();

export const environmentValidationSchema: Joi.ObjectSchema<EnvironmentVariables> =
  Joi.object<EnvironmentVariables>({
    NODE_ENV: Joi.string()
      .valid('development', 'test', 'staging', 'production')
      .default('development'),
    PORT: Joi.number().port().default(3000),
    FRONTEND_URL: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .default('http://localhost:5173'),
    DATABASE_URL: Joi.string()
      .uri({ scheme: ['postgres', 'postgresql'] })
      .required(),
    JWT_ACCESS_SECRET: Joi.string().trim().min(32).required(),
    JWT_REFRESH_SECRET: Joi.string()
      .trim()
      .min(32)
      .invalid(Joi.ref('JWT_ACCESS_SECRET'))
      .required()
      .messages({
        'any.invalid': 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
      }),
    JWT_ACCESS_EXPIRES_IN: Joi.string()
      .pattern(/^[1-9]\d*(?:s|m|h|d|w)$/)
      .default('15m'),
    JWT_REFRESH_EXPIRES_IN: Joi.string()
      .pattern(/^[1-9]\d*(?:s|m|h|d|w)$/)
      .default('7d'),
    REFRESH_COOKIE_DOMAIN: optionalString,
    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,
    EMAIL_FROM: optionalString,
    EMAIL_API_KEY: optionalString,
  }).unknown(true);
