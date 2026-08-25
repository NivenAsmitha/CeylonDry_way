import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UserStatus } from '../../../generated/prisma/client.js';
import { ManagementReasonDto } from './management-reason.dto';

export const manageableInactiveStatuses = [
  UserStatus.SUSPENDED,
  UserStatus.DISABLED,
] as const;

export class ChangeUserStatusDto extends ManagementReasonDto {
  @ApiProperty({ enum: manageableInactiveStatuses })
  @IsIn(manageableInactiveStatuses)
  status!: (typeof manageableInactiveStatuses)[number];
}
