import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Prisma,
  RoleName,
  UserStatus,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

const ACCESS_SECRET = 'strategy-access-secret-that-is-longer-than-32-chars';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userFindUnique: jest.MockedFunction<
    (args: Prisma.UserFindUniqueArgs) => Promise<unknown>
  >;

  beforeEach(async () => {
    userFindUnique = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: { user: { findUnique: userFindUnique } },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => ACCESS_SECRET,
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('loads safe current roles from the database for an access payload', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      name: 'Test Person',
      phone: null,
      language: 'en',
      status: UserStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      roles: [
        { role: { name: RoleName.CLIENT } },
        { role: { name: RoleName.OWNER } },
      ],
    });

    const user = await strategy.validate({ sub: 'user-1', type: 'access' });

    expect(user.roles).toEqual([RoleName.CLIENT, RoleName.OWNER]);
    expect(user).not.toHaveProperty('passwordHash');
    expect(userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1', status: UserStatus.ACTIVE },
      }),
    );
  });

  it('rejects refresh payloads and inactive or missing current users', async () => {
    await expect(
      strategy.validate({
        sub: 'user-1',
        sid: 'session-1',
        type: 'refresh',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userFindUnique).not.toHaveBeenCalled();

    userFindUnique.mockResolvedValue(null);
    await expect(
      strategy.validate({ sub: 'user-1', type: 'access' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
