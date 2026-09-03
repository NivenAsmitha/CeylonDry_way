import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessManagementController } from './access-management.controller';
import { AccessManagementService } from './access-management.service';

@Module({
  imports: [AuthModule],
  controllers: [AccessManagementController],
  providers: [AccessManagementService],
})
export class AccessManagementModule {}
