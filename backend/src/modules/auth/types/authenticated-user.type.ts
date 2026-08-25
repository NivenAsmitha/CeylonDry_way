import type { RoleName, UserStatus } from '../../../generated/prisma/client.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  language: string;
  status: UserStatus;
  roles: RoleName[];
  createdAt: Date;
}
