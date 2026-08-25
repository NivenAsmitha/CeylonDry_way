import { Module } from '@nestjs/common';
import { StaffAccountsService } from './staff-accounts.service';

@Module({
  providers: [StaffAccountsService],
  exports: [StaffAccountsService],
})
export class StaffAccountsModule {}
