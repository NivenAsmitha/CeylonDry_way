import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';
import { REFRESH_COOKIE_NAME } from './auth.constants';

const REFRESH_COOKIE_PATH = '/api/v1/auth';

function durationMilliseconds(value: string): number {
  const match = /^(\d+)(s|m|h|d|w)$/.exec(value);

  if (!match) throw new Error('Invalid refresh-cookie lifetime configuration');
  const amount = Number.parseInt(match[1], 10);
  const multipliers = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  } as const;
  const milliseconds =
    amount * multipliers[match[2] as keyof typeof multipliers];

  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
    throw new Error('Invalid refresh-cookie lifetime configuration');
  }

  return milliseconds;
}

@Injectable()
export class RefreshCookieService {
  readonly name = REFRESH_COOKIE_NAME;
  private readonly baseOptions: CookieOptions;
  private readonly maxAge: number;

  constructor(configService: ConfigService) {
    const production =
      configService.getOrThrow<string>('NODE_ENV') === 'production';
    const domain = configService.get<string>('REFRESH_COOKIE_DOMAIN')?.trim();

    this.maxAge = durationMilliseconds(
      configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
    );
    this.baseOptions = {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      ...(domain ? { domain } : {}),
    };
  }

  getSetOptions(): CookieOptions {
    return { ...this.baseOptions, maxAge: this.maxAge };
  }

  getClearOptions(): CookieOptions {
    return { ...this.baseOptions };
  }
}
