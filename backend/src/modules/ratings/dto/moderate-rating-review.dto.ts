import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';

export enum RatingModerationAction {
  HIDE = 'HIDE',
  RESTORE = 'RESTORE',
}

export class ModerateRatingReviewDto {
  @ApiProperty({ enum: RatingModerationAction })
  @IsEnum(RatingModerationAction)
  action!: RatingModerationAction;

  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @Transform(trimStringToNull)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}
