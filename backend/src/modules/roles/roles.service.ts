import { Injectable } from '@nestjs/common';
import type { RoleName } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';

export interface RoleIdentity {
  id: string;
  name: RoleName;
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findByName(name: RoleName): Promise<RoleIdentity | null> {
    return this.prisma.role.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
      },
    });
  }
}
