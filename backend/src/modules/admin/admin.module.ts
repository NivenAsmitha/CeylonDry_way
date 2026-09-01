import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffAccountsModule } from '../staff-accounts/staff-accounts.module';
import { AdminController } from './admin.controller';
import { AdminPropertiesController } from './admin-properties.controller';
import { AdminPropertiesService } from './admin-properties.service';

@Module({
  imports: [AuthModule, StaffAccountsModule],
  controllers: [AdminController, AdminPropertiesController],
  providers: [AdminPropertiesService],
})
export class AdminModule {}
