import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleName } from '../src/generated/prisma/client.js';

type SeedRole = {
  name: RoleName;
  description: string;
};

type SeedAmenity = {
  code: string;
  name: string;
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

    if (roleCount !== roles.length || amenityCount !== amenities.length) {
      throw new Error('Seed verification failed.');
    }

    console.log(
      `Seed completed: ${roleCount} roles and ${amenityCount} amenities.`,
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
