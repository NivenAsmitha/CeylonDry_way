import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString, MaxLength, ValidateIf } from 'class-validator';
import { MAX_PROPERTY_PHOTO_ALT_TEXT } from '../property-photo.constants';

export class UpdatePropertyPhotoDto {
  @ApiProperty({ nullable: true, maxLength: MAX_PROPERTY_PHOTO_ALT_TEXT })
  @IsDefined()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @MaxLength(MAX_PROPERTY_PHOTO_ALT_TEXT)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  altText!: string | null;
}
