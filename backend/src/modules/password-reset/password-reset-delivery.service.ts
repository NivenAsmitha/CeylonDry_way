import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface PasswordResetDelivery {
  userId: string;
  email: string;
  name: string;
  rawToken: string;
  expiresAt: Date;
}

@Injectable()
export class PasswordResetDeliveryService {
  sendPasswordReset(delivery: PasswordResetDelivery): Promise<void> {
    void delivery;
    throw new ServiceUnavailableException(
      'Password-reset email delivery is not configured',
    );
  }
}
