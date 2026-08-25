import { ApiProperty } from '@nestjs/swagger';
import { RoleName, UserStatus } from '../../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

export class CurrentUserResponseDto implements AuthenticatedUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: ['en'] })
  language!: string;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ enum: RoleName, isArray: true })
  roles!: RoleName[];

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;
}
