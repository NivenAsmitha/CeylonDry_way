import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import {
  ClientSupportController,
  StaffSupportController,
} from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [
    AuthModule,
    ThrottlerModule.forRoot([{ name: 'support', ttl: 60_000, limit: 30 }]),
  ],
  controllers: [ClientSupportController, StaffSupportController],
  providers: [SupportService],
})
export class SupportModule {}
