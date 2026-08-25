import { Module } from '@nestjs/common';
import { PasswordResetDeliveryService } from './password-reset-delivery.service';
import { PasswordResetService } from './password-reset.service';

@Module({
  providers: [PasswordResetService, PasswordResetDeliveryService],
  exports: [PasswordResetService, PasswordResetDeliveryService],
})
export class PasswordResetModule {}
