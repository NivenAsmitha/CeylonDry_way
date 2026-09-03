import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionKey, RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  DeleteFacilityRatingResponseDto,
  FacilityRatingDto,
  FacilityRatingSummaryDto,
} from './dto/facility-rating-response.dto';
import { UpsertFacilityRatingDto } from './dto/upsert-facility-rating.dto';
import { ModerateRatingReviewDto } from './dto/moderate-rating-review.dto';
import {
  PublicRatingReviewQueryDto,
  StaffRatingReviewQueryDto,
} from './dto/rating-review-query.dto';
import { UpsertRatingReplyDto } from './dto/rating-reply.dto';
import { RatingsService } from './ratings.service';

@ApiTags('Facility ratings')
@Controller('places/:propertyId/ratings')
export class PublicRatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get public category averages for a facility' })
  @ApiOkResponse({ type: FacilityRatingSummaryDto })
  @ApiNotFoundResponse({ description: 'Place not found' })
  summary(@Param('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.ratings.summary(propertyId);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get public written reviews and owner replies' })
  reviews(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Query() query: PublicRatingReviewQueryDto,
  ) {
    return this.ratings.publicReviews(propertyId, query);
  }
}

@ApiTags('Property owner review replies')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'The property owner role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.OWNER)
@Controller('reviews/:reviewId/reply')
export class OwnerRatingRepliesController {
  constructor(private readonly ratings: RatingsService) {}

  @Put()
  @ApiOperation({ summary: 'Create or update the property owner reply' })
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() input: UpsertRatingReplyDto,
  ) {
    return this.ratings.upsertOwnerReply(reviewId, user.id, input);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete the property owner reply' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ) {
    return this.ratings.deleteOwnerReply(reviewId, user.id);
  }
}

@ApiTags('Review moderation')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'REVIEWER or ADMIN role is required' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PermissionKey.REVIEW_MODERATION)
@Controller('staff/reviews')
export class StaffRatingReviewsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get()
  list(@Query() query: StaffRatingReviewQueryDto) {
    return this.ratings.staffReviews(query);
  }

  @Patch(':reviewId/moderation')
  moderateReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() input: ModerateRatingReviewDto,
  ) {
    return this.ratings.moderateReview(user.id, reviewId, input);
  }

  @Patch('replies/:replyId/moderation')
  moderateReply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @Body() input: ModerateRatingReviewDto,
  ) {
    return this.ratings.moderateReply(user.id, replyId, input);
  }
}

@ApiTags('My facility rating')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'CLIENT or OWNER role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.CLIENT, RoleName.OWNER)
@Controller('places/:propertyId/ratings/me')
export class MyRatingController {
  constructor(private readonly ratings: RatingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current user rating for a facility' })
  @ApiOkResponse({ type: FacilityRatingDto })
  mine(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratings.mine(propertyId, user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update the current user rating' })
  @ApiOkResponse({ type: FacilityRatingDto })
  upsert(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpsertFacilityRatingDto,
  ) {
    return this.ratings.upsert(propertyId, user.id, input);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete the current user rating' })
  @ApiOkResponse({ type: DeleteFacilityRatingResponseDto })
  remove(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratings.remove(propertyId, user.id);
  }
}
