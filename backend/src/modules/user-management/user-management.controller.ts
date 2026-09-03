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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
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
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionKey } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { ChangeUserRolesDto } from './dto/change-user-roles.dto';
import { ManagementReasonDto } from './dto/management-reason.dto';
import { UpdateManagedUserDto } from './dto/update-managed-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UserManagementService } from './user-management.service';

@ApiTags('User management')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@ApiForbiddenResponse({
  description: 'The actor or target is outside the management hierarchy',
})
@ApiNotFoundResponse({ description: 'User not found' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PermissionKey.USER_MANAGEMENT)
@Controller('management/users')
export class UserManagementController {
  constructor(private readonly users: UserManagementService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter users using safe fields' })
  @ApiOkResponse({ description: 'Paginated safe user summaries' })
  @ApiBadRequestResponse({ description: 'List filters are invalid' })
  list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: UserListQueryDto,
  ) {
    return this.users.listUsers(actor.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get safe user, activity, role, and audit details' })
  @ApiOkResponse({ description: 'Safe management details' })
  get(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    return this.users.getUser(actor.id, targetId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit permitted non-authority profile fields' })
  @ApiOkResponse({ description: 'Updated safe management details' })
  @ApiBadRequestResponse({ description: 'Profile input is invalid' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body() input: UpdateManagedUserDto,
  ) {
    return this.users.updateUser(actor.id, targetId, input);
  }

  @Patch(':id/roles')
  @ApiOperation({ summary: 'Assign an audited, valid account role set' })
  @ApiOkResponse({ description: 'Updated safe management details' })
  @ApiBadRequestResponse({
    description: 'Role combination or reason is invalid',
  })
  @ApiConflictResponse({
    description: 'Role change conflicts with account data',
  })
  changeRoles(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body() input: ChangeUserRolesDto,
  ) {
    return this.users.changeRoles(actor.id, targetId, input);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Suspend or disable an eligible user' })
  @ApiOkResponse({ description: 'Updated safe management details' })
  @ApiBadRequestResponse({ description: 'Status or reason is invalid' })
  @ApiConflictResponse({ description: 'Requested transition is invalid' })
  changeStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body() input: ChangeUserStatusDto,
  ) {
    return this.users.changeStatus(actor.id, targetId, input);
  }

  @Post(':id/password-reset')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a one-time password-reset link' })
  @ApiAcceptedResponse({
    description: 'A generic accepted response; no token is returned',
  })
  @ApiBadRequestResponse({ description: 'Reason is invalid' })
  initiatePasswordReset(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body() input: ManagementReasonDto,
  ) {
    return this.users.initiatePasswordReset(actor.id, targetId, input);
  }

  @Post(':id/revoke-sessions')
  @ApiOperation({ summary: 'Revoke every active refresh session for a user' })
  @ApiOkResponse({ description: 'Only the revoked session count is returned' })
  @ApiBadRequestResponse({ description: 'Reason is invalid' })
  revokeSessions(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body() input: ManagementReasonDto,
  ) {
    return this.users.revokeSessions(actor.id, targetId, input);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft-delete and disable a user while preserving relations',
  })
  @ApiOkResponse({ description: 'Soft-deleted safe management details' })
  @ApiBadRequestResponse({ description: 'Reason is invalid' })
  softDelete(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body() input: ManagementReasonDto,
  ) {
    return this.users.softDelete(actor.id, targetId, input);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore an eligible disabled or deleted user' })
  @ApiOkResponse({ description: 'Restored safe management details' })
  @ApiBadRequestResponse({ description: 'Reason is invalid' })
  @ApiConflictResponse({ description: 'Account is already active' })
  restore(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body() input: ManagementReasonDto,
  ) {
    return this.users.restore(actor.id, targetId, input);
  }
}
