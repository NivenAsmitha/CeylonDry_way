import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

export const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  language: true,
  status: true,
  createdAt: true,
  roles: {
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type SafeUserRecord = Prisma.UserGetPayload<{
  select: typeof safeUserSelect;
}>;

export function mapSafeUser(user: SafeUserRecord): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    language: user.language,
    status: user.status,
    roles: user.roles.map(({ role }) => role.name),
    createdAt: user.createdAt,
  };
}
