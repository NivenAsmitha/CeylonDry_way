import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  argon2id,
  hash as hashPassword,
  verify as verifyPassword,
} from 'argon2';
import type { CookieOptions } from 'express';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma, RoleName, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { mapSafeUser, safeUserSelect } from '../users/user.mapper';
import {
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_REFRESH_MESSAGE,
  REFRESH_COOKIE_NAME,
} from './auth.constants';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import {
  isRefreshJwtPayload,
  type AccessJwtPayload,
  type RefreshJwtPayload,
} from './types/jwt-payload.type';

const PUBLIC_REGISTRATION_REASON = 'PUBLIC_REGISTRATION';
const MAX_USER_AGENT_LENGTH = 500;
const MAX_IP_ADDRESS_LENGTH = 64;

const loginUserSelect = {
  ...safeUserSelect,
  passwordHash: true,
} satisfies Prisma.UserSelect;

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

export interface AuthSessionResult extends AuthResponse {
  refreshToken: string;
}

type RefreshRotationResult =
  | { kind: 'success'; auth: AuthSessionResult }
  | { kind: 'invalid' }
  | { kind: 'reuse' };

function parseDurationMilliseconds(value: string): number {
  const match = /^(\d+)(s|m|h|d|w)$/.exec(value);

  if (!match) {
    throw new Error('Invalid JWT lifetime configuration');
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multiplier =
    unit === 's'
      ? 1_000
      : unit === 'm'
        ? 60_000
        : unit === 'h'
          ? 3_600_000
          : unit === 'd'
            ? 86_400_000
            : 604_800_000;
  const milliseconds = amount * multiplier;

  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
    throw new Error('Invalid JWT lifetime configuration');
  }

  return milliseconds;
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function tokenHashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  return (
    leftBuffer.length > 0 &&
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function normalizeMetadataValue(
  value: string | undefined,
  maximumLength: number,
): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized.slice(0, maximumLength) : undefined;
}

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessLifetimeSeconds: number;
  private readonly refreshLifetimeSeconds: number;
  private readonly refreshLifetimeMilliseconds: number;
  private readonly production: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    if (this.accessSecret === this.refreshSecret) {
      throw new Error('JWT access and refresh secrets must be different');
    }

    const accessLifetimeMilliseconds = parseDurationMilliseconds(
      configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
    );
    this.refreshLifetimeMilliseconds = parseDurationMilliseconds(
      configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
    );
    this.accessLifetimeSeconds = Math.max(
      1,
      Math.ceil(accessLifetimeMilliseconds / 1_000),
    );
    this.refreshLifetimeSeconds = Math.max(
      1,
      Math.ceil(this.refreshLifetimeMilliseconds / 1_000),
    );
    this.production =
      configService.getOrThrow<string>('NODE_ENV') === 'production';
  }

  getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.production,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: this.refreshLifetimeMilliseconds,
    };
  }

  getRefreshCookieClearOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.production,
      sameSite: 'lax',
      path: '/api/v1/auth',
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthenticatedUser> {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const clientRole = await this.rolesService.findByName(RoleName.CLIENT);

    if (!clientRole) {
      throw new ServiceUnavailableException(
        'The required CLIENT role is not configured',
      );
    }

    const passwordHash = await hashPassword(registerDto.password, {
      type: argon2id,
    });

    try {
      const user = await this.prisma.$transaction((transaction) =>
        transaction.user.create({
          data: {
            name: registerDto.name.trim(),
            email,
            passwordHash,
            phone: registerDto.phone?.trim(),
            roles: {
              create: {
                role: {
                  connect: { id: clientRole.id },
                },
                systemReason: PUBLIC_REGISTRATION_REASON,
              },
            },
          },
          select: safeUserSelect,
        }),
      );

      return mapSafeUser(user);
    } catch (error: unknown) {
      if (hasPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw error;
    }
  }

  async login(
    loginDto: LoginDto,
    metadata: SessionMetadata,
  ): Promise<AuthSessionResult> {
    const email = loginDto.email.trim().toLowerCase();
    const userRecord = await this.prisma.user.findUnique({
      where: { email },
      select: loginUserSelect,
    });

    if (!userRecord || userRecord.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    let passwordIsValid = false;

    try {
      passwordIsValid = await verifyPassword(
        userRecord.passwordHash,
        loginDto.password,
      );
    } catch {
      passwordIsValid = false;
    }

    if (!passwordIsValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.createSession(mapSafeUser(userRecord), randomUUID(), metadata);
  }

  async refresh(
    refreshToken: string,
    metadata: SessionMetadata,
  ): Promise<AuthSessionResult> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const suppliedTokenHash = hashRefreshToken(refreshToken);
    const now = new Date();

    const rotation: RefreshRotationResult = await this.prisma.$transaction(
      async (transaction) => {
        const session = await transaction.refreshSession.findUnique({
          where: { id: payload.sid },
          select: {
            id: true,
            userId: true,
            tokenHash: true,
            familyId: true,
            expiresAt: true,
            revokedAt: true,
            user: {
              select: safeUserSelect,
            },
          },
        });

        if (
          !session ||
          session.userId !== payload.sub ||
          !tokenHashesMatch(session.tokenHash, suppliedTokenHash)
        ) {
          return { kind: 'invalid' };
        }

        if (session.revokedAt) {
          await transaction.refreshSession.updateMany({
            where: {
              userId: session.userId,
              familyId: session.familyId,
              revokedAt: null,
            },
            data: { revokedAt: now },
          });

          return { kind: 'reuse' };
        }

        if (
          session.expiresAt <= now ||
          session.user.status !== UserStatus.ACTIVE
        ) {
          return { kind: 'invalid' };
        }

        const replacementSessionId = randomUUID();
        const [accessToken, replacementRefreshToken] = await Promise.all([
          this.signAccessToken(session.userId),
          this.signRefreshToken(session.userId, replacementSessionId),
        ]);
        const revokeResult = await transaction.refreshSession.updateMany({
          where: {
            id: session.id,
            tokenHash: suppliedTokenHash,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { revokedAt: now },
        });

        if (revokeResult.count !== 1) {
          await transaction.refreshSession.updateMany({
            where: {
              userId: session.userId,
              familyId: session.familyId,
              revokedAt: null,
            },
            data: { revokedAt: now },
          });

          return { kind: 'reuse' };
        }

        await transaction.refreshSession.create({
          data: {
            id: replacementSessionId,
            userId: session.userId,
            tokenHash: hashRefreshToken(replacementRefreshToken),
            familyId: session.familyId,
            expiresAt: this.getRefreshExpiration(),
            ...this.normalizeSessionMetadata(metadata),
          },
        });

        return {
          kind: 'success',
          auth: {
            accessToken,
            refreshToken: replacementRefreshToken,
            user: mapSafeUser(session.user),
          },
        };
      },
    );

    if (rotation.kind !== 'success') {
      throw new UnauthorizedException(INVALID_REFRESH_MESSAGE);
    }

    return rotation.auth;
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      select: { id: true },
    });

    if (!session) {
      return;
    }

    await this.prisma.refreshSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  private async createSession(
    user: AuthenticatedUser,
    familyId: string,
    metadata: SessionMetadata,
  ): Promise<AuthSessionResult> {
    const sessionId = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user.id),
      this.signRefreshToken(user.id, sessionId),
    ]);

    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        familyId,
        expiresAt: this.getRefreshExpiration(),
        ...this.normalizeSessionMetadata(metadata),
      },
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  private signAccessToken(userId: string): Promise<string> {
    const payload: AccessJwtPayload = {
      sub: userId,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessLifetimeSeconds,
    });
  }

  private signRefreshToken(userId: string, sessionId: string): Promise<string> {
    const payload: RefreshJwtPayload = {
      sub: userId,
      sid: sessionId,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshLifetimeSeconds,
    });
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshJwtPayload> {
    let payload: unknown;

    try {
      payload = await this.jwtService.verifyAsync<object>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_MESSAGE);
    }

    if (!isRefreshJwtPayload(payload)) {
      throw new UnauthorizedException(INVALID_REFRESH_MESSAGE);
    }

    return payload;
  }

  private getRefreshExpiration(): Date {
    return new Date(Date.now() + this.refreshLifetimeMilliseconds);
  }

  private normalizeSessionMetadata(
    metadata: SessionMetadata,
  ): Pick<SessionMetadata, 'userAgent' | 'ipAddress'> {
    return {
      userAgent: normalizeMetadataValue(
        metadata.userAgent,
        MAX_USER_AGENT_LENGTH,
      ),
      ipAddress: normalizeMetadataValue(
        metadata.ipAddress,
        MAX_IP_ADDRESS_LENGTH,
      ),
    };
  }
}

export { REFRESH_COOKIE_NAME };
