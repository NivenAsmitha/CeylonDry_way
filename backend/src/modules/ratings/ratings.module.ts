import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  MyRatingController,
  OwnerRatingRepliesController,
  PublicRatingsController,
  StaffRatingReviewsController,
} from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [AuthModule],
  controllers: [
    PublicRatingsController,
    MyRatingController,
    OwnerRatingRepliesController,
    StaffRatingReviewsController,
  ],
  providers: [RatingsService],
})
export class RatingsModule {}
