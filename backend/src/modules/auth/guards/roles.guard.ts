import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import type { RoleName } from '../../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

interface RequestWithOptionalUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<readonly RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    if (requiredRoles.length === 0) {
      return false;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithOptionalUser>();
    const currentUser = request.user;

    if (!currentUser) {
      return false;
    }

    return requiredRoles.some((role) => currentUser.roles.includes(role));
  }
}
