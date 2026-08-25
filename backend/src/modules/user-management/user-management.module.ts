import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PasswordResetModule } from '../password-reset/password-reset.module';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';

@Module({
  imports: [AuthModule, PasswordResetModule],
  controllers: [UserManagementController],
  providers: [UserManagementService],
})
export class UserManagementModule {}
