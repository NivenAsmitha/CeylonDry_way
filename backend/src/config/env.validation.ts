import Joi from 'joi';

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  PORT: number;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
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
    JWT_ACCESS_SECRET: optionalString,
    JWT_REFRESH_SECRET: optionalString,
    JWT_ACCESS_EXPIRES_IN: Joi.string().min(1).default('15m'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().min(1).default('7d'),
    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,
    EMAIL_FROM: optionalString,
    EMAIL_API_KEY: optionalString,
  }).unknown(true);
