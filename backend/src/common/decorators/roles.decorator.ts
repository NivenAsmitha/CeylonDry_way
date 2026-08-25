import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'required_roles';

export const Roles = (...roles: RoleName[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
