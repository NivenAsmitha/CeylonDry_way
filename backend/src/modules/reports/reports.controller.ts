import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionKey } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import { CreatePropertyReportDto } from './dto/create-property-report.dto';
import { ModeratePropertyReportDto } from './dto/moderate-property-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Public property reports')
@Controller('places/:propertyId/reports')
export class PublicReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ reports: { limit: 5, ttl: 60_000 } })
  @ApiCreatedResponse({ description: 'Report accepted for moderation' })
  @ApiTooManyRequestsResponse({ description: 'Report rate limit exceeded' })
  create(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() input: CreatePropertyReportDto,
  ) {
    return this.reports.create(propertyId, input);
  }
}

@ApiTags('Admin report moderation')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'ADMIN role is required' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PermissionKey.REPORT_MANAGEMENT)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@Query() query: AdminReportQueryDto) {
    return this.reports.list(query);
  }

  @Patch(':id/moderation')
  moderate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) reportId: string,
    @Body() input: ModeratePropertyReportDto,
  ) {
    return this.reports.moderate(user.id, reportId, input);
  }
}
