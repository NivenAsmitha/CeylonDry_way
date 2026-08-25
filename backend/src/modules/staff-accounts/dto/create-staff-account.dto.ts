import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  normalizeEmail,
  trimString,
} from '../../../common/transforms/string.transforms';

export class CreateStaffAccountDto {
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ format: 'email', maxLength: 254 })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 16, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  @Matches(/[a-z]/, {
    message: 'temporaryPassword requires a lowercase letter',
  })
  @Matches(/[A-Z]/, {
    message: 'temporaryPassword requires an uppercase letter',
  })
  @Matches(/[0-9]/, { message: 'temporaryPassword requires a number' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'temporaryPassword requires a symbol',
  })
  temporaryPassword!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
