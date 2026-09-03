import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PermissionKey,
  RoleName,
  UserStatus,
} from '../../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { PermissionsGuard } from './permissions.guard';

function user(
  roles: RoleName[],
  permissions: PermissionKey[],
): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'person@example.test',
    name: 'Person',
    phone: null,
    language: 'en',
    status: UserStatus.ACTIVE,
    roles,
    permissions,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function context(currentUser?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => function handler(): void {},
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => ({ user: currentUser }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let getAllAndOverride: jest.MockedFunction<
    () => readonly PermissionKey[] | undefined
  >;

  beforeEach(async () => {
    getAllAndOverride = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride },
        },
      ],
    }).compile();
    guard = module.get(PermissionsGuard);
  });

  it('allows a user with the required permission', () => {
    getAllAndOverride.mockReturnValue([PermissionKey.USER_MANAGEMENT]);
    expect(
      guard.canActivate(
        context(user([RoleName.ADMIN], [PermissionKey.USER_MANAGEMENT])),
      ),
    ).toBe(true);
  });

  it('denies a user when the permission was revoked', () => {
    getAllAndOverride.mockReturnValue([PermissionKey.USER_MANAGEMENT]);
    expect(guard.canActivate(context(user([RoleName.ADMIN], [])))).toBe(false);
  });

  it('keeps Developer authority protected', () => {
    getAllAndOverride.mockReturnValue([PermissionKey.REPORT_MANAGEMENT]);
    expect(guard.canActivate(context(user([RoleName.DEVELOPER], [])))).toBe(
      true,
    );
  });
});
