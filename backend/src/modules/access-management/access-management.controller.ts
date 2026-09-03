import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AccessManagementService } from './access-management.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@ApiTags('Developer access management')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'DEVELOPER role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.DEVELOPER)
@Controller('developer/access-management')
export class AccessManagementController {
  constructor(private readonly access: AccessManagementService) {}

  @Get()
  getMatrix() {
    return this.access.getMatrix();
  }

  @Patch(':role')
  @ApiBadRequestResponse({ description: 'Role or permissions are invalid' })
  @ApiConflictResponse({ description: 'Access configuration is unchanged' })
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('role') role: string,
    @Body() input: UpdateRolePermissionsDto,
  ) {
    return this.access.updateRole(user.id, role, input);
  }
}
