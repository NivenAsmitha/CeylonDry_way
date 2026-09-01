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
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AdminPropertiesService } from './admin-properties.service';
import { AdminPropertyActionDto } from './dto/admin-property-action.dto';
import { AdminPropertyQueryDto } from './dto/admin-property-query.dto';

@ApiTags('Admin property management')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'ADMIN role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
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
