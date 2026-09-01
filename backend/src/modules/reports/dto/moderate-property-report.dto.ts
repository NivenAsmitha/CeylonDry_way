import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';

export enum ReportModerationAction {
  START_REVIEW = 'START_REVIEW',
  RESOLVE = 'RESOLVE',
  DISMISS = 'DISMISS',
}

export class ModeratePropertyReportDto {
  @ApiProperty({ enum: ReportModerationAction })
  @IsEnum(ReportModerationAction)
  action!: ReportModerationAction;

  @ApiPropertyOptional({ maxLength: 1500 })
  @Transform(trimStringToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  note?: string | null;
}
