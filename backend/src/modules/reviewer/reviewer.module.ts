import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReviewerController } from './reviewer.controller';
import { ReviewerService } from './reviewer.service';

@Module({
  imports: [AuthModule],
  controllers: [ReviewerController],
  providers: [ReviewerService],
  exports: [ReviewerService],
})
export class ReviewerModule {}
