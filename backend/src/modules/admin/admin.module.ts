import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffAccountsModule } from '../staff-accounts/staff-accounts.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, StaffAccountsModule],
  controllers: [AdminController],
})
export class AdminModule {}
