import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleName, UserStatus } from '../../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { RolesGuard } from './roles.guard';

const currentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'person@example.com',
  name: 'Test Person',
  phone: null,
  language: 'en',
  status: UserStatus.ACTIVE,
  roles: [RoleName.CLIENT],
  permissions: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createExecutionContext(
  user: AuthenticatedUser | undefined,
): ExecutionContext {
  return {
    getHandler: () => function handler(): void {},
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let getAllAndOverride: jest.MockedFunction<
    () => readonly RoleName[] | undefined
  >;

  beforeEach(async () => {
    getAllAndOverride = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  it('permits a route without role metadata', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createExecutionContext(undefined))).toBe(true);
  });

  it('permits a user with a required current role', () => {
    getAllAndOverride.mockReturnValue([RoleName.CLIENT]);

    expect(guard.canActivate(createExecutionContext(currentUser))).toBe(true);
  });

  it('denies an authenticated user without a required role', () => {
    getAllAndOverride.mockReturnValue([RoleName.ADMIN]);

    expect(guard.canActivate(createExecutionContext(currentUser))).toBe(false);
  });

  it('denies when required role information has no authenticated user', () => {
    getAllAndOverride.mockReturnValue([RoleName.CLIENT]);

    expect(guard.canActivate(createExecutionContext(undefined))).toBe(false);
  });

  it('denies an explicitly configured empty role requirement', () => {
    getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(createExecutionContext(currentUser))).toBe(false);
  });
});
