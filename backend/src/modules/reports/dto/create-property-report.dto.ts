import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';
import { PropertyReportCategory } from '../../../generated/prisma/client.js';

export class CreatePropertyReportDto {
  @ApiProperty({ enum: PropertyReportCategory })
  @IsEnum(PropertyReportCategory)
  category!: PropertyReportCategory;

  @ApiProperty({ minLength: 20, maxLength: 1500 })
  @Transform(trimStringToNull)
  @IsString()
  @MinLength(20)
  @MaxLength(1500)
  description!: string;

  @ApiPropertyOptional({ maxLength: 254 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  reporterEmail?: string | null;
}
