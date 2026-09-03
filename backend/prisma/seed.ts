import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PermissionKey,
  PrismaClient,
  RoleName,
} from '../src/generated/prisma/client.js';

type SeedRole = {
  name: RoleName;
  description: string;
};

type SeedAmenity = {
  code: string;
  name: string;
};

const permissions = [
  {
    key: PermissionKey.USER_MANAGEMENT,
    name: 'User management',
    description: 'View and manage eligible user accounts.',
  },
  {
    key: PermissionKey.REVIEWER_MANAGEMENT,
    name: 'Reviewer management',
    description: 'Create and manage reviewer accounts.',
  },
  {
    key: PermissionKey.PROPERTY_MANAGEMENT,
    name: 'Property management',
    description: 'Manage property records and lifecycle actions.',
  },
  {
    key: PermissionKey.REPORT_MANAGEMENT,
    name: 'Report management',
    description: 'Review and resolve community reports.',
  },
  {
    key: PermissionKey.LISTING_REVIEW,
    name: 'Listing review',
    description: 'Review submitted listings and apply decisions.',
  },
  {
    key: PermissionKey.MANUAL_PROPERTY_MANAGEMENT,
    name: 'Manual property management',
    description: 'Create and maintain staff-authored properties.',
  },
  {
    key: PermissionKey.REVIEW_MODERATION,
    name: 'Review moderation',
    description: 'Moderate facility reviews and owner replies.',
  },
  {
    key: PermissionKey.SUPPORT_MANAGEMENT,
    name: 'Support management',
    description: 'Read, claim and answer client support requests.',
  },
] as const;

const defaultRolePermissions: Readonly<
  Record<'ADMIN' | 'REVIEWER', readonly PermissionKey[]>
> = {
  ADMIN: [
    PermissionKey.USER_MANAGEMENT,
    PermissionKey.REVIEWER_MANAGEMENT,
    PermissionKey.PROPERTY_MANAGEMENT,
    PermissionKey.REPORT_MANAGEMENT,
    PermissionKey.REVIEW_MODERATION,
    PermissionKey.SUPPORT_MANAGEMENT,
  ],
  REVIEWER: [
    PermissionKey.LISTING_REVIEW,
    PermissionKey.MANUAL_PROPERTY_MANAGEMENT,
    PermissionKey.REVIEW_MODERATION,
    PermissionKey.SUPPORT_MANAGEMENT,
  ],
};

const roles: readonly SeedRole[] = [
  {
    name: RoleName.CLIENT,
    description: 'Public user and registered client',
  },
  {
    name: RoleName.OWNER,
    description: 'Property owner',
  },
  {
    name: RoleName.REVIEWER,
    description: 'Listing quality reviewer',
  },
  {
    name: RoleName.ADMIN,
    description: 'System administrator',
  },
  {
    name: RoleName.DEVELOPER,
    description: 'Technical operations access',
  },
];

const amenities: readonly SeedAmenity[] = [
  { code: 'TOILET_PAPER', name: 'Toilet paper' },
  { code: 'HANDWASHING', name: 'Handwashing facilities' },
  { code: 'WHEELCHAIR_ACCESS', name: 'Wheelchair accessible' },
  { code: 'BABY_CHANGING', name: 'Baby changing facilities' },
  { code: 'PARKING', name: 'Parking available' },
  { code: 'WASHLET', name: 'Washlet available' },
];

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const adapter = new PrismaPg(databaseUrl);
  const prisma = new PrismaClient({ adapter });

  console.log('Starting database seed...');

  try {
    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {
          description: role.description,
        },
        create: role,
      });
    }

    for (const [index, permission] of permissions.entries()) {
      await prisma.permission.upsert({
        where: { key: permission.key },
        update: {
          name: permission.name,
          description: permission.description,
          sortOrder: index,
        },
        create: { ...permission, sortOrder: index },
      });
    }

    for (const [roleName, permissionKeys] of Object.entries(
      defaultRolePermissions,
    ) as Array<
      [RoleName.ADMIN | RoleName.REVIEWER, readonly PermissionKey[]]
    >) {
      const role = await prisma.role.findUniqueOrThrow({
        where: { name: roleName },
        select: { id: true },
      });
      const [assignmentCount, customizationCount] = await Promise.all([
        prisma.rolePermission.count({ where: { roleId: role.id } }),
        prisma.auditLog.count({
          where: {
            action: 'ROLE_PERMISSIONS_UPDATED',
            targetType: 'Role',
            targetId: roleName,
          },
        }),
      ]);
      if (assignmentCount > 0 || customizationCount > 0) continue;

      const configuredPermissions = await prisma.permission.findMany({
        where: { key: { in: [...permissionKeys] } },
        select: { id: true },
      });
      await prisma.rolePermission.createMany({
        data: configuredPermissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
          reason: 'SYSTEM_DEFAULT_PERMISSION',
        })),
        skipDuplicates: true,
      });
    }

    for (const amenity of amenities) {
      await prisma.amenity.upsert({
        where: { code: amenity.code },
        update: {
          name: amenity.name,
          isActive: true,
        },
        create: {
          ...amenity,
          isActive: true,
        },
      });
    }

    const roleCount = await prisma.role.count({
      where: {
        name: {
          in: roles.map((role) => role.name),
        },
      },
    });

    const amenityCount = await prisma.amenity.count({
      where: {
        code: {
          in: amenities.map((amenity) => amenity.code),
        },
      },
    });

    const permissionCount = await prisma.permission.count({
      where: {
        key: {
          in: permissions.map((permission) => permission.key),
        },
      },
    });

    if (
      roleCount !== roles.length ||
      amenityCount !== amenities.length ||
      permissionCount !== permissions.length
    ) {
      throw new Error('Seed verification failed.');
    }

    console.log(
      `Seed completed: ${roleCount} roles, ${permissionCount} permissions and ${amenityCount} amenities.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  void error;
  console.error('Database seed failed.');
  process.exitCode = 1;
});
