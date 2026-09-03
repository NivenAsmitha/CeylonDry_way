import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';
import {
  SupportTicketCategory,
  SupportTicketPriority,
} from '../../../generated/prisma/client.js';

export class CreateSupportTicketDto {
  @ApiProperty({ enum: SupportTicketCategory })
  @IsEnum(SupportTicketCategory)
  category!: SupportTicketCategory;

  @ApiPropertyOptional({ enum: SupportTicketPriority })
  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @ApiProperty({ minLength: 5, maxLength: 140 })
  @Transform(trimStringToNull)
  @IsString()
  @MinLength(5)
  @MaxLength(140)
  subject!: string;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @Transform(trimStringToNull)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsUUID()
  relatedPropertyId?: string | null;
}
