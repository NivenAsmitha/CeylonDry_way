import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PasswordResetDelivery {
  userId: string;
  email: string;
  name: string;
  rawToken: string;
  expiresAt: Date;
}

@Injectable()
export class PasswordResetDeliveryService {
  private readonly logger = new Logger(PasswordResetDeliveryService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordReset(delivery: PasswordResetDelivery): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const resetUrl = new URL('/reset-password', frontendUrl);
    resetUrl.searchParams.set('token', delivery.rawToken);

    const apiKey = this.configService.get<string>('EMAIL_API_KEY')?.trim();
    const from = this.configService.get<string>('EMAIL_FROM')?.trim();
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );

    if (!apiKey || !from) {
      if (environment === 'development' || environment === 'test') {
        this.logger.warn(
          `Development password-reset link for ${delivery.email}: ${resetUrl.toString()}`,
        );
        return;
      }

      throw new ServiceUnavailableException(
        'Password-reset email delivery is not configured',
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [delivery.email],
        subject: 'Reset your ComfortGo password',
        text: [
          `Hello ${delivery.name},`,
          '',
          'Use the link below to reset your ComfortGo password:',
          resetUrl.toString(),
          '',
          `This link expires at ${delivery.expiresAt.toISOString()} and can be used only once.`,
          'If you did not request this reset, you can ignore this email.',
        ].join('\n'),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Password-reset email could not be sent',
      );
    }
  }
}
