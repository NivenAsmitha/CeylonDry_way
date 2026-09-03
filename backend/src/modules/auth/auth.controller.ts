import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiAcceptedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { REFRESH_COOKIE_NAME } from './auth.constants';
import { AuthService, type AuthResponse } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CurrentUserResponseDto } from '../users/dto/current-user-response.dto';
import { ResetPasswordDto } from '../password-reset/dto/reset-password.dto';
import { RequestPasswordResetDto } from '../password-reset/dto/request-password-reset.dto';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { RefreshCookieService } from './refresh-cookie.service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getRefreshCookie(
  request: Request,
  cookieName: string,
): string | undefined {
  const cookies: unknown = request.cookies;

  if (!isRecord(cookies)) {
    return undefined;
  }

  const refreshCookie = cookies[cookieName];

  return typeof refreshCookie === 'string' && refreshCookie.length > 0
    ? refreshCookie
    : undefined;
}

function getSessionMetadata(request: Request): {
  userAgent?: string;
  ipAddress?: string;
} {
  return {
    userAgent: request.get('user-agent'),
    ipAddress: request.ip,
  };
}

function toAuthResponse(
  authSession: Awaited<ReturnType<AuthService['login']>>,
): AuthResponse {
  return {
    accessToken: authSession.accessToken,
    user: authSession.user,
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiCreatedResponse({ type: CurrentUserResponseDto })
  @ApiBadRequestResponse({ description: 'Registration validation failed' })
  @ApiConflictResponse({ description: 'Email is already registered' })
  @ApiTooManyRequestsResponse({
    description: 'Registration rate limit exceeded',
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 3, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Request a one-time password-reset link' })
  @ApiAcceptedResponse({
    schema: {
      example: {
        accepted: true,
        message:
          'If an active account exists for that email, password reset instructions have been sent.',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email validation failed' })
  @ApiTooManyRequestsResponse({
    description: 'Password-reset request rate limit exceeded',
  })
  requestPasswordReset(@Body() input: RequestPasswordResetDto) {
    return this.passwordResetService.request(input);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Complete a one-time password reset' })
  @ApiOkResponse({
    schema: { example: { message: 'Password reset completed' } },
  })
  @ApiBadRequestResponse({
    description: 'Reset token is invalid, expired, used, or revoked',
  })
  @ApiTooManyRequestsResponse({ description: 'Reset rate limit exceeded' })
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.passwordResetService.complete(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Login validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: 'Login rate limit exceeded' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const authSession = await this.authService.login(
      loginDto,
      getSessionMetadata(request),
    );
    response.cookie(
      this.refreshCookie.name,
      authSession.refreshToken,
      this.refreshCookie.getSetOptions(),
    );

    return toAuthResponse(authSession);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({ summary: 'Rotate the HttpOnly refresh cookie' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or expired',
  })
  @ApiTooManyRequestsResponse({ description: 'Refresh rate limit exceeded' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const refreshToken = getRefreshCookie(request, this.refreshCookie.name);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    try {
      const authSession = await this.authService.refresh(
        refreshToken,
        getSessionMetadata(request),
      );
      response.cookie(
        this.refreshCookie.name,
        authSession.refreshToken,
        this.refreshCookie.getSetOptions(),
      );

      return toAuthResponse(authSession);
    } catch (error: unknown) {
      response.clearCookie(
        this.refreshCookie.name,
        this.refreshCookie.getClearOptions(),
      );
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiNoContentResponse({ description: 'Session revoked and cookie cleared' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    try {
      await this.authService.logout(
        getRefreshCookie(request, this.refreshCookie.name),
      );
    } catch {
      // The cookie is always cleared and logout remains idempotent.
    } finally {
      response.clearCookie(
        this.refreshCookie.name,
        this.refreshCookie.getClearOptions(),
      );
    }
  }
}
