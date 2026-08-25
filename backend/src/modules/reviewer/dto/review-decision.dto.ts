import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';
import { ReviewDecisionType } from '../../../generated/prisma/client.js';

const REVIEW_FIELD_PATTERN = /^[A-Za-z0-9_.[\]-]+$/;

export class ReviewFieldNoteDto {
  @ApiProperty({ example: 'description', maxLength: 100 })
  @Transform(trimStringToNull)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(REVIEW_FIELD_PATTERN)
  field!: string;

  @ApiProperty({
    example: 'Clarify the accessible entrance instructions.',
    maxLength: 500,
  })
  @Transform(trimStringToNull)
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  message!: string;
}

export class ReviewDecisionDto {
  @ApiProperty({ enum: ReviewDecisionType })
  @IsEnum(ReviewDecisionType)
  decision!: ReviewDecisionType;

  @ApiPropertyOptional({
    description: 'Required for request changes, reject, and suspend decisions.',
    minLength: 3,
    maxLength: 1000,
    nullable: true,
  })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason?: string | null;

  @ApiPropertyOptional({ type: [ReviewFieldNoteDto], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ReviewFieldNoteDto)
  fieldNotes?: ReviewFieldNoteDto[];
}
