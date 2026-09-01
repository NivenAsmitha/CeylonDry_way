import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Current user')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ type: CurrentUserResponseDto })
  getCurrentUser(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AuthenticatedUser> {
    return this.usersService.getCurrentUser(currentUser.id);
  }

  @Patch()
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiBadRequestResponse({ description: 'Profile update validation failed' })
  updateCurrentUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<AuthenticatedUser> {
    return this.usersService.updateCurrentUser(
      currentUser.id,
      updateProfileDto,
    );
  }

  @Patch('password')
  @ApiOkResponse({
    schema: { example: { message: 'Password changed successfully' } },
  })
  @ApiBadRequestResponse({ description: 'Password validation failed' })
  changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() input: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.changePassword(currentUser.id, input);
  }
}
