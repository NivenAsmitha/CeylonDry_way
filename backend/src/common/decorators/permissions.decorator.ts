import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../../generated/prisma/client.js';

export const PERMISSIONS_KEY = 'required_permissions';

export const Permissions = (
  ...permissions: PermissionKey[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
