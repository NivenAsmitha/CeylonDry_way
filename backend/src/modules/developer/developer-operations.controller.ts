import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DeveloperOperationsService } from './developer-operations.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('Developer operations')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'DEVELOPER role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.DEVELOPER)
@Controller('developer/operations')
export class DeveloperOperationsController {
  constructor(private readonly operations: DeveloperOperationsService) {}

  @Get('health')
  health() {
    return this.operations.health();
  }

  @Get('audit-logs')
  auditLogs(@Query() query: AuditLogQueryDto) {
    return this.operations.auditLogs(query);
  }
}
