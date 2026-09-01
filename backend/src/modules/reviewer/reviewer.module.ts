import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertiesModule } from '../properties/properties.module';
import { ReviewerController } from './reviewer.controller';
import { ReviewerPropertiesController } from './reviewer-properties.controller';
import { ReviewerPropertyPhotosController } from './reviewer-property-photos.controller';
import { ReviewerService } from './reviewer.service';

@Module({
  imports: [AuthModule, PropertiesModule],
  controllers: [
    ReviewerController,
    ReviewerPropertiesController,
    ReviewerPropertyPhotosController,
  ],
  providers: [ReviewerService],
  exports: [ReviewerService],
})
export class ReviewerModule {}
