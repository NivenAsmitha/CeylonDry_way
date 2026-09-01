import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  MyRatingController,
  PublicRatingsController,
} from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicRatingsController, MyRatingController],
  providers: [RatingsService],
})
export class RatingsModule {}
