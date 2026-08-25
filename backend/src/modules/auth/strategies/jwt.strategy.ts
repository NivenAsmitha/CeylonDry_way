import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service';
import { mapSafeUser, safeUserSelect } from '../../users/user.mapper';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { isAccessJwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: unknown): Promise<AuthenticatedUser> {
    if (!isAccessJwtPayload(payload)) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
        status: UserStatus.ACTIVE,
      },
      select: safeUserSelect,
    });

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    return mapSafeUser(user);
  }
}
