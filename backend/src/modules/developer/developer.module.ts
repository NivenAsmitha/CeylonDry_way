import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffAccountsModule } from '../staff-accounts/staff-accounts.module';
import { DeveloperController } from './developer.controller';

@Module({
  imports: [AuthModule, StaffAccountsModule],
  controllers: [DeveloperController],
})
export class DeveloperModule {}
