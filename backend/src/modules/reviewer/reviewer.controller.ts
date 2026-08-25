import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ReviewDecisionDto } from './dto/review-decision.dto';
import { ReviewerListQueryDto } from './dto/reviewer-list-query.dto';
import {
  ReviewerListingDetailDto,
  ReviewerQueueResponseDto,
} from './dto/reviewer-response.dto';
import { ReviewerService } from './reviewer.service';

@ApiTags('Reviewer listings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
@ApiForbiddenResponse({ description: 'REVIEWER role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.REVIEWER)
@Controller('reviewer/listings')
export class ReviewerController {
  constructor(private readonly reviewerService: ReviewerService) {}

  @Get()
  @ApiOperation({ summary: 'List the controlled reviewer workflow queue' })
  @ApiOkResponse({ type: ReviewerQueueResponseDto })
  listListings(
    @Query() query: ReviewerListQueryDto,
  ): Promise<ReviewerQueueResponseDto> {
    return this.reviewerService.listListings(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a submitted listing for review' })
  @ApiOkResponse({ type: ReviewerListingDetailDto })
  @ApiNotFoundResponse({ description: 'Reviewer listing not found' })
  getListing(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) propertyId: string,
  ): Promise<ReviewerListingDetailDto> {
    return this.reviewerService.getListing(currentUser.id, propertyId);
  }

  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply one privileged listing decision atomically' })
  @ApiOkResponse({ type: ReviewerListingDetailDto })
  @ApiBadRequestResponse({ description: 'Decision validation failed' })
  @ApiNotFoundResponse({ description: 'Reviewer listing not found' })
  @ApiConflictResponse({ description: 'Invalid or stale status transition' })
  decide(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) propertyId: string,
    @Body() input: ReviewDecisionDto,
  ): Promise<ReviewerListingDetailDto> {
    return this.reviewerService.decide(currentUser.id, propertyId, input);
  }
}
