import { Injectable } from '@nestjs/common';
import { RoleName } from './generated/prisma/enums.js';
import { PrismaService } from './prisma/prisma.service';

export interface HealthResponse {
  status: 'ok';
  service: 'comfortgo-api';
  database: {
    status: 'connected';
    seededRoleCount: number;
  };
  timestamp: string;
}

const SEEDED_ROLE_NAMES: readonly RoleName[] = [
  RoleName.CLIENT,
  RoleName.OWNER,
  RoleName.REVIEWER,
  RoleName.ADMIN,
  RoleName.DEVELOPER,
];

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    const seededRoleCount = await this.prisma.role.count({
      where: {
        name: {
          in: [...SEEDED_ROLE_NAMES],
        },
      },
    });

    return {
      status: 'ok',
      service: 'comfortgo-api',
      database: {
        status: 'connected',
        seededRoleCount,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
