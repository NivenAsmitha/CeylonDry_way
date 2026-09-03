import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import { PermissionKey, RoleName } from '../../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

interface RequestWithOptionalUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      readonly PermissionKey[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions) return true;
    if (requiredPermissions.length === 0) return false;

    const request = context
      .switchToHttp()
      .getRequest<RequestWithOptionalUser>();
    const currentUser = request.user;
    if (!currentUser) return false;

    if (currentUser.roles.includes(RoleName.DEVELOPER)) return true;

    return requiredPermissions.some((permission) =>
      currentUser.permissions.includes(permission),
    );
  }
}
