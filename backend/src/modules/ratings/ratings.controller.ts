import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  DeleteFacilityRatingResponseDto,
  FacilityRatingDto,
  FacilityRatingSummaryDto,
} from './dto/facility-rating-response.dto';
import { UpsertFacilityRatingDto } from './dto/upsert-facility-rating.dto';
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
