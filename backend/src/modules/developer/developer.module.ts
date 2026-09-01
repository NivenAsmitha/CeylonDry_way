import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffAccountsModule } from '../staff-accounts/staff-accounts.module';
import { DeveloperController } from './developer.controller';
import { DeveloperOperationsController } from './developer-operations.controller';
import { DeveloperOperationsService } from './developer-operations.service';

@Module({
  imports: [AuthModule, StaffAccountsModule],
  controllers: [DeveloperController, DeveloperOperationsController],
  providers: [DeveloperOperationsService],
})
export class DeveloperModule {}
