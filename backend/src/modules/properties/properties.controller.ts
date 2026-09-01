import {
  Body,
  Controller,
  Delete,
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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreatePropertyDto } from './dto/create-property.dto';
import {
  AmenityResponseDto,
  OwnerPropertyListResponseDto,
  OwnerPropertyResponseDto,
} from './dto/property-response.dto';
import { SubmitPropertyDto } from './dto/submit-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';

@ApiTags('Owner properties')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
@ApiForbiddenResponse({
  description: 'Required client or owner role is missing',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('owner/properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get('amenities')
  @ApiOperation({ summary: 'List active controlled amenities' })
  @ApiOkResponse({ type: [AmenityResponseDto] })
  listAmenities(): Promise<AmenityResponseDto[]> {
    return this.propertiesService.listActiveAmenities();
  }

  @Post()
  @Roles(RoleName.CLIENT)
  @ApiOperation({
    summary: 'Start a property draft and assign OWNER when needed',
  })
  @ApiCreatedResponse({ type: OwnerPropertyResponseDto })
  @ApiBadRequestResponse({ description: 'Draft input validation failed' })
  createDraft(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createPropertyDto: CreatePropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    return this.propertiesService.createDraft(
      currentUser.id,
      createPropertyDto,
    );
  }

  @Get()
  @Roles(RoleName.OWNER)
  @ApiOkResponse({ type: OwnerPropertyListResponseDto })
  listOwnedProperties(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<OwnerPropertyListResponseDto> {
    return this.propertiesService.listOwnedProperties(currentUser.id);
  }

  @Get(':id')
  @Roles(RoleName.OWNER)
  @ApiOkResponse({ type: OwnerPropertyResponseDto })
  @ApiNotFoundResponse({ description: 'Property not found' })
  getOwnedProperty(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) propertyId: string,
  ): Promise<OwnerPropertyResponseDto> {
    return this.propertiesService.getOwnedProperty(currentUser.id, propertyId);
  }

  @Patch(':id')
  @Roles(RoleName.OWNER)
  @ApiOkResponse({ type: OwnerPropertyResponseDto })
  @ApiBadRequestResponse({ description: 'Draft input validation failed' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  @ApiConflictResponse({ description: 'Property is not editable' })
  updateOwnedProperty(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) propertyId: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    return this.propertiesService.updateOwnedProperty(
      currentUser.id,
      propertyId,
      updatePropertyDto,
    );
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleName.OWNER)
  @ApiOkResponse({ type: OwnerPropertyResponseDto })
  @ApiBadRequestResponse({ description: 'Submission confirmation is required' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  @ApiConflictResponse({ description: 'Invalid lifecycle transition' })
  @ApiUnprocessableEntityResponse({
    description: 'Draft is missing required submission fields',
  })
  submitOwnedProperty(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) propertyId: string,
    @Body() submitPropertyDto: SubmitPropertyDto,
  ): Promise<OwnerPropertyResponseDto> {
    return this.propertiesService.submitOwnedProperty(
      currentUser.id,
      propertyId,
      submitPropertyDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RoleName.OWNER)
  @ApiOperation({
    summary: 'Remove an owned property from the active workspace',
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  @ApiConflictResponse({ description: 'Property is already removed' })
  async deleteOwnedProperty(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) propertyId: string,
  ): Promise<void> {
    await this.propertiesService.archiveOwnedProperty(
      currentUser.id,
      propertyId,
    );
  }
}
