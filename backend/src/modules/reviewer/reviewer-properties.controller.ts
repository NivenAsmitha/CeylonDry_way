import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePropertyDto } from '../properties/dto/create-property.dto';
import {
  OwnerPropertyListResponseDto,
  OwnerPropertyResponseDto,
} from '../properties/dto/property-response.dto';
import { SubmitPropertyDto } from '../properties/dto/submit-property.dto';
import { UpdatePropertyDto } from '../properties/dto/update-property.dto';
import { PropertiesService } from '../properties/properties.service';

@ApiTags('Reviewer-created properties')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'REVIEWER role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.REVIEWER)
@Controller('reviewer/properties')
export class ReviewerPropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reviewer-authored property draft' })
  @ApiCreatedResponse({ type: OwnerPropertyResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreatePropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    return this.properties.createReviewerDraft(user.id, input);
  }

  @Get()
  @ApiOkResponse({ type: OwnerPropertyListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OwnerPropertyListResponseDto> {
    return this.properties.listOwnedProperties(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: OwnerPropertyResponseDto })
  @ApiNotFoundResponse({ description: 'Reviewer-authored property not found' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
  ): Promise<OwnerPropertyResponseDto> {
    return this.properties.getOwnedProperty(user.id, propertyId);
  }

  @Patch(':id')
  @ApiOkResponse({ type: OwnerPropertyResponseDto })
  @ApiConflictResponse({ description: 'Property is not editable' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Body() input: UpdatePropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    return this.properties.updateOwnedProperty(user.id, propertyId, input);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OwnerPropertyResponseDto })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Body() input: SubmitPropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    return this.properties.submitOwnedProperty(user.id, propertyId, input);
  }
}
