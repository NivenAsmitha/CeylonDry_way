import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  RoleName,
  UserStatus,
} from '../src/generated/prisma/client.js';
import {
  assertAllowedRoleCombination,
  hasExactRoleSet,
  normalizeRoleSet,
} from '../src/modules/roles/role-combination.policy.js';

const staffRoles = new Set([
  RoleName.REVIEWER,
  RoleName.ADMIN,
  RoleName.DEVELOPER,
]);

function maskEmail(email: string): string {
  const [local = '', domain = 'invalid'] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

function desiredRoles(
  currentRoles: readonly RoleName[],
  propertyCount: number,
): RoleName[] | null {
  const staff = currentRoles.filter((role) => staffRoles.has(role));
  if (staff.length > 1) return null;
  if (staff.length === 1) return [staff[0]];
  if (currentRoles.includes(RoleName.OWNER) || propertyCount > 0) {
    return [RoleName.CLIENT, RoleName.OWNER];
  }
  return [RoleName.CLIENT];
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured.');
  const apply = process.argv.includes('--apply');
  const actorArgument = process.argv.find((value) =>
    value.startsWith('--actor-email='),
  );
  const actorEmail = actorArgument
    ?.slice('--actor-email='.length)
    .trim()
    .toLowerCase();
  const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        roles: { select: { role: { select: { name: true } } } },
        _count: { select: { properties: true } },
      },
    });
    const corrections: Array<{
      id: string;
      maskedEmail: string;
      before: RoleName[];
      after: RoleName[];
    }> = [];
    const ambiguous: Array<{
      id: string;
      maskedEmail: string;
      roles: RoleName[];
    }> = [];

    for (const user of users) {
      const current = normalizeRoleSet(user.roles.map(({ role }) => role.name));
      const desired = desiredRoles(current, user._count.properties);

      if (!desired) {
        ambiguous.push({
          id: user.id,
          maskedEmail: maskEmail(user.email),
          roles: current,
        });
      } else if (!hasExactRoleSet(current, desired)) {
        assertAllowedRoleCombination(desired);
        corrections.push({
          id: user.id,
          maskedEmail: maskEmail(user.email),
          before: current,
          after: desired,
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: apply ? 'apply' : 'dry-run',
          correctionCount: corrections.length,
          corrections,
          ambiguousCount: ambiguous.length,
          ambiguous,
        },
        null,
        2,
      ),
    );

    if (!apply || corrections.length === 0) return;
    if (!actorEmail) {
      throw new Error('--actor-email is required with --apply.');
    }

    const actor = await prisma.user.findUnique({
      where: { email: actorEmail, status: UserStatus.ACTIVE },
      select: {
        id: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    const actorRoles = normalizeRoleSet(
      actor?.roles.map(({ role }) => role.name) ?? [],
    );
    if (!actor || !hasExactRoleSet(actorRoles, [RoleName.DEVELOPER])) {
      throw new Error(
        'A DEVELOPER-only actor is required to apply corrections.',
      );
    }

    const roles = await prisma.role.findMany({
      select: { id: true, name: true },
    });
    const roleIds = new Map(roles.map((role) => [role.name, role.id]));

    await prisma.$transaction(async (transaction) => {
      for (const correction of corrections) {
        await transaction.userRole.deleteMany({
          where: { userId: correction.id },
        });
        await transaction.userRole.createMany({
          data: correction.after.map((role) => {
            const roleId = roleIds.get(role);
            if (!roleId) throw new Error(`Required ${role} role is missing.`);
            return {
              userId: correction.id,
              roleId,
              assignedById: actor.id,
              systemReason: 'ROLE_POLICY_CORRECTION',
            };
          }),
        });
        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: 'ACCOUNT_ROLES_CORRECTED',
            targetType: 'User',
            targetId: correction.id,
            beforeSummary: { roles: correction.before },
            afterSummary: { roles: correction.after },
          },
        });
      }
    });

    console.log(`Applied ${corrections.length} role-policy corrections.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Role-policy audit failed.',
  );
  process.exitCode = 1;
});
