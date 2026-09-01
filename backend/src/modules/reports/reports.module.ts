import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import {
  AdminReportsController,
  PublicReportsController,
} from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    AuthModule,
    ThrottlerModule.forRoot([{ name: 'reports', ttl: 60_000, limit: 20 }]),
  ],
  controllers: [PublicReportsController, AdminReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
