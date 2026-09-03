import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionKey } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AdminPropertiesService } from './admin-properties.service';
import { AdminPropertyActionDto } from './dto/admin-property-action.dto';
import { AdminPropertyQueryDto } from './dto/admin-property-query.dto';

@ApiTags('Admin property management')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'ADMIN role is required' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PermissionKey.PROPERTY_MANAGEMENT)
@Controller('admin/properties')
export class AdminPropertiesController {
  constructor(private readonly properties: AdminPropertiesService) {}

  @Get()
  list(@Query() query: AdminPropertyQueryDto) {
    return this.properties.list(query);
  }

  @Patch(':id/action')
  applyAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Body() input: AdminPropertyActionDto,
  ) {
    return this.properties.applyAction(user.id, propertyId, input);
  }
}
