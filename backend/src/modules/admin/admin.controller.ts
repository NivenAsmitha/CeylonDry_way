import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionKey } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateStaffAccountDto } from '../staff-accounts/dto/create-staff-account.dto';
import { StaffAccountsService } from '../staff-accounts/staff-accounts.service';
import { CurrentUserResponseDto } from '../users/dto/current-user-response.dto';

@ApiTags('Admin account management')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@ApiForbiddenResponse({ description: 'ADMIN role is required' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PermissionKey.REVIEWER_MANAGEMENT)
@Controller('admin/reviewers')
export class AdminController {
  constructor(private readonly staffAccounts: StaffAccountsService) {}

  @Post()
  @ApiCreatedResponse({ type: CurrentUserResponseDto })
  @ApiBadRequestResponse({ description: 'Reviewer account input is invalid' })
  @ApiConflictResponse({ description: 'Email is already registered' })
  createReviewer(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() input: CreateStaffAccountDto,
  ): Promise<AuthenticatedUser> {
    return this.staffAccounts.createReviewer(currentUser.id, input);
  }
}
