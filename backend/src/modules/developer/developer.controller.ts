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
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateStaffAccountDto } from '../staff-accounts/dto/create-staff-account.dto';
import { StaffAccountsService } from '../staff-accounts/staff-accounts.service';
import { CurrentUserResponseDto } from '../users/dto/current-user-response.dto';

@ApiTags('Developer account management')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@ApiForbiddenResponse({ description: 'DEVELOPER role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.DEVELOPER)
@Controller('developer/admins')
export class DeveloperController {
  constructor(private readonly staffAccounts: StaffAccountsService) {}

  @Post()
  @ApiCreatedResponse({ type: CurrentUserResponseDto })
  @ApiBadRequestResponse({ description: 'Admin account input is invalid' })
  @ApiConflictResponse({ description: 'Email is already registered' })
  createAdmin(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() input: CreateStaffAccountDto,
  ): Promise<AuthenticatedUser> {
    return this.staffAccounts.createAdmin(currentUser.id, input);
  }
}
