import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';
import { SupportTicketStatus } from '../../../generated/prisma/client.js';

export class UpdateSupportTicketStatusDto {
  @ApiProperty({ enum: SupportTicketStatus })
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;

  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @Transform(trimStringToNull)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}
