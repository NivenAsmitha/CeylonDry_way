import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { trimStringToNull } from '../../../common/transforms/string.transforms';

export enum AdminPropertyAction {
  SUSPEND = 'SUSPEND',
  REACTIVATE = 'REACTIVATE',
  ARCHIVE = 'ARCHIVE',
}

export class AdminPropertyActionDto {
  @IsEnum(AdminPropertyAction)
  action!: AdminPropertyAction;

  @Transform(trimStringToNull)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}
